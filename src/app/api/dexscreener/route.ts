import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ===== DEX SCREENER API PROXY =====
// Fetches real-time pair data from DEX Screener and stores price snapshots
// for historical chart building.

const DEXSCREENER_PAIR = "0x6eee7befd37571e8da63fa80a7e967eeb98465d7eee9c37d66e9e124fca68a41";
const DEXSCREENER_API = `https://api.dexscreener.com/latest/dex/pairs/avalanche/${DEXSCREENER_PAIR}`;

// In-memory cache for DEX Screener API (avoid hammering)
let dexCache: { data: any; expires: number } | null = null;
const DEX_CACHE_TTL = 15_000; // 15s

async function fetchDexData(): Promise<any> {
  // Check cache first
  if (dexCache && Date.now() < dexCache.expires) {
    return dexCache.data;
  }

  try {
    const res = await fetch(DEXSCREENER_API, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      console.error(`DEX Screener API error: ${res.status}`);
      // Return stale cache if available
      if (dexCache) return dexCache.data;
      return null;
    }

    const data = await res.json();
    const pair = data?.pairs?.[0] || data?.pair || null;

    if (pair) {
      dexCache = { data: pair, expires: Date.now() + DEX_CACHE_TTL };
    }

    return pair;
  } catch (err) {
    console.error("DEX Screener fetch error:", err);
    if (dexCache) return dexCache.data;
    return null;
  }
}

// Save a price snapshot to the database (for chart history)
async function saveSnapshot(pair: any): Promise<void> {
  try {
    const priceUsd = parseFloat(pair.priceUsd || "0");
    const priceNative = parseFloat(pair.priceNative || "0");
    const volumeH24 = pair.volume?.h24 || 0;
    const liquidityUsd = pair.liquidity?.usd || 0;
    const marketCap = pair.marketCap || pair.fdv || 0;

    // Only save if we have meaningful data
    if (priceUsd <= 0 && priceNative <= 0) return;

    // Check if we already saved a snapshot in the last 60 seconds
    const recentSnapshot = await db.priceSnapshot.findFirst({
      where: {
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
      orderBy: { createdAt: "desc" },
    });

    // If a recent snapshot exists and the price hasn't changed significantly, skip
    if (recentSnapshot) {
      const priceChange = Math.abs(recentSnapshot.priceUsd - priceUsd) / Math.max(recentSnapshot.priceUsd, 0.0000001);
      if (priceChange < 0.001 && Date.now() - recentSnapshot.createdAt.getTime() < 60_000) {
        return; // Skip — price barely changed and snapshot is very recent
      }
    }

    await db.priceSnapshot.create({
      data: {
        priceUsd,
        priceNative,
        volumeH24,
        liquidityUsd,
        marketCap,
        priceChangeH1: pair.priceChange?.h1 || 0,
        priceChangeH24: pair.priceChange?.h24 || 0,
        txnsBuysH1: pair.txns?.h1?.buys || 0,
        txnsSellsH1: pair.txns?.h1?.sells || 0,
      },
    });
  } catch (err) {
    console.error("Failed to save price snapshot:", err);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "live";

  try {
    switch (action) {
      // ===== LIVE PAIR DATA =====
      case "live": {
        const pair = await fetchDexData();

        if (!pair) {
          return NextResponse.json({
            connected: false,
            message: "DEX Screener API unavailable",
          });
        }

        // Save snapshot in background (don't await to keep response fast)
        saveSnapshot(pair).catch(() => {});

        // Format response
        const priceUsd = parseFloat(pair.priceUsd || "0");
        const priceNative = parseFloat(pair.priceNative || "0");

        return NextResponse.json({
          connected: true,
          pair: {
            chainId: pair.chainId,
            dexId: pair.dexId,
            pairAddress: pair.pairAddress,
            labels: pair.labels || [],
            url: pair.url,
            baseToken: pair.baseToken,
            quoteToken: pair.quoteToken,
            priceNative,
            priceUsd,
            txns: pair.txns || {},
            volume: pair.volume || {},
            priceChange: pair.priceChange || {},
            liquidity: pair.liquidity || {},
            fdv: pair.fdv || 0,
            marketCap: pair.marketCap || 0,
            pairCreatedAt: pair.pairCreatedAt || null,
          },
          fetchedAt: new Date().toISOString(),
        });
      }

      // ===== CHART HISTORY =====
      case "chart": {
        const hours = parseInt(searchParams.get("hours") || "24");
        const since = new Date(Date.now() - hours * 3600_000);

        // Try to get snapshots from DB, fallback to empty if DB not available
        let snapshots: any[] = [];
        try {
          snapshots = await db.priceSnapshot.findMany({
            where: {
              createdAt: { gte: since },
            },
            orderBy: { createdAt: "asc" },
            take: 500, // Max data points
          });
        } catch (dbErr) {
          console.error("DB unavailable for chart data, returning empty:", dbErr);
        }

        // Get current pair data for header info
        const pair = await fetchDexData();

        return NextResponse.json({
          snapshots: snapshots.map((s) => ({
            t: s.createdAt.toISOString(),
            priceUsd: s.priceUsd,
            priceNative: s.priceNative,
            volumeH24: s.volumeH24,
            liquidityUsd: s.liquidityUsd,
            marketCap: s.marketCap,
            priceChangeH1: s.priceChangeH1,
            priceChangeH24: s.priceChangeH24,
          })),
          current: pair ? {
            priceUsd: parseFloat(pair.priceUsd || "0"),
            priceNative: parseFloat(pair.priceNative || "0"),
            priceChange: pair.priceChange || {},
            volume: pair.volume || {},
            liquidity: pair.liquidity || {},
            marketCap: pair.marketCap || pair.fdv || 0,
            txns: pair.txns || {},
          } : null,
          hours,
          totalSnapshots: snapshots.length,
        });
      }

      // ===== SNAPSHOT COUNT =====
      case "info": {
        let totalSnapshots = 0;
        let oldestSnapshot: any = null;
        let newestSnapshot: any = null;
        try {
          totalSnapshots = await db.priceSnapshot.count();
          oldestSnapshot = await db.priceSnapshot.findFirst({
            orderBy: { createdAt: "asc" },
          });
          newestSnapshot = await db.priceSnapshot.findFirst({
            orderBy: { createdAt: "desc" },
          });
        } catch (dbErr) {
          console.error("DB unavailable for info:", dbErr);
        }

        return NextResponse.json({
          totalSnapshots,
          oldestSnapshot: oldestSnapshot?.createdAt || null,
          newestSnapshot: newestSnapshot?.createdAt || null,
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action", availableActions: ["live", "chart", "info"] },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("DEX Screener route error:", error);
    return NextResponse.json(
      { error: error.message || "DEX Screener API failed" },
      { status: 500 }
    );
  }
}
