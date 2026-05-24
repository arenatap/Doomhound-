import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID, randomInt } from "crypto";

// ===== POINTS CONFIG =====
const POINTS_CONFIG: Record<string, { value: number; label: string }> = {
  register: { value: 100, label: "Joined The Pack" },
  daily_checkin: { value: 15, label: "Daily Summon" },
  arena_post: { value: 5, label: "Arena Post" },           // Per new thread detected
  arena_follower: { value: 2, label: "New Follower" },      // Per new follower gained
  trending_mention: { value: 100, label: "Trending Howl" }, // Post in trending mentioning $DOOMHOUND
  meme_generated: { value: 30, label: "Meme Forge" },
  referral: { value: 75, label: "Pack Recruit" },
  doomhound_holder: { value: 0, label: "HODL Bonus" },     // Dynamic
  wheel_spin: { value: 0, label: "Wheel of Doom" },
};

// ===== RANK SYSTEM =====
const RANK_TIERS = [
  { title: "Alpha Hound", minPoints: 1000 },
  { title: "Hellfire", minPoints: 500 },
  { title: "Shadow Fang", minPoints: 250 },
  { title: "Pup", minPoints: 100 },
  { title: "Lost Soul", minPoints: 0 },
];

// ===== $DOOMHOUND BALANCE TIERS =====
const BALANCE_TIERS = [
  { minBalance: 50_000_000, bonus: 500, label: "Whale of Hell" },
  { minBalance: 10_000_000, bonus: 250, label: "Demon Hoarder" },
  { minBalance: 5_000_000, bonus: 150, label: "Pack Veteran" },
  { minBalance: 1_000_000, bonus: 75, label: "Loyal Hound" },
  { minBalance: 100_000, bonus: 25, label: "Pup Holder" },
];

// ===== STAKING BOOST EVENT =====
// 2x staking points to celebrate $6K MC! Active until Sunday May 25 2026 23:59:59 Rome time
// IMPORTANT: Boost status is checked at RUNTIME (inside functions), not at module load time.
// This ensures the boost expires correctly even if the server stays running past the end date.
const STAKING_BOOST_MULTIPLIER = 2; // 2x points
const STAKING_BOOST_END = new Date("2026-05-25T23:59:59+02:00"); // Sunday midnight Rome time

function isStakingBoostActive(): boolean {
  return Date.now() < STAKING_BOOST_END.getTime();
}

// ===== STAKING TIERS (auto-updated from on-chain balance) =====
const STAKING_TIERS_BASE = [
  { minBalance: 100_000_000, tier: "diamond", emoji: "💎", label: "Diamond", ptsPerDay: 40, apy: 40 },
  { minBalance: 50_000_000,  tier: "gold",    emoji: "🟡", label: "Gold",    ptsPerDay: 20, apy: 20 },
  { minBalance: 10_000_000,  tier: "silver",  emoji: "🥈", label: "Silver",  ptsPerDay: 8,  apy: 8  },
  { minBalance: 1_000_000,   tier: "bronze",  emoji: "🥉", label: "Bronze",  ptsPerDay: 3,  apy: 3  },
];

// Returns the current staking tiers, applying the boost multiplier if the event is still active.
// Called at runtime so the boost expires correctly without a server restart.
function getStakingTiers() {
  return isStakingBoostActive()
    ? STAKING_TIERS_BASE.map(t => ({
        ...t,
        ptsPerDay: t.ptsPerDay * STAKING_BOOST_MULTIPLIER,
        apy: t.apy * STAKING_BOOST_MULTIPLIER,
      }))
    : STAKING_TIERS_BASE;
}

function getStakingTier(balance: number) {
  return getStakingTiers().find((t) => balance >= t.minBalance) || null;
}

/**
 * Auto-update staking data for a member based on their on-chain balance.
 * Called during registration, check-in, and verify_arena.
 * - Reads on-chain balance via walletAddress
 * - Calculates pending rewards since last update
 * - Updates stakedAmount, stakingTier, pendingStakingReward
 */
// ===== DEV WALLET EXCLUSION (for airdrop leaderboard) =====
const DEV_WALLETS = (process.env.DEV_WALLETS || "").split(",").map(w => w.toLowerCase().trim()).filter(Boolean);
const DEV_HANDLES = (process.env.DEV_HANDLES || "").split(",").map(h => h.toLowerCase().trim()).filter(Boolean);

async function autoUpdateStaking(handle: string): Promise<{
  stakedAmount: number;
  stakingTier: string;
  pendingStakingReward: number;
  tierUpgraded: boolean;
  tierDowngraded: boolean;
}> {
  let member = await db.packMember.findUnique({ where: { handle } });
  if (!member || !process.env.DOOMHOUND_CONTRACT) {
    return { stakedAmount: 0, stakingTier: "none", pendingStakingReward: 0, tierUpgraded: false, tierDowngraded: false };
  }

  // If walletAddress is missing, try to fetch it from Arena API
  if (!member.walletAddress) {
    try {
      const arenaData = await arenaFetch(
        `/agents/user/handle?handle=${encodeURIComponent(handle)}`
      );
      if (arenaData.user?.address) {
        await db.packMember.update({
          where: { handle },
          data: { walletAddress: arenaData.user.address },
        });
        member = { ...member, walletAddress: arenaData.user.address };
      }
    } catch (err) {
      console.error("Failed to fetch wallet from Arena:", err);
    }
  }

  if (!member.walletAddress) {
    return { stakedAmount: 0, stakingTier: "none", pendingStakingReward: 0, tierUpgraded: false, tierDowngraded: false };
  }

  // Read on-chain balance
  const balanceResult = await checkDoomhoundBalance(member.walletAddress);
  const newBalance = balanceResult.balance;
  const newTierInfo = getStakingTier(newBalance);
  const newTier = newTierInfo ? newTierInfo.tier : "none";

  // Detect tier changes
  const oldTier = member.stakingTier;
  const tierUpgraded = oldTier !== "none" && newTier !== "none" &&
    getStakingTiers().findIndex(t => t.tier === newTier) < getStakingTiers().findIndex(t => t.tier === oldTier);
  const tierDowngraded = oldTier !== "none" && newTier !== "none" &&
    getStakingTiers().findIndex(t => t.tier === newTier) > getStakingTiers().findIndex(t => t.tier === oldTier);
  const tierLost = oldTier !== "none" && newTier === "none";
  const tierGained = oldTier === "none" && newTier !== "none";

  // Calculate pending rewards using CALENDAR DAYS (Europe/Rome timezone).
  // Every day at 00:00 Rome time = 1 new staking day for ALL users.
  // This means everyone gets rewards at the same time — no individual 24h timers.
  // IMPORTANT: Always calculate rewards for the OLD tier period, even if user dropped to "none".
  const PACK_TZ = "Europe/Rome";
  const getDateInTz = (d: Date): string => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: PACK_TZ,
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(d);
    const year = parts.find(p => p.type === "year")!.value;
    const month = parts.find(p => p.type === "month")!.value;
    const day = parts.find(p => p.type === "day")!.value;
    return `${year}-${month}-${day}`;
  };

  let newPending = member.pendingStakingReward;
  let rewardedDays = 0;
  const todayStr = getDateInTz(new Date());

  if (member.lastStakingUpdate && oldTier !== "none") {
    const lastStr = getDateInTz(new Date(member.lastStakingUpdate));
    // Count calendar days between last update and today (exclusive of last day, inclusive of today)
    const lastDate = new Date(lastStr + "T00:00:00Z");
    const todayDate = new Date(todayStr + "T00:00:00Z");
    const dayDiff = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);
    rewardedDays = Math.max(0, dayDiff);
    if (rewardedDays > 0) {
      const oldTierInfo = getStakingTiers().find(t => t.tier === oldTier);
      const rate = oldTierInfo ? oldTierInfo.ptsPerDay : 0;

      newPending += rate * rewardedDays;
    }
  }

  // Set lastStakingUpdate to today's date (midnight Rome time in UTC representation)
  // This marks "all days up to and including today have been rewarded"
  const nextLastStakingUpdate = new Date(todayStr + "T00:00:00Z");

  // Update the member
  await db.packMember.update({
    where: { handle },
    data: {
      stakedAmount: newBalance,
      stakingTier: newTier,
      pendingStakingReward: newPending,
      lastStakingUpdate: nextLastStakingUpdate,
      doomhoundBalance: newBalance,
      balanceCheckedAt: new Date(),
    },
  });

  // Auto-trigger referral stake bonus: if this member just gained a staking tier
  // and was referred by someone, award +10 pts to their referrer (once per referral)
  if (tierGained && member.referredBy) {
    try {
      const referralRecord = await db.referralRecord.findFirst({
        where: { refereeHandle: handle },
      });
      if (referralRecord && !referralRecord.stakeBonusAwarded) {
        const referrer = await db.packMember.findUnique({ where: { handle: referralRecord.referrerHandle } });
        if (referrer) {
          // Award +10 bonus to referrer
          await db.activityLog.create({
            data: {
              memberHandle: referrer.handle,
              type: "referral_stake_bonus",
              description: `@${handle} started staking! Referral bonus!`,
              points: 10,
            },
          });
          await db.packMember.update({
            where: { handle: referrer.handle },
            data: { points: { increment: 10 } },
          });
          // Mark bonus as awarded
          await db.referralRecord.update({
            where: { id: referralRecord.id },
            data: { stakeBonusAwarded: true },
          });
        }
      }
    } catch (err) {
      console.error("Failed to award referral stake bonus:", err);
      // Non-critical — don't break staking update
    }
  }

  return {
    stakedAmount: newBalance,
    stakingTier: newTier,
    pendingStakingReward: newPending,
    tierUpgraded: tierUpgraded || tierGained,
    tierDowngraded: tierDowngraded || tierLost,
  };
}

// ===== ACHIEVEMENT DEFINITIONS =====
interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_blood", name: "First Blood", emoji: "🩸", description: "First check-in" },
  { id: "pack_starter", name: "Pack Starter", emoji: "⛓️", description: "Referred 1 member" },
  { id: "7_day_streak", name: "7-Day Streak", emoji: "🔥", description: "7 consecutive daily check-ins" },
  { id: "howler", name: "Howler", emoji: "📢", description: "10+ Arena posts verified" },
  { id: "whale_spotter", name: "Whale Spotter", emoji: "🐋", description: "Holds 1M+ $DOOMHOUND" },
  { id: "trending_demon", name: "Trending Demon", emoji: "📈", description: "Had a trending post" },
  { id: "og_hound", name: "OG Hound", emoji: "👑", description: "Registered in first 24h" },
  { id: "meme_lord", name: "Meme Lord", emoji: "🎨", description: "5+ memes forged" },
];

// Points awarded when each achievement is unlocked
const ACHIEVEMENT_POINTS: Record<string, number> = {
  first_blood: 10,
  pack_starter: 25,
  "7_day_streak": 50,
  howler: 100,
  whale_spotter: 75,
  trending_demon: 150,
  og_hound: 200,
  meme_lord: 100,
};

// Launch: 22:00 Rome (CEST) = 20:00 UTC May 5
const SITE_LAUNCH_DATE = new Date("2026-05-05T20:00:00Z");

function getRank(points: number): string {
  for (const tier of RANK_TIERS) {
    if (points >= tier.minPoints) return tier.title;
  }
  return "Lost Soul";
}

function getBalanceTier(balance: number) {
  for (const tier of BALANCE_TIERS) {
    if (balance >= tier.minBalance) return tier;
  }
  return null;
}

// ===== ARENA API WITH CACHING =====
const ARENA_API_BASE = "https://api.starsarena.com";
const ARENA_API_KEY = process.env.ARENA_API_KEY;

// In-memory cache to avoid hitting Arena rate limits (1000 req/hr)
const arenaCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60_000; // 1 minute cache

async function arenaFetch(endpoint: string, cacheTtl = CACHE_TTL) {
  const cacheKey = endpoint;
  const cached = arenaCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const res = await fetch(`${ARENA_API_BASE}${endpoint}`, {
    headers: {
      "X-API-Key": ARENA_API_KEY || "",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // If rate limited, return stale cache if available
    if (res.status === 429 && cached) {
      console.log(`Arena 429 — using stale cache for ${endpoint}`);
      return cached.data;
    }
    throw new Error(`Arena API error: ${res.status} ${res.statusText} ${text}`);
  }
  const data = await res.json();
  arenaCache.set(cacheKey, { data, expires: Date.now() + cacheTtl });
  return data;
}

// ===== ACHIEVEMENT HELPERS =====
interface Achievement {
  id: string;
  name: string;
  emoji: string;
  awardedAt: string;
}

function parseAchievements(json: string): Achievement[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function stringifyAchievements(achievements: Achievement[]): string {
  return JSON.stringify(achievements);
}

function hasAchievement(achievements: Achievement[], id: string): boolean {
  return achievements.some((a) => a.id === id);
}

function awardAchievement(achievements: Achievement[], def: AchievementDef): Achievement[] {
  if (hasAchievement(achievements, def.id)) return achievements;
  return [
    ...achievements,
    { id: def.id, name: def.name, emoji: def.emoji, awardedAt: new Date().toISOString() },
  ];
}

// ===== CHECK AND AWARD ACHIEVEMENTS =====
async function checkAndAwardAchievements(handle: string): Promise<{ newAchievements: string[] }> {
  const member = await db.packMember.findUnique({
    where: { handle },
    include: { activities: { orderBy: { createdAt: "desc" } } },
  });
  if (!member) return { newAchievements: [] };

  // Safety: ensure activities array exists (defensive against undefined)
  const activities = member.activities || [];

  let achievements = parseAchievements(member.achievements);
  const beforeIds = new Set(achievements.map((a) => a.id));

  // First Blood — First check-in
  const hasCheckin = activities.some((a) => a.type === "daily_checkin");
  if (hasCheckin) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "first_blood")!);
  }

  // Pack Starter — Referred 1 member
  const hasReferral = activities.some((a) => a.type === "referral");
  if (hasReferral) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "pack_starter")!);
  }

  // 7-Day Streak
  if (member.streakCount >= 7) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "7_day_streak")!);
  }

  // Howler — 10+ Arena posts verified (meme_generated + social_mission = verified Arena posts)
  const arenaPostCount = activities.filter((a) => a.type === "meme_generated" || a.type === "arena_post" || a.type === "social_mission").length;
  if (arenaPostCount >= 10) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "howler")!);
  }

  // Whale Spotter — Holds 1M+ $DOOMHOUND
  if (member.doomhoundBalance >= 1_000_000) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "whale_spotter")!);
  }

  // Trending Demon — Had a trending post
  const hasTrending = activities.some((a) => a.type === "trending_mention");
  if (hasTrending) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "trending_demon")!);
  }

  // OG Hound — Registered in first 24h of site launch
  const launchPlus24h = new Date(SITE_LAUNCH_DATE.getTime() + 24 * 60 * 60 * 1000);
  if (new Date(member.createdAt) <= launchPlus24h) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "og_hound")!);
  }

  // Meme Lord — 5+ memes forged
  const memeCount = activities.filter((a) => a.type === "meme_generated").length;
  if (memeCount >= 5) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "meme_lord")!);
  }

  // Find newly awarded
  const afterIds = new Set(achievements.map((a) => a.id));
  const newIds = [...afterIds].filter((id) => !beforeIds.has(id));

  // Save if changed and award points for new achievements
  if (newIds.length > 0) {
    await db.packMember.update({
      where: { handle },
      data: { achievements: stringifyAchievements(achievements) },
    });

    // Award points for each newly unlocked achievement
    for (const achId of newIds) {
      const pts = ACHIEVEMENT_POINTS[achId] || 0;
      if (pts > 0) {
        const def = ACHIEVEMENT_DEFS.find(d => d.id === achId);
        await addActivity(handle, "achievement_unlock", `Unlocked ${def?.emoji || ""} ${def?.name || achId}!`, pts);
      }
    }
  }

  return { newAchievements: newIds };
}

// ===== HELPERS =====
async function addActivity(handle: string, type: string, description: string, points: number) {
  await db.activityLog.create({
    data: { memberHandle: handle, type, description, points },
  });
  // BUG FIX: Use atomic increment instead of read-calculate-write to prevent race conditions
  const member = await db.packMember.update({
    where: { handle },
    data: { points: { increment: points } },
  });
  const newRank = getRank(member.points);
  if (member.rank !== newRank) {
    await db.packMember.update({
      where: { handle },
      data: { rank: newRank },
    });
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function formatBalance(balance: number): string {
  if (balance >= 1_000_000) return `${(balance / 1_000_000).toFixed(1)}M`;
  if (balance >= 1_000) return `${(balance / 1_000).toFixed(1)}K`;
  return balance.toFixed(0);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ===== COOKIE HELPERS =====
const SESSION_COOKIE = "doomhound_session";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// ===== GET: Leaderboard + Profile + Session Login =====
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "leaderboard": {
        const members = await db.packMember.findMany({
          orderBy: { points: "desc" },
          take: 50,
          include: {
            activities: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });
        return NextResponse.json({ leaderboard: members });
      }

      case "profile": {
        const rawHandle = searchParams.get("handle");
        if (!rawHandle) {
          return NextResponse.json({ error: "handle is required" }, { status: 400 });
        }
        const handle = rawHandle.replace("@", "").trim().toLowerCase();
        const member = await db.packMember.findUnique({
          where: { handle },
          include: {
            activities: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }
        // Count referrals (members who were referred by this handle)
        const referralCount = await db.packMember.count({
          where: { referredBy: handle },
        });
        return NextResponse.json({ member, referralCount });
      }

      case "wheel_history": {
        const wheelActivities = await db.activityLog.findMany({
          where: { type: "wheel_spin", description: { contains: "Won" } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { member: { select: { handle: true, userName: true, profilePic: true } } },
        });
        return NextResponse.json({ history: wheelActivities });
      }

      case "session_login": {
        // Restore session from cookie (server-side)
        const token = request.cookies.get(SESSION_COOKIE)?.value;
        if (!token) {
          return NextResponse.json({ error: "No session" }, { status: 401 });
        }
        const member = await db.packMember.findUnique({
          where: { sessionToken: token },
          include: {
            activities: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        });
        if (!member) {
          const res = NextResponse.json({ error: "Invalid session" }, { status: 401 });
          clearSessionCookie(res);
          return res;
        }
        const sessionReferralCount = await db.packMember.count({
          where: { referredBy: member.handle },
        });
        return NextResponse.json({
          member,
          referralCount: sessionReferralCount,
          stakingBoost: isStakingBoostActive() ? { active: true, multiplier: STAKING_BOOST_MULTIPLIER, endsAt: STAKING_BOOST_END.toISOString() } : { active: false },
        });
      }

      case "restore_session": {
        // BUG FIX: Require existing session cookie to restore session.
        // Previously, anyone could pass any handle and get full account access.
        // Now: must have a valid session cookie (even if expired handle mismatch),
        // OR the handle in localStorage must match the session cookie's handle.
        const handleParam = searchParams.get("handle");
        if (!handleParam) {
          return NextResponse.json({ error: "handle is required" }, { status: 400 });
        }
        const cleanH = handleParam.replace("@", "").trim().toLowerCase();

        // Check if there's an existing session cookie — if so, only allow restoring the same handle
        const existingToken = request.cookies.get(SESSION_COOKIE)?.value;
        if (existingToken) {
          const existingSession = await db.packMember.findUnique({
            where: { sessionToken: existingToken },
            select: { handle: true },
          });
          if (existingSession && existingSession.handle === cleanH) {
            // Valid session — just return the member data without generating a new token
            const member = await db.packMember.findUnique({
              where: { handle: cleanH },
              include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
            });
            const restoreReferralCount = await db.packMember.count({
              where: { referredBy: cleanH },
            });
            return NextResponse.json({ member, referralCount: restoreReferralCount });
          }
        }

        // No valid session — require re-authentication via register/login
        return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
      }

      case "staking_stats": {
        // Total staked across all members
        const stakers = await db.packMember.findMany({
          where: { stakingTier: { not: "none" } },
          select: { handle: true, userName: true, profilePic: true, stakedAmount: true, stakingTier: true },
          orderBy: { stakedAmount: "desc" },
        });

        const totalStaked = stakers.reduce((sum, s) => sum + s.stakedAmount, 0);

        // Top 5 stakers
        const topStakers = stakers.slice(0, 5);

        // Count by tier
        const tierCounts: Record<string, number> = { diamond: 0, gold: 0, silver: 0, bronze: 0 };
        for (const s of stakers) {
          if (tierCounts[s.stakingTier] !== undefined) {
            tierCounts[s.stakingTier]++;
          }
        }

        // Total rewards distributed (from activity logs)
        const totalRewards = await db.activityLog.aggregate({
          where: { type: "staking_reward" },
          _sum: { points: true },
        });

        return NextResponse.json({
          totalStaked,
          totalStakers: stakers.length,
          topStakers,
          tierCounts,
          totalRewardsDistributed: totalRewards._sum.points || 0,
          stakingBoost: isStakingBoostActive() ? { active: true, multiplier: STAKING_BOOST_MULTIPLIER, endsAt: STAKING_BOOST_END.toISOString() } : { active: false },
          stakingTiers: getStakingTiers(),
        });
      }

      case "airdrop_leaderboard": {
        // Airdrop leaderboard: points earned SINCE snapshot
        // airdropPoints = totalPointsEarned - airdropPointsStart
        // Dev wallets/handles are excluded
        const allMembers = await db.packMember.findMany({
          select: {
            handle: true,
            userName: true,
            profilePic: true,
            points: true,
            airdropPointsStart: true,
            stakingTier: true,
            walletAddress: true,
          },
          orderBy: { points: "desc" },
        });

        // Check if airdrop has been initialized (any member has airdropPointsStart > 0)
        const airdropInitialized = allMembers.some(m => m.airdropPointsStart > 0);

        // Calculate airdrop points and exclude devs (via DEV_HANDLES/DEV_WALLETS env vars)
        // If airdrop NOT initialized yet, everyone shows 0
        // Always show ALL non-dev members so the leaderboard is visible even at 0 points
        const leaderboard = allMembers
          .filter(m => {
            const isDev = DEV_HANDLES.includes(m.handle.toLowerCase()) ||
                          (m.walletAddress ? DEV_WALLETS.includes(m.walletAddress.toLowerCase()) : false);
            return !isDev; // Exclude devs
          })
          .map(m => ({
            handle: m.handle,
            userName: m.userName,
            profilePic: m.profilePic,
            stakingTier: m.stakingTier,
            airdropPoints: airdropInitialized ? Math.max(0, m.points - m.airdropPointsStart) : 0,
            totalPoints: m.points,
          }))
          .sort((a, b) => b.airdropPoints - a.airdropPoints);

        // Airdrop prizes — 200M total pool
        const AIRDROP_PRIZES = [
          { rank: 1, amount: 100_000_000, emoji: "🥇" },
          { rank: 2, amount: 60_000_000, emoji: "🥈" },
          { rank: 3, amount: 40_000_000, emoji: "🥉" },
        ];

        return NextResponse.json({
          leaderboard,
          airdropPrizes: AIRDROP_PRIZES,
          totalPool: 200_000_000,
          airdropInitialized,
        });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["leaderboard", "profile", "wheel_history", "session_login", "restore_session", "staking_stats", "airdrop_leaderboard"],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Pack API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== POST: All mutations =====
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, handle } = body;

  // ===== ADMIN ACTIONS (no handle required) =====
  // These run BEFORE the handle check since they operate on ALL members
  if (action === "init_airdrop") {
    const adminPwd = body.adminPassword as string | undefined;
    // BUG FIX: Use only env var for admin password (no hardcoded fallback)
    if (adminPwd !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
      const allMembers = await db.packMember.findMany({
        select: { handle: true, points: true },
      });

      // Use transaction to ensure atomic snapshot — no partial state on failure
      await db.$transaction(
        allMembers.map(m =>
          db.packMember.update({
            where: { handle: m.handle },
            data: { airdropPointsStart: m.points },
          })
        )
      );

      return NextResponse.json({
        success: true,
        membersUpdated: allMembers.length,
        message: `Airdrop initialized! All ${allMembers.length} members start from 0 airdrop points.`,
      });
    } catch (error: any) {
      console.error("Init airdrop error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const cleanHandle = handle.replace("@", "").trim().toLowerCase();

  // BUG FIX: Session authentication for all mutations except register and admin actions
  // Prevents unauthenticated API abuse (anyone calling endpoints with just a handle)
  const SESSION_AUTH_ACTIONS = ["checkin", "verify_arena", "update_staking", "claim_staking", "check_balance", "claim_meme", "process_referral", "wheel_spin"];
  if (SESSION_AUTH_ACTIONS.includes(action)) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated. Please log in again." }, { status: 401 });
    }
    const sessionMember = await db.packMember.findUnique({
      where: { sessionToken },
      select: { handle: true },
    });
    if (!sessionMember || sessionMember.handle !== cleanHandle) {
      return NextResponse.json({ error: "Session mismatch. Please log in again." }, { status: 401 });
    }
  }

  try {
    switch (action) {
      // ===== REGISTER =====
      case "register": {
        const existing = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (existing) {
          // Generate/update session token for existing member too
          const token = existing.sessionToken || randomUUID();
          const updateData: any = {};
          if (!existing.sessionToken) {
            updateData.sessionToken = token;
          }

          // BUG FIX: Do NOT process referral retroactively for existing members.
          // Referral is ONLY valid at the time of FIRST registration.
          // If a user is already in the Pack, clicking someone's referral link
          // should NOT reassign them to a different referrer.
          // Clear any stale referral code from localStorage on the client side.
          // (No server-side action needed — just don't set referredBy)

          if (Object.keys(updateData).length > 0) {
            await db.packMember.update({
              where: { handle: cleanHandle },
              data: updateData,
            });
          }

          const member = await db.packMember.findUnique({
            where: { handle: cleanHandle },
            include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
          });
          const referralCount = await db.packMember.count({
            where: { referredBy: cleanHandle },
          });
          const res = NextResponse.json({ member, referralCount, alreadyRegistered: true, sessionToken: token });
          setSessionCookie(res, token);
          return res;
        }

        // Verify handle on Arena
        const arenaData = await arenaFetch(
          `/agents/user/handle?handle=${encodeURIComponent(cleanHandle)}`
        );

        if (!arenaData.user) {
          return NextResponse.json(
            { error: "Handle not found on The Arena. Sign up first at arena.social" },
            { status: 404 }
          );
        }

        const profile = arenaData.user;
        const walletAddress = profile.address || null;
        const threadCount = profile.threadCount || 0;
        const followerCount = profile.followerCount || 0;
        const sessionToken = randomUUID();

        const member = await db.packMember.create({
          data: {
            handle: cleanHandle,
            userName: profile.userName || cleanHandle,
            profilePic: profile.profilePicture || "",
            walletAddress,
            points: POINTS_CONFIG.register.value,
            rank: getRank(POINTS_CONFIG.register.value),
            lastThreadCount: threadCount,
            lastFollowerCount: followerCount,
            lastVerifiedAt: new Date(),
            sessionToken,
          },
        });

        await db.activityLog.create({
          data: {
            memberHandle: cleanHandle,
            type: "register",
            description: "Joined the $DOOMHOUND pack!",
            points: POINTS_CONFIG.register.value,
          },
        });

        // Check $DOOMHOUND balance if wallet + contract available
        let balanceBonus = 0;
        let balanceTierLabel = null;
        if (walletAddress && process.env.DOOMHOUND_CONTRACT) {
          const balanceResult = await checkDoomhoundBalance(walletAddress);
          if (balanceResult.balance > 0) {
            const tier = getBalanceTier(balanceResult.balance);
            if (tier) {
              balanceBonus = tier.bonus;
              balanceTierLabel = tier.label;
              await addActivity(cleanHandle, "doomhound_holder",
                `${tier.label}: Holds ${formatBalance(balanceResult.balance)} $DOOMHOUND`, tier.bonus);
            }
          }
        }

        // Referral — supports both referral CODE (8-char uppercase from engagement system)
        // and handle-based referral (legacy fallback).
        // The ?ref= param from the URL is stored as the referralCode by the client.
        // SAFEGUARD: Only process referral for NEW members who don't already have a referredBy.
        // Also check for duplicate referral activities to prevent double-awarding points.
        const rawRef = body.referral as string | undefined;
        const cleanRef = rawRef ? rawRef.replace("@", "").trim().toLowerCase() : undefined;
        const freshMember = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (cleanRef && cleanRef !== cleanHandle && freshMember && !freshMember.referredBy) {
          // Try to find referrer by referralCode first (8-char uppercase code), then by handle
          let referrer = await db.packMember.findFirst({
            where: { referralCode: cleanRef.toUpperCase() },
          });
          if (!referrer) {
            // Fallback: try finding by handle (legacy compatibility)
            referrer = await db.packMember.findUnique({ where: { handle: cleanRef } });
          }
          if (referrer) {
            // Check for duplicate referral activity (prevent double-awarding)
            const existingReferralActivity = await db.activityLog.findFirst({
              where: {
                memberHandle: referrer.handle,
                type: "referral",
                description: { contains: cleanHandle },
              },
            });
            if (!existingReferralActivity) {
              // Check referrer's active referral count (max 50 for points)
              const referrerActiveCount = await db.referralRecord.count({
                where: { referrerHandle: referrer.handle, registrationPointsGiven: true },
              });
              const canAwardPoints = referrerActiveCount < 50;

              // Set referredBy on the new member
              await db.packMember.update({
                where: { handle: cleanHandle },
                data: { referredBy: referrer.handle },
              });

              // Create ReferralRecord for the engagement system
              await db.referralRecord.create({
                data: {
                  referrerHandle: referrer.handle,
                  refereeHandle: cleanHandle,
                  registrationPointsGiven: canAwardPoints,
                },
              });

              if (canAwardPoints) {
                // Award +75 pts to referrer (pack route legacy)
                await addActivity(referrer.handle, "referral", `Recruited @${cleanHandle} to the pack!`, POINTS_CONFIG.referral.value);

                // Also award +3 welcome pts to referee via engagement system
                await db.activityLog.create({
                  data: { memberHandle: cleanHandle, type: "referral_welcome", description: `Joined via @${referrer.handle}'s referral!`, points: 3 },
                });
                await db.packMember.update({
                  where: { handle: cleanHandle },
                  data: { points: { increment: 3 } },
                });

                // Increment referrer's referral count
                await db.packMember.update({
                  where: { handle: referrer.handle },
                  data: { referralCount: { increment: 1 } },
                });

                // Register daily activity for referrer (for streak tracking)
                const PACK_TZ_REG = "Europe/Rome";
                const regParts = new Intl.DateTimeFormat("en-US", {
                  timeZone: PACK_TZ_REG,
                  year: "numeric", month: "2-digit", day: "2-digit",
                }).formatToParts(new Date());
                const regYear = regParts.find(p => p.type === "year")!.value;
                const regMonth = regParts.find(p => p.type === "month")!.value;
                const regDay = regParts.find(p => p.type === "day")!.value;
                const regTodayStr = `${regYear}-${regMonth}-${regDay}`;
                try {
                  await db.dailyActivity.create({
                    data: { memberHandle: referrer.handle, activityDate: new Date(regTodayStr + "T00:00:00Z"), actionType: "referral" },
                  });
                } catch { /* already exists, fine */ }
              } else {
                // Referrer hit cap — still record referral but no points
                await addActivity(referrer.handle, "referral", `Recruited @${cleanHandle} (cap reached, no pts)`, 0);
              }
            }
          }
        }

        // Check & award achievements (OG Hound check, etc.)
        const { newAchievements } = await checkAndAwardAchievements(cleanHandle);

        // Auto-update staking (initial stake based on balance at registration)
        const stakingResult = await autoUpdateStaking(cleanHandle);

        // Set airdropPointsStart = current points so new users also start at 0 airdrop points
        const memberAfterStaking = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (memberAfterStaking) {
          await db.packMember.update({
            where: { handle: cleanHandle },
            data: { airdropPointsStart: memberAfterStaking.points },
          });
        }

        const fullMember = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });

        const res = NextResponse.json({
          member: fullMember,
          alreadyRegistered: false,
          balanceBonus,
          balanceTierLabel,
          newAchievements,
          staking: stakingResult,
          sessionToken,
        });
        setSessionCookie(res, sessionToken);
        return res;
      }

      // ===== DAILY CHECK-IN =====
      case "checkin": {
        const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }

        // Always use Europe/Rome timezone for consistent date comparison across all users
        // This matches the frontend canCheckIn() logic and the project's CET schedule
        const PACK_TZ = "Europe/Rome";
        const now = new Date();

        // Reliable date-in-timezone helper using formatToParts (avoids locale-dependent toLocaleDateString)
        const getDateInTz = (d: Date): string => {
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: PACK_TZ,
            year: "numeric", month: "2-digit", day: "2-digit",
          }).formatToParts(d);
          const year = parts.find(p => p.type === "year")!.value;
          const month = parts.find(p => p.type === "month")!.value;
          const day = parts.find(p => p.type === "day")!.value;
          return `${year}-${month}-${day}`; // Always YYYY-MM-DD
        };

        // Calculate the calendar-day difference between two dates in the target timezone
        const getDayDiff = (earlier: Date, later: Date): number => {
          const earlierStr = getDateInTz(earlier);
          const laterStr = getDateInTz(later);
          const earlierDate = new Date(earlierStr + "T00:00:00Z");
          const laterDate = new Date(laterStr + "T00:00:00Z");
          return Math.round((laterDate.getTime() - earlierDate.getTime()) / 86400000);
        };

        const todayStr = getDateInTz(now);

        if (member.lastCheckIn) {
          const lastStr = getDateInTz(new Date(member.lastCheckIn));
          if (lastStr === todayStr) {
            // Already checked in today — return full member data so client can update
            const fullMember = await db.packMember.findUnique({
              where: { handle: cleanHandle },
              include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
            });
            return NextResponse.json({ error: "Already checked in today", member: fullMember });
          }
        }

        // Calculate streak using calendar-day difference (robust against timezone edge cases)
        let newStreakCount = 1;
        const lastCheckDate = member.lastCheckIn || member.lastStreakAt;
        if (lastCheckDate) {
          const lastDate = new Date(lastCheckDate);
          const dayDiff = getDayDiff(lastDate, now);

          if (dayDiff === 0) {
            // Same day (shouldn't reach here since we check above, but keep streak)
            newStreakCount = member.streakCount;
          } else if (dayDiff === 1) {
            // Yesterday — continue streak
            newStreakCount = member.streakCount + 1;
          } else if (dayDiff === 2) {
            // Missed one calendar day — grace period (48h from last check-in)
            // This handles edge cases like late-night check-ins across date boundaries
            const hoursSinceLastCheck = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastCheck < 48) {
              // Grace period applies — continue streak
              newStreakCount = member.streakCount + 1;
            } else {
              // More than 48h but within 2 calendar days — still allow streak continuation
              // to be more forgiving for users in different timezones or with busy schedules
              newStreakCount = member.streakCount + 1;
            }
          } else if (dayDiff === 3) {
            // Missed 2 calendar days — still generous grace period
            const hoursSinceLastCheck = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastCheck < 72) {
              // Within 72h — continue streak (allows skipping one full day)
              newStreakCount = member.streakCount + 1;
            }
            // Otherwise: missed too many days, streak resets to 1
          }
          // dayDiff >= 4: definitely missed too many days, streak resets to 1 (default)
        }

        await addActivity(cleanHandle, "daily_checkin", `Daily summon completed (streak: ${newStreakCount})`, POINTS_CONFIG.daily_checkin.value);
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: { lastCheckIn: new Date(), streakCount: newStreakCount, lastStreakAt: new Date() },
        });

        // Register daily activity for streak tracking (engagement system reads this for "Last 7 Days" display)
        const todayDate = new Date(todayStr + "T00:00:00Z");
        try {
          await db.dailyActivity.create({
            data: { memberHandle: cleanHandle, activityDate: todayDate, actionType: "claim" },
          });
        } catch {
          // Unique constraint = already registered today, that's fine
        }

        // Auto-update staking (reads on-chain balance, calculates pending rewards)
        const stakingResult = await autoUpdateStaking(cleanHandle);

        // Check achievements (First Blood, 7-Day Streak)
        const { newAchievements } = await checkAndAwardAchievements(cleanHandle);

        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });
        return NextResponse.json({ member: updated, newAchievements, staking: stakingResult });
      }

      // ===== VERIFY ARENA ACTIVITY =====
      case "verify_arena": {
        const member = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" } } },
        });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }

        // 1 hour cooldown on verification
        if (member.lastVerifiedAt) {
          const timeSinceVerify = Date.now() - new Date(member.lastVerifiedAt).getTime();
          if (timeSinceVerify < 3600000) {
            const minsLeft = Math.ceil((3600000 - timeSinceVerify) / 60000);
            return NextResponse.json({
              error: `Wait ${minsLeft}m before next verification`,
              member,
              cooldown: true,
            });
          }
        }

        // Fetch current Arena profile
        const arenaData = await arenaFetch(
          `/agents/user/handle?handle=${encodeURIComponent(cleanHandle)}`
        );

        if (!arenaData.user) {
          return NextResponse.json({ error: "Arena profile not found", member });
        }

        const profile = arenaData.user;
        const currentThreadCount = profile.threadCount || 0;
        const currentFollowerCount = profile.followerCount || 0;

        // We track thread count for display but do NOT award points for generic posts
        // Points for posts require submitting a specific Arena post URL via Meme Forge
        const newThreads = Math.max(0, currentThreadCount - member.lastThreadCount);
        const newFollowers = Math.max(0, currentFollowerCount - member.lastFollowerCount);

        let totalNewPoints = 0;
        const verifiedActivities: { type: string; description: string; points: number }[] = [];

        // Award points ONLY for new followers (verified via API)
        if (newFollowers > 0) {
          const pts = newFollowers * POINTS_CONFIG.arena_follower.value;
          totalNewPoints += pts;
          verifiedActivities.push({
            type: "arena_follower",
            description: `${newFollowers} new follower${newFollowers > 1 ? "s" : ""} on Arena!`,
            points: pts,
          });
        }

        // Also check for new posts in the DOOMHOUND community feed by this user
        // This detects posts made ON the community page, not just the user's personal profile
        let communityPostsFound = 0;
        try {
          const arenaUserId = profile.id;
          if (arenaUserId) {
            const communityFeed = await arenaFetch(
              `/agents/threads/feed/community?communityId=4b326b82-46e7-4ac7-a34b-8e8d00913f0b&page=1&pageSize=25`
            );
            const communityThreads = communityFeed.threads || [];
            for (const thread of communityThreads) {
              const threadHandle = (thread.userHandle || "").toLowerCase();
              if (threadHandle === cleanHandle) {
                communityPostsFound++;
              }
            }
          }
        } catch (err: any) {
          console.log("Community feed scan failed:", err?.message || err);
        }

        // Scan trending feed for mentions of this user's $DOOMHOUND posts
        const trendingData = await arenaFetch(
          "/agents/threads/feed/trendingPosts?pageSize=50"
        );
        const threads = trendingData.threads || [];
        let trendingBonus = 0;

        // BUG FIX: Get already-awarded trending thread IDs to prevent repeat awards
        const awardedTrendingIds = new Set(
          (member.activities || [])
            .filter(a => a.type === "trending_mention" && a.description.includes("[trending:"))
            .map(a => {
              const match = a.description.match(/\[trending:([^\]]+)\]/);
              return match ? match[1] : null;
            })
            .filter(Boolean)
        );

        for (const thread of threads) {
          const content = stripHtml(thread.content || "").toLowerCase();
          const threadHandle = (thread.userHandle || "").toLowerCase();
          const communityTicker = thread.community?.ticker?.toLowerCase();
          const threadId = thread.id;

          // Skip already-awarded trending posts
          if (threadId && awardedTrendingIds.has(threadId)) continue;

          const isDoomhoundPost =
            content.includes("doomhound") ||
            content.includes("$doomhound") ||
            communityTicker === "doomhound";

          if (threadHandle === cleanHandle && isDoomhoundPost) {
            trendingBonus += POINTS_CONFIG.trending_mention.value;
            verifiedActivities.push({
              type: "trending_mention",
              description: `Your $DOOMHOUND post is trending on Arena! 🔥 [trending:${threadId}]`,
              points: POINTS_CONFIG.trending_mention.value,
            });
            break;
          }
        }

        totalNewPoints += trendingBonus;

        // Save all verified activities
        for (const act of verifiedActivities) {
          await addActivity(cleanHandle, act.type, act.description, act.points);
        }

        // Update member's Arena tracking data
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: {
            lastThreadCount: currentThreadCount,
            lastFollowerCount: currentFollowerCount,
            lastVerifiedAt: new Date(),
          },
        });

        // Check achievements (Trending Demon)
        const { newAchievements } = await checkAndAwardAchievements(cleanHandle);

        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });

        return NextResponse.json({
          member: updated,
          verified: true,
          newThreads,
          newFollowers,
          communityPostsFound,
          trendingBonus,
          totalNewPoints,
          currentThreadCount,
          currentFollowerCount,
          newAchievements,
        });
      }

      // ===== UPDATE STAKING (trigger from frontend on staking page load) =====
      case "update_staking": {
        const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }
        const stakingResult = await autoUpdateStaking(cleanHandle);
        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });
        return NextResponse.json({ member: updated, staking: stakingResult });
      }

      // ===== CLAIM STAKING REWARDS =====
      case "claim_staking": {
        const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }

        // Auto-update staking first to catch up pending rewards
        const stakingResult = await autoUpdateStaking(cleanHandle);

        // Re-read member to get updated pendingStakingReward
        const updatedMember = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (!updatedMember) {
          return NextResponse.json({ error: "Member not found after update" }, { status: 404 });
        }

        const reward = updatedMember.pendingStakingReward;
        if (reward <= 0) {
          return NextResponse.json({ error: "No staking rewards to claim", member: updatedMember });
        }

        // Add reward points to total
        await addActivity(
          cleanHandle,
          "staking_reward",
          `Claimed ${reward} staking rewards (${stakingResult.stakingTier} tier)`,
          reward
        );

        // Use ATOMIC DECREMENT instead of setting to 0.
        // This prevents a race condition: if another autoUpdateStaking call
        // adds more pending rewards between our read and write, decrement
        // preserves those new rewards instead of wiping them to 0.
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: { pendingStakingReward: { decrement: reward } },
        });

        const finalMember = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });

        return NextResponse.json({
          member: finalMember,
          claimedReward: reward,
          stakingTier: stakingResult.stakingTier,
        });
      }

      // ===== CHECK $DOOMHOUND BALANCE =====
      case "check_balance": {
        const member = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }
        if (!member.walletAddress) {
          return NextResponse.json({ error: "No wallet address linked to your Arena profile. Connect a wallet on The Arena first!", member });
        }
        if (!process.env.DOOMHOUND_CONTRACT) {
          return NextResponse.json({
            error: "$DOOMHOUND not launched yet — balance check available after launch!",
            member,
            preLaunch: true,
          });
        }

        const balanceResult = await checkDoomhoundBalance(member.walletAddress);
        const tier = getBalanceTier(balanceResult.balance);

        // Remove old balance bonuses and recalculate
        const oldBalanceActivities = await db.activityLog.findMany({
          where: { memberHandle: cleanHandle, type: "doomhound_holder" },
        });
        let oldBonus = 0;
        for (const act of oldBalanceActivities) {
          oldBonus += act.points;
        }
        if (oldBalanceActivities.length > 0) {
          await db.activityLog.deleteMany({
            where: { memberHandle: cleanHandle, type: "doomhound_holder" },
          });
        }

        let newBonus = 0;
        let balanceTierLabel = null;
        if (tier) {
          newBonus = tier.bonus;
          balanceTierLabel = tier.label;
          await db.activityLog.create({
            data: {
              memberHandle: cleanHandle,
              type: "doomhound_holder",
              description: `${tier.label}: Holds ${formatBalance(balanceResult.balance)} $DOOMHOUND`,
              points: tier.bonus,
            },
          });
        }

        // Update points atomically: adjust the difference between new and old balance bonus.
        // This avoids the race condition of summing ALL activity logs.
        const pointsAdjustment = newBonus - oldBonus;

        await db.packMember.update({
          where: { handle: cleanHandle },
          data: {
            doomhoundBalance: balanceResult.balance,
            balanceCheckedAt: new Date(),
            ...(pointsAdjustment !== 0 ? { points: { increment: pointsAdjustment } } : {}),
          },
        });

        // Update rank based on the adjusted points
        const updatedForRank = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (updatedForRank) {
          const newRank = getRank(updatedForRank.points);
          if (updatedForRank.rank !== newRank) {
            await db.packMember.update({
              where: { handle: cleanHandle },
              data: { rank: newRank },
            });
          }
        }

        // Also update staking data when balance is checked (keeps tier in sync)
        await autoUpdateStaking(cleanHandle);

        // Check achievements (Whale Spotter)
        const { newAchievements } = await checkAndAwardAchievements(cleanHandle);

        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });

        return NextResponse.json({
          member: updated,
          balance: balanceResult.balance,
          balanceFormatted: formatBalance(balanceResult.balance),
          tier: balanceTierLabel,
          bonusChange: newBonus - oldBonus,
          newAchievements,
        });
      }

      // ===== CLAIM MEME (requires Arena post URL) =====
      case "claim_meme": {
        const postUrl = body.postUrl as string | undefined;
        if (!postUrl || !postUrl.trim()) {
          return NextResponse.json({ error: "Arena post URL required! Paste the link to your $DOOMHOUND post on Arena." }, { status: 400 });
        }

        // Validate URL — must be from arena.social
        const trimmedUrl = postUrl.trim();
        if (!trimmedUrl.includes("arena.social")) {
          return NextResponse.json({ error: "Invalid URL. Must be a link from arena.social" }, { status: 400 });
        }

        // Extract thread ID from various Arena URL patterns:
        // arena.social/thread/12345
        // arena.social/username/status/12345
        // arena.social/username/12345
        // arena.social/username/status/cbaee301-207e-4695-8846-884cd9575391 (UUID format)
        const threadIdMatch = trimmedUrl.match(
          /arena\.social\/(?:thread\/|(?:[^/]+\/)?(?:status\/)?)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)/i
        );
        const threadId = threadIdMatch ? threadIdMatch[1] : null;

        const member = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" } } },
        });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }

        // Check cooldown (10 min between claims)
        const lastMeme = (member.activities || []).find(
          (a) => a.type === "meme_generated" && Date.now() - new Date(a.createdAt).getTime() < 600000
        );
        if (lastMeme) {
          return NextResponse.json({ error: "Cooldown: 10 minutes between claims", member });
        }

        // Check for duplicate claim (same thread ID already claimed)
        if (threadId) {
          const existingClaim = await db.activityLog.findFirst({
            where: {
              memberHandle: cleanHandle,
              type: "meme_generated",
              description: { contains: `[arena:${threadId}]` },
            },
          });
          if (existingClaim) {
            return NextResponse.json({ error: "This post has already been claimed for points!" }, { status: 400 });
          }
        }

        // ===== VERIFY THE POST ON ARENA =====
        let verified = false;
        let verificationDetail = "";

        // Extract handle from URL (e.g. arena.social/Toff083249361/status/...)
        const urlHandleMatch = trimmedUrl.match(/arena\.social\/([a-zA-Z0-9_]+)\/status\//);
        const urlHandle = urlHandleMatch ? urlHandleMatch[1].toLowerCase() : null;

        if (threadId) {
          // Strategy 0: Fetch thread directly by ID (most reliable, works for any post)
          try {
            const threadData = await arenaFetch(`/agents/threads/${threadId}`, 0);
            const thread = threadData.thread || threadData;

            if (thread && thread.id) {
              // Verify ownership
              const threadHandle = (thread.userHandle || "").toLowerCase();
              if (threadHandle === cleanHandle || (urlHandle && urlHandle === cleanHandle)) {
                // Verify content is $DOOMHOUND related
                const content = stripHtml(thread.content || "").toLowerCase();
                const communityTicker = thread.community?.ticker?.toLowerCase();
                const communityId = thread.communityId;

                const isDoomhoundRelated =
                  content.includes("doomhound") ||
                  content.includes("$doomhound") ||
                  content.includes("doom") ||
                  communityTicker === "doomhound" ||
                  communityId === "4b326b82-46e7-4ac7-a34b-8e8d00913f0b";

                if (isDoomhoundRelated) {
                  verified = true;
                  verificationDetail = thread.communityId
                    ? "Community post verified on $DOOMHOUND Arena"
                    : "Post verified on Arena";
                } else {
                  return NextResponse.json({
                    error: "This post doesn't mention $DOOMHOUND. Post about $DOOMHOUND on Arena and submit that link!",
                  }, { status: 400 });
                }
              } else {
                return NextResponse.json({
                  error: "This post doesn't belong to your Arena account. Submit your own $DOOMHOUND post!",
                }, { status: 400 });
              }
            }
          } catch (err: any) {
            console.log("Direct thread lookup failed (falling back to feed search):", err?.message || err);
          }

          // Strategy 1: Search the user's thread feed for this thread ID (fallback if direct fetch fails)
          // This works for BOTH profile posts AND community posts
          if (!verified) {
            try {
              // First get the user's Arena profile to get their userId
              const arenaProfile = await arenaFetch(
                `/agents/user/handle?handle=${encodeURIComponent(cleanHandle)}`
              );
              const arenaUserId = arenaProfile.user?.id;

              if (arenaUserId) {
                // Fetch user's recent threads (includes community posts) — check first 2 pages (100 threads)
                for (let page = 1; page <= 2 && !verified; page++) {
                  const userThreadsData = await arenaFetch(
                    `/agents/threads/feed/user?userId=${arenaUserId}&page=${page}&pageSize=50`
                  );
                  const userThreads = userThreadsData.threads || [];

                  // Find the specific thread by ID
                  const foundThread = userThreads.find((t: any) => t.id === threadId);

                  if (foundThread) {
                    // Verify ownership
                    const threadHandle = (foundThread.userHandle || "").toLowerCase();
                    if (threadHandle === cleanHandle || (urlHandle && urlHandle === cleanHandle)) {
                      // Verify content is $DOOMHOUND related
                      const content = stripHtml(foundThread.content || "").toLowerCase();
                      const communityTicker = foundThread.community?.ticker?.toLowerCase();
                      const communityId = foundThread.communityId;

                      const isDoomhoundRelated =
                        content.includes("doomhound") ||
                        content.includes("$doomhound") ||
                        content.includes("doom") ||
                        communityTicker === "doomhound" ||
                        communityId === "4b326b82-46e7-4ac7-a34b-8e8d00913f0b";

                      if (isDoomhoundRelated) {
                        verified = true;
                        verificationDetail = foundThread.communityId
                          ? "Community post verified on $DOOMHOUND Arena"
                          : "Post verified on Arena";
                      } else {
                        return NextResponse.json({
                          error: "This post doesn't mention $DOOMHOUND. Post about $DOOMHOUND on Arena and submit that link!",
                        }, { status: 400 });
                      }
                    } else {
                      return NextResponse.json({
                        error: "This post doesn't belong to your Arena account. Submit your own $DOOMHOUND post!",
                      }, { status: 400 });
                    }
                  }
                }
              }
            } catch (err: any) {
              console.log("User thread feed lookup failed:", err?.message || err);
            }
          }

          // Strategy 2: Search DOOMHOUND community feed for this thread (fallback)
          if (!verified) {
            try {
              for (let page = 1; page <= 2 && !verified; page++) {
                const communityFeed = await arenaFetch(
                  `/agents/threads/feed/community?communityId=4b326b82-46e7-4ac7-a34b-8e8d00913f0b&page=${page}&pageSize=50`
                );
                const communityThreads = communityFeed.threads || [];
                const foundThread = communityThreads.find((t: any) => t.id === threadId);

                if (foundThread) {
                  const threadHandle = (foundThread.userHandle || "").toLowerCase();
                  if (threadHandle === cleanHandle || (urlHandle && urlHandle === cleanHandle)) {
                    verified = true;
                    verificationDetail = "Community post found in $DOOMHOUND feed";
                  } else {
                    return NextResponse.json({
                      error: "This post doesn't belong to your Arena account. Submit your own $DOOMHOUND post!",
                    }, { status: 400 });
                    }
                }
              }
            } catch (err: any) {
              console.log("Community feed lookup failed:", err?.message || err);
            }
          }

          // Strategy 3 is REMOVED: Previously, if the URL contained the user's handle,
          // the post was accepted without actually verifying it via the Arena API.
          // This allowed users to craft fake URLs and farm 30 pts every 10 min.
          // Now, posts must be verified via the Arena API (Strategy 1 or 2).
        }

        // Strategy 4 is REMOVED: Previously, if threadCount increased, the post was accepted.
        // This could be gamed by deleting and re-posting, and didn't verify $DOOMHOUND content.
        // Now, posts must be verified via the Arena API (Strategy 1 or 2).

        if (!verified) {
          return NextResponse.json({
            error: "Could not verify your post on Arena. Make sure the URL is correct and the post is from your account.",
          }, { status: 400 });
        }

        // Award points!
        const desc = threadId
          ? `$DOOMHOUND Arena post verified! (${verificationDetail}) [arena:${threadId}]`
          : `$DOOMHOUND Arena post verified! (${verificationDetail})`;

        await addActivity(cleanHandle, "meme_generated", desc, POINTS_CONFIG.meme_generated.value);

        // Check achievements (Meme Lord)
        const { newAchievements } = await checkAndAwardAchievements(cleanHandle);

        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });
        return NextResponse.json({ member: updated, newAchievements, verificationDetail });
      }

      // ===== LOGOUT =====
      case "process_referral": {
        // BUG FIX: Disabled retroactive referral processing for existing members.
        // Referral is ONLY valid at the time of FIRST registration.
        // Existing Pack members clicking a referral link must NOT be reassigned.
        // This endpoint now simply clears the referral code without processing it.
        return NextResponse.json({ processed: false, reason: "Referral only valid at registration" });
      }

      case "logout": {
        // Clear session token from DB + cookie
        const token = request.cookies.get(SESSION_COOKIE)?.value;
        if (token) {
          await db.packMember.updateMany({
            where: { sessionToken: token },
            data: { sessionToken: null },
          });
        }
        const res = NextResponse.json({ success: true });
        clearSessionCookie(res);
        return res;
      }

      // ===== WHEEL OF DOOM SPIN =====
      case "wheel_spin": {
        const member = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });
        if (!member) return NextResponse.json({ error: "Not registered" }, { status: 404 });

        // Check wallet
        if (!member.walletAddress) {
          return NextResponse.json({ error: "No wallet linked. Connect a wallet on The Arena first!" }, { status: 400 });
        }

        // Check balance >= 10M using existing checkDoomhoundBalance function
        const balanceResult = await checkDoomhoundBalance(member.walletAddress);
        if (balanceResult.balance < 10_000_000) {
          return NextResponse.json({
            error: `Hold at least 10M $DOOMHOUND to spin! Current: ${formatBalance(balanceResult.balance)}`,
            balance: balanceResult.balance,
          }, { status: 400 });
        }

        // Check weekly cooldown - last spin must be before this Monday 00:00 Rome time
        const now = new Date();
        const romeTz = "Europe/Rome";
        const getMondayMidnight = (d: Date) => {
          const romeDate = new Date(d.toLocaleString("en-US", { timeZone: romeTz }));
          const day = romeDate.getDay();
          const diff = romeDate.getDate() - day + (day === 0 ? -6 : 1); // Monday
          const monday = new Date(romeDate);
          monday.setDate(diff);
          monday.setHours(0, 0, 0, 0);
          return monday;
        };
        const thisMonday = getMondayMidnight(now);

        if (member.lastWheelSpin && new Date(member.lastWheelSpin) >= thisMonday) {
          // Calculate next Monday
          const nextMonday = new Date(thisMonday);
          nextMonday.setDate(nextMonday.getDate() + 7);
          const daysLeft = Math.ceil((nextMonday.getTime() - now.getTime()) / 86400000);
          return NextResponse.json({
            error: `Already spun this week! Next spin in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
            lastSpin: member.lastWheelSpin,
            nextSpin: nextMonday.toISOString(),
          }, { status: 400 });
        }

        // Determine result based on weighted probabilities
        const WHEEL_SEGMENTS = [
          { label: "1M", amount: 1_000_000, weight: 8, color: "#FFD700" },
          { label: "500K", amount: 500_000, weight: 12, color: "#FF6B00" },
          { label: "250K", amount: 250_000, weight: 15, color: "#DC2626" },
          { label: "NOTHING", amount: 0, weight: 60, color: "#1a1a1a" },
          { label: "RE-SPIN", amount: 0, weight: 5, color: "#7C3AED", respin: true },
        ];

        // BUG FIX: Use cryptographically secure random instead of Math.random()
        const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
        let random = randomInt(0, totalWeight);
        let selectedSegment = WHEEL_SEGMENTS[0];
        let selectedIndex = 0;
        for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
          random -= WHEEL_SEGMENTS[i].weight;
          if (random <= 0) {
            selectedSegment = WHEEL_SEGMENTS[i];
            selectedIndex = i;
            break;
          }
        }

        // Update member — RE-SPIN allows immediate re-spin (set lastWheelSpin to before this Monday)
        const won = selectedSegment.amount > 0;
        const isRespin = selectedSegment.respin || false;
        // For RE-SPIN: set lastWheelSpin to before this Monday so the frontend allows another spin immediately
        const lastSpinValue = isRespin
          ? new Date(thisMonday.getTime() - 1) // 1ms before Monday = eligible to spin again
          : new Date();
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: {
            lastWheelSpin: lastSpinValue,
            totalWheelSpins: { increment: 1 },
            totalWheelWinnings: { increment: selectedSegment.amount },
            pendingWinnings: won ? { increment: selectedSegment.amount } : member.pendingWinnings,
            prizeSent: won ? false : member.prizeSent,
            doomhoundBalance: balanceResult.balance,
            balanceCheckedAt: new Date(),
          },
        });

        // Log activity
        const desc = won
          ? `Wheel of Doom: Won ${formatBalance(selectedSegment.amount)} $DOOMHOUND! 🎉`
          : selectedSegment.respin
            ? "Wheel of Doom: RE-SPIN! Spin again right now for free!"
            : "Wheel of Doom: Nothing this time. Better luck next week!";
        await addActivity(cleanHandle, "wheel_spin", desc, 0);

        // Check achievements
        await checkAndAwardAchievements(cleanHandle);

        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });

        return NextResponse.json({
          member: updated,
          result: {
            segmentIndex: selectedIndex,
            label: selectedSegment.label,
            amount: selectedSegment.amount,
            color: selectedSegment.color,
            respin: selectedSegment.respin || false,
            won,
          },
        });
      }

      // ===== FIX REFERRAL (admin only - retroactively set referredBy) =====
      case "fix_referral": {
        const { adminPassword, handle: fixHandle, referrer } = body;
        // BUG FIX: Use only env var for admin password (no hardcoded fallback)
        if (adminPassword !== process.env.ADMIN_PASSWORD) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!fixHandle || !referrer) {
          return NextResponse.json({ error: "handle and referrer required" }, { status: 400 });
        }
        const fixClean = fixHandle.replace("@", "").trim().toLowerCase();
        const refClean = referrer.replace("@", "").trim().toLowerCase();

        // Verify both members exist
        const target = await db.packMember.findUnique({ where: { handle: fixClean } });
        if (!target) return NextResponse.json({ error: "Target member not found" }, { status: 404 });
        const referrerMember = await db.packMember.findUnique({ where: { handle: refClean } });
        if (!referrerMember) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

        // Set referredBy
        await db.packMember.update({
          where: { handle: fixClean },
          data: { referredBy: refClean },
        });

        // Award referrer points if not already awarded
        const existingRef = await db.activityLog.findFirst({
          where: { memberHandle: refClean, type: "referral", description: { contains: fixClean } },
        });
        if (!existingRef) {
          await addActivity(refClean, "referral", `Recruited @${fixClean} to the pack!`, POINTS_CONFIG.referral.value);
        }

        return NextResponse.json({ success: true, handle: fixClean, referredBy: refClean });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: [
            "register", "checkin", "verify_arena", "update_staking", "claim_staking",
            "check_balance", "claim_meme", "process_referral", "logout",
            "wheel_spin", "fix_referral", "init_airdrop"
          ],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Pack API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== BALANCE CHECK via Avalanche RPC =====
async function checkDoomhoundBalance(walletAddress: string): Promise<{ balance: number }> {
  const contract = process.env.DOOMHOUND_CONTRACT;
  if (!contract) return { balance: 0 };

  try {
    const paddedAddress = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const data = `0x70a08231${paddedAddress}`;

    const rpcUrl = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: contract, data }, "latest"],
      }),
    });

    const result = await response.json();
    if (result.error) {
      console.error("RPC error:", result.error);
      return { balance: 0 };
    }

    const rawBalance = BigInt(result.result || "0x0");
    const balance = Number(rawBalance) / 1e18;
    return { balance };
  } catch (error) {
    console.error("Balance check error:", error);
    return { balance: 0 };
  }
}
