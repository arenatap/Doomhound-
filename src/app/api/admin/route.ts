import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ===== ADMIN PASSWORD =====
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "doomhound2026";

function verifyAdmin(request: NextRequest): boolean {
  const password = request.headers.get("X-Admin-Password");
  return password === ADMIN_PASSWORD;
}

function formatBalance(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)}M`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(1)}K`;
  return b.toFixed(0);
}

// ===== GET =====
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "pending_prizes": {
        const pending = await db.packMember.findMany({
          where: {
            pendingWinnings: { gt: 0 },
            prizeSent: false,
          },
          orderBy: { lastWheelSpin: "desc" },
          select: {
            handle: true,
            userName: true,
            profilePic: true,
            walletAddress: true,
            pendingWinnings: true,
            totalWheelSpins: true,
            totalWheelWinnings: true,
            lastWheelSpin: true,
          },
        });

        const totalPending = pending.reduce((sum, m) => sum + m.pendingWinnings, 0);
        const pendingCount = pending.length;

        return NextResponse.json({ pending, totalPending, pendingCount });
      }

      case "stats": {
        const totalSpinsResult = await db.packMember.aggregate({
          _sum: { totalWheelSpins: true },
        });
        const totalWonResult = await db.packMember.aggregate({
          _sum: { totalWheelWinnings: true },
        });
        const totalPendingResult = await db.packMember.aggregate({
          _sum: { pendingWinnings: true },
          where: { prizeSent: false },
        });
        const uniqueSpinners = await db.packMember.count({
          where: { totalWheelSpins: { gt: 0 } },
        });
        const pendingCount = await db.packMember.count({
          where: { pendingWinnings: { gt: 0 }, prizeSent: false },
        });

        const totalWon = totalWonResult._sum.totalWheelWinnings || 0;
        const totalPending = totalPendingResult._sum.pendingWinnings || 0;
        const totalSent = totalWon - totalPending;

        return NextResponse.json({
          totalSpins: totalSpinsResult._sum.totalWheelSpins || 0,
          totalWon,
          totalPending,
          totalSent,
          uniqueSpinners,
          pendingCount,
        });
      }

      case "recent": {
        const filter = searchParams.get("filter") || "all";
        const where: any = { type: "wheel_spin" };

        if (filter === "wins") where.description = { contains: "Won" };
        else if (filter === "nothing") where.description = { contains: "Nothing" };
        else if (filter === "respin") where.description = { contains: "RE-SPIN" };

        const activities = await db.activityLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            member: {
              select: {
                handle: true,
                userName: true,
                profilePic: true,
                walletAddress: true,
                pendingWinnings: true,
                prizeSent: true,
              },
            },
          },
        });

        return NextResponse.json({ activities });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["pending_prizes", "stats", "recent"],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== POST =====
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  // Verify password (can be in body for POST or header)
  const password = body.password || request.headers.get("X-Admin-Password");
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    switch (action) {
      case "verify": {
        return NextResponse.json({ valid: true });
      }

      case "mark_sent": {
        const { handle } = body;
        if (!handle) {
          return NextResponse.json({ error: "Handle required" }, { status: 400 });
        }

        const member = await db.packMember.findUnique({ where: { handle } });
        if (!member) {
          return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        if (member.pendingWinnings <= 0) {
          return NextResponse.json({ error: "No pending winnings for this member" }, { status: 400 });
        }

        const amount = member.pendingWinnings;

        await db.packMember.update({
          where: { handle },
          data: { prizeSent: true, pendingWinnings: 0 },
        });

        await db.activityLog.create({
          data: {
            memberHandle: handle,
            type: "wheel_spin",
            description: `Prize sent: ${formatBalance(amount)} $DOOMHOUND delivered! ✅`,
            points: 0,
          },
        });

        return NextResponse.json({ success: true, handle, amount });
      }

      case "mark_all_sent": {
        const pendingMembers = await db.packMember.findMany({
          where: { pendingWinnings: { gt: 0 }, prizeSent: false },
          select: { handle: true, pendingWinnings: true },
        });

        let count = 0;
        for (const m of pendingMembers) {
          await db.packMember.update({
            where: { handle: m.handle },
            data: { prizeSent: true, pendingWinnings: 0 },
          });
          await db.activityLog.create({
            data: {
              memberHandle: m.handle,
              type: "wheel_spin",
              description: `Prize sent: ${formatBalance(m.pendingWinnings)} $DOOMHOUND delivered! ✅`,
              points: 0,
            },
          });
          count++;
        }

        return NextResponse.json({ success: true, count });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
