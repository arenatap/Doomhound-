import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ===== AVAX SHIELD API =====
async function scanWithShield(address: string): Promise<{
  riskScore: number;
  verdict: string;
  data: any;
}> {
  try {
    const res = await fetch("https://avax-shield.pages.dev/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!res.ok) return { riskScore: -1, verdict: "error", data: {} };
    const data = await res.json();
    return {
      riskScore: data.riskScore ?? -1,
      verdict: data.verdict ?? "unknown",
      data,
    };
  } catch (err) {
    console.error("AVAX Shield scan error:", err);
    return { riskScore: -1, verdict: "error", data: {} };
  }
}

// ===== MARKET CAP CHECK (via DEX Screener) =====
async function checkMarketCap(contractAddress: string): Promise<{
  marketCapUsd: number;
  valid: boolean;
}> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) return { marketCapUsd: 0, valid: false };
    const data = await res.json();
    const pairs = data.pairs || [];
    if (pairs.length === 0) return { marketCapUsd: 0, valid: false };
    // Get the best pair (highest liquidity)
    const best = pairs.sort((a: any, b: any) =>
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];
    const mc = best.fdv || best.marketCap || 0;
    return { marketCapUsd: mc, valid: mc >= 1000 };
  } catch (err) {
    console.error("Market cap check error:", err);
    return { marketCapUsd: 0, valid: false };
  }
}

// ===== ADMIN AUTH =====
function verifyAdmin(password: string | undefined): boolean {
  return password === process.env.ADMIN_PASSWORD;
}

// ===== GET =====
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "list": {
        const apps = await db.launchpadApplication.findMany({
          orderBy: { submittedAt: "desc" },
          include: { daoProposal: true },
        });
        return NextResponse.json({ applications: apps });
      }

      case "application": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const app = await db.launchpadApplication.findUnique({
          where: { id },
          include: { daoProposal: true },
        });
        if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ application: app });
      }

      default:
        return NextResponse.json({ error: "Unknown action", availableActions: ["list", "application"] }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Launchpad API GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== POST =====
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    // ===== SUBMIT APPLICATION (public) =====
    if (action === "submit") {
      const { projectName, contractAddress, description, supplyPercent, tokenAmount, arenaLink, contactInfo } = body;

      if (!projectName || !description || !tokenAmount) {
        return NextResponse.json({ error: "Project name, description, and token amount are required" }, { status: 400 });
      }

      const pct = parseFloat(supplyPercent);
      if (isNaN(pct) || pct < 1) {
        return NextResponse.json({ error: "Supply % must be at least 1%" }, { status: 400 });
      }

      // Create application
      const app = await db.launchpadApplication.create({
        data: {
          projectName: projectName.trim(),
          contractAddress: contractAddress?.trim() || null,
          description: description.trim(),
          supplyPercent: pct,
          tokenAmount: tokenAmount.trim(),
          arenaLink: arenaLink?.trim() || null,
          contactInfo: contactInfo?.trim() || null,
          status: "submitted",
        },
      });

      // Auto-scan with AVAX Shield if contract address provided
      if (app.contractAddress) {
        const shield = await scanWithShield(app.contractAddress);
        // Check market cap ($1K minimum)
        const mcCheck = await checkMarketCap(app.contractAddress);

        let newStatus = "shield_scanned";
        let shieldVerdict = shield.verdict;

        if (!mcCheck.valid && app.contractAddress) {
          shieldVerdict = "RISKY";
          // Still save but mark as risky
        }

        await db.launchpadApplication.update({
          where: { id: app.id },
          data: {
            shieldScore: shield.riskScore,
            shieldVerdict: shieldVerdict,
            shieldData: JSON.stringify({
              ...shield.data,
              marketCapUsd: mcCheck.marketCapUsd,
              mcValid: mcCheck.valid,
            }),
            status: newStatus,
          },
        });

        const updated = await db.launchpadApplication.findUnique({
          where: { id: app.id },
          include: { daoProposal: true },
        });

        return NextResponse.json({
          success: true,
          application: updated,
          shieldResult: {
            riskScore: shield.riskScore,
            verdict: shieldVerdict,
            marketCapUsd: mcCheck.marketCapUsd,
            mcValid: mcCheck.valid,
          },
        });
      }

      return NextResponse.json({ success: true, application: app });
    }

    // ===== ADMIN ACTIONS =====
    if (["scan_shield", "approve", "reject", "mark_airdropped"].includes(action)) {
      if (!verifyAdmin(body.adminPassword)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // ===== RE-SCAN SHIELD (admin) =====
    if (action === "scan_shield") {
      const { applicationId } = body;
      if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

      const app = await db.launchpadApplication.findUnique({ where: { id: applicationId } });
      if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
      if (!app.contractAddress) return NextResponse.json({ error: "No contract address to scan" }, { status: 400 });

      const shield = await scanWithShield(app.contractAddress);
      const mcCheck = await checkMarketCap(app.contractAddress);

      let shieldVerdict = shield.verdict;
      if (!mcCheck.valid) shieldVerdict = "RISKY";

      await db.launchpadApplication.update({
        where: { id: applicationId },
        data: {
          shieldScore: shield.riskScore,
          shieldVerdict,
          shieldData: JSON.stringify({
            ...shield.data,
            marketCapUsd: mcCheck.marketCapUsd,
            mcValid: mcCheck.valid,
          }),
          status: "shield_scanned",
        },
      });

      const updated = await db.launchpadApplication.findUnique({
        where: { id: applicationId },
        include: { daoProposal: true },
      });

      return NextResponse.json({
        success: true,
        application: updated,
        shieldResult: { riskScore: shield.riskScore, verdict: shieldVerdict, marketCapUsd: mcCheck.marketCapUsd, mcValid: mcCheck.valid },
      });
    }

    // ===== APPROVE (admin) — creates DAO proposal automatically =====
    if (action === "approve") {
      const { applicationId, airdropWallet, adminNotes } = body;
      if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

      const app = await db.launchpadApplication.findUnique({ where: { id: applicationId } });
      if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

      if (app.status !== "shield_scanned" && app.status !== "submitted") {
        return NextResponse.json({ error: `Cannot approve application in status: ${app.status}` }, { status: 400 });
      }

      // Create DAO proposal
      const votingDurationHours = 24;
      const votingEndsAt = new Date(Date.now() + votingDurationHours * 60 * 60 * 1000);

      // Take snapshot of current member points for voting power
      const members = await db.packMember.findMany({
        where: { points: { gt: 0 } },
        select: { handle: true, points: true },
      });
      const snapshotData = JSON.stringify(
        Object.fromEntries(members.map(m => [m.handle, m.points]))
      );

      const shieldInfo = `Shield Score: ${app.shieldScore}/100 (${app.shieldVerdict})`;
      const mcInfo = (() => {
        try {
          const sd = JSON.parse(app.shieldData);
          return sd.marketCapUsd ? `\nMC: $${Math.round(sd.marketCapUsd).toLocaleString()}` : "";
        } catch { return ""; }
      })();
      const airdropInfo = `Airdrop: ${app.supplyPercent}% supply (${app.tokenAmount} tokens) → Top 20`;
      const walletInfo = airdropWallet ? `\nLaunchpad Wallet: ${airdropWallet}` : "";

      const proposal = await db.daoProposal.create({
        data: {
          title: `🚀 Launchpad: ${app.projectName}`,
          description: `${app.description}\n\n${shieldInfo}${mcInfo}\n${airdropInfo}${walletInfo}\n\nContract: ${app.contractAddress || "Pre-launch"}`,
          category: "pack",
          createdBy: "admin",
          votingEndsAt,
          quorum: 3,
          approvalPct: 50,
          snapshotData,
        },
      });

      // Update application
      await db.launchpadApplication.update({
        where: { id: applicationId },
        data: {
          status: "dao_voting",
          daoProposalId: proposal.id,
          airdropWallet: airdropWallet || null,
          adminNotes: adminNotes || null,
          reviewedAt: new Date(),
        },
      });

      const updated = await db.launchpadApplication.findUnique({
        where: { id: applicationId },
        include: { daoProposal: true },
      });

      return NextResponse.json({ success: true, application: updated, proposal });
    }

    // ===== REJECT (admin) =====
    if (action === "reject") {
      const { applicationId, adminNotes } = body;
      if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

      await db.launchpadApplication.update({
        where: { id: applicationId },
        data: {
          status: "rejected",
          adminNotes: adminNotes || null,
          reviewedAt: new Date(),
        },
      });

      const updated = await db.launchpadApplication.findUnique({
        where: { id: applicationId },
        include: { daoProposal: true },
      });

      return NextResponse.json({ success: true, application: updated });
    }

    // ===== MARK AIRDROPPED (admin) =====
    if (action === "mark_airdropped") {
      const { applicationId } = body;
      if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

      await db.launchpadApplication.update({
        where: { id: applicationId },
        data: { status: "completed" },
      });

      const updated = await db.launchpadApplication.findUnique({
        where: { id: applicationId },
        include: { daoProposal: true },
      });

      return NextResponse.json({ success: true, application: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Launchpad API POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
