import { NextRequest, NextResponse } from "next/server";

const ARENA_API_BASE = "https://api.starsarena.com";
const ARENA_API_KEY = process.env.ARENA_API_KEY;

async function arenaFetch(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${ARENA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "X-API-Key": ARENA_API_KEY || "",
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Arena API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      // Get token/share holders — requires subjectId
      case "holders": {
        const subjectId = searchParams.get("subjectId");
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "25";
        if (!subjectId) {
          return NextResponse.json(
            { error: "subjectId is required" },
            { status: 400 }
          );
        }
        const data = await arenaFetch(
          `/agents/shares/holders?subjectId=${subjectId}&page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // Get user's shares holdings
      case "holdings": {
        const page = searchParams.get("page") || "1";
        const pageSize = searchParams.get("pageSize") || "25";
        const data = await arenaFetch(
          `/agents/shares/holdings?page=${page}&pageSize=${pageSize}`
        );
        return NextResponse.json(data);
      }

      // Get shares stats
      case "stats": {
        const data = await arenaFetch("/agents/shares/stats");
        return NextResponse.json(data);
      }

      // Get trending posts from Arena (includes community/token data)
      case "trending": {
        const data = await arenaFetch(
          "/agents/threads/feed/trendingPosts?pageSize=10"
        );
        return NextResponse.json(data);
      }

      // Search for a user/token on Arena
      case "search": {
        const query = searchParams.get("q");
        if (!query) {
          return NextResponse.json(
            { error: "q parameter is required" },
            { status: 400 }
          );
        }
        const data = await arenaFetch(
          `/agents/user/search?query=${encodeURIComponent(query)}`
        );
        return NextResponse.json(data);
      }

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

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            availableActions: [
              "holders",
              "holdings",
              "stats",
              "trending",
              "search",
              "profile",
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
