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

      case "assign_referral": {
        // Manually assign a referral: set referredBy on newUser and give referrer 75pts
        const { newMemberHandle, referrerHandle } = body;
        if (!newMemberHandle || !referrerHandle) {
          return NextResponse.json({ error: "Both newMemberHandle and referrerHandle are required" }, { status: 400 });
        }

        const cleanNew = newMemberHandle.replace("@", "").trim().toLowerCase();
        const cleanRef = referrerHandle.replace("@", "").trim().toLowerCase();

        if (cleanNew === cleanRef) {
          return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
        }

        const newMember = await db.packMember.findUnique({ where: { handle: cleanNew } });
        if (!newMember) {
          return NextResponse.json({ error: `@${cleanNew} not found in the pack` }, { status: 404 });
        }

        const referrer = await db.packMember.findUnique({ where: { handle: cleanRef } });
        if (!referrer) {
          return NextResponse.json({ error: `@${cleanRef} not found in the pack` }, { status: 404 });
        }

        if (newMember.referredBy) {
          return NextResponse.json({ error: `@${cleanNew} already referred by @${newMember.referredBy}` }, { status: 400 });
        }

        // Award referrer 75pts
        const REFERRAL_POINTS = 75;
        await db.activityLog.create({
          data: {
            memberHandle: cleanRef,
            type: "referral",
            description: `Recruited @${cleanNew} to the pack! (admin assigned)`,
            points: REFERRAL_POINTS,
          },
        });

        // Update referrer points + rank
        const referrerActivities = await db.activityLog.findMany({ where: { memberHandle: cleanRef } });
        const referrerTotalPoints = referrerActivities.reduce((sum, a) => sum + a.points, 0);
        const RANK_TIERS = [
          { title: "Alpha Hound", minPoints: 1000 },
          { title: "Hellfire", minPoints: 500 },
          { title: "Shadow Fang", minPoints: 250 },
          { title: "Pup", minPoints: 100 },
          { title: "Lost Soul", minPoints: 0 },
        ];
        const referrerRank = RANK_TIERS.find(r => referrerTotalPoints >= r.minPoints)?.title || "Lost Soul";
        await db.packMember.update({
          where: { handle: cleanRef },
          data: { points: referrerTotalPoints, rank: referrerRank },
        });

        // Set referredBy on new member
        await db.packMember.update({
          where: { handle: cleanNew },
          data: { referredBy: cleanRef },
        });

        return NextResponse.json({
          success: true,
          newMember: cleanNew,
          referrer: cleanRef,
          pointsAwarded: REFERRAL_POINTS,
          referrerNewTotal: referrerTotalPoints,
        });
      }

      case "award_achievement": {
        const { handle: targetHandle, achievementId } = body;
        if (!targetHandle || !achievementId) {
          return NextResponse.json({ error: "handle and achievementId required" }, { status: 400 });
        }
        const cleanTarget = targetHandle.replace("@", "").trim().toLowerCase();
        const member = await db.packMember.findUnique({ where: { handle: cleanTarget } });
        if (!member) {
          return NextResponse.json({ error: `@${cleanTarget} not found` }, { status: 404 });
        }
        const ACHIEVEMENT_DEFS: Record<string, { name: string; emoji: string }> = {
          first_blood: { name: "First Blood", emoji: "🩸" },
          pack_starter: { name: "Pack Starter", emoji: "⛓️" },
          "7_day_streak": { name: "7-Day Streak", emoji: "🔥" },
          howler: { name: "Howler", emoji: "📢" },
          whale_spotter: { name: "Whale Spotter", emoji: "🐋" },
          trending_demon: { name: "Trending Demon", emoji: "📈" },
          og_hound: { name: "OG Hound", emoji: "👑" },
          meme_lord: { name: "Meme Lord", emoji: "🎨" },
        };
        const def = ACHIEVEMENT_DEFS[achievementId];
        if (!def) {
          return NextResponse.json({ error: "Unknown achievement: " + achievementId }, { status: 400 });
        }
        let achievements = JSON.parse(member.achievements || "[]");
        if (achievements.some((a: any) => a.id === achievementId)) {
          return NextResponse.json({ error: `@${cleanTarget} already has ${def.name}` }, { status: 400 });
        }
        achievements.push({ id: achievementId, name: def.name, emoji: def.emoji, awardedAt: new Date().toISOString() });
        await db.packMember.update({
          where: { handle: cleanTarget },
          data: { achievements: JSON.stringify(achievements) },
        });
        return NextResponse.json({ success: true, handle: cleanTarget, achievement: def.name });
      }

      case "fix_referral_points": {
        // Find all members who have referredBy set but referrer has no referral activity for them
        const allMembers = await db.packMember.findMany({
          select: { handle: true, referredBy: true },
        });

        const debug: string[] = [];
        const fixes: string[] = [];
        let totalPtsAwarded = 0;

        debug.push(`Total members: ${allMembers.length}`);
        debug.push(`Members with referredBy: ${allMembers.filter(m => m.referredBy).length}`);

        for (const member of allMembers) {
          if (!member.referredBy) continue;

          // Check if referrer already has ANY referral activity
          const existingReferralActivities = await db.activityLog.findMany({
            where: {
              memberHandle: member.referredBy,
              type: "referral",
            },
          });

          debug.push(`@${member.handle} referredBy=@${member.referredBy} → referrer has ${existingReferralActivities.length} referral activities`);

          // Check if any of these activities mention this specific member
          const alreadyHasActivity = existingReferralActivities.some(a =>
            a.description.toLowerCase().includes(member.handle.toLowerCase())
          );

          if (alreadyHasActivity) {
            debug.push(`  → ALREADY has activity for @${member.handle}, skipping`);
          }

          if (!alreadyHasActivity) {
            // Award the missing 75pts to the referrer
            const REFERRAL_PTS = 75;
            await db.activityLog.create({
              data: {
                memberHandle: member.referredBy,
                type: "referral",
                description: `Recruited @${member.handle} to the pack! (backfill)`,
                points: REFERRAL_PTS,
              },
            });

            // Recalculate referrer total points
            const referrerActivities = await db.activityLog.findMany({ where: { memberHandle: member.referredBy } });
            const totalPoints = referrerActivities.reduce((sum, a) => sum + a.points, 0);
            const RANK_TIERS = [
              { title: "Alpha Hound", minPoints: 1000 },
              { title: "Hellfire", minPoints: 500 },
              { title: "Shadow Fang", minPoints: 250 },
              { title: "Pup", minPoints: 100 },
              { title: "Lost Soul", minPoints: 0 },
            ];
            const rank = RANK_TIERS.find(r => totalPoints >= r.minPoints)?.title || "Lost Soul";
            await db.packMember.update({
              where: { handle: member.referredBy },
              data: { points: totalPoints, rank },
            });

            fixes.push(`@${member.referredBy} → +${REFERRAL_PTS}pts for recruiting @${member.handle}`);
            totalPtsAwarded += REFERRAL_PTS;
          }
        }

        return NextResponse.json({ success: true, fixes, totalPtsAwarded, fixCount: fixes.length, debug });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
