import { NextRequest, NextResponse } from "next/server";

// ===== ARENA API — REAL ENDPOINTS =====
// Docs: https://arena.social/agents
// Base URL: https://api.starsarena.com
// All endpoints require X-API-Key header

const ARENA_API_BASE = "https://api.starsarena.com";
const ARENA_API_KEY = process.env.ARENA_API_KEY || "";

// The DOOMHOUND user ID on Arena (set after registration)
// Can be found via /agents/user/handle?handle=doomhound
const DOOMHOUND_USER_ID = process.env.DOOMHOUND_SUBJECT_ID || "";

async function arenaFetch(endpoint: string, options?: RequestInit) {
  const url = `${ARENA_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "X-API-Key": ARENA_API_KEY,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    next: { revalidate: 30 }, // Cache for 30s
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Arena API error: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      // ===== SHARES & KEY DATA =====

      // Get $DOOMHOUND share/key stats (price, holders, market cap)
      case "stats": {
        const userId = searchParams.get("userId") || DOOMHOUND_USER_ID;
        if (!userId) {
          return NextResponse.json(
            { error: "userId or DOOMHOUND_SUBJECT_ID env required" },
            { status: 400 }
          );
        }
        const data = await arenaFetch(`/agents/shares/stats?userId=${userId}`);
        return NextResponse.json(data);
      }

      // Get holders of $DOOMHOUND keys/shares
      case "holders": {
        const userId = searchParams.get("userId") || DOOMHOUND_USER_ID;
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "25";
        const endpoint = userId
          ? `/agents/shares/holders?userId=${userId}&page=${page}&pageSize=${pageSize}`
          : `/agents/shares/holders?page=${page}&pageSize=${pageSize}`;
        const data = await arenaFetch(endpoint);
        return NextResponse.json(data);
      }

      // Get holder wallet addresses
      case "holder-addresses": {
        const userId = searchParams.get("userId") || DOOMHOUND_USER_ID;
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "25";
        const data = await arenaFetch(
          `/agents/shares/holder-addresses?userId=${userId}&page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // Get the agent's holdings (shares of other users)
      case "holdings": {
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "25";
        const data = await arenaFetch(
          `/agents/shares/holdings?page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // Get earnings breakdown
      case "earnings": {
        const userId = searchParams.get("userId") || DOOMHOUND_USER_ID;
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const data = await arenaFetch(
          `/agents/shares/earnings-breakdown?userId=${userId}`
        );
        return NextResponse.json(data);
      }

      // ===== USER DATA =====

      // Get user profile by handle
      case "profile": {
        const handle = searchParams.get("handle");
        if (!handle) {
          return NextResponse.json(
            { error: "handle is required" },
            { status: 400 }
          );
        }
        const data = await arenaFetch(
          `/agents/user/handle?handle=${encodeURIComponent(handle)}`
        );
        return NextResponse.json(data);
      }

      // Get user by ID
      case "user": {
        const userId = searchParams.get("userId");
        if (!userId) {
          return NextResponse.json(
            { error: "userId is required" },
            { status: 400 }
          );
        }
        const data = await arenaFetch(
          `/agents/user/id?userId=${userId}`
        );
        return NextResponse.json(data);
      }

      // Get the DOOMHOUND profile (combined profile + stats)
      case "doomhound": {
        const userId = DOOMHOUND_USER_ID;
        if (!userId) {
          return NextResponse.json(
            { error: "DOOMHOUND_SUBJECT_ID env not set" },
            { status: 400 }
          );
        }
        // Fetch profile + share stats in parallel
        const [profileData, statsData, holdersData] = await Promise.allSettled([
          arenaFetch(`/agents/user/id?userId=${userId}`),
          arenaFetch(`/agents/shares/stats?userId=${userId}`),
          arenaFetch(`/agents/shares/holders?userId=${userId}&page=1&pageSize=10`),
        ]);

        return NextResponse.json({
          profile: profileData.status === "fulfilled" ? profileData.value : null,
          stats: statsData.status === "fulfilled" ? statsData.value : null,
          holders: holdersData.status === "fulfilled" ? holdersData.value : null,
        });
      }

      // Get top users on Arena
      case "top": {
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "20";
        const data = await arenaFetch(
          `/agents/user/top?page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // Search users
      case "search": {
        const q = searchParams.get("q");
        if (!q) {
          return NextResponse.json(
            { error: "q parameter is required" },
            { status: 400 }
          );
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "20";
        const data = await arenaFetch(
          `/agents/user/search?searchString=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // ===== THREADS & POSTS =====

      // Get trending posts
      case "trending": {
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "10";
        const data = await arenaFetch(
          `/agents/threads/feed/trendingPosts?page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // Get user's threads/posts
      case "threads": {
        const userId = searchParams.get("userId") || DOOMHOUND_USER_ID;
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "10";
        const data = await arenaFetch(
          `/agents/threads/feed/user?userId=${userId}&page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // ===== FOLLOW DATA =====

      // Get followers
      case "followers": {
        const userId = searchParams.get("userId") || DOOMHOUND_USER_ID;
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "20";
        const data = await arenaFetch(
          `/agents/follow/followers/list?followersOfUserId=${userId}&pageNumber=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // Get following
      case "following": {
        const userId = searchParams.get("userId") || DOOMHOUND_USER_ID;
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "20";
        const data = await arenaFetch(
          `/agents/follow/following/list?followingUserId=${userId}&pageNumber=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // ===== COMBINED LIVE DATA FOR TICKER =====

      // Get combined live data for the ticker + status section
      case "live": {
        const userId = DOOMHOUND_USER_ID;
        if (!userId) {
          // No Arena API key configured — return fallback
          return NextResponse.json({
            connected: false,
            message: "Arena API not configured. Set ARENA_API_KEY and DOOMHOUND_SUBJECT_ID.",
          });
        }

        const [statsResult, holdersResult, profileResult] = await Promise.allSettled([
          arenaFetch(`/agents/shares/stats?userId=${userId}`),
          arenaFetch(`/agents/shares/holders?userId=${userId}&page=1&pageSize=5`),
          arenaFetch(`/agents/user/id?userId=${userId}`),
        ]);

        return NextResponse.json({
          connected: true,
          stats: statsResult.status === "fulfilled" ? statsResult.value?.stats : null,
          topHolders: holdersResult.status === "fulfilled"
            ? (holdersResult.value?.holders || []).slice(0, 5)
            : [],
          profile: profileResult.status === "fulfilled" ? profileResult.value?.user : null,
          fetchedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            availableActions: [
              "stats", "holders", "holder-addresses", "holdings", "earnings",
              "profile", "user", "doomhound", "top", "search",
              "trending", "threads", "followers", "following", "live",
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
