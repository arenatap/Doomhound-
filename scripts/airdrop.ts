/**
 * Airdrop Script — DoomhoundNFT (New Contract)
 * 
 * Mints NFTs to the 13 legitimate owners from the old (hacked) contract.
 * Uses adminMint(to, quantity) for each address.
 * 
 * The new contract uses totalSupply()+1 for token IDs (same as v2),
 * so after airdrop the token IDs will be 1-34 (same pattern as original).
 * 
 * Usage:
 *   NFT_CONTRACT_ADDRESS=0x... DEPLOYER_PRIVATE_KEY=0x... bun run scripts/airdrop.ts
 * 
 * IMPORTANT: The DEPLOYER_PRIVATE_KEY must be the OWNER of the new contract.
 * NEVER commit this key to the repository!
 */

import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { avalanche } from "wagmi/chains";
import { privateKeyToAccount } from "viem/accounts";
import { NFT_ABI } from "../src/lib/nft-abi";

// ===== CONFIGURATION =====
const NFT_CONTRACT_ADDRESS = (process.env.NFT_CONTRACT_ADDRESS || "") as `0x${string}`;
const DEPLOYER_PRIVATE_KEY = (process.env.DEPLOYER_PRIVATE_KEY || "") as `0x${string}`;
const AVAX_RPC_URL = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";

// ===== AIRDROP LIST — 34 NFTs to 13 legitimate owners =====
// These are the exact owners and quantities from the old (hacked) contract
const AIRDROP_LIST: { address: `0x${string}`; count: number; tokenIds: number[] }[] = [
  { address: "0x51b2902cD06270A90a2fef33447eB4c1006Ea790", count: 5, tokenIds: [1, 2, 22, 23, 24] },
  { address: "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73", count: 13, tokenIds: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 33] },
  { address: "0x56fECD3294e493E776F948a006a9EeA0B094F630", count: 2, tokenIds: [14, 15] },
  { address: "0xc2EE02C8A0A7BEDC7acA459ae7D07C0D12a37D5e", count: 2, tokenIds: [16, 21] },
  { address: "0x86EBa2434681FF58b8aD717a13B2f6Dd63C2c181", count: 1, tokenIds: [18] },
  { address: "0x4Dd9C7062a6Dd52453862860356f6B1a16DF209c", count: 2, tokenIds: [19, 20] },
  { address: "0x004eC902C941139e177d92ff17614b339655499e", count: 1, tokenIds: [25] },
  { address: "0x47FBe4f7B7C2f77D3C74868E98E27B32353BAA19", count: 1, tokenIds: [26] },
  { address: "0x55d594C142B4EdfbB920BCF910326a21106bf406", count: 2, tokenIds: [27, 30] },
  { address: "0x1c7fc21f3F57B1362ccd38143370dB1e8770ED49", count: 1, tokenIds: [28] },
  { address: "0xe458ca2D2eE3b314cC6A3F041C20d35cEC639Cbf", count: 1, tokenIds: [29] },
  { address: "0xa8d877197e6D82c3c31ff240aF0Dd36650BcF7bB", count: 2, tokenIds: [31, 32] },
  { address: "0x0D37517a9C43D01eec4649b89125eBc11bd7b3c8", count: 1, tokenIds: [34] },
];

async function main() {
  // Validate configuration
  if (!NFT_CONTRACT_ADDRESS || NFT_CONTRACT_ADDRESS === "0x") {
    console.error("❌ NFT_CONTRACT_ADDRESS not set. Run with: NFT_CONTRACT_ADDRESS=0x... bun run scripts/airdrop.ts");
    process.exit(1);
  }

  if (!DEPLOYER_PRIVATE_KEY || DEPLOYER_PRIVATE_KEY === "0x") {
    console.error("❌ DEPLOYER_PRIVATE_KEY not set. Run with: DEPLOYER_PRIVATE_KEY=0x... bun run scripts/airdrop.ts");
    process.exit(1);
  }

  // Verify total count
  const totalNfts = AIRDROP_LIST.reduce((sum, entry) => sum + entry.count, 0);
  console.log(`\n🔥 DOOMHOUND NFT AIRDROP — Hounds of the Hell (New Contract)`);
  console.log(`📋 Contract: ${NFT_CONTRACT_ADDRESS}`);
  console.log(`📊 Total NFTs to airdrop: ${totalNfts}`);
  console.log(`👥 Total recipients: ${AIRDROP_LIST.length}\n`);

  if (totalNfts !== 34) {
    console.error(`❌ Expected 34 NFTs but got ${totalNfts}. Check AIRDROP_LIST.`);
    process.exit(1);
  }

  // Setup clients
  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  console.log(`🔑 Deployer address: ${account.address}\n`);

  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(AVAX_RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: avalanche,
    transport: http(AVAX_RPC_URL),
  });

  // Verify contract owner
  const owner = await publicClient.readContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: "owner",
  });
  console.log(`👤 Contract owner: ${owner}`);

  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    console.error(`❌ Deployer is NOT the contract owner! Deployer: ${account.address}, Owner: ${owner}`);
    process.exit(1);
  }

  // Check current supply
  const currentSupply = await publicClient.readContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: "totalSupply",
  });
  console.log(`📦 Current totalSupply: ${currentSupply}\n`);

  if (Number(currentSupply) > 0) {
    console.warn(`⚠️  Contract already has ${currentSupply} NFTs minted. Airdrop will add ${totalNfts} more.`);
    console.warn(`⚠️  Total after airdrop: ${Number(currentSupply) + totalNfts}/100\n`);
    console.warn(`⚠️  NOTE: Token IDs will be ${Number(currentSupply) + 1} to ${Number(currentSupply) + totalNfts}`);
    console.warn(`⚠️       These will NOT match the old contract's token IDs (1-34).`);
    console.warn(`⚠️       This is expected — the NFT images/metadata are the same via IPFS.\n`);
  }

  // Execute airdrop
  let successCount = 0;
  let failCount = 0;

  for (const entry of AIRDROP_LIST) {
    try {
      console.log(`📤 Minting ${entry.count} NFT(s) to ${entry.address}...`);

      const { request } = await publicClient.simulateContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "adminMint",
        args: [entry.address, BigInt(entry.count)],
        account,
      });

      const txHash = await walletClient.writeContract(request);
      console.log(`   ⏳ TX: ${txHash}`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status === "success") {
        console.log(`   ✅ Success! Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);
        successCount += entry.count;
      } else {
        console.error(`   ❌ TX reverted! Hash: ${txHash}`);
        failCount += entry.count;
      }

      // Wait 2 seconds between transactions to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`   ❌ Error minting to ${entry.address}: ${error.message}`);
      failCount += entry.count;
    }
  }

  // Final summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔥 AIRDROP COMPLETE`);
  console.log(`✅ Successfully minted: ${successCount} NFTs`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} NFTs`);
  }

  const finalSupply = await publicClient.readContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: "totalSupply",
  });
  console.log(`📦 Final totalSupply: ${finalSupply}/100`);

  // Verify ownership matches expected
  console.log(`\n📋 POST-AIRDROP VERIFICATION:`);
  for (const entry of AIRDROP_LIST) {
    const balance = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: "balanceOf",
      args: [entry.address],
    });
    const status = Number(balance) >= entry.count ? "✅" : "❌";
    console.log(`   ${status} ${entry.address}: ${balance} NFTs (expected ${entry.count})`);
  }

  console.log(`${"=".repeat(60)}\n`);

  console.log(`📋 NEXT STEPS:`);
  console.log(`1. Call setBaseURI("ipfs://bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/")`);
  console.log(`2. Call reveal("ipfs://bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/")`);
  console.log(`3. Call setFreeMintActive(true)`);
  console.log(`4. Call setPaidMintActive(true)`);
  console.log(`5. Update NEXT_PUBLIC_NFT_CONTRACT_ADDRESS on Render Dashboard`);
  console.log(`6. Update NFT_SIGNER_PRIVATE_KEY on Render Dashboard`);
  console.log(`7. Update DEPLOYER_PRIVATE_KEY on Render Dashboard`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
