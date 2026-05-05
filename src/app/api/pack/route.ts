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
  });
  if (!res.ok) throw new Error(`Arena API error: ${res.status}`);
  return res.json();
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

        const fullMember = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });

        return NextResponse.json({
          member: fullMember,
          alreadyRegistered: false,
          balanceBonus,
          balanceTierLabel,
        });
      }

      // ===== DAILY CHECK-IN =====
      case "checkin": {
        const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }
        if (member.lastCheckIn) {
          const last = new Date(member.lastCheckIn);
          const now = new Date();
          if (
            last.getFullYear() === now.getFullYear() &&
            last.getMonth() === now.getMonth() &&
            last.getDate() === now.getDate()
          ) {
            return NextResponse.json({ error: "Already checked in today", member });
          }
        }
        await addActivity(cleanHandle, "daily_checkin", "Daily summon completed", POINTS_CONFIG.daily_checkin.value);
        await db.packMember.update({
          where: { handle: cleanHandle },
          data: { lastCheckIn: new Date() },
        });
        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });
        return NextResponse.json({ member: updated });
      }

      // ===== VERIFY ARENA ACTIVITY =====
      // This is the key action: fetches current Arena profile stats,
      // compares with stored values, and awards points for differences
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

        const newThreads = Math.max(0, currentThreadCount - member.lastThreadCount);
        const newFollowers = Math.max(0, currentFollowerCount - member.lastFollowerCount);

        let totalNewPoints = 0;
        const verifiedActivities: { type: string; description: string; points: number }[] = [];

        // Award points for new threads (posts)
        if (newThreads > 0) {
          const pts = newThreads * POINTS_CONFIG.arena_post.value;
          totalNewPoints += pts;
          verifiedActivities.push({
            type: "arena_post",
            description: `${newThreads} new post${newThreads > 1 ? "s" : ""} on Arena detected!`,
            points: pts,
          });
        }

        // Award points for new followers
        if (newFollowers > 0) {
          const pts = newFollowers * POINTS_CONFIG.arena_follower.value;
          totalNewPoints += pts;
          verifiedActivities.push({
            type: "arena_follower",
            description: `${newFollowers} new follower${newFollowers > 1 ? "s" : ""} on Arena!`,
            points: pts,
          });
        }

        // 2. Scan trending feed for mentions of this user or $DOOMHOUND
        const trendingData = await arenaFetch(
          "/agents/threads/feed/trendingPosts?pageSize=50"
        );
        const threads = trendingData.threads || [];
        let trendingBonus = 0;

        for (const thread of threads) {
          const content = stripHtml(thread.content || "").toLowerCase();
          const threadHandle = (thread.userHandle || "").toLowerCase();
          const communityTicker = thread.community?.ticker?.toLowerCase();

          // Check if this user posted in trending AND mentions $DOOMHOUND or is in DOOMHOUND community
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
            break; // Only award once per verify
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
        });
      }

      // ===== CHECK $DOOMHOUND BALANCE =====
      case "check_balance": {
        const member = await db.packMember.findUnique({ where: { handle: cleanHandle } });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }
        if (!member.walletAddress) {
          return NextResponse.json({ error: "No wallet address linked to your Arena profile", member });
        }
        if (!process.env.DOOMHOUND_CONTRACT) {
          return NextResponse.json({
            error: "Token not launched yet — balance check available after launch!",
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
        });
      }

      // ===== CLAIM MEME =====
      case "claim_meme": {
        const member = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" } } },
        });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }
        const lastMeme = member.activities.find(
          (a) => a.type === "meme_generated" && Date.now() - new Date(a.createdAt).getTime() < 600000
        );
        if (lastMeme) {
          return NextResponse.json({ error: "Cooldown: 10 minutes between claims", member });
        }
        await addActivity(cleanHandle, "meme_generated", "Forged a $DOOMHOUND meme!", POINTS_CONFIG.meme_generated.value);
        const updated = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });
        return NextResponse.json({ member: updated });
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
