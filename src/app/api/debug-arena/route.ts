import { NextRequest, NextResponse } from "next/server";

// TEMPORARY debug endpoint — remove after diagnosing Arena verification issue
const ARENA_API_BASE = "https://api.starsarena.com";
const ARENA_API_KEY = process.env.ARENA_API_KEY;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { threadId, handle } = body;

  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }

  const results: any = { threadId, handle, apiBase: ARENA_API_BASE, hasApiKey: !!ARENA_API_KEY };

  // Test 1: Direct thread fetch by ID
  try {
    const res = await fetch(`${ARENA_API_BASE}/agents/threads/${threadId}`, {
      headers: { "X-API-Key": ARENA_API_KEY || "", "Content-Type": "application/json" },
    });
    results.directStatus = res.status;
    results.directStatusText = res.statusText;
    const data = await res.json();
    results.directRawKeys = Object.keys(data);
    results.directThread = data.thread || data;
    if (data.thread) {
      results.directThreadKeys = Object.keys(data.thread);
    }
    if (results.directThread?.id) {
      results.directThreadId = results.directThread.id;
      results.directThreadHandle = results.directThread.userHandle;
      results.directThreadContent = stripHtml(results.directThread.content || "").substring(0, 200);
      results.directCommunityId = results.directThread.communityId;
      results.directCommunityTicker = results.directThread.community?.ticker;
    }
  } catch (err: any) {
    results.directError = err.message;
  }

  // Test 2: User profile lookup
  if (handle) {
    try {
      const res = await fetch(`${ARENA_API_BASE}/agents/user/handle?handle=${encodeURIComponent(handle)}`, {
        headers: { "X-API-Key": ARENA_API_KEY || "", "Content-Type": "application/json" },
      });
      results.profileStatus = res.status;
      const data = await res.json();
      results.profileUserHandle = data.user?.handle;
      results.profileUserId = data.user?.id;
      results.profileUserKeys = data.user ? Object.keys(data.user) : [];
      const userId = data.user?.id;

      // Test 3: User thread feed — search multiple pages
      if (userId) {
        results.feedSearchPages = [];
        let foundOnPage = 0;
        for (let page = 1; page <= 10 && !foundOnPage; page++) {
          const res2 = await fetch(`${ARENA_API_BASE}/agents/threads/feed/user?userId=${userId}&page=${page}&pageSize=50`, {
            headers: { "X-API-Key": ARENA_API_KEY || "", "Content-Type": "application/json" },
          });
          const feedData = await res2.json();
          const threads = feedData.threads || [];
          const found = threads.some((t: any) => t.id === threadId);
          results.feedSearchPages.push({
            page,
            threadCount: threads.length,
            totalCount: feedData.count,
            found,
            threadIds: threads.map((t: any) => t.id),
          });
          if (found) {
            foundOnPage = page;
            const foundThread = threads.find((t: any) => t.id === threadId);
            results.foundThread = {
              id: foundThread.id,
              handle: foundThread.userHandle,
              content: stripHtml(foundThread.content || "").substring(0, 200),
              communityId: foundThread.communityId,
              communityTicker: foundThread.community?.ticker,
            };
          }
          // If no more threads, stop
          if (threads.length === 0) break;
        }
        results.foundOnPage = foundOnPage;
      }
    } catch (err: any) {
      results.profileError = err.message;
    }
  }

  // Test 4: Community feed
  try {
    const res = await fetch(`${ARENA_API_BASE}/agents/threads/feed/community?communityId=4b326b82-46e7-4ac7-a34b-8e8d00913f0b&page=1&pageSize=10`, {
      headers: { "X-API-Key": ARENA_API_KEY || "", "Content-Type": "application/json" },
    });
    results.communityStatus = res.status;
    const commData = await res.json();
    results.communityThreadCount = commData.threads?.length || 0;
    results.communityThreadIds = (commData.threads || []).map((t: any) => ({
      id: t.id,
      handle: t.userHandle,
      snippet: stripHtml(t.content || "").substring(0, 80),
    }));
    results.foundInCommunity = (commData.threads || []).some((t: any) => t.id === threadId);
  } catch (err: any) {
    results.communityError = err.message;
  }

  // Test 5: Try alternative thread endpoint patterns
  const altEndpoints = [
    `/agents/threads/detail/${threadId}`,
    `/agents/threads/${threadId}/detail`,
    `/agents/threads/post/${threadId}`,
    `/thread/${threadId}`,
    `/agents/posts/${threadId}`,
  ];

  results.altEndpoints = [];
  for (const ep of altEndpoints) {
    try {
      const res = await fetch(`${ARENA_API_BASE}${ep}`, {
        headers: { "X-API-Key": ARENA_API_KEY || "", "Content-Type": "application/json" },
      });
      results.altEndpoints.push({ endpoint: ep, status: res.status });
    } catch (err: any) {
      results.altEndpoints.push({ endpoint: ep, error: err.message });
    }
  }

  return NextResponse.json(results);
}
