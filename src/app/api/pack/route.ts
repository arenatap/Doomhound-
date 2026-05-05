import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

// ===== ARENA API =====
const ARENA_API_BASE = "https://api.starsarena.com";
const ARENA_API_KEY = process.env.ARENA_API_KEY;

async function arenaFetch(endpoint: string) {
  const res = await fetch(`${ARENA_API_BASE}${endpoint}`, {
    headers: {
      "X-API-Key": ARENA_API_KEY || "",
      "Content-Type": "application/json",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Arena API error: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
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

  let achievements = parseAchievements(member.achievements);
  const beforeIds = new Set(achievements.map((a) => a.id));

  // First Blood — First check-in
  const hasCheckin = member.activities.some((a) => a.type === "daily_checkin");
  if (hasCheckin) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "first_blood")!);
  }

  // Pack Starter — Referred 1 member
  const hasReferral = member.activities.some((a) => a.type === "referral");
  if (hasReferral) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "pack_starter")!);
  }

  // 7-Day Streak
  if (member.streakCount >= 7) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "7_day_streak")!);
  }

  // Howler — 10+ Arena posts verified (total arena_post activities)
  const arenaPostCount = member.activities.filter((a) => a.type === "arena_post").length;
  // Each arena_post activity can represent multiple posts, so we sum from descriptions or use threadCount
  // Simpler: count activities of type arena_post
  if (arenaPostCount >= 10) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "howler")!);
  }

  // Whale Spotter — Holds 1M+ $DOOMHOUND
  if (member.doomhoundBalance >= 1_000_000) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "whale_spotter")!);
  }

  // Trending Demon — Had a trending post
  const hasTrending = member.activities.some((a) => a.type === "trending_mention");
  if (hasTrending) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "trending_demon")!);
  }

  // OG Hound — Registered in first 24h of site launch
  const launchPlus24h = new Date(SITE_LAUNCH_DATE.getTime() + 24 * 60 * 60 * 1000);
  if (new Date(member.createdAt) <= launchPlus24h) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "og_hound")!);
  }

  // Meme Lord — 5+ memes forged
  const memeCount = member.activities.filter((a) => a.type === "meme_generated").length;
  if (memeCount >= 5) {
    achievements = awardAchievement(achievements, ACHIEVEMENT_DEFS.find((d) => d.id === "meme_lord")!);
  }

  // Find newly awarded
  const afterIds = new Set(achievements.map((a) => a.id));
  const newIds = [...afterIds].filter((id) => !beforeIds.has(id));

  // Save if changed
  if (newIds.length > 0) {
    await db.packMember.update({
      where: { handle },
      data: { achievements: stringifyAchievements(achievements) },
    });
  }

  return { newAchievements: newIds };
}

// ===== HELPERS =====
async function addActivity(handle: string, type: string, description: string, points: number) {
  await db.activityLog.create({
    data: { memberHandle: handle, type, description, points },
  });
  const member = await db.packMember.findUnique({ where: { handle } });
  if (member) {
    const newPoints = member.points + points;
    const newRank = getRank(newPoints);
    await db.packMember.update({
      where: { handle },
      data: { points: newPoints, rank: newRank },
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

// ===== GET: Leaderboard + Profile =====
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
        const handle = searchParams.get("handle");
        if (!handle) {
          return NextResponse.json({ error: "handle is required" }, { status: 400 });
        }
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
        return NextResponse.json({ member });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["leaderboard", "profile"],
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

  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const cleanHandle = handle.replace("@", "").trim().toLowerCase();

  try {
    switch (action) {
      // ===== REGISTER =====
      case "register": {
        const existing = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (existing) {
          const member = await db.packMember.findUnique({
            where: { handle: cleanHandle },
            include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
          });
          return NextResponse.json({ member, alreadyRegistered: true });
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

        // Referral
        const ref = body.referral as string | undefined;
        if (ref && ref !== cleanHandle) {
          const referrer = await db.packMember.findUnique({ where: { handle: ref } });
          if (referrer) {
            await addActivity(ref, "referral", `Recruited @${cleanHandle} to the pack!`, POINTS_CONFIG.referral.value);
            await db.packMember.update({
              where: { handle: cleanHandle },
              data: { referredBy: ref },
            });
          }
        }

        // Check & award achievements (OG Hound check, etc.)
        const { newAchievements } = await checkAndAwardAchievements(cleanHandle);

        const fullMember = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });

        return NextResponse.json({
          member: fullMember,
          alreadyRegistered: false,
          balanceBonus,
          balanceTierLabel,
          newAchievements,
        });
      }

      // ===== DAILY CHECK-IN =====
      case "checkin": {
        const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }

        // Use Europe/Rome timezone for date comparison (user's timezone)
        const now = new Date();
        const userTz = body.timezone || "Europe/Rome";
        const getUserDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: userTz }); // YYYY-MM-DD format
        
        const todayStr = getUserDate(now);

        if (member.lastCheckIn) {
          const lastStr = getUserDate(new Date(member.lastCheckIn));
          if (lastStr === todayStr) {
            return NextResponse.json({ error: "Already checked in today", member });
          }
        }

        // Calculate streak
        let newStreakCount = 1;
        if (member.lastStreakAt) {
          const lastStreakStr = getUserDate(new Date(member.lastStreakAt));
          // Calculate yesterday in user's timezone
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = getUserDate(yesterday);

          if (lastStreakStr === yesterdayStr) {
            // Last streak was yesterday — continue streak
            newStreakCount = member.streakCount + 1;
          } else if (lastStreakStr === todayStr) {
            // Already checked in today (shouldn't happen, but keep streak)
            newStreakCount = member.streakCount;
          }
          // If last streak was before yesterday, streak resets to 1 (default)
        }

        await addActivity(cleanHandle, "daily_checkin", `Daily summon completed (streak: ${newStreakCount})`, POINTS_CONFIG.daily_checkin.value);
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: { lastCheckIn: new Date(), streakCount: newStreakCount, lastStreakAt: new Date() },
        });

        // Check achievements (First Blood, 7-Day Streak)
        const { newAchievements } = await checkAndAwardAchievements(cleanHandle);

        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });
        return NextResponse.json({ member: updated, newAchievements });
      }

      // ===== VERIFY ARENA ACTIVITY =====
      case "verify_arena": {
        const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
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

        // Scan trending feed for mentions of this user's $DOOMHOUND posts
        const trendingData = await arenaFetch(
          "/agents/threads/feed/trendingPosts?pageSize=50"
        );
        const threads = trendingData.threads || [];
        let trendingBonus = 0;

        for (const thread of threads) {
          const content = stripHtml(thread.content || "").toLowerCase();
          const threadHandle = (thread.userHandle || "").toLowerCase();
          const communityTicker = thread.community?.ticker?.toLowerCase();

          const isDoomhoundPost =
            content.includes("doomhound") ||
            content.includes("$doomhound") ||
            communityTicker === "doomhound";

          if (threadHandle === cleanHandle && isDoomhoundPost) {
            trendingBonus += POINTS_CONFIG.trending_mention.value;
            verifiedActivities.push({
              type: "trending_mention",
              description: `Your $DOOMHOUND post is trending on Arena! 🔥`,
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
          trendingBonus,
          totalNewPoints,
          currentThreadCount,
          currentFollowerCount,
          newAchievements,
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

        // Recalculate total points from all activities
        const allActivities = await db.activityLog.findMany({
          where: { memberHandle: cleanHandle },
        });
        const totalPoints = allActivities.reduce((sum, a) => sum + a.points, 0);

        await db.packMember.update({
          where: { handle: cleanHandle },
          data: {
            doomhoundBalance: balanceResult.balance,
            balanceCheckedAt: new Date(),
            points: totalPoints,
            rank: getRank(totalPoints),
          },
        });

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
        const lastMeme = member.activities.find(
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

        if (threadId) {
          try {
            // Try to fetch the thread from Arena API
            const threadData = await arenaFetch(`/agents/threads/${threadId}`);
            const thread = threadData.thread || threadData;

            if (thread) {
              // Verify ownership — the thread must be from this user
              const threadHandle = (
                thread.userHandle ||
                thread.user?.handle ||
                thread.handle ||
                ""
              ).toLowerCase();

              if (threadHandle === cleanHandle) {
                // Verify content mentions $DOOMHOUND
                const content = stripHtml(thread.content || "").toLowerCase();
                const communityTicker = thread.community?.ticker?.toLowerCase();

                const isDoomhoundRelated =
                  content.includes("doomhound") ||
                  content.includes("$doomhound") ||
                  content.includes("doom") ||
                  communityTicker === "doomhound";

                if (isDoomhoundRelated) {
                  verified = true;
                  verificationDetail = "Content verified on Arena";
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
            // Thread API might not support direct lookup, fall back to threadCount check
            console.log("Thread API lookup failed, falling back to threadCount verification:", err?.message || err);
          }
        }

        // Fallback verification: check if threadCount has increased
        if (!verified) {
          try {
            const arenaData = await arenaFetch(
              `/agents/user/handle?handle=${encodeURIComponent(cleanHandle)}`
            );
            if (arenaData.user) {
              const currentThreadCount = arenaData.user.threadCount || 0;
              if (currentThreadCount > member.lastThreadCount) {
                verified = true;
                verificationDetail = "New post activity detected on Arena";
                // Update the tracked thread count
                await db.packMember.update({
                  where: { handle: cleanHandle },
                  data: { lastThreadCount: currentThreadCount },
                });
              } else {
                return NextResponse.json({
                  error: "No new post detected on your Arena profile. Make sure you posted on Arena first!",
                }, { status: 400 });
              }
            }
          } catch (err) {
            console.error("Arena profile fetch failed:", err);
          }
        }

        if (!verified) {
          return NextResponse.json({
            error: "Could not verify your post on Arena. Make sure you posted about $DOOMHOUND and the URL is correct.",
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

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
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
