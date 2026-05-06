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

// In-memory cache to reduce Arena API calls (rate limit: 1000 req/hr)
const arenaCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL_DEFAULT = 30_000; // 30s for live data
const CACHE_TTL_STATIC = 120_000; // 2min for static data (profiles, etc.)

async function arenaFetch(endpoint: string, options?: RequestInit, cacheTtl = CACHE_TTL_DEFAULT): Promise<any> {
  const cacheKey = `GET:${endpoint}`;
  const cached = arenaCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  try {
    const url = `${ARENA_API_BASE}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "X-API-Key": ARENA_API_KEY,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      // If rate limited, return stale cache if available (even if expired)
      if (res.status === 429 && cached) {
        console.log(`Arena 429 — using stale cache for ${endpoint}`);
        return cached.data;
      }
      // For other errors, try stale cache too
      if (cached) {
        console.log(`Arena ${res.status} — using stale cache for ${endpoint}`);
        return cached.data;
      }
      // No cache available, return null instead of throwing
      console.error(`Arena API error: ${res.status} — no cache for ${endpoint}`);
      return null;
    }
    const data = await res.json();
    arenaCache.set(cacheKey, { data, expires: Date.now() + cacheTtl });
    return data;
  } catch (err) {
    // Network error — use stale cache if available
    if (cached) {
      console.log(`Arena fetch error — using stale cache for ${endpoint}`);
      return cached.data;
    }
    console.error(`Arena fetch error — no cache for ${endpoint}:`, err);
    return null;
  }
}

// Helper: convert wei-like string to number (divide by 1e18)
function fromWei(wei: string | number): number {
  if (!wei) return 0;
  const val = typeof wei === "string" ? parseFloat(wei) : wei;
  return val / 1e18;
}

// Arena bonding curve constants (from Arena production source)
const ARENA_PER_AVAX = 4274.28; // 2,149,963.74 $ARENA / 503 AVAX
const GRADUATION_LIQUIDITY_AVAX = 503;
const GRADUATION_LIQUIDITY_ARENA = 2_149_963.74;

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
        const communityData = await arenaFetch(`/agents/communities/search?searchString=doomhound&page=1&pageSize=10`, undefined, CACHE_TTL_DEFAULT);
        const ownerData = await arenaFetch(`/agents/user/id?userId=${DOOMHOUND_OWNER_ID}`, undefined, CACHE_TTL_STATIC);

        // Fetch AVAX/USD price from CoinGecko (cached for 5 min)
        let avaxUsd = 9.6; // fallback
        try {
          const cgCacheKey = "GET:coingecko:avax";
          const cgCached = arenaCache.get(cgCacheKey);
          if (cgCached && Date.now() < cgCached.expires) {
            avaxUsd = cgCached.data;
          } else {
            const cgRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd");
            if (cgRes.ok) {
              const cgData = await cgRes.json();
              avaxUsd = cgData?.["avalanche-2"]?.usd || 9.6;
              arenaCache.set(cgCacheKey, { data: avaxUsd, expires: Date.now() + 300_000 }); // 5 min cache
            }
          }
        } catch {
          // Keep fallback
        }

        // Extract community data
        let community: any = null;
        if (communityData) {
          const communities = communityData.communities || [];
          community = communities.find(
            (c: any) => c.contractAddress?.toLowerCase() === "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb".toLowerCase()
          ) || communities[0] || null;
        }

        // Extract owner profile
        let ownerProfile: any = null;
        if (ownerData) {
          ownerProfile = ownerData.user || null;
        }

        // Build stats from community data
        // CRITICAL: The Arena API returns different units depending on paymentToken:
        // - price, marketCap, totalSupply are ALWAYS in AVAX-wei (18 decimals)
        // - liquidity is in the PAYMENT TOKEN's wei:
        //   * If paymentToken === "arena" → liquidity is in $ARENA-wei (18 decimals)
        //   * If paymentToken === "avax"  → liquidity is in AVAX-wei (18 decimals)
        // This is because the bonding curve accumulates whatever token users pay with.
        const stats = community?.stats || null;
        const paymentToken = community?.paymentToken || "arena";

        // Convert raw liquidity based on payment token
        let liquidityArena = 0;
        let liquidityAvax = 0;
        if (stats?.liquidity) {
          const liquidityRaw = fromWei(stats.liquidity); // raw value / 1e18
          if (paymentToken === "arena") {
            liquidityArena = liquidityRaw;
            liquidityAvax = liquidityRaw / ARENA_PER_AVAX;
          } else {
            // paymentToken === "avax" or other
            liquidityAvax = liquidityRaw;
            liquidityArena = liquidityRaw * ARENA_PER_AVAX;
          }
        }

        // Calculate bonding curve progress correctly
        // Use liquidity (in $ARENA) vs graduation threshold (2,149,963.74 $ARENA)
        // This is more accurate than marketCap because it reflects actual deposited funds
        const bondingCurveProgress = liquidityArena > 0
          ? Math.min(100, (liquidityArena / GRADUATION_LIQUIDITY_ARENA) * 100)
          : null;

        const formattedStats = stats
          ? {
              price: fromWei(stats.price),
              marketCap: fromWei(stats.marketCap),
              totalSupply: fromWei(stats.totalSupply),
              buys: stats.buys || 0,
              sells: stats.sells || 0,
              buyVolume: stats.buyVolume || "0",
              sellVolume: stats.sellVolume || "0",
              liquidityAvax: liquidityAvax,
              liquidityArena: liquidityArena,
            }
          : null;

        return NextResponse.json({
          connected: true,
          rateLimited: !communityData, // true if Arena API returned 429 with no cache
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
                isLP: community.isLP || false,
                bcGroupId: community.bcGroupId || null,
                // Calculated bonding curve progress (from liquidity / graduation threshold)
                bondingCurveProgress: bondingCurveProgress,
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
                keyPrice: fromWei(ownerProfile.keyPrice || ownerProfile.lastKeyPrice || "0"),
              }
            : null,
          fetchedAt: new Date().toISOString(),
          avaxUsd: avaxUsd,
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
