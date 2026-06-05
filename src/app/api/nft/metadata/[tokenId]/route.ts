import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// ===== NFT Metadata API =====
// Serves metadata JSON for each token ID from local files.
// The contract's baseURI should be set to: https://doomhound.onrender.com/api/nft/metadata/
// Then tokenURI(tokenId) returns: https://doomhound.onrender.com/api/nft/metadata/{tokenId}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;

  // Validate tokenId - must be a positive integer
  const tokenIdNum = parseInt(tokenId, 10);
  if (isNaN(tokenIdNum) || tokenIdNum < 1) {
    return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
  }

  try {
    // Read the metadata JSON file from public/nft/metadata/
    const filePath = path.join(process.cwd(), "public", "nft", "metadata", `${tokenId}.json`);
    const fileContent = await fs.readFile(filePath, "utf-8");

    // Parse to validate it's valid JSON
    const metadata = JSON.parse(fileContent);

    // Return with proper CORS headers for marketplace access
    return NextResponse.json(metadata, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    // File doesn't exist - token not minted or metadata not yet uploaded
    return NextResponse.json(
      { error: "Token metadata not found", tokenId: tokenIdNum },
      { status: 404 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
