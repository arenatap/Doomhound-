import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { db } from "@/lib/db";

// Airdrop API — Mint specific token IDs to old contract holders
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
const AVAX_RPC = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Definitive airdrop list: 13 holders, 36 NFTs with specific token IDs
const AIRDROP_LIST = [
  { wallet: "0xeead31aa69a5afaa902ddffaa758d8d81c992a73", handle: "Florida_Man__", tokenIds: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 33], count: 13 },
  { wallet: "0x51b2902cd06270a90a2fef33447eb4c1006ea790", handle: "toff_arena", tokenIds: [1, 2, 22, 23, 24], count: 5 },
  { wallet: "0x4dd9c7062a6dd52453862860356f6b1a16df209c", handle: "702Philip", tokenIds: [19, 20, 36], count: 3 },
  { wallet: "0x56fecd3294e493e776f948a006a9eea0b094f630", handle: "onesimu_s", tokenIds: [14, 15, 35], count: 3 },
  { wallet: "0x55d594c142b4edfbb920bcf910326a21106bf406", handle: "Hegi____", tokenIds: [27, 30], count: 2 },
  { wallet: "0xc2ee02c8a0a7bedc7aca459ae7d07c0d12a37d5e", handle: "redtreader", tokenIds: [16, 21], count: 2 },
  { wallet: "0xa8d877197e6d82c3c31ff240af0dd36650bcf7bb", handle: "LadyRedPepe", tokenIds: [31, 32], count: 2 },
  { wallet: "0x0d37517a9c43d01eec4649b89125ebc11bd7b3c8", handle: "iiMIDO_", tokenIds: [34], count: 1 },
  { wallet: "0x86eba2434681ff58b8ad717a13b2f6dd63c2c181", handle: "KeezerDrumz", tokenIds: [18], count: 1 },
  { wallet: "0x004ec902c941139e177d92ff17614b339655499e", handle: "SarveshD1981", tokenIds: [25], count: 1 },
  { wallet: "0x47fbe4f7b7c2f77d3c74868e98e27b32353baa19", handle: "yunusay", tokenIds: [26], count: 1 },
  { wallet: "0x1c7fc21f3f57b1362ccd38143370db1e8770ed49", handle: "SlowPete_", tokenIds: [28], count: 1 },
  { wallet: "0xe458ca2d2ee3b314cc6a3f041c20d35cec639cbf", handle: "AiDog_NFT", tokenIds: [29], count: 1 },
];

const AIRDROP_ABI = [
  "function adminMintTokenBatch(address to, uint256[] calldata tokenIds) external",
  "function owner() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function MAX_SUPPLY() view returns (uint256)",
];

// GET — Check airdrop status
export async function GET(request: NextRequest) {
  try {
    const password = request.nextUrl.searchParams.get("password");
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!NFT_CONTRACT_ADDRESS || NFT_CONTRACT_ADDRESS === "0x851ba0903c345676369634660e2757026418dced") {
      return NextResponse.json({
        contractAddress: null,
        airdropList: AIRDROP_LIST,
        totalAirdropNeeded: 36,
        totalHolders: 13,
        status: "waiting_deploy",
        message: "Deploy the new contract first, then set NFT_CONTRACT_ADDRESS env var.",
      });
    }

    const provider = new ethers.JsonRpcProvider(AVAX_RPC);
    const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, AIRDROP_ABI, provider);

    const currentSupply = Number(await nftContract.totalSupply());
    const maxSupply = Number(await nftContract.MAX_SUPPLY());

    // Check which tokens are already minted
    const holders = [];
    let totalMinted = 0;
    let totalSkipped = 0;

    for (const entry of AIRDROP_LIST) {
      const alreadyMinted: number[] = [];
      const needsMint: number[] = [];

      for (const tokenId of entry.tokenIds) {
        try {
          const owner = await nftContract.ownerOf(tokenId);
          if (owner.toLowerCase() === entry.wallet.toLowerCase()) {
            alreadyMinted.push(tokenId);
          } else {
            needsMint.push(tokenId);
          }
        } catch {
          // Token doesn't exist yet — needs minting
          needsMint.push(tokenId);
        }
      }

      totalMinted += alreadyMinted.length;
      totalSkipped += alreadyMinted.length;

      holders.push({
        wallet: entry.wallet,
        handle: entry.handle,
        expectedCount: entry.count,
        alreadyMinted: alreadyMinted.length,
        needsAirdrop: needsMint.length,
        needsMintTokenIds: needsMint,
        alreadyMintedTokenIds: alreadyMinted,
        status: needsMint.length === 0 ? "complete" : "pending",
      });
    }

    const totalAirdropNeeded = holders.reduce((sum, h) => sum + h.needsAirdrop, 0);

    return NextResponse.json({
      contractAddress: NFT_CONTRACT_ADDRESS,
      currentSupply,
      maxSupply,
      totalAirdropNeeded,
      totalMinted,
      totalSkipped,
      holders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Execute airdrop
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body.password;
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!NFT_CONTRACT_ADDRESS || NFT_CONTRACT_ADDRESS === "0x851ba0903c345676369634660e2757026418dced") {
      return NextResponse.json({ error: "New contract not deployed yet. Deploy first." }, { status: 400 });
    }

    if (!DEPLOYER_PRIVATE_KEY) {
      return NextResponse.json({ error: "DEPLOYER_PRIVATE_KEY not configured" }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(AVAX_RPC);
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, AIRDROP_ABI, wallet);

    // Verify owner
    const contractOwner = await nftContract.owner();
    if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      return NextResponse.json({
        error: `Wallet ${wallet.address} is NOT the contract owner ${contractOwner}`,
      }, { status: 500 });
    }

    const results = [];
    let totalMinted = 0;
    let totalSkipped = 0;

    for (const entry of AIRDROP_LIST) {
      try {
        // Check which tokens still need minting
        const needsMint: number[] = [];
        for (const tokenId of entry.tokenIds) {
          try {
            const owner = await nftContract.ownerOf(tokenId);
            if (owner.toLowerCase() !== entry.wallet.toLowerCase()) {
              needsMint.push(tokenId);
            }
            // else: already minted to correct owner, skip
          } catch {
            needsMint.push(tokenId);
          }
        }

        if (needsMint.length === 0) {
          results.push({
            wallet: entry.wallet,
            handle: entry.handle,
            status: "skipped",
            message: `All ${entry.count} NFTs already minted`,
          });
          totalSkipped += entry.count;
          continue;
        }

        // Use adminMintTokenBatch for efficiency
        console.log(`[AIRDROP] Minting ${needsMint.length} tokens to ${entry.handle} (${entry.wallet}): [${needsMint.join(',')}]`);

        const tx = await nftContract.adminMintTokenBatch(
          entry.wallet,
          needsMint
        );
        console.log(`[AIRDROP] TX sent: ${tx.hash}, waiting...`);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          results.push({
            wallet: entry.wallet,
            handle: entry.handle,
            status: "success",
            minted: needsMint.length,
            tokenIds: needsMint,
            txHash: tx.hash,
          });
          totalMinted += needsMint.length;
          console.log(`[AIRDROP] ✅ ${entry.handle}: ${needsMint.length} NFTs minted`);
        } else {
          results.push({
            wallet: entry.wallet,
            handle: entry.handle,
            status: "failed",
            message: "Transaction reverted",
          });
          console.error(`[AIRDROP] ❌ ${entry.handle}: TX reverted`);
        }

        // Wait 2s between transactions to avoid nonce issues
        await new Promise(r => setTimeout(r, 2000));
      } catch (err: any) {
        results.push({
          wallet: entry.wallet,
          handle: entry.handle,
          status: "error",
          message: err.message?.slice(0, 100),
        });
        console.error(`[AIRDROP] ❌ ${entry.handle}: ${err.message?.slice(0, 100)}`);
      }
    }

    // Get final supply
    const finalSupply = Number(await nftContract.totalSupply());

    return NextResponse.json({
      success: true,
      contractAddress: NFT_CONTRACT_ADDRESS,
      totalMinted,
      totalSkipped,
      finalSupply,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
