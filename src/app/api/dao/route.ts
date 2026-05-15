import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ===== DEFAULT DAO SETTINGS =====
const DEFAULT_SETTINGS: Record<string, string> = {
  categories: JSON.stringify(["burn", "pack", "treasury", "nft", "marketing"]),
  voting_duration_hours: "48",
  quorum: "3",
  approval_threshold: "50",
  proposer_min_points: "0", // 0 = only admin can propose
};

async function getSetting(key: string): Promise<string> {
  const setting = await db.daoSettings.findUnique({ where: { key } });
  return setting?.value || DEFAULT_SETTINGS[key] || "";
}

async function setSetting(key: string, value: string) {
  return db.daoSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// ===== GET: Proposals + Settings + Single Proposal =====
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "proposals": {
        const status = searchParams.get("status"); // active, passed, failed, all
        const category = searchParams.get("category");

        const where: any = {};
        if (status && status !== "all") where.status = status;
        if (category) where.category = category;

        const proposals = await db.daoProposal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            votes: {
              include: {
                proposal: { select: { id: true } },
              },
            },
          },
        });

        // Auto-close expired proposals
        const now = new Date();
        for (const p of proposals) {
          if (p.status === "active" && new Date(p.votingEndsAt) <= now) {
            await closeProposal(p.id);
          }
        }

        // Re-fetch after potential closures
        const updated = await db.daoProposal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: { votes: true },
        });

        // Add vote summary to each proposal
        const result = updated.map((p) => {
          const yesVotes = p.votes.filter((v) => v.vote === "yes");
          const noVotes = p.votes.filter((v) => v.vote === "no");
          const yesPower = yesVotes.reduce((sum, v) => sum + v.votingPower, 0);
          const noPower = noVotes.reduce((sum, v) => sum + v.votingPower, 0);
          const totalPower = yesPower + noPower;

          return {
            ...p,
            _count: { votes: p.votes.length },
            yesVotes: yesVotes.length,
            noVotes: noVotes.length,
            yesPower,
            noPower,
            totalPower,
          };
        });

        return NextResponse.json({ proposals: result });
      }

      case "proposal": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        const proposal = await db.daoProposal.findUnique({
          where: { id },
          include: { votes: true },
        });

        if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Auto-close if expired
        if (proposal.status === "active" && new Date(proposal.votingEndsAt) <= new Date()) {
          await closeProposal(proposal.id);
        }

        const yesVotes = proposal.votes.filter((v) => v.vote === "yes");
        const noVotes = proposal.votes.filter((v) => v.vote === "no");
        const yesPower = yesVotes.reduce((sum, v) => sum + v.votingPower, 0);
        const noPower = noVotes.reduce((sum, v) => sum + v.votingPower, 0);

        // Check if user already voted
        const handle = searchParams.get("handle");
        const userVote = handle ? proposal.votes.find((v) => v.memberHandle === handle.replace("@", "").trim().toLowerCase()) : null;

        return NextResponse.json({
          proposal: {
            ...proposal,
            yesVotes: yesVotes.length,
            noVotes: noVotes.length,
            yesPower,
            noPower,
            totalPower: yesPower + noPower,
            userVote: userVote?.vote || null,
          },
        });
      }

      case "settings": {
        const allSettings = await db.daoSettings.findMany();
        const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
        for (const s of allSettings) {
          settingsMap[s.key] = s.value;
        }
        return NextResponse.json({ settings: settingsMap });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["proposals", "proposal", "settings"],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("DAO API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== POST: Create proposal, Vote, Admin actions =====
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      // ===== VOTE =====
      case "vote": {
        const { proposalId, handle, vote, votingPower: requestedPower } = body;
        if (!proposalId || !handle || !vote) {
          return NextResponse.json({ error: "proposalId, handle, and vote required" }, { status: 400 });
        }
        if (vote !== "yes" && vote !== "no") {
          return NextResponse.json({ error: "Vote must be 'yes' or 'no'" }, { status: 400 });
        }

        const cleanHandle = handle.replace("@", "").trim().toLowerCase();

        // Get member
        const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (!member) {
          return NextResponse.json({ error: "Not registered in the Pack" }, { status: 404 });
        }

        // Validate voting power: user chooses how many points to commit (1 to their total)
        const power = Math.max(1, Math.min(
          typeof requestedPower === "number" ? requestedPower : member.points,
          member.points
        ));

        // Get proposal
        const proposal = await db.daoProposal.findUnique({
          where: { id: proposalId },
          include: { votes: true },
        });
        if (!proposal) {
          return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
        }

        // Check if active
        if (proposal.status !== "active") {
          return NextResponse.json({ error: "This proposal is no longer active" }, { status: 400 });
        }

        // Check if voting period is over
        if (new Date(proposal.votingEndsAt) <= new Date()) {
          await closeProposal(proposal.id);
          return NextResponse.json({ error: "Voting period has ended" }, { status: 400 });
        }

        // Check if already voted
        const existingVote = proposal.votes.find((v) => v.memberHandle === cleanHandle);
        if (existingVote) {
          return NextResponse.json({ error: "You already voted on this proposal" }, { status: 400 });
        }

        // Create vote with user-chosen voting power
        const newVote = await db.daoVote.create({
          data: {
            proposalId,
            memberHandle: cleanHandle,
            vote,
            votingPower: power,
          },
        });

        // Log activity
        await db.activityLog.create({
          data: {
            memberHandle: cleanHandle,
            type: "dao_vote",
            description: `Voted ${vote.toUpperCase()} on "${proposal.title}" (${power} voting power)`,
            points: 0,
          },
        });

        return NextResponse.json({ success: true, vote: newVote });
      }

      // ===== CREATE PROPOSAL (admin only) =====
      case "create_proposal": {
        const { adminPassword, title, description, category } = body;
        if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== "doomhound2026") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!title || !description || !category) {
          return NextResponse.json({ error: "title, description, and category required" }, { status: 400 });
        }

        // Validate category
        const categories = JSON.parse(await getSetting("categories"));
        if (!categories.includes(category)) {
          return NextResponse.json({ error: `Invalid category. Allowed: ${categories.join(", ")}` }, { status: 400 });
        }

        // Get settings
        const durationHours = parseInt(await getSetting("voting_duration_hours"));
        const quorum = parseInt(await getSetting("quorum"));
        const approvalPct = parseInt(await getSetting("approval_threshold"));

        const now = new Date();
        const votingEndsAt = new Date(now.getTime() + durationHours * 3600000);

        // Snapshot all members' points
        const allMembers = await db.packMember.findMany({
          select: { handle: true, points: true },
        });
        const snapshotData = JSON.stringify(
          Object.fromEntries(allMembers.map((m) => [m.handle, m.points]))
        );

        const proposal = await db.daoProposal.create({
          data: {
            title,
            description,
            category,
            createdBy: "admin",
            votingEndsAt,
            quorum,
            approvalPct,
            snapshotData,
          },
        });

        return NextResponse.json({ success: true, proposal });
      }

      // ===== CANCEL PROPOSAL (admin only) =====
      case "cancel_proposal": {
        const { adminPassword, proposalId } = body;
        if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== "doomhound2026") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!proposalId) {
          return NextResponse.json({ error: "proposalId required" }, { status: 400 });
        }

        const proposal = await db.daoProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (proposal.status !== "active") {
          return NextResponse.json({ error: "Can only cancel active proposals" }, { status: 400 });
        }

        await db.daoProposal.update({
          where: { id: proposalId },
          data: { status: "cancelled" },
        });

        return NextResponse.json({ success: true });
      }

      // ===== UPDATE SETTINGS (admin only) =====
      case "update_settings": {
        const { adminPassword, settings } = body;
        if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== "doomhound2026") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!settings || typeof settings !== "object") {
          return NextResponse.json({ error: "settings object required" }, { status: 400 });
        }

        // Validate categories
        if (settings.categories) {
          try {
            const cats = JSON.parse(settings.categories);
            if (!Array.isArray(cats)) throw new Error();
          } catch {
            return NextResponse.json({ error: "categories must be a JSON array" }, { status: 400 });
          }
        }

        // Validate numeric settings
        for (const key of ["voting_duration_hours", "quorum", "approval_threshold", "proposer_min_points"]) {
          if (settings[key] !== undefined) {
            const num = parseInt(settings[key]);
            if (isNaN(num) || num < 0) {
              return NextResponse.json({ error: `${key} must be a non-negative number` }, { status: 400 });
            }
          }
        }

        // Save all settings
        for (const [key, value] of Object.entries(settings)) {
          await setSetting(key, String(value));
        }

        return NextResponse.json({ success: true });
      }

      // ===== EXECUTE PROPOSAL (admin marks as executed) =====
      case "execute_proposal": {
        const { adminPassword, proposalId } = body;
        if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== "doomhound2026") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const proposal = await db.daoProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (proposal.status !== "passed") {
          return NextResponse.json({ error: "Can only execute passed proposals" }, { status: 400 });
        }

        await db.daoProposal.update({
          where: { id: proposalId },
          data: { status: "executed" },
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["vote", "create_proposal", "cancel_proposal", "update_settings", "execute_proposal"],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("DAO API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== HELPER: Close a proposal and compute result =====
async function closeProposal(proposalId: string) {
  const proposal = await db.daoProposal.findUnique({
    where: { id: proposalId },
    include: { votes: true },
  });
  if (!proposal || proposal.status !== "active") return;

  const yesVotes = proposal.votes.filter((v) => v.vote === "yes");
  const noVotes = proposal.votes.filter((v) => v.vote === "no");
  const yesPower = yesVotes.reduce((sum, v) => sum + v.votingPower, 0);
  const noPower = noVotes.reduce((sum, v) => sum + v.votingPower, 0);
  const totalPower = yesPower + noPower;

  const totalVoters = proposal.votes.length;
  const meetsQuorum = totalVoters >= proposal.quorum;
  const approvalRate = totalPower > 0 ? (yesPower / totalPower) * 100 : 0;
  const passed = meetsQuorum && approvalRate >= proposal.approvalPct;

  const resultData = JSON.stringify({
    totalVoters,
    totalPower,
    yesVoters: yesVotes.length,
    noVoters: noVotes.length,
    yesPower,
    noPower,
    meetsQuorum,
    approvalRate: Math.round(approvalRate * 10) / 10,
    passed,
  });

  await db.daoProposal.update({
    where: { id: proposalId },
    data: {
      status: passed ? "passed" : "failed",
      resultData,
    },
  });
}
