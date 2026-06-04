import { NextRequest, NextResponse } from "next/server";

// IPFS Image Proxy — resolves ipfs:// URIs and serves them with proper caching
// This allows next/image to optimize IPFS images (WebP conversion, resizing)
// and avoids CORS issues with direct IPFS gateway access from the browser

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

const CACHE_MAX_AGE = 86400 * 30; // 30 days — IPFS CIDs are content-addressed, never change

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Resolve ipfs:// to HTTP gateway URL
  let httpUrl = url;
  if (url.startsWith("ipfs://")) {
    httpUrl = url.replace("ipfs://", IPFS_GATEWAYS[0]);
  }

  // Try each gateway
  for (const gw of IPFS_GATEWAYS) {
    try {
      // If the URL doesn't start with a known gateway, use the first one
      const fetchUrl = url.startsWith("ipfs://")
        ? url.replace("ipfs://", gw)
        : httpUrl;

      const resp = await fetch(fetchUrl, {
        signal: AbortSignal.timeout(10000),
        headers: {
          // Some gateways need a user agent
          "User-Agent": "DoomhoundNFT/1.0",
        },
      });

      if (!resp.ok) continue;

      const contentType = resp.headers.get("content-type") || "image/png";
      const body = await resp.arrayBuffer();

      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, immutable`,
          "CDN-Cache-Control": `public, max-age=${CACHE_MAX_AGE}, immutable`,
          "Vercel-CDN-Cache-Control": `public, max-age=${CACHE_MAX_AGE}, immutable`,
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Failed to fetch from IPFS" }, { status: 502 });
}
