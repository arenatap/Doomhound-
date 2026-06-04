import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { db } from "@/lib/db";

const NFT_SIGNER_PRIVATE_KEY = process.env.NFT_SIGNER_PRIVATE_KEY;
const OLD_NFT_CONTRACT = "0x851ba0903c345676369634660e2757026418dced";
const NEW_NFT_CONTRACT = "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb";
// Block old contract — if NFT_CONTRACT_ADDRESS points to the old contract, force the new one
const _rawNftAddr = process.env.NFT_CONTRACT_ADDRESS;
const NFT_CONTRACT_ADDRESS = (!_rawNftAddr || _rawNftAddr.toLowerCase() === OLD_NFT_CONTRACT.toLowerCase())
  ? NEW_NFT_CONTRACT
  : _rawNftAddr;
const ARENA_API_KEY = process.env.ARENA_API_KEY;
const ARENA_API_BASE = "https://api.starsarena.com";
const DOOMHOUND_TOKEN = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dead";
const BURN_AMOUNT_WEI = BigInt("11000000000000000000000000"); // 11M * 10^18
const AVAX_RPC = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";

// Log which contract is active on startup
console.log(`[NFT] Using NFT contract: ${NFT_CONTRACT_ADDRESS}${_rawNftAddr && _rawNftAddr.toLowerCase() === OLD_NFT_CONTRACT.toLowerCase() ? " (FORCED from old contract!)" : ""}`);

// Total claimFreeMint slots on NEW contract: 2 event winners (2° claim ×1) + 8 never claimed (×1) = 10 free mints
// The 13 old holders + toff_arena receive NFTs via AIRDROP (adminMintTokenBatch), NOT free mint
const TOTAL_FREE_MINTS = 10;

// ---- NFT Metadata Cache ----
// Pre-fetched metadata + image URLs for all minted tokens
// Avoids slow per-request IPFS gateway calls
// NOTE: cloudflare-ipfs.com is DOWN as of June 2026 — removed
// NOTE: dweb.link removed — unreliable/slow
// NOTE: ipfs.io is 65x faster than Pinata (0.06s vs 3.7s tested 2026-06-04)
const IPFS_GWS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

interface CachedToken {
  owner: string;
  name: string;
  image: string; // resolved HTTP URL
}

// ---- Hardcoded metadata fallback ----
// Pre-fetched on 2026-06-01 from on-chain revealed metadata via Pinata IPFS gateway
// This ensures images always show even if IPFS gateways are unreachable from server
// The revealed metadata uses shuffled image filenames (reveal mechanic)
// The cache refresh will still update owner data on-chain and fetch new tokens
const HARDCODED_METADATA: Record<number, { name: string; image: string }> = {
  1: { name: "Hounds of the Hell #1", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/95.png" },
  2: { name: "Hounds of the Hell #2", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/58.png" },
  3: { name: "Hounds of the Hell #3", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/66.png" },
  4: { name: "Hounds of the Hell #4", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/60.png" },
  5: { name: "Hounds of the Hell #5", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/96.png" },
  6: { name: "Hounds of the Hell #6", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/54.png" },
  7: { name: "Hounds of the Hell #7", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/16.png" },
  8: { name: "Hounds of the Hell #8", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/72.png" },
  9: { name: "Hounds of the Hell #9", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/82.png" },
  10: { name: "Hounds of the Hell #10", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/25.png" },
  11: { name: "Hounds of the Hell #11", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/67.png" },
  12: { name: "Hounds of the Hell #12", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/36.png" },
  13: { name: "Hounds of the Hell #13", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/28.png" },
  14: { name: "Hounds of the Hell #14", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/6.png" },
  15: { name: "Hounds of the Hell #15", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/69.png" },
  16: { name: "Hounds of the Hell #16", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/45.png" },
  17: { name: "Hounds of the Hell #17", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/1.png" },
  18: { name: "Hounds of the Hell #18", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/93.png" },
  19: { name: "Hounds of the Hell #19", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/79.png" },
  20: { name: "Hounds of the Hell #20", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/53.png" },
  21: { name: "Hounds of the Hell #21", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/7.png" },
  22: { name: "Hounds of the Hell #22", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/35.png" },
  23: { name: "Hounds of the Hell #23", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/75.png" },
  24: { name: "Hounds of the Hell #24", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/78.png" },
  25: { name: "Hounds of the Hell #25", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/4.png" },
  26: { name: "Hounds of the Hell #26", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/55.png" },
  27: { name: "Hounds of the Hell #27", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/15.png" },
  28: { name: "Hounds of the Hell #28", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/34.png" },
  29: { name: "Hounds of the Hell #29", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/40.png" },
  30: { name: "Hounds of the Hell #30", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/62.png" },
  31: { name: "Hounds of the Hell #31", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/42.png" },
  32: { name: "Hounds of the Hell #32", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/19.png" },
  33: { name: "Hounds of the Hell #33", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/14.png" },
  34: { name: "Hounds of the Hell #34", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/73.png" },
  35: { name: "Hounds of the Hell #35", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/89.png" },
  36: { name: "Hounds of the Hell #36", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/9.png" },
  37: { name: "Hounds of the Hell #37", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/38.png" },
  38: { name: "Hounds of the Hell #38", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/43.png" },
  39: { name: "Hounds of the Hell #39", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/51.png" },
  40: { name: "Hounds of the Hell #40", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/23.png" },
  41: { name: "Hounds of the Hell #41", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/24.png" },
  42: { name: "Hounds of the Hell #42", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/86.png" },
  43: { name: "Hounds of the Hell #43", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/12.png" },
  44: { name: "Hounds of the Hell #44", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/46.png" },
  45: { name: "Hounds of the Hell #45", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/52.png" },
  46: { name: "Hounds of the Hell #46", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/29.png" },
  47: { name: "Hounds of the Hell #47", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/84.png" },
  48: { name: "Hounds of the Hell #48", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/81.png" },
  49: { name: "Hounds of the Hell #49", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/99.png" },
  50: { name: "Hounds of the Hell #50", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/80.png" },
  51: { name: "Hounds of the Hell #51", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/59.png" },
  52: { name: "Hounds of the Hell #52", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/85.png" },
  53: { name: "Hounds of the Hell #53", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/87.png" },
  54: { name: "Hounds of the Hell #54", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/22.png" },
  55: { name: "Hounds of the Hell #55", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/2.png" },
  56: { name: "Hounds of the Hell #56", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/48.png" },
  57: { name: "Hounds of the Hell #57", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/10.png" },
  58: { name: "Hounds of the Hell #58", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/98.png" },
  59: { name: "Hounds of the Hell #59", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/20.png" },
  60: { name: "Hounds of the Hell #60", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/88.png" },
  61: { name: "Hounds of the Hell #61", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/71.png" },
  62: { name: "Hounds of the Hell #62", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/41.png" },
  63: { name: "Hounds of the Hell #63", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/97.png" },
  64: { name: "Hounds of the Hell #64", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/32.png" },
  65: { name: "Hounds of the Hell #65", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/27.png" },
  66: { name: "Hounds of the Hell #66", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/61.png" },
  67: { name: "Hounds of the Hell #67", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/11.png" },
  68: { name: "Hounds of the Hell #68", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/3.png" },
  69: { name: "Hounds of the Hell #69", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/21.png" },
  70: { name: "Hounds of the Hell #70", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/44.png" },
  71: { name: "Hounds of the Hell #71", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/83.png" },
  72: { name: "Hounds of the Hell #72", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/33.png" },
  73: { name: "Hounds of the Hell #73", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/26.png" },
  74: { name: "Hounds of the Hell #74", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/49.png" },
  75: { name: "Hounds of the Hell #75", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/94.png" },
  76: { name: "Hounds of the Hell #76", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/68.png" },
  77: { name: "Hounds of the Hell #77", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/92.png" },
  78: { name: "Hounds of the Hell #78", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/91.png" },
  79: { name: "Hounds of the Hell #79", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/37.png" },
  80: { name: "Hounds of the Hell #80", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/77.png" },
  81: { name: "Hounds of the Hell #81", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/74.png" },
  82: { name: "Hounds of the Hell #82", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/70.png" },
  83: { name: "Hounds of the Hell #83", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/13.png" },
  84: { name: "Hounds of the Hell #84", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/90.png" },
  85: { name: "Hounds of the Hell #85", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/39.png" },
  86: { name: "Hounds of the Hell #86", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/5.png" },
  87: { name: "Hounds of the Hell #87", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/18.png" },
  88: { name: "Hounds of the Hell #88", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/31.png" },
  89: { name: "Hounds of the Hell #89", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/65.png" },
  90: { name: "Hounds of the Hell #90", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/76.png" },
  91: { name: "Hounds of the Hell #91", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/57.png" },
  92: { name: "Hounds of the Hell #92", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/56.png" },
  93: { name: "Hounds of the Hell #93", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/30.png" },
  94: { name: "Hounds of the Hell #94", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/63.png" },
  95: { name: "Hounds of the Hell #95", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/8.png" },
  96: { name: "Hounds of the Hell #96", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/100.png" },
  97: { name: "Hounds of the Hell #97", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/50.png" },
  98: { name: "Hounds of the Hell #98", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/64.png" },
  99: { name: "Hounds of the Hell #99", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/17.png" },
  100: { name: "Hounds of the Hell #100", image: "https://ipfs.io/ipfs/bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/47.png" },
};

// IPFS CID for revealed metadata (contract tokenURI returns ipfs://CID/{id}.json)
const REVEALED_CID = "bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4";
const IMAGE_CID = "bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje";

let metadataCache: Record<number, CachedToken> = {};
let cacheLastFetched = 0;
const CACHE_TTL = 60_000; // refresh every 60s

function resolveIpfs(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return uri.replace("ipfs://", IPFS_GWS[0]); // ipfs.io primary (fastest)
  return uri;
}

async function fetchMetadataWithFallback(httpURI: string): Promise<{ name: string; image: string } | null> {
  // Try each gateway
  for (const gw of IPFS_GWS) {
    try {
      const uri = httpURI.startsWith("http") ? httpURI : resolveIpfs(httpURI);
      const resp = await fetch(uri, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const meta = await resp.json();
      return {
        name: meta.name || "",
        image: resolveIpfs(meta.image || ""),
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function refreshMetadataCache() {
  const now = Date.now();
  if (now - cacheLastFetched < CACHE_TTL && Object.keys(metadataCache).length > 0) return;

  try {
    const provider = new ethers.JsonRpcProvider(AVAX_RPC);
    const nftContract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb",
      [
        "function totalSupply() view returns (uint256)",
        "function ownerOf(uint256 tokenId) view returns (address)",
      ],
      provider
    );
    const supply = await nftContract.totalSupply();
    const maxScan = Math.min(Number(supply), 100);

    // Batch fetch all ownerOf in parallel
    const newCache: Record<number, CachedToken> = {};
    const promises = [];
    for (let i = 1; i <= maxScan; i++) {
      promises.push(
        nftContract.ownerOf(i)
          .then((o: string) => {
            // Use hardcoded metadata if available, otherwise construct from CID
            const hardcoded = HARDCODED_METADATA[i];
            newCache[i] = {
              owner: o.toLowerCase(),
              name: hardcoded?.name || `Hounds of the Hell #${i}`,
              image: hardcoded?.image || `https://gateway.pinata.cloud/ipfs/${IMAGE_CID}/${i}.png`,
            };
          })
          .catch(() => {
            // Token doesn't exist yet — skip
          })
      );
    }
    await Promise.all(promises);
    metadataCache = newCache;
    cacheLastFetched = now;
    console.log(`[NFT Cache] Refreshed: ${Object.keys(metadataCache).length} tokens cached`);
  } catch (e: any) {
    console.error(`[NFT Cache] Refresh failed: ${e.message}`);
  }
}

// Kick off cache refresh on module load (fire and forget)
setTimeout(() => refreshMetadataCache(), 2000);

function getSigner(): ethers.Wallet {
  if (!NFT_SIGNER_PRIVATE_KEY) throw new Error("NFT_SIGNER_PRIVATE_KEY not configured");
  return new ethers.Wallet(NFT_SIGNER_PRIVATE_KEY);
}

/**
 * Get the total number of NFTs minted directly to a wallet (Transfer from 0x0).
 * This is the ONLY reliable way to verify adminMints, since adminMint doesn't
 * update any on-chain counter (freeMintClaimed/paidMintClaimed).
 *
 * Returns: { mintCount, adminMintCount }
 * - mintCount = total NFTs minted to this wallet (from address 0x0)
 * - adminMintCount = mintCount - freeMintClaimed - paidMintClaimed
 *
 * NOTE: Avalanche RPC limits getLogs to 2048 blocks per request.
 * We use parallel batch queries (10 chunks at a time) for speed.
 */
async function getOnChainMintCounts(
  walletLower: string,
  onChainFreeClaimed: number,
  onChainPaidClaimed: number
): Promise<{ mintCount: number; adminMintCount: number }> {
  try {
    const provider = new ethers.JsonRpcProvider(AVAX_RPC);

    // ERC721 Transfer event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const zeroAddress = ethers.zeroPadValue("0x0000000000000000000000000000000000000000", 32);
    const toAddress = ethers.zeroPadValue(walletLower, 32);

    const nftAddress = NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb";

    // Get the block range and query in parallel batches
    const latestBlock = await provider.getBlockNumber();
    const START_BLOCK = 86800000; // Contract was deployed around this block
    const CHUNK_SIZE = 2000;
    const PARALLEL_BATCHES = 10; // Query 10 chunks in parallel

    // Build all chunk ranges
    const ranges: { from: number; to: number }[] = [];
    for (let from = START_BLOCK; from <= latestBlock; from += CHUNK_SIZE) {
      ranges.push({ from, to: Math.min(from + CHUNK_SIZE - 1, latestBlock) });
    }

    // Process in parallel batches
    let allLogs: ethers.Log[] = [];
    for (let i = 0; i < ranges.length; i += PARALLEL_BATCHES) {
      const batch = ranges.slice(i, i + PARALLEL_BATCHES);
      const results = await Promise.allSettled(
        batch.map(async ({ from, to }) => {
          return provider.getLogs({
            address: nftAddress,
            topics: [transferTopic, zeroAddress, toAddress],
            fromBlock: from,
            toBlock: to,
          });
        })
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          allLogs = allLogs.concat(result.value);
        }
      }
    }

    const mintCount = allLogs.length;
    const adminMintCount = Math.max(0, mintCount - onChainFreeClaimed - onChainPaidClaimed);

    console.log(`[MintCount] ${walletLower}: totalMints=${mintCount}, freeClaimed=${onChainFreeClaimed}, paidClaimed=${onChainPaidClaimed}, adminMints=${adminMintCount}`);
    return { mintCount, adminMintCount };
  } catch (e: any) {
    console.warn(`[MintCount] Failed for ${walletLower}: ${e.message}`);
    return { mintCount: -1, adminMintCount: -1 }; // Unknown — don't use for reconciliation
  }
}

/**
 * Reconcile DB mintClaimed with on-chain state.
 *
 * Sources of truth:
 * 1. freeMintClaimed[wallet] — tracks claimFreeMint calls (max 1 per wallet)
 * 2. adminMintTxHash — DB field set ONLY when adminMint succeeds on-chain
 *
 * We do NOT trust mintClaimed from DB for adminMint tracking because it was
 * corrupted by the old balanceOf-based reconciliation (e.g. Florida_Man__ had
 * mintClaimed=10, then capped to 2 by "conservative" reconciliation, but
 * adminMint was never actually performed).
 *
 * Logic:
 * - effectiveMintClaimed = onChainFreeClaimed + (adminMintTxHash ? 1 : 0)
 * - If onChainFreeClaimed=0 and DB mintClaimed>0: old bug — reset to 0
 * - ALWAYS cap at mintAllowance
 */
async function reconcileMintClaimed(
  dbMintClaimed: number,
  onChainFreeClaimed: number,
  onChainPaidClaimed: number,
  onChainBalance: number,
  mintAllowance: number,
  walletLower: string,
  adminMintTxHash: string | null
): Promise<number> {
  // Rule 1: On-chain freeMintClaimed > DB → DB is stale, update
  if (onChainFreeClaimed > dbMintClaimed) {
    console.log(`[Reconcile] ${walletLower}: onChain(${onChainFreeClaimed}) > DB(${dbMintClaimed}): updating DB to on-chain`);
    return Math.min(onChainFreeClaimed, mintAllowance);
  }

  // Rule 2: On-chain confirms at least 1 free claim
  if (onChainFreeClaimed >= 1) {
    // For adminMint tracking, ONLY trust adminMintTxHash — NOT mintClaimed.
    // The mintClaimed value was corrupted by old reconciliation bugs.
    const adminMintDone = adminMintTxHash ? 1 : 0;
    const effectiveValue = onChainFreeClaimed + adminMintDone;
    if (effectiveValue !== dbMintClaimed) {
      console.log(`[Reconcile] ${walletLower}: DB(${dbMintClaimed}) -> onChain(${onChainFreeClaimed}) + adminMintTxHash(${adminMintTxHash ? 'yes' : 'no'}) = ${effectiveValue}`);
    }
    return Math.min(effectiveValue, mintAllowance);
  }

  // Rule 3: onChainFreeClaimed=0 but DB>0 → old bug, reset to 0
  if (dbMintClaimed > 0) {
    console.log(`[Reconcile] ${walletLower}: DB(${dbMintClaimed}) but onChain=0. Old bug — reset to 0.`);
    return 0;
  }

  // Rule 4: Both are 0 — nothing claimed
  return 0;
}

async function verifyArenaHandle(handle: string): Promise<boolean> {
  if (!ARENA_API_KEY) return true; // If no API key, skip verification (don't block)
  try {
    const resp = await fetch(`${ARENA_API_BASE}/agents/user/handle?handle=${encodeURIComponent(handle)}`, {
      headers: { "X-API-Key": ARENA_API_KEY, "Content-Type": "application/json" },
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return !!data?.user;
  } catch {
    return true; // On network error, don't block — let the mint proceed
  }
}

// GET — Contract info, whitelist status, mint status
export async function GET(request: NextRequest) {
  try {
    // Signer is optional for GET — only needed for displaying the signer address
    let signerAddress: string | null = null;
    try {
      signerAddress = getSigner().address;
    } catch {
      // NFT_SIGNER_PRIVATE_KEY not configured yet — non-blocking for status checks
    }

    // Get whitelist stats
    const totalWhitelisted = await db.nftWhitelist.count();
    const claimedCount = await db.nftWhitelist.count({ where: { claimed: true } });
    const totalAllowance = await db.nftWhitelist.aggregate({ _sum: { mintAllowance: true } });
    const totalClaimed = await db.nftWhitelist.aggregate({ _sum: { mintClaimed: true } });
    const freeMintsRemaining = TOTAL_FREE_MINTS - (totalClaimed._sum.mintClaimed || 0);

    // Get wallet-specific status if provided
    let walletStatus = null;
    let userTokens: number[] = [];
    let tokenURIMap: Record<number, string> = {};
    let burnMintStatus = null;
    const wallet = request.nextUrl.searchParams.get("wallet");
    if (wallet) {
      const walletLower = wallet.toLowerCase();
      const entry = await db.nftWhitelist.findFirst({
        where: {
          walletAddress: { equals: walletLower, mode: "insensitive" },
        },
      });
      if (entry) {
        // CRITICAL: Reconcile DB with actual on-chain state using the
        // centralized reconcileMintClaimed function.
        let effectiveMintClaimed = entry.mintClaimed;
        let onChainClaimed = 0;
        let onChainPaid = 0;
        let onChainBalance = 0;
        try {
          const provider = new ethers.JsonRpcProvider(AVAX_RPC);
          const nftRead = new ethers.Contract(
            NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb",
            [
              "function freeMintClaimed(address) view returns (uint256)",
              "function paidMintClaimed(address) view returns (uint256)",
              "function balanceOf(address) view returns (uint256)",
            ],
            provider
          );

          onChainClaimed = Number(await nftRead.freeMintClaimed(walletLower));
          onChainPaid = Number(await nftRead.paidMintClaimed(walletLower));
          onChainBalance = Number(await nftRead.balanceOf(walletLower));

          console.log(`[NFT GET] Reconciliation data for ${walletLower}: DB=${entry.mintClaimed}, onChainFree=${onChainClaimed}, onChainPaid=${onChainPaid}, balanceOf=${onChainBalance}`);
        } catch (e: any) {
          console.warn(`[NFT GET] Could not read on-chain state for ${walletLower}: ${e.message}`);
        }

        // Use the centralized reconciliation function (uses adminMintTxHash for 2nd claim)
        effectiveMintClaimed = await reconcileMintClaimed(
          entry.mintClaimed,
          onChainClaimed,
          onChainPaid,
          onChainBalance,
          entry.mintAllowance,
          walletLower,
          entry.adminMintTxHash
        );

        // Update DB if reconciled value differs
        if (effectiveMintClaimed !== entry.mintClaimed) {
          console.log(`[NFT GET] Reconciling DB for ${walletLower}: ${entry.mintClaimed} -> ${effectiveMintClaimed}`);
          await db.nftWhitelist.update({
            where: { id: entry.id },
            data: {
              mintClaimed: effectiveMintClaimed,
              claimed: effectiveMintClaimed >= entry.mintAllowance,
            },
          });
        }

        const mintsLeft = entry.mintAllowance - effectiveMintClaimed;
        walletStatus = {
          whitelisted: true,
          handle: entry.handle,
          reason: entry.reason,
          mintAllowance: entry.mintAllowance,
          mintClaimed: effectiveMintClaimed,
          mintsLeft,
          claimed: effectiveMintClaimed >= entry.mintAllowance,
        };
      } else {
        walletStatus = { whitelisted: false };
      }

      // Use cached metadata instead of live on-chain scan
      await refreshMetadataCache();
      for (const [tokenIdStr, cached] of Object.entries(metadataCache)) {
        const tokenId = parseInt(tokenIdStr);
        if (cached.owner === walletLower) {
          userTokens.push(tokenId);
          if (cached.image) {
            tokenURIMap[tokenId] = cached.image;
          }
        }
      }

      // Also check burn mint status for this wallet (current contract only)
      // Old-contract mints should NOT count as "minted" for the new contract
      const currentNftAddr = (NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb").toLowerCase();
      try {
        const burnRequest = await db.burnMintRequest.findFirst({
          where: {
            walletAddress: { equals: walletLower, mode: "insensitive" },
          },
          orderBy: { createdAt: "desc" },
        });
        if (burnRequest) {
          // Check if the mint was actually on the current contract
          let effectiveMinted = burnRequest.minted;
          if (burnRequest.minted && burnRequest.mintTxHash) {
            try {
              const provider3 = new ethers.JsonRpcProvider(AVAX_RPC);
              const mintReceipt = await provider3.getTransactionReceipt(burnRequest.mintTxHash);
              if (mintReceipt && mintReceipt.to?.toLowerCase() !== currentNftAddr) {
                console.log(`[NFT GET] Burn mint TX ${burnRequest.mintTxHash} was to OLD contract, not current. Marking as not minted.`);
                effectiveMinted = false;
              }
            } catch {}
          }
          burnMintStatus = {
            verified: burnRequest.verified,
            minted: effectiveMinted,
            txHash: burnRequest.txHash,
          };
        }
      } catch (burnErr: any) {
        // Fallback to raw SQL if contractAddress column is missing
        if (burnErr.message?.includes("contractAddress") || burnErr.message?.includes("does not exist")) {
          try {
            const rawResult = await db.$queryRaw`
              SELECT verified, minted, "txHash", "mintTxHash"
              FROM "BurnMintRequest"
              WHERE "walletAddress" = ${walletLower}
              ORDER BY "createdAt" DESC
              LIMIT 1
            ` as any[];
            if (rawResult && rawResult.length > 0) {
              // Same check for old contract mints
              let effectiveMinted = rawResult[0].minted;
              if (effectiveMinted && rawResult[0].mintTxHash) {
                try {
                  const provider4 = new ethers.JsonRpcProvider(AVAX_RPC);
                  const mintReceipt = await provider4.getTransactionReceipt(rawResult[0].mintTxHash);
                  if (mintReceipt && mintReceipt.to?.toLowerCase() !== currentNftAddr) {
                    effectiveMinted = false;
                  }
                } catch {}
              }
              burnMintStatus = {
                verified: rawResult[0].verified,
                minted: effectiveMinted,
                txHash: rawResult[0].txHash,
              };
            }
          } catch {}
        }
      }
    }

    // Get handle-specific status
    let handleStatus = null;
    const handle = request.nextUrl.searchParams.get("handle");
    if (handle) {
      const cleanHandle = handle.toLowerCase().replace("@", "");
      const entry = await db.nftWhitelist.findFirst({
        where: { handle: cleanHandle },
      });
      if (entry) {
        const mintsLeft = entry.mintAllowance - entry.mintClaimed;
        handleStatus = {
          whitelisted: true,
          walletAddress: entry.walletAddress,
          reason: entry.reason,
          mintAllowance: entry.mintAllowance,
          mintClaimed: entry.mintClaimed,
          mintsLeft,
          claimed: entry.claimed,
        };
      } else {
        handleStatus = { whitelisted: false };
      }
    }

    // Build gallery data (all minted NFTs with images)
    const gallery: Array<{ tokenId: number; name: string; image: string; owner: string }> = [];
    for (const [tokenIdStr, cached] of Object.entries(metadataCache)) {
      gallery.push({
        tokenId: parseInt(tokenIdStr),
        name: cached.name,
        image: cached.image,
        owner: cached.owner,
      });
    }
    // Sort by tokenId
    gallery.sort((a, b) => a.tokenId - b.tokenId);

    return NextResponse.json({
      contractAddress: NFT_CONTRACT_ADDRESS,
      signerAddress,
      totalWhitelisted,
      claimedCount,
      freeMintsRemaining,
      totalFreeMints: TOTAL_FREE_MINTS,
      totalAllowance: totalAllowance._sum.mintAllowance || 0,
      totalClaimed: totalClaimed._sum.mintClaimed || 0,
      mintPrice: "0.69",
      burnAmount: "11000000000000000000000000", // 11M $DOOMHOUND (18 decimals)
      doomhoundToken: DOOMHOUND_TOKEN,
      burnAddress: BURN_ADDRESS,
      maxPaidPerWallet: 2, // Must match contract MAX_PAID_PER_WALLET
      chain: { id: 43114, name: "Avalanche C-Chain" },
      walletStatus,
      handleStatus,
      burnMintStatus,
      userTokens,
      tokenURIs: tokenURIMap || {},
      gallery,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Request free mint signature OR confirm a completed free mint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, arenaHandle, action } = body;

    // ---- confirm_free_mint: called by frontend AFTER claimFreeMint succeeds on-chain ----
    // This updates the DB to reflect the on-chain state.
    // CRITICAL: We only update the DB AFTER the on-chain tx succeeds, preventing
    // the bug where DB shows "claimed" but the user never received the NFT.
    if (action === "confirm_free_mint") {
      if (!wallet) {
        return NextResponse.json({ error: "wallet is required" }, { status: 400 });
      }
      const walletLower = wallet.toLowerCase();

      // Verify on-chain that freeMintClaimed[wallet] >= 1
      try {
        const provider = new ethers.JsonRpcProvider(AVAX_RPC);
        const nftReadOnly = new ethers.Contract(
          NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb",
          [
            "function freeMintClaimed(address) view returns (uint256)",
            "function paidMintClaimed(address) view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
          ],
          provider
        );
        const onChainClaimed = Number(await nftReadOnly.freeMintClaimed(walletLower));
        const onChainPaid = Number(await nftReadOnly.paidMintClaimed(walletLower));
        const onChainBalance = Number(await nftReadOnly.balanceOf(walletLower));

        if (onChainClaimed < 1) {
          return NextResponse.json(
            { error: "On-chain verification failed: freeMintClaimed is 0. The on-chain mint may not have completed yet." },
            { status: 400 }
          );
        }

        // Update DB to match on-chain state
        const entry = await db.nftWhitelist.findFirst({
          where: { walletAddress: { equals: walletLower, mode: "insensitive" } },
        });

        if (!entry) {
          return NextResponse.json({ error: "Not whitelisted" }, { status: 403 });
        }

        // Use centralized reconciliation (uses adminMintTxHash for 2nd claim)
        const effectiveClaimed = await reconcileMintClaimed(
          entry.mintClaimed,
          onChainClaimed,
          onChainPaid,
          onChainBalance,
          entry.mintAllowance,
          walletLower,
          entry.adminMintTxHash
        );
        const isFullyClaimed = effectiveClaimed >= entry.mintAllowance;

        if (effectiveClaimed !== entry.mintClaimed) {
          await db.nftWhitelist.update({
            where: { id: entry.id },
            data: {
              mintClaimed: effectiveClaimed,
              claimed: isFullyClaimed,
            },
          });
          console.log(`[NFT confirm_free_mint] Updated DB for ${walletLower}: mintClaimed ${entry.mintClaimed} -> ${effectiveClaimed} (onChain=${onChainClaimed}, balanceOf=${onChainBalance})`);
        }

        return NextResponse.json({
          success: true,
          mintClaimed: effectiveClaimed,
          mintAllowance: entry.mintAllowance,
          mintsLeft: entry.mintAllowance - effectiveClaimed,
        });
      } catch (e: any) {
        console.error(`[NFT confirm_free_mint] Error:`, e.message);
        return NextResponse.json({ error: "Failed to verify on-chain state: " + e.message }, { status: 500 });
      }
    }

    // ---- Default: Request free mint signature ----
    if (!wallet) {
      return NextResponse.json(
        { error: "wallet address is required" },
        { status: 400 }
      );
    }

    const walletLower = wallet.toLowerCase();

    // CRITICAL FIX: Check on-chain freeMintClaimed[wallet] to determine
    // whether this is a first or second claim. We use the BLOCKCHAIN as the
    // source of truth, NOT the database. This fixes the bug where the DB
    // showed "claimed" after the first mint failed on-chain.
    const provider = new ethers.JsonRpcProvider(AVAX_RPC);
    const nftReadOnly = new ethers.Contract(
      NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb",
      [
        "function freeMintClaimed(address) view returns (uint256)",
        "function paidMintClaimed(address) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
      ],
      provider
    );
    const onChainFreeClaimed = Number(await nftReadOnly.freeMintClaimed(walletLower));
    let onChainPaidClaimed = 0;
    let onChainBalance = 0;
    try {
      onChainPaidClaimed = Number(await nftReadOnly.paidMintClaimed(walletLower));
      onChainBalance = Number(await nftReadOnly.balanceOf(walletLower));
    } catch {}
    console.log(`[NFT POST] On-chain for ${walletLower}: freeMintClaimed=${onChainFreeClaimed}, paidMintClaimed=${onChainPaidClaimed}, balanceOf=${onChainBalance}`);

    // Reconcile the DB with on-chain state using the centralized function
    const existingEntry = await db.nftWhitelist.findFirst({
      where: { walletAddress: { equals: walletLower, mode: "insensitive" } },
    });
    if (existingEntry) {
      const reconciledValue = await reconcileMintClaimed(
        existingEntry.mintClaimed,
        onChainFreeClaimed,
        onChainPaidClaimed,
        onChainBalance,
        existingEntry.mintAllowance,
        walletLower,
        existingEntry.adminMintTxHash
      );

      if (reconciledValue !== existingEntry.mintClaimed) {
        console.log(`[NFT POST] Reconciling DB for ${walletLower}: DB=${existingEntry.mintClaimed}, onChain=${onChainFreeClaimed}, balance=${onChainBalance} -> ${reconciledValue}`);
        await db.nftWhitelist.update({
          where: { id: existingEntry.id },
          data: {
            mintClaimed: reconciledValue,
            claimed: reconciledValue >= existingEntry.mintAllowance,
          },
        });
      }
    }

    // Use a Prisma interactive transaction for the second claim (adminMint)
    // For the first claim, we DON'T update the DB — we only generate a signature.
    // The DB is updated later via the confirm_free_mint action after on-chain success.
    const result = await db.$transaction(async (tx) => {
      // Check free mints remaining globally (inside transaction for atomicity)
      const totalClaimed = await tx.nftWhitelist.aggregate({ _sum: { mintClaimed: true } });
      if ((totalClaimed._sum.mintClaimed || 0) >= TOTAL_FREE_MINTS) {
        throw new Error("NO_FREE_MINTS");
      }

      // Find whitelist entry by wallet address (primary) or handle (secondary)
      let whitelistEntry = await tx.nftWhitelist.findFirst({
        where: {
          walletAddress: { equals: walletLower, mode: "insensitive" },
        },
      });

      // If not found by wallet, try by handle (if provided)
      if (!whitelistEntry && arenaHandle) {
        const cleanHandle = arenaHandle.toLowerCase().replace("@", "").trim();
        whitelistEntry = await tx.nftWhitelist.findFirst({
          where: { handle: cleanHandle },
        });

        // If found by handle, update the wallet address
        if (whitelistEntry && !whitelistEntry.walletAddress) {
          whitelistEntry = await tx.nftWhitelist.update({
            where: { id: whitelistEntry.id },
            data: { walletAddress: walletLower },
          });
        }
      }

      if (!whitelistEntry) {
        throw new Error("NOT_WHITELISTED");
      }

      // Use centralized reconciliation for effective mint claimed
      const effectiveMintClaimed = await reconcileMintClaimed(
        whitelistEntry.mintClaimed,
        onChainFreeClaimed,
        onChainPaidClaimed,
        onChainBalance,
        whitelistEntry.mintAllowance,
        walletLower,
        whitelistEntry.adminMintTxHash
      );

      // Check if all mints are claimed (using effective count, not just DB)
      if (effectiveMintClaimed >= whitelistEntry.mintAllowance) {
        throw new Error("ALREADY_CLAIMED");
      }

      // If handle is provided and entry has no handle, update it
      if (arenaHandle && !whitelistEntry.handle) {
        const cleanHandle = arenaHandle.toLowerCase().replace("@", "").trim();
        const handleValid = await verifyArenaHandle(cleanHandle);
        if (handleValid) {
          await tx.nftWhitelist.update({
            where: { id: whitelistEntry.id },
            data: { handle: cleanHandle },
          });
        }
      }

      // Verify Arena handle if one exists on the entry
      if (whitelistEntry.handle) {
        const handleValid = await verifyArenaHandle(whitelistEntry.handle);
        if (!handleValid) {
          throw new Error("INVALID_HANDLE");
        }
      }

      // Determine first vs second claim based on ON-CHAIN state
      // On-chain freeMintClaimed[wallet] is 0 if no claimFreeMint succeeded,
      // 1 if one succeeded. adminMint does NOT increment freeMintClaimed.
      const isFirstClaim = onChainFreeClaimed === 0;

      if (isFirstClaim) {
        // FIRST CLAIM: Generate signature for claimFreeMint on-chain
        // CRITICAL: We do NOT update mintClaimed in the DB here!
        // The DB will be updated only AFTER the on-chain tx succeeds
        // (via the confirm_free_mint action called by the frontend).
        // This prevents the bug where DB shows "claimed" but the user
        // never received the NFT because the on-chain tx failed.
        const nonce = Date.now();
        const signer = getSigner();

        const messageHash = ethers.solidityPackedKeccak256(
          ["address", "uint256"],
          [walletLower, nonce]
        );
        const signature = await signer.signMessage(ethers.getBytes(messageHash));

        // DO NOT update DB here — wait for on-chain confirmation
        const globalClaimed = totalClaimed._sum.mintClaimed || 0;

        return {
          nonce,
          signature,
          isFirstClaim: true,
          freeMintsRemaining: TOTAL_FREE_MINTS - globalClaimed,
          mintClaimed: effectiveMintClaimed, // still 0 in DB
          mintAllowance: whitelistEntry.mintAllowance,
          mintsLeft: whitelistEntry.mintAllowance - effectiveMintClaimed,
        };
      } else {
        // SECOND CLAIM for airdrop winners: adminMint directly from backend
        // This only happens when on-chain freeMintClaimed >= 1 (first claim succeeded)
        // Use DEPLOYER_PRIVATE_KEY if set, otherwise fall back to NFT_SIGNER_PRIVATE_KEY
        // CRITICAL: The key MUST be the contract owner's key, otherwise adminMint reverts
        const OWNER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.NFT_SIGNER_PRIVATE_KEY;
        if (!OWNER_PRIVATE_KEY) throw new Error("OWNER_KEY_MISSING");

        const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

        // Verify this wallet is the contract owner before trying adminMint
        const nftContractWithOwner = new ethers.Contract(
          NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb",
          [
            "function adminMint(address to, uint256 quantity) external",
            "function owner() view returns (address)",
          ],
          ownerWallet
        );

        const contractOwner = await nftContractWithOwner.owner();
        if (contractOwner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
          console.error(`[NFT adminMint] FATAL: Key wallet ${ownerWallet.address} is NOT the contract owner ${contractOwner}. Set DEPLOYER_PRIVATE_KEY env var!`);
          throw new Error("NOT_CONTRACT_OWNER");
        }

        // SAFEGUARD: Check if user already has their second free NFT by using
        // the on-chain mint count (Transfer events from address(0)).
        // This prevents double-minting for users who already got adminMint
        // but whose DB was reset by the aggressive reconciliation.
        try {
          const { mintCount, adminMintCount } = await getOnChainMintCounts(
            walletLower,
            onChainFreeClaimed,
            onChainPaidClaimed
          );
          if (mintCount >= 0 && adminMintCount > 0) {
            console.log(`[NFT adminMint] User ${walletLower} already has ${adminMintCount} adminMint(s) on-chain (totalMints=${mintCount}, free=${onChainFreeClaimed}, paid=${onChainPaidClaimed}). Updating DB only.`);
            // Update DB to reflect on-chain reality without minting again
            const newClaimedCount = onChainFreeClaimed + adminMintCount;
            const cappedClaimed = Math.min(newClaimedCount, whitelistEntry.mintAllowance);
            const isFullyClaimed = cappedClaimed >= whitelistEntry.mintAllowance;
            await tx.nftWhitelist.update({
              where: { id: whitelistEntry.id },
              data: {
                mintClaimed: cappedClaimed,
                claimed: isFullyClaimed,
                walletAddress: walletLower,
                adminMintTxHash: "safeguard_detected", // Mark as done so future reconciliation trusts it
              },
            });
            return {
              adminMinted: false,
              alreadyHadNFT: true,
              freeMintsRemaining: TOTAL_FREE_MINTS - (totalClaimed._sum.mintClaimed || 0),
              mintClaimed: cappedClaimed,
              mintAllowance: whitelistEntry.mintAllowance,
              mintsLeft: whitelistEntry.mintAllowance - cappedClaimed,
            };
          }
        } catch (safeguardErr: any) {
          console.warn(`[NFT adminMint] Safeguard check failed: ${safeguardErr.message}. Proceeding with mint.`);
        }

        // Execute adminMint on-chain
        console.log(`[NFT adminMint] Owner verified (${ownerWallet.address}). Minting to ${walletLower}...`);
        const mintTx = await nftContractWithOwner.adminMint(walletLower, 1);
        console.log(`[NFT adminMint] TX sent: ${mintTx.hash}, waiting for confirmation...`);
        const mintReceipt = await mintTx.wait();
        console.log(`[NFT adminMint] TX confirmed in block ${mintReceipt.blockNumber}, status: ${mintReceipt.status}`);

        if (mintReceipt.status !== 1) {
          console.error(`[NFT adminMint] TX REVERTED! Hash: ${mintTx.hash}`);
          throw new Error("ADMIN_MINT_REVERTED");
        }

        // Only update DB AFTER adminMint succeeds on-chain
        const newClaimedCount = effectiveMintClaimed + 1;
        const isFullyClaimed = newClaimedCount >= whitelistEntry.mintAllowance;

        await tx.nftWhitelist.update({
          where: { id: whitelistEntry.id },
          data: {
            mintClaimed: newClaimedCount,
            claimed: isFullyClaimed,
            walletAddress: walletLower,
            adminMintTxHash: mintTx.hash,
          },
        });

        const globalClaimed = (totalClaimed._sum.mintClaimed || 0) + 1;

        return {
          adminMinted: true,
          txHash: mintTx.hash,
          freeMintsRemaining: TOTAL_FREE_MINTS - globalClaimed,
          mintClaimed: newClaimedCount,
          mintAllowance: whitelistEntry.mintAllowance,
          mintsLeft: whitelistEntry.mintAllowance - newClaimedCount,
        };
      }
    }, { timeout: 30_000 }); // 30s timeout — adminMint on-chain can take 5-15s on Avalanche

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    // Handle specific transaction errors
    if (error.message === "NO_FREE_MINTS") {
      return NextResponse.json(
        { error: "No free mints remaining", freeMintsRemaining: 0 },
        { status: 400 }
      );
    }
    if (error.message === "NOT_WHITELISTED") {
      return NextResponse.json(
        { error: "You are not on the whitelist. Free mint is only for top holders and airdrop winners." },
        { status: 403 }
      );
    }
    if (error.message === "ALREADY_CLAIMED") {
      return NextResponse.json(
        { error: "You already claimed all your free mints!" },
        { status: 400 }
      );
    }
    if (error.message === "INVALID_HANDLE") {
      return NextResponse.json(
        { error: "Arena handle not found. Please use a valid Arena handle." },
        { status: 400 }
      );
    }
    if (error.message === "OWNER_KEY_MISSING") {
      return NextResponse.json(
        { error: "Server configuration error: owner key not set. Please contact the team — DEPLOYER_PRIVATE_KEY or NFT_SIGNER_PRIVATE_KEY must be configured." },
        { status: 500 }
      );
    }
    if (error.message === "NOT_CONTRACT_OWNER") {
      return NextResponse.json(
        { error: "Server configuration error: the signing key is not the contract owner. The team needs to set DEPLOYER_PRIVATE_KEY to the contract owner's private key." },
        { status: 500 }
      );
    }
    if (error.message === "ADMIN_MINT_REVERTED") {
      return NextResponse.json(
        { error: "The second NFT mint failed on-chain. The team has been notified and will mint it manually." },
        { status: 500 }
      );
    }
    // Log the full error for debugging adminMint issues
    console.error(`[NFT POST] Error:`, error.message, error.stack || "");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT — Verify burn transaction and record burn mint
export async function PUT(request: NextRequest) {
  try {
    const { action, wallet, txHash } = await request.json();

    if (action !== "verify_burn") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!wallet || !txHash) {
      return NextResponse.json(
        { error: "wallet and txHash are required" },
        { status: 400 }
      );
    }

    const walletLower = wallet.toLowerCase();

    // Check: no duplicate verified burn requests for this wallet ON THE CURRENT CONTRACT
    // Old-contract burn records should NOT block burns on the new contract
    // We verify the mintTxHash was actually sent to the current NFT contract
    const currentNftAddress = (NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb").toLowerCase();
    let existingBurn: any = null;
    let existingBurnIsOnCurrentContract = false;
    try {
      existingBurn = await db.burnMintRequest.findFirst({
        where: {
          walletAddress: { equals: walletLower, mode: "insensitive" },
          verified: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (findErr: any) {
      if (findErr.message?.includes("contractAddress") || findErr.message?.includes("does not exist")) {
        // Fallback to raw SQL
        const rawResult = await db.$queryRaw`
          SELECT id, "walletAddress", "txHash", "burnAmount", verified, minted, "mintTxHash"
          FROM "BurnMintRequest"
          WHERE "walletAddress" = ${walletLower} AND verified = true
          ORDER BY "createdAt" DESC
          LIMIT 1
        ` as any[];
        if (rawResult && rawResult.length > 0) {
          existingBurn = rawResult[0];
        }
      } else {
        throw findErr;
      }
    }

    // Variables for the skip-on-chain-verify flow
    let skipOnChainVerify = false;
    let existingTxHash: string | null = null;
    let existingBurnAmount: string | null = null;

    // If there's an existing burn, check if the mint was actually done on the CURRENT contract
    // Old-contract mints should NOT count as "already minted" for the new contract
    if (existingBurn && existingBurn.minted && existingBurn.mintTxHash) {
      try {
        const provider2 = new ethers.JsonRpcProvider(AVAX_RPC);
        const mintReceipt = await provider2.getTransactionReceipt(existingBurn.mintTxHash);
        if (mintReceipt && mintReceipt.to?.toLowerCase() !== currentNftAddress) {
          console.log(`[NFT verify_burn] Existing mint TX ${existingBurn.mintTxHash} was to OLD contract ${mintReceipt.to}, not current ${currentNftAddress}. Allowing new burn.`);
          existingBurnIsOnCurrentContract = false;
          // Don't block — treat as if no valid mint exists
          existingBurn = null;
        } else {
          existingBurnIsOnCurrentContract = true;
        }
      } catch (e: any) {
        console.warn(`[NFT verify_burn] Could not verify mint TX contract: ${e.message}`);
        // If we can't verify, assume it's on current contract to be safe
        existingBurnIsOnCurrentContract = true;
      }
    }
    if (existingBurn) {
      // Already have a verified burn
      if (existingBurn.minted) {
        // Already minted — return success
        return NextResponse.json({
          success: true,
          verified: true,
          minted: true,
          mintTxHash: existingBurn.mintTxHash,
          message: "Burn already verified and NFT already minted!",
          burnAmount: existingBurn.burnAmount,
          txHash: existingBurn.txHash,
        });
      }
      // Verified but NOT yet minted — retry auto-mint
      console.log(`[NFT verify_burn] Found existing verified burn for ${walletLower} but not yet minted. Retrying auto-mint...`);
      // Fall through to the auto-mint section below (skip on-chain re-verification)
      // We'll use the existing txHash for the DB update
      skipOnChainVerify = true;
      existingTxHash = existingBurn.txHash;
      existingBurnAmount = existingBurn.burnAmount;
    }

    // Verify the burn transaction on-chain (skip if already verified from DB)
    const provider = new ethers.JsonRpcProvider(AVAX_RPC);
    let burnAmountStr: string;
    let dbTxHash: string; // The txHash to use for DB lookups

    if (skipOnChainVerify && existingTxHash && existingBurnAmount) {
      // Already verified in a previous call — skip re-verification
      burnAmountStr = existingBurnAmount;
      dbTxHash = existingTxHash;
      console.log(`[NFT verify_burn] Skipping on-chain re-verification for ${walletLower}, using existing record`);
    } else {
      // First time verification — verify on-chain
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt || receipt.status !== 1) {
        return NextResponse.json(
          { error: "Transaction not found or failed" },
          { status: 400 }
        );
      }

      // Verify it's a transfer of $DOOMHOUND to the burn address
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 400 }
        );
      }

      // Check: from address matches the claiming wallet
      if (tx.from.toLowerCase() !== walletLower) {
        return NextResponse.json(
          { error: "Transaction sender does not match your wallet" },
          { status: 400 }
        );
      }

      // Check: to address is the DOOMHOUND token contract (for transfer calls)
      if (tx.to?.toLowerCase() !== DOOMHOUND_TOKEN.toLowerCase()) {
        return NextResponse.json(
          { error: "Transaction is not a $DOOMHOUND transfer" },
          { status: 400 }
        );
      }

      // Decode the transfer function to verify recipient and amount
      const erc20Interface = new ethers.Interface([
        "function transfer(address to, uint256 amount)"
      ]);
      const decoded = erc20Interface.parseTransaction({ data: tx.data });

      if (!decoded) {
        return NextResponse.json(
          { error: "Could not decode transaction data" },
          { status: 400 }
        );
      }

      const recipient = decoded.args[0].toLowerCase();
      const amount = BigInt(decoded.args[1].toString());

      if (recipient !== BURN_ADDRESS) {
        return NextResponse.json(
          { error: "Tokens were not sent to the burn address" },
          { status: 400 }
        );
      }

      if (amount < BURN_AMOUNT_WEI) {
        return NextResponse.json(
          { error: `Insufficient burn amount. Expected at least 11M $DOOMHOUND, got ${ethers.formatUnits(amount, 18)}` },
          { status: 400 }
        );
      }

      burnAmountStr = amount.toString();
      dbTxHash = txHash.toLowerCase();

      // Upsert: if this txHash already exists, update it; otherwise create new
      // Use try/catch with raw SQL fallback in case contractAddress column is missing from DB
      try {
        await db.burnMintRequest.upsert({
          where: { txHash: dbTxHash },
          update: {
            verified: true,
            burnAmount: burnAmountStr,
          },
          create: {
            walletAddress: walletLower,
            txHash: dbTxHash,
            burnAmount: burnAmountStr,
            verified: true,
            minted: false,
          },
        });
        console.log(`[NFT verify_burn] DB upsert successful for ${walletLower}, txHash=${dbTxHash}`);
      } catch (upsertErr: any) {
        if (upsertErr.message?.includes("contractAddress") || upsertErr.message?.includes("does not exist")) {
          console.warn("[NFT verify_burn] contractAddress column missing, using raw SQL for upsert");
          // Raw SQL upsert fallback — only uses columns that exist
          await db.$executeRaw`
            INSERT INTO "BurnMintRequest" ("walletAddress", "txHash", "burnAmount", verified, minted, "createdAt", "updatedAt")
            VALUES (${walletLower}, ${dbTxHash}, ${burnAmountStr}, true, false, NOW(), NOW())
            ON CONFLICT ("txHash") DO UPDATE SET verified = true, "burnAmount" = ${burnAmountStr}, "updatedAt" = NOW()
          `;
        } else {
          throw upsertErr;
        }
      }
    }

    // AUTO-MINT: Automatically call adminMint after successful burn verification
    // This replaces the old manual process where the team had to mint manually
    let mintTxHash: string | null = null;
    let autoMintError: string | null = null;
    try {
      // Try DEPLOYER_PRIVATE_KEY first (contract owner), then NFT_SIGNER_PRIVATE_KEY (signer)
      const OWNER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.NFT_SIGNER_PRIVATE_KEY;
      if (OWNER_PRIVATE_KEY) {
        const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
        const nftContractWithOwner = new ethers.Contract(
          NFT_CONTRACT_ADDRESS || "0x350661c692003cC9D8b350B88e5cc2Fd989E4DCb",
          [
            "function adminMint(address to, uint256 quantity) external",
            "function owner() view returns (address)",
          ],
          ownerWallet
        );

        const contractOwner = await nftContractWithOwner.owner();
        if (contractOwner.toLowerCase() === ownerWallet.address.toLowerCase()) {
          console.log(`[NFT verify_burn] Auto-minting NFT for ${walletLower}...`);
          const mintTx = await nftContractWithOwner.adminMint(walletLower, 1);
          console.log(`[NFT verify_burn] Mint TX sent: ${mintTx.hash}, waiting for confirmation...`);
          const mintReceipt = await mintTx.wait();
          if (mintReceipt.status === 1) {
            mintTxHash = mintTx.hash;
            console.log(`[NFT verify_burn] Auto-mint confirmed for ${walletLower}: ${mintTxHash}`);
            // Update DB to mark as minted (with fallback for missing contractAddress column)
            try {
              await db.burnMintRequest.update({
                where: { txHash: dbTxHash },
                data: { minted: true, mintTxHash: mintTxHash },
              });
            } catch (updateErr: any) {
              if (updateErr.message?.includes("contractAddress") || updateErr.message?.includes("does not exist")) {
                await db.$executeRaw`
                  UPDATE "BurnMintRequest" SET minted = true, "mintTxHash" = ${mintTxHash}, "updatedAt" = NOW()
                  WHERE "txHash" = ${dbTxHash}
                `;
              } else {
                console.error(`[NFT verify_burn] Failed to update minted status in DB:`, updateErr.message);
              }
            }
          } else {
            autoMintError = "Mint transaction reverted on-chain";
            console.error(`[NFT verify_burn] Auto-mint REVERTED for ${walletLower}: ${mintTx.hash}`);
          }
        } else {
          autoMintError = `Auto-mint unavailable: signing key (${ownerWallet.address.slice(0, 6)}...${ownerWallet.address.slice(-4)}) is not the contract owner (${contractOwner.slice(0, 6)}...${contractOwner.slice(-4)}). Set DEPLOYER_PRIVATE_KEY env var on Render.`;
          console.warn(`[NFT verify_burn] Auto-mint skipped: key wallet ${ownerWallet.address} is NOT the contract owner ${contractOwner}. DEPLOYER_PRIVATE_KEY must be set to the owner's private key.`);
        }
      } else {
        autoMintError = "DEPLOYER_PRIVATE_KEY not configured on server. The team needs to add it as an environment variable on Render for auto-minting.";
        console.warn(`[NFT verify_burn] Auto-mint skipped: no DEPLOYER_PRIVATE_KEY or NFT_SIGNER_PRIVATE_KEY configured`);
      }
    } catch (mintError: any) {
      autoMintError = mintError.message;
      console.error(`[NFT verify_burn] Auto-mint failed for ${walletLower}: ${mintError.message}`);
    }

    // Format burn amount for display (handle both raw wei string and formatted)
    const burnAmountDisplay = burnAmountStr ? (Number(burnAmountStr) / 1e18).toFixed(0) + " $DOOMHOUND" : "11M $DOOMHOUND";

    if (mintTxHash) {
      return NextResponse.json({
        success: true,
        verified: true,
        minted: true,
        message: "Burn verified! Your NFT has been minted to your wallet automatically!",
        burnAmount: burnAmountDisplay,
        txHash: dbTxHash,
        mintTxHash,
      });
    } else {
      // Auto-mint didn't work — fall back to manual process
      return NextResponse.json({
        success: true,
        verified: true,
        minted: false,
        message: "Burn verified! Your NFT will be minted by the team shortly. Keep an eye on your wallet.",
        burnAmount: burnAmountDisplay,
        txHash: dbTxHash,
        autoMintError: autoMintError || undefined,
      });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
