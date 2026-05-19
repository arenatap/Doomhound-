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

// ===== ARENA API =====
const ARENA_API_BASE = "https://api.starsarena.com";
const ARENA_API_KEY = process.env.ARENA_API_KEY;
const DOOMHOUND_COMMUNITY_ID = "4b326b82-46e7-4ac7-a34b-8e8d00913f0b";

const arenaCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60_000;

async function arenaFetch(endpoint: string, cacheTtl = CACHE_TTL) {
  const cacheKey = endpoint;
  const cached = arenaCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) return cached.data;

  const res = await fetch(`${ARENA_API_BASE}${endpoint}`, {
    headers: { "X-API-Key": ARENA_API_KEY || "", "Content-Type": "application/json" },
  });
  if (!res.ok) {
    if (res.status === 429 && cached) return cached.data;
    const text = await res.text().catch(() => "");
    throw new Error(`Arena API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  arenaCache.set(cacheKey, { data, expires: Date.now() + cacheTtl });
  return data;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
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
// All missions require Arena post URL as proof and are verified via The Arena API.
const DEFAULT_MISSIONS = [
  { missionId: "M01", name: "Community Post", description: "Post about $DOOMHOUND in the Arena community", points: 2, cooldownHours: 2, maxLifetime: null },
  { missionId: "M02", name: "Tag 3 Pack Members", description: "Tag 3 real users in an Arena post about $DOOMHOUND", points: 3, cooldownHours: 2, maxLifetime: 10 },
  { missionId: "M03", name: "Create a Meme", description: "Create and post a $DOOMHOUND meme on Arena with the official hashtag", points: 5, cooldownHours: 2, maxLifetime: 20 },
  { missionId: "M04", name: "Engage with Official", description: "Like and reply to an official $DOOMHOUND Arena post", points: 3, cooldownHours: 2, maxLifetime: null },
  { missionId: "M05", name: "Share Referral Link", description: "Share your $DOOMHOUND referral link on Arena", points: 2, cooldownHours: 2, maxLifetime: 50 },
];

async function ensureMissionsExist() {
  for (const mission of DEFAULT_MISSIONS) {
    await db.socialMission.upsert({
      where: { missionId: mission.missionId },
      update: { name: mission.name, description: mission.description, points: mission.points, cooldownHours: mission.cooldownHours, maxLifetime: mission.maxLifetime },
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

// ===== ARENA POST VERIFICATION =====
// Verifies that an Arena post URL is real, belongs to the user, and is $DOOMHOUND-related.
// Returns the verified thread object or null.
async function verifyArenaPost(proofUrl: string, userHandle: string): Promise<{
  verified: boolean;
  thread?: any;
  reason?: string;
}> {
  const trimmedUrl = proofUrl.trim();

  // Must be from arena.social
  if (!trimmedUrl.includes("arena.social")) {
    return { verified: false, reason: "Invalid URL. Must be a link from arena.social" };
  }

  // Extract thread ID from Arena URL patterns
  const threadIdMatch = trimmedUrl.match(
    /arena\.social\/(?:thread\/|(?:[^/]+\/)?(?:status\/)?)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)/i
  );
  const threadId = threadIdMatch ? threadIdMatch[1] : null;

  if (!threadId) {
    return { verified: false, reason: "Could not extract thread ID from URL. Make sure it's a valid Arena post link." };
  }

  // Strategy 1: Fetch user's Arena profile and search their threads
  try {
    const arenaProfile = await arenaFetch(
      `/agents/user/handle?handle=${encodeURIComponent(userHandle)}`
    );
    const arenaUserId = arenaProfile.user?.id;

    if (arenaUserId) {
      const userThreadsData = await arenaFetch(
        `/agents/threads/feed/user?userId=${arenaUserId}&page=1&pageSize=25`
      );
      const userThreads = userThreadsData.threads || [];
      const foundThread = userThreads.find((t: any) => t.id === threadId);

      if (foundThread) {
        // Verify ownership
        const threadHandle = (foundThread.userHandle || foundThread.user?.handle || "").toLowerCase();
        if (threadHandle !== userHandle) {
          return { verified: false, reason: "This post doesn't belong to your Arena account. Submit your own post!" };
        }
        return { verified: true, thread: foundThread };
      }
    }
  } catch (err: any) {
    console.log("User thread feed lookup failed:", err?.message || err);
  }

  // Strategy 2: Search DOOMHOUND community feed for this thread
  try {
    const communityFeed = await arenaFetch(
      `/agents/threads/feed/community?communityId=${DOOMHOUND_COMMUNITY_ID}&page=1&pageSize=50`
    );
    const communityThreads = communityFeed.threads || [];
    const foundThread = communityThreads.find((t: any) => t.id === threadId);

    if (foundThread) {
      const threadHandle = (foundThread.userHandle || foundThread.user?.handle || "").toLowerCase();
      if (threadHandle !== userHandle) {
        return { verified: false, reason: "This post doesn't belong to your Arena account." };
      }
      return { verified: true, thread: foundThread };
    }
  } catch (err: any) {
    console.log("Community feed lookup failed:", err?.message || err);
  }

  return { verified: false, reason: "Post not found on Arena. Make sure the URL is correct and the post is public." };
}

// Check if a thread is $DOOMHOUND related
function isDoomhoundRelated(thread: any): boolean {
  const content = stripHtml(thread.content || "").toLowerCase();
  const communityTicker = (thread.community?.ticker || "").toLowerCase();
  const communityId = thread.communityId;

  return (
    content.includes("doomhound") ||
    content.includes("$doomhound") ||
    content.includes("doom") ||
    communityTicker === "doomhound" ||
    communityId === DOOMHOUND_COMMUNITY_ID
  );
}

// Check if a thread is in the DOOMHOUND community
function isInDoomhoundCommunity(thread: any): boolean {
  return thread.communityId === DOOMHOUND_COMMUNITY_ID ||
    (thread.community?.ticker || "").toLowerCase() === "doomhound";
}

// Count @mentions in a post (for Tag mission)
function countMentions(thread: any): number {
  const content = stripHtml(thread.content || "");
  // Match @username patterns
  const mentions = content.match(/@([a-zA-Z0-9_]+)/g);
  return mentions ? mentions.length : 0;
}

// Check if thread contains a referral link (doomhound.onrender.com)
function containsReferralLink(thread: any): boolean {
  const content = stripHtml(thread.content || "").toLowerCase();
  return content.includes("doomhound.onrender.com") || content.includes("doomhound.fun");
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
    // ===== MISSIONS: complete_mission (ARENA API VERIFIED) =====
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

      // ===== ARENA API VERIFICATION =====
      // All missions require an Arena post URL as proof
      if (!proofUrl || !proofUrl.trim()) {
        return NextResponse.json({
          error: "Arena post URL required! Paste the link to your Arena post as proof.",
        }, { status: 400 });
      }

      // Verify the post via Arena API
      const verification = await verifyArenaPost(proofUrl, cleanHandle);
      if (!verification.verified) {
        return NextResponse.json({
          error: verification.reason || "Could not verify your Arena post. Make sure the URL is correct.",
        }, { status: 400 });
      }

      const thread = verification.thread;

      // Check for duplicate proof (same thread already used for this mission)
      const threadId = thread?.id || "";
      if (threadId) {
        const existingProof = await db.missionCompletion.findFirst({
          where: {
            memberHandle: cleanHandle,
            missionId,
            proofUrl: { contains: threadId },
          },
        });
        if (existingProof) {
          return NextResponse.json({ error: "This post has already been used for this mission!" }, { status: 400 });
        }
      }

      // ===== MISSION-SPECIFIC VERIFICATION =====
      switch (missionId) {
        case "M01": {
          // Community Post: must be in the DOOMHOUND community
          if (!isInDoomhoundCommunity(thread) && !isDoomhoundRelated(thread)) {
            return NextResponse.json({
              error: "This post is not in the $DOOMHOUND community or doesn't mention $DOOMHOUND. Post in the community on Arena!",
            }, { status: 400 });
          }
          break;
        }

        case "M02": {
          // Tag 3 Pack Members: post must mention 3+ users AND be $DOOMHOUND related
          if (!isDoomhoundRelated(thread)) {
            return NextResponse.json({
              error: "This post doesn't mention $DOOMHOUND. Tag users in a $DOOMHOUND post!",
            }, { status: 400 });
          }
          const mentionCount = countMentions(thread);
          if (mentionCount < 3) {
            return NextResponse.json({
              error: `Only ${mentionCount} user(s) tagged. You need to tag at least 3 users in the post!`,
            }, { status: 400 });
          }
          break;
        }

        case "M03": {
          // Create a Meme: must be $DOOMHOUND related (community post or mentions $DOOMHOUND)
          if (!isDoomhoundRelated(thread)) {
            return NextResponse.json({
              error: "This post doesn't mention $DOOMHOUND. Create a meme about $DOOMHOUND on Arena!",
            }, { status: 400 });
          }
          break;
        }

        case "M04": {
          // Engage with Official: must be a reply/quote to an official DOOMHOUND post
          // Check if the post is a reply (has parentThreadId or quotedThread)
          // OR if it's in the DOOMHOUND community (engaging with official content)
          const isReply = !!(thread.parentThreadId || thread.quotedThread || thread.replyTo);
          const isCommunityPost = isInDoomhoundCommunity(thread);
          if (!isReply && !isCommunityPost) {
            // Fallback: check if content mentions the official account or is a reply
            const content = stripHtml(thread.content || "").toLowerCase();
            const engagesOfficial = content.includes("@doomhoundavax") || content.includes("doomhoundavax");
            if (!engagesOfficial) {
              return NextResponse.json({
                error: "This post doesn't engage with the official $DOOMHOUND account. Reply to or quote an official post!",
              }, { status: 400 });
            }
          }
          if (!isDoomhoundRelated(thread) && !isCommunityPost) {
            return NextResponse.json({
              error: "This post isn't $DOOMHOUND related. Engage with official $DOOMHOUND content!",
            }, { status: 400 });
          }
          break;
        }

        case "M05": {
          // Share Referral Link: post must contain a doomhound link
          if (!containsReferralLink(thread) && !isDoomhoundRelated(thread)) {
            return NextResponse.json({
              error: "This post doesn't contain your $DOOMHOUND referral link. Share your doomhound.onrender.com link on Arena!",
            }, { status: 400 });
          }
          break;
        }

        default: {
          // Generic: just needs to be $DOOMHOUND related
          if (!isDoomhoundRelated(thread)) {
            return NextResponse.json({
              error: "This post isn't $DOOMHOUND related.",
            }, { status: 400 });
          }
          break;
        }
      }

      // ===== ALL VERIFIED — AWARD POINTS =====
      const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
      if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

      const { multiplier } = getStreakMultiplier(member.streakCount);
      const pointsAwarded = Math.ceil(mission.points * multiplier);

      // Create completion record with proof URL
      const completion = await db.missionCompletion.create({
        data: {
          memberHandle: cleanHandle,
          missionId,
          proofUrl: proofUrl.trim(),
          pointsAwarded,
        },
      });

      // Award points
      const totalPoints = await awardPoints(
        cleanHandle,
        "social_mission",
        `Completed mission: ${mission.name} [arena:${threadId}]`,
        mission.points,
        multiplier
      );

      // Register daily activity (for streak)
      const todayStr = getDateInTz(new Date());
      try {
        await db.dailyActivity.create({
          data: { memberHandle: cleanHandle, activityDate: new Date(todayStr + "T00:00:00Z"), actionType: "mission" },
        });
      } catch {
        // Unique constraint = already registered today, that's fine
      }

      return NextResponse.json({ success: true, completion, pointsAwarded: totalPoints, multiplier, verified: true });
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
          requiresProof: true, // All missions require Arena post URL
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

      return NextResponse.json({ referralCode: code, referralLink: `https://doomhound.onrender.com/?ref=${code}` });
    }

    // ===== REFERRAL: register_referral =====
    if (action === "register_referral") {
      if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();
      const { referralCode } = body;
      if (!referralCode) return NextResponse.json({ error: "referralCode is required" }, { status: 400 });

      const referrer = await db.packMember.findFirst({
        where: { referralCode: referralCode.toUpperCase() },
      });
      if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });

      if (referrer.handle === cleanHandle) {
        return NextResponse.json({ error: "Cannot use own referral code" }, { status: 400 });
      }

      const existingReferral = await db.referralRecord.findUnique({
        where: { referrerHandle_refereeHandle: { referrerHandle: referrer.handle, refereeHandle: cleanHandle } },
      });
      if (existingReferral) {
        return NextResponse.json({ error: "Referral already registered", alreadyRegistered: true });
      }

      const referee = await db.packMember.findUnique({ where: { handle: cleanHandle } });
      if (!referee) return NextResponse.json({ error: "Member not found" }, { status: 404 });
      if (referee.referredBy && referee.referredBy !== referrer.handle) {
        return NextResponse.json({ error: "Already referred by someone else" }, { status: 400 });
      }

      const referrerActiveCount = await db.referralRecord.count({
        where: { referrerHandle: referrer.handle, registrationPointsGiven: true },
      });
      const canAwardPoints = referrerActiveCount < 50;

      const record = await db.referralRecord.create({
        data: {
          referrerHandle: referrer.handle,
          refereeHandle: cleanHandle,
          registrationPointsGiven: canAwardPoints,
        },
      });

      await db.packMember.update({
        where: { handle: cleanHandle },
        data: { referredBy: referrer.handle },
      });

      if (canAwardPoints) {
        const { multiplier } = getStreakMultiplier(referrer.streakCount);
        const refPoints = await awardPoints(referrer.handle, "referral", `Recruited @${cleanHandle} via referral system!`, 5, multiplier);

        const refereeMultiplier = getStreakMultiplier(referee.streakCount).multiplier;
        const refPoints2 = await awardPoints(cleanHandle, "referral_welcome", `Joined via @${referrer.handle}'s referral!`, 3, refereeMultiplier);

        await db.packMember.update({
          where: { handle: referrer.handle },
          data: { referralCount: { increment: 1 } },
        });

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

      const authHandle = await getAuthenticatedHandle(request);
      if (!authHandle) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

      const record = await db.referralRecord.findFirst({
        where: { refereeHandle: cleanReferee },
      });
      if (!record) return NextResponse.json({ error: "No referral record found" }, { status: 404 });
      if (record.stakeBonusAwarded) return NextResponse.json({ error: "Stake bonus already awarded" }, { status: 400 });

      const referee = await db.packMember.findUnique({ where: { handle: cleanReferee } });
      if (!referee || referee.stakingTier === "none") {
        return NextResponse.json({ error: "Referee is not staking" }, { status: 400 });
      }

      const referrer = await db.packMember.findUnique({ where: { handle: record.referrerHandle } });
      if (!referrer) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

      const { multiplier } = getStreakMultiplier(referrer.streakCount);
      const pointsAwarded = await awardPoints(record.referrerHandle, "referral_stake_bonus", `@${cleanReferee} started staking! Referral bonus!`, 10, multiplier);

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
        referralLink: `https://doomhound.onrender.com/?ref=${code}`,
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

      if (member.streakMultiplier !== multiplier) {
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: { streakMultiplier: multiplier },
        });
      }

      const nextTier = STREAK_TIERS.find(t => t.minDays > member.streakCount);
      const nextMilestone = nextTier ? nextTier.minDays : null;
      const progressToNext = nextMilestone ? (member.streakCount / nextMilestone) * 100 : 100;

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

      const todayStr = getDateInTz(new Date());
      const todayDate = new Date(todayStr + "T00:00:00Z");
      const existingClaim = await db.dailyActivity.findUnique({
        where: { memberHandle_activityDate_actionType: { memberHandle: cleanHandle, activityDate: todayDate, actionType: "claim" } },
      });
      if (existingClaim) {
        return NextResponse.json({ error: "Already claimed today" }, { status: 400 });
      }

      await db.dailyActivity.create({
        data: { memberHandle: cleanHandle, activityDate: todayDate, actionType: "claim" },
      });

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

      const existingFreeze = await db.streakFreeze.findUnique({
        where: { memberHandle_targetDate: { memberHandle: cleanHandle, targetDate: target } },
      });
      if (existingFreeze) {
        return NextResponse.json({ error: "Already frozen for this date" }, { status: 400 });
      }

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
