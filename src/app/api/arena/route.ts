import { NextRequest, NextResponse } from "next/server";

// ===== ARENA API — COMMUNITY ENDPOINTS =====
// DOOMHOUND is a Community on The Arena, NOT a regular user.
// Community ID: 4b326b82-46e7-4ac7-a34b-8e8d00913f0b
// Owner (Toff): 50e801a6-0f7d-4ca9-a855-462f834f2900
// Contract: 0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb

const ARENA_API_BASE = "https://api.starsarena.com";
const ARENA_API_KEY = process.env.ARENA_API_KEY || "";

const DOOMHOUND_COMMUNITY_ID = "4b326b82-46e7-4ac7-a34b-8e8d00913f0b";
const DOOMHOUND_OWNER_ID = "50e801a6-0f7d-4ca9-a855-462f834f2900";

async function arenaFetch(endpoint: string, options?: RequestInit) {
  const url = `${ARENA_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "X-API-Key": ARENA_API_KEY,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    next: { revalidate: 20 }, // Cache for 20s for live feel
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Arena API error: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

// Helper: convert wei-like string to AVAX number
function weiToAvax(wei: string | number): number {
  if (!wei) return 0;
  const val = typeof wei === "string" ? parseFloat(wei) : wei;
  return val / 1e18;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      // ===== LIVE DATA (for ticker + status section) =====
      case "live": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({
            connected: false,
            message: "Arena API not configured. Set ARENA_API_KEY env.",
          });
        }

        // Fetch community data (includes stats) + owner profile
        const [communityResult, ownerResult] = await Promise.allSettled([
          arenaFetch(`/agents/communities/search?searchString=doomhound&page=1&pageSize=10`),
          arenaFetch(`/agents/user/id?userId=${DOOMHOUND_OWNER_ID}`),
        ]);

        // Extract community data
        let community: any = null;
        if (communityResult.status === "fulfilled") {
          const communities = communityResult.value?.communities || [];
          community = communities.find(
            (c: any) => c.contractAddress?.toLowerCase() === "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb".toLowerCase()
          ) || communities[0] || null;
        }

        // Extract owner profile
        let ownerProfile: any = null;
        if (ownerResult.status === "fulfilled") {
          ownerProfile = ownerResult.value?.user || null;
        }

        // Build stats from community data
        const stats = community?.stats || null;
        const formattedStats = stats
          ? {
              price: weiToAvax(stats.price),
              marketCap: weiToAvax(stats.marketCap),
              totalSupply: weiToAvax(stats.totalSupply),
              buys: stats.buys || 0,
              sells: stats.sells || 0,
              buyVolume: stats.buyVolume || "0",
              sellVolume: stats.sellVolume || "0",
              liquidity: weiToAvax(stats.liquidity),
            }
          : null;

        return NextResponse.json({
          connected: true,
          community: community
            ? {
                id: community.id,
                name: community.name,
                ticker: community.ticker,
                tokenName: community.tokenName,
                description: community.description,
                photoURL: community.photoURL,
                contractAddress: community.contractAddress,
                followerCount: community.followerCount || 0,
                tokenPhase: community.tokenPhase,
                createdOn: community.createdOn,
                paymentToken: community.paymentToken,
              }
            : null,
          stats: formattedStats,
          ownerProfile: ownerProfile
            ? {
                handle: ownerProfile.handle,
                userName: ownerProfile.userName,
                profilePicture: ownerProfile.profilePicture,
                followerCount: ownerProfile.followerCount || 0,
                threadCount: ownerProfile.threadCount || 0,
                keyPrice: weiToAvax(ownerProfile.keyPrice || ownerProfile.lastKeyPrice || "0"),
              }
            : null,
          fetchedAt: new Date().toISOString(),
        });
      }

      // ===== COMMUNITY DETAILS =====
      case "community": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const data = await arenaFetch(
          `/agents/communities/search?searchString=doomhound&page=1&pageSize=10`
        );
        const community = (data.communities || []).find(
          (c: any) => c.contractAddress?.toLowerCase() === "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb".toLowerCase()
        ) || data.communities?.[0] || null;
        return NextResponse.json({ community });
      }

      // ===== OWNER (TOFF) SHARES =====
      case "stats": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const data = await arenaFetch(
          `/agents/shares/stats?userId=${DOOMHOUND_OWNER_ID}`
        );
        return NextResponse.json(data);
      }

      // ===== OWNER KEY HOLDERS =====
      case "holders": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "25";
        const data = await arenaFetch(
          `/agents/shares/holders?userId=${DOOMHOUND_OWNER_ID}&page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // ===== OWNER PROFILE =====
      case "profile": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const data = await arenaFetch(
          `/agents/user/id?userId=${DOOMHOUND_OWNER_ID}`
        );
        return NextResponse.json(data);
      }

      // ===== OWNER THREADS =====
      case "threads": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "10";
        const data = await arenaFetch(
          `/agents/threads/feed/user?userId=${DOOMHOUND_OWNER_ID}&page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // ===== TRENDING POSTS =====
      case "trending": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "10";
        const data = await arenaFetch(
          `/agents/threads/feed/trendingPosts?page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // ===== USER LOOKUP (for pack registration) =====
      case "user": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const handle = searchParams.get("handle");
        if (!handle) {
          return NextResponse.json({ error: "handle is required" }, { status: 400 });
        }
        const data = await arenaFetch(
          `/agents/user/handle?handle=${encodeURIComponent(handle)}`
        );
        return NextResponse.json(data);
      }

      // ===== USER SEARCH =====
      case "search": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const q = searchParams.get("q");
        if (!q) {
          return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
        }
        const data = await arenaFetch(
          `/agents/user/search?searchString=${encodeURIComponent(q)}&page=1&pageSize=20`
        );
        return NextResponse.json(data);
      }

      // ===== FOLLOWERS OF OWNER =====
      case "followers": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "20";
        const data = await arenaFetch(
          `/agents/follow/followers/list?followersOfUserId=${DOOMHOUND_OWNER_ID}&pageNumber=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // ===== EARNINGS BREAKDOWN =====
      case "earnings": {
        if (!ARENA_API_KEY) {
          return NextResponse.json({ error: "Arena API not configured" }, { status: 400 });
        }
        const data = await arenaFetch(
          `/agents/shares/earnings-breakdown?userId=${DOOMHOUND_OWNER_ID}`
        );
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            availableActions: [
              "live", "community", "stats", "holders", "profile",
              "threads", "trending", "user", "search", "followers", "earnings",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Arena API error:", error);
    return NextResponse.json(
      { error: error.message || "Arena API request failed" },
      { status: 500 }
    );
  }
}
