import { NextRequest, NextResponse } from "next/server";

// ===== Middleware for NFT assets CORS =====
// Adds CORS headers to NFT metadata and image responses
// so that NFT marketplaces (Joepegs, etc.) can fetch them

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply CORS to NFT-related paths
  if (pathname.startsWith("/nft/") || pathname.startsWith("/api/nft/")) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Cache-Control", "public, max-age=86400, immutable");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/nft/:path*", "/api/nft/:path*"],
};
