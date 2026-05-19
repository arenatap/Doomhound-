import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";

// ===== SESSION AUTH =====
const SESSION_COOKIE = "doomhound_session";

async function getAuthenticatedHandle(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const member = await db.packMember.findUnique({
    where: { sessionToken: token },
    select: { handle: true },
  });
  return member?.handle || null;
}

// ===== STREAK MULTIPLIER LOGIC =====
const STREAK_TIERS = [
  { minDays: 30, multiplier: 2.0, label: "x2.0", color: "gold" },
  { minDays: 14, multiplier: 1.8, label: "x1.8", color: "red" },
  { minDays: 7, multiplier: 1.5, label: "x1.5", color: "orange" },
  { minDays: 3, multiplier: 1.2, label: "x1.2", color: "yellow" },
  { minDays: 0, multiplier: 1.0, label: "x1.0", color: "white" },
];

function getStreakMultiplier(streakDays: number): { multiplier: number; label: string; color: string } {
  const tier = STREAK_TIERS.find(t => streakDays >= t.minDays);
  return tier || STREAK_TIERS[STREAK_TIERS.length - 1];
}

// ===== REFERRAL CODE GENERATION =====
function generateReferralCode(handle: string): string {
  const hash = createHash("sha256").update(handle.toLowerCase() + "doomhound_pack_salt").digest("hex");
  return hash.substring(0, 8).toUpperCase();
}

// ===== DEFAULT MISSIONS =====
const DEFAULT_MISSIONS = [
  { missionId: "M01", name: "Retweet Ufficiale", description: "Retweet di un post ufficiale @DoomhoundAVAX", points: 2, cooldownHours: 24, maxLifetime: null },
  { missionId: "M02", name: "Tag 3 Amici", description: "Tagga 3 utenti reali sotto un post ufficiale", points: 3, cooldownHours: 48, maxLifetime: 10 },
  { missionId: "M03", name: "Crea un Meme", description: "Crea e posta un meme $DOOMHOUND con hashtag ufficiale", points: 5, cooldownHours: 72, maxLifetime: 20 },
  { missionId: "M04", name: "Discord Attivo", description: "Invia almeno 10 messaggi in un canale ufficiale Discord", points: 3, cooldownHours: 24, maxLifetime: null },
  { missionId: "M05", name: "Invita su Discord", description: "Un nuovo utente entra nel Discord tramite il tuo invito", points: 2, cooldownHours: 0, maxLifetime: 50 },
];

async function ensureMissionsExist() {
  for (const mission of DEFAULT_MISSIONS) {
    await db.socialMission.upsert({
      where: { missionId: mission.missionId },
      update: {},
      create: mission,
    });
  }
}

// ===== POINTS AWARD HELPER =====
async function awardPoints(handle: string, type: string, description: string, basePoints: number, multiplier: number) {
  const finalPoints = Math.ceil(basePoints * multiplier);
  await db.activityLog.create({
    data: { memberHandle: handle, type, description, points: finalPoints },
  });
  await db.packMember.update({
    where: { handle },
    data: { points: { increment: finalPoints } },
  });
  return finalPoints;
}

// ===== TIMEZONE HELPERS =====
const PACK_TZ = "Europe/Rome";

function getDateInTz(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACK_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const year = parts.find(p => p.type === "year")!.value;
  const month = parts.find(p => p.type === "month")!.value;
  const day = parts.find(p => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

// ===== GET HANDLER =====
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "missions": {
        await ensureMissionsExist();
        const missions = await db.socialMission.findMany({
          where: { isActive: true },
          orderBy: { missionId: "asc" },
        });
        return NextResponse.json({ missions });
      }

      case "init_missions": {
        await ensureMissionsExist();
        const missions = await db.socialMission.findMany({ orderBy: { missionId: "asc" } });
        return NextResponse.json({ success: true, missions });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["missions", "init_missions"],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Engagement API GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== POST HANDLER =====
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, handle } = body;

  try {
    // ===== MISSIONS: complete_mission =====
    if (action === "complete_mission") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();

      // Auth check
      const authHandle = await getAuthenticatedHandle(request);
      if (!authHandle || authHandle !== cleanHandle) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      const { missionId, proofUrl } = body;
      if (!missionId) return NextResponse.json({ error: "missionId is required" }, { status: 400 });

      await ensureMissionsExist();

      const mission = await db.socialMission.findUnique({ where: { missionId } });
      if (!mission || !mission.isActive) {
        return NextResponse.json({ error: "Mission not found or inactive" }, { status: 404 });
      }

      // Check max lifetime
      if (mission.maxLifetime !== null) {
        const completionCount = await db.missionCompletion.count({
          where: { memberHandle: cleanHandle, missionId },
        });
        if (completionCount >= mission.maxLifetime) {
          return NextResponse.json({ error: "Max completions reached for this mission" }, { status: 400 });
        }
      }

      // Check cooldown
      if (mission.cooldownHours > 0) {
        const lastCompletion = await db.missionCompletion.findFirst({
          where: { memberHandle: cleanHandle, missionId },
          orderBy: { completedAt: "desc" },
        });
        if (lastCompletion) {
          const cooldownMs = mission.cooldownHours * 60 * 60 * 1000;
          const timeSince = Date.now() - new Date(lastCompletion.completedAt).getTime();
          if (timeSince < cooldownMs) {
            const hoursLeft = ((cooldownMs - timeSince) / (1000 * 60 * 60)).toFixed(1);
            return NextResponse.json({ error: `Cooldown active. ${hoursLeft}h remaining.`, cooldown: true }, { status: 400 });
          }
        }
      }

      // Get streak multiplier
      const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
      if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

      const { multiplier } = getStreakMultiplier(member.streakCount);
      const pointsAwarded = Math.ceil(mission.points * multiplier);

      // Create completion record
      const completion = await db.missionCompletion.create({
        data: {
          memberHandle: cleanHandle,
          missionId,
          proofUrl: proofUrl || null,
          pointsAwarded,
        },
      });

      // Award points
      const totalPoints = await awardPoints(cleanHandle, "social_mission", `Completed mission: ${mission.name}`, mission.points, multiplier);

      // Register daily activity (for streak)
      const todayStr = getDateInTz(new Date());
      try {
        await db.dailyActivity.create({
          data: { memberHandle: cleanHandle, activityDate: new Date(todayStr + "T00:00:00Z"), actionType: "mission" },
        });
      } catch {
        // Unique constraint = already registered today, that's fine
      }

      return NextResponse.json({ success: true, completion, pointsAwarded: totalPoints, multiplier });
    }

    // ===== MISSIONS: mission_status =====
    if (action === "mission_status") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();

      await ensureMissionsExist();

      const missions = await db.socialMission.findMany({
        where: { isActive: true },
        orderBy: { missionId: "asc" },
        include: {
          completions: {
            where: { memberHandle: cleanHandle },
            orderBy: { completedAt: "desc" },
          },
        },
      });

      const missionStatus = missions.map(m => {
        const completions = m.completions;
        const lastCompletion = completions[0] || null;
        let cooldownRemaining = 0;
        if (m.cooldownHours > 0 && lastCompletion) {
          const cooldownMs = m.cooldownHours * 60 * 60 * 1000;
          const timeSince = Date.now() - new Date(lastCompletion.completedAt).getTime();
          cooldownRemaining = Math.max(0, cooldownMs - timeSince);
        }
        return {
          missionId: m.missionId,
          name: m.name,
          description: m.description,
          points: m.points,
          cooldownHours: m.cooldownHours,
          maxLifetime: m.maxLifetime,
          completionsCount: completions.length,
          maxReached: m.maxLifetime !== null ? completions.length >= m.maxLifetime : false,
          cooldownRemaining,
          onCooldown: cooldownRemaining > 0,
          lastCompletedAt: lastCompletion?.completedAt || null,
        };
      });

      return NextResponse.json({ missions: missionStatus });
    }

    // ===== REFERRAL: get_referral_code =====
    if (action === "get_referral_code") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();

      const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
      if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

      let code = member.referralCode;
      if (!code) {
        code = generateReferralCode(cleanHandle);
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: { referralCode: code },
        });
      }

      return NextResponse.json({ referralCode: code, referralLink: `https://doomhound.onrender.com/pack?ref=${code}` });
    }

    // ===== REFERRAL: register_referral =====
    if (action === "register_referral") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();
      const { referralCode } = body;
      if (!referralCode) return NextResponse.json({ error: "referralCode is required" }, { status: 400 });

      // Find referrer by code
      const referrer = await db.packMember.findFirst({
        where: { referralCode: referralCode.toUpperCase() },
      });
      if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });

      // Self-referral check
      if (referrer.handle === cleanHandle) {
        return NextResponse.json({ error: "Cannot use own referral code" }, { status: 400 });
      }

      // Check if already referred
      const existingReferral = await db.referralRecord.findUnique({
        where: { referrerHandle_refereeHandle: { referrerHandle: referrer.handle, refereeHandle: cleanHandle } },
      });
      if (existingReferral) {
        return NextResponse.json({ error: "Referral already registered", alreadyRegistered: true });
      }

      // Check if referee already has a referrer (via referredBy field)
      const referee = await db.packMember.findUnique({ where: { handle: cleanHandle } });
      if (!referee) return NextResponse.json({ error: "Member not found" }, { status: 404 });
      if (referee.referredBy && referee.referredBy !== referrer.handle) {
        return NextResponse.json({ error: "Already referred by someone else" }, { status: 400 });
      }

      // Check referrer's active referral count (max 50 for points)
      const referrerActiveCount = await db.referralRecord.count({
        where: { referrerHandle: referrer.handle, registrationPointsGiven: true },
      });
      const canAwardPoints = referrerActiveCount < 50;

      // Create referral record
      const record = await db.referralRecord.create({
        data: {
          referrerHandle: referrer.handle,
          refereeHandle: cleanHandle,
          registrationPointsGiven: canAwardPoints,
        },
      });

      // Set referredBy on PackMember
      await db.packMember.update({
        where: { handle: cleanHandle },
        data: { referredBy: referrer.handle },
      });

      // Award points
      if (canAwardPoints) {
        // Get streak multiplier for referrer
        const { multiplier } = getStreakMultiplier(referrer.streakCount);
        const refPoints = await awardPoints(referrer.handle, "referral", `Recruited @${cleanHandle} via referral system!`, 5, multiplier);
        
        // +3 to referee
        const refereeMultiplier = getStreakMultiplier(referee.streakCount).multiplier;
        const refPoints2 = await awardPoints(cleanHandle, "referral_welcome", `Joined via @${referrer.handle}'s referral!`, 3, refereeMultiplier);

        // Increment referral count
        await db.packMember.update({
          where: { handle: referrer.handle },
          data: { referralCount: { increment: 1 } },
        });

        // Register daily activity for both
        const todayStr = getDateInTz(new Date());
        const todayDate = new Date(todayStr + "T00:00:00Z");
        try {
          await db.dailyActivity.create({ data: { memberHandle: referrer.handle, activityDate: todayDate, actionType: "referral" } });
        } catch { /* already exists */ }

        return NextResponse.json({ success: true, record, referrerPoints: refPoints, refereePoints: refPoints2 });
      }

      return NextResponse.json({ success: true, record, pointsAwarded: false, message: "Referrer reached 50 referral cap" });
    }

    // ===== REFERRAL: stake_bonus_referral =====
    if (action === "stake_bonus_referral") {
      const { refereeHandle } = body;
      if (!refereeHandle) return NextResponse.json({ error: "refereeHandle is required" }, { status: 400 });
      const cleanReferee = refereeHandle.replace("@", "").trim().toLowerCase();

      // Auth check
      const authHandle = await getAuthenticatedHandle(request);
      if (!authHandle) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

      // Find the referral record
      const record = await db.referralRecord.findFirst({
        where: { refereeHandle: cleanReferee },
      });
      if (!record) return NextResponse.json({ error: "No referral record found" }, { status: 404 });
      if (record.stakeBonusAwarded) return NextResponse.json({ error: "Stake bonus already awarded" }, { status: 400 });

      // Check if referee actually has a staking tier
      const referee = await db.packMember.findUnique({ where: { handle: cleanReferee } });
      if (!referee || referee.stakingTier === "none") {
        return NextResponse.json({ error: "Referee is not staking" }, { status: 400 });
      }

      // Award +10 to referrer with streak multiplier
      const referrer = await db.packMember.findUnique({ where: { handle: record.referrerHandle } });
      if (!referrer) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

      const { multiplier } = getStreakMultiplier(referrer.streakCount);
      const pointsAwarded = await awardPoints(record.referrerHandle, "referral_stake_bonus", `@${cleanReferee} started staking! Referral bonus!`, 10, multiplier);

      // Mark as awarded
      await db.referralRecord.update({
        where: { id: record.id },
        data: { stakeBonusAwarded: true },
      });

      return NextResponse.json({ success: true, pointsAwarded });
    }

    // ===== REFERRAL: referral_stats =====
    if (action === "referral_stats") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();

      const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
      if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

      // Generate code if missing
      let code = member.referralCode;
      if (!code) {
        code = generateReferralCode(cleanHandle);
        await db.packMember.update({ where: { handle: cleanHandle }, data: { referralCode: code } });
      }

      const referrals = await db.referralRecord.findMany({
        where: { referrerHandle: cleanHandle },
        orderBy: { registeredAt: "desc" },
        include: {
          referee: { select: { handle: true, userName: true, profilePic: true, stakingTier: true } },
        },
      });

      const referralPoints = await db.activityLog.aggregate({
        where: { memberHandle: cleanHandle, type: { in: ["referral", "referral_stake_bonus"] } },
        _sum: { points: true },
      });

      return NextResponse.json({
        referralCode: code,
        referralLink: `https://doomhound.onrender.com/pack?ref=${code}`,
        totalReferrals: referrals.length,
        activeReferralsForPoints: member.referralCount,
        maxReferrals: 50,
        totalReferralPoints: referralPoints._sum.points || 0,
        referees: referrals.map(r => ({
          handle: r.refereeHandle,
          userName: r.referee?.userName || r.refereeHandle,
          profilePic: r.referee?.profilePic || "",
          stakingTier: r.referee?.stakingTier || "none",
          registeredAt: r.registeredAt,
          stakeBonusAwarded: r.stakeBonusAwarded,
        })),
      });
    }

    // ===== STREAK: streak_status =====
    if (action === "streak_status") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();

      const member = await db.packMember.findUnique({
        where: { handle: cleanHandle },
        include: {
          streakFreezes: { orderBy: { targetDate: "desc" } },
          dailyActivities: { orderBy: { activityDate: "desc" }, take: 7 },
        },
      });
      if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

      const { multiplier, label, color } = getStreakMultiplier(member.streakCount);

      // Auto-award freezes: 1 per 30 days of streak, max 2 accumulated
      let updatedFreezeAvailable = member.freezeAvailable;
      const earnedFreezes = Math.floor(member.streakCount / 30);
      const totalEarned = earnedFreezes + member.freezeUsedTotal;
      const shouldBeAvailable = Math.min(2, Math.max(0, totalEarned - member.freezeUsedTotal));
      if (shouldBeAvailable > member.freezeAvailable) {
        updatedFreezeAvailable = shouldBeAvailable;
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: { freezeAvailable: updatedFreezeAvailable },
        });
      }

      // Update streak multiplier on member
      if (member.streakMultiplier !== multiplier) {
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: { streakMultiplier: multiplier },
        });
      }

      // Next milestone
      const nextTier = STREAK_TIERS.find(t => t.minDays > member.streakCount);
      const nextMilestone = nextTier ? nextTier.minDays : null;
      const progressToNext = nextMilestone ? (member.streakCount / nextMilestone) * 100 : 100;

      // Last 7 days activity
      const todayStr = getDateInTz(new Date());
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getDateInTz(d);
        const hasActivity = member.dailyActivities.some(
          a => getDateInTz(new Date(a.activityDate)) === dateStr
        );
        const hasFreeze = member.streakFreezes.some(
          f => getDateInTz(new Date(f.targetDate)) === dateStr
        );
        last7Days.push({ date: dateStr, active: hasActivity, frozen: hasFreeze });
      }

      return NextResponse.json({
        streakDays: member.streakCount,
        multiplier,
        multiplierLabel: label,
        multiplierColor: color,
        freezeAvailable: updatedFreezeAvailable,
        freezeUsedTotal: member.freezeUsedTotal,
        maxFreezes: 2,
        nextMilestone,
        progressToNext,
        last7Days,
        lastStreakAt: member.lastStreakAt,
      });
    }

    // ===== STREAK: daily_claim =====
    if (action === "daily_claim") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();

      const authHandle = await getAuthenticatedHandle(request);
      if (!authHandle || authHandle !== cleanHandle) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
      if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

      // Check if already claimed today
      const todayStr = getDateInTz(new Date());
      const todayDate = new Date(todayStr + "T00:00:00Z");
      const existingClaim = await db.dailyActivity.findUnique({
        where: { memberHandle_activityDate_actionType: { memberHandle: cleanHandle, activityDate: todayDate, actionType: "claim" } },
      });
      if (existingClaim) {
        return NextResponse.json({ error: "Already claimed today" }, { status: 400 });
      }

      // Register daily activity
      await db.dailyActivity.create({
        data: { memberHandle: cleanHandle, activityDate: todayDate, actionType: "claim" },
      });

      // Award +1 base point with streak multiplier
      const { multiplier } = getStreakMultiplier(member.streakCount);
      const pointsAwarded = Math.ceil(1 * multiplier);

      await db.activityLog.create({
        data: { memberHandle: cleanHandle, type: "daily_claim", description: `Daily streak claim (${multiplier}x multiplier)`, points: pointsAwarded },
      });
      await db.packMember.update({
        where: { handle: cleanHandle },
        data: { points: { increment: pointsAwarded }, streakMultiplier: multiplier },
      });

      return NextResponse.json({ success: true, pointsAwarded, multiplier });
    }

    // ===== STREAK: activate_freeze =====
    if (action === "activate_freeze") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();

      const authHandle = await getAuthenticatedHandle(request);
      if (!authHandle || authHandle !== cleanHandle) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      const { targetDate } = body;
      if (!targetDate) return NextResponse.json({ error: "targetDate is required" }, { status: 400 });

      const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
      if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

      if (member.freezeAvailable <= 0) {
        return NextResponse.json({ error: "No freezes available" }, { status: 400 });
      }

      const target = new Date(targetDate + "T00:00:00Z");
      if (target <= new Date()) {
        return NextResponse.json({ error: "Target date must be in the future" }, { status: 400 });
      }

      // Check if already frozen for this date
      const existingFreeze = await db.streakFreeze.findUnique({
        where: { memberHandle_targetDate: { memberHandle: cleanHandle, targetDate: target } },
      });
      if (existingFreeze) {
        return NextResponse.json({ error: "Already frozen for this date" }, { status: 400 });
      }

      // Activate freeze
      await db.streakFreeze.create({
        data: { memberHandle: cleanHandle, targetDate: target },
      });

      await db.packMember.update({
        where: { handle: cleanHandle },
        data: {
          freezeAvailable: { decrement: 1 },
          freezeUsedTotal: { increment: 1 },
        },
      });

      return NextResponse.json({ success: true, freezeActivatedFor: targetDate, freezesRemaining: member.freezeAvailable - 1 });
    }

    return NextResponse.json({
      error: "Unknown action",
      availableActions: [
        "complete_mission", "mission_status",
        "get_referral_code", "register_referral", "stake_bonus_referral", "referral_stats",
        "streak_status", "daily_claim", "activate_freeze",
      ],
    }, { status: 400 });

  } catch (error: any) {
    console.error("Engagement API POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
