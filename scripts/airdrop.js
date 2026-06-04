/**
 * DOOMHOUND NFT — Airdrop Script
 *
 * Mints 36 NFTs to 13 legitimate owners on the NEW contract,
 * preserving the same token IDs as the old (hacked) contract.
 *
 * Token IDs are minted IN ORDER starting from 1.
 * Since adminMint always mints totalSupply+1, we must mint
 * each token to its correct owner in sequential order.
 *
 * Usage:
 *   npx hardhat run scripts/airdrop.js --network avax
 *
 * Required env vars:
 *   PRIVATE_KEY           — Owner wallet private key
 *   NFT_CONTRACT_ADDRESS  — New contract address (from deploy.js)
 */

// ===== AIRDROP DATA =====
// Verified on-chain from old contract 0x851ba0903c345676369634660E2757026418DCEd
// Total: 36 NFTs, 13 unique owners
// Last verified: 2026-06-02
const AIRDROP_LIST = [
  // token ID, owner address
  [1,  "0x51b2902cD06270A90a2fef33447eB4c1006Ea790"],
  [2,  "0x51b2902cD06270A90a2fef33447eB4c1006Ea790"],
  [3,  "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [4,  "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [5,  "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [6,  "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [7,  "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [8,  "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [9,  "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [10, "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [11, "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [12, "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [13, "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [14, "0x56fECD3294e493E776F948a006a9EeA0B094F630"],
  [15, "0x56fECD3294e493E776F948a006a9EeA0B094F630"],
  [16, "0xc2EE02C8A0A7BEDC7acA459ae7D07C0D12a37D5e"],
  [17, "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [18, "0x86EBa2434681FF58b8aD717a13B2f6Dd63C2c181"],
  [19, "0x4Dd9C7062a6Dd52453862860356f6B1a16DF209c"],
  [20, "0x4Dd9C7062a6Dd52453862860356f6B1a16DF209c"],
  [21, "0xc2EE02C8A0A7BEDC7acA459ae7D07C0D12a37D5e"],
  [22, "0x51b2902cD06270A90a2fef33447eB4c1006Ea790"],
  [23, "0x51b2902cD06270A90a2fef33447eB4c1006Ea790"],
  [24, "0x51b2902cD06270A90a2fef33447eB4c1006Ea790"],
  [25, "0x004eC902C941139e177d92ff17614b339655499e"],
  [26, "0x47FBe4f7B7C2f77D3C74868E98E27B32353BAA19"],
  [27, "0x55d594C142B4EdfbB920BCF910326a21106bf406"],
  [28, "0x1c7fc21f3F57B1362ccd38143370dB1e8770ED49"],
  [29, "0xe458ca2D2eE3b314cC6A3F041C20d35cEC639Cbf"],
  [30, "0x55d594C142B4EdfbB920BCF910326a21106bf406"],
  [31, "0xa8d877197e6D82c3c31ff240aF0Dd36650BcF7bB"],
  [32, "0xa8d877197e6D82c3c31ff240aF0Dd36650BcF7bB"],
  [33, "0xeead31Aa69A5AfaA902dDFfAa758d8D81C992A73"],
  [34, "0x0D37517a9C43D01eec4649b89125eBc11bd7b3c8"],
  [35, "0x56fECD3294e493E776F948a006a9EeA0B094F630"],
  [36, "0x4Dd9C7062a6Dd52453862860356f6B1a16DF209c"],
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Airdrop with account:", deployer.address);

  const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
  if (!CONTRACT_ADDRESS) {
    throw new Error("NFT_CONTRACT_ADDRESS env var is required (the new contract address)");
  }

  const nft = await hre.ethers.getContractAt("DoomhoundNFT", CONTRACT_ADDRESS);

  const currentSupply = Number(await nft.totalSupply());
  console.log("Current supply before airdrop:", currentSupply);

  if (currentSupply > 0) {
    console.log("WARNING: Contract already has", currentSupply, "tokens minted!");
    console.log("Airdrop will mint tokens starting from ID", currentSupply + 1);
    console.log("This may NOT match the old contract's token IDs!");
  }

  // Validate that we're starting from 0 (fresh contract)
  if (currentSupply > 0) {
    const proceed = process.env.FORCE_AIRDROP === "true";
    if (!proceed) {
      throw new Error("Contract is not empty! Set FORCE_AIRDROP=true to proceed anyway.");
    }
  }

  // ===== GROUP BY OWNER (for gas efficiency) =====
  // adminMint(to, quantity) mints `quantity` tokens sequentially
  // We need to call adminMint in the exact order of token IDs
  // Since adminMint mints totalSupply+1, totalSupply+2, etc.,
  // we can batch consecutive tokens to the same owner.

  console.log("\n===== AIRDROP PLAN =====");
  console.log(`Total tokens to mint: ${AIRDROP_LIST.length}`);

  // Group consecutive tokens by same owner for batched adminMint
  const batches = [];
  let currentBatch = { owner: AIRDROP_LIST[0][1], count: 1, startId: 1 };

  for (let i = 1; i < AIRDROP_LIST.length; i++) {
    const [tokenId, owner] = AIRDROP_LIST[i];
    if (owner.toLowerCase() === currentBatch.owner.toLowerCase()) {
      currentBatch.count++;
    } else {
      batches.push(currentBatch);
      currentBatch = { owner, count: 1, startId: tokenId };
    }
  }
  batches.push(currentBatch);

  console.log(`\nBatched into ${batches.length} adminMint calls:\n`);

  let totalTokens = 0;
  for (const batch of batches) {
    console.log(`  ${batch.owner} → ${batch.count} NFTs (IDs ${batch.startId}-${batch.startId + batch.count - 1})`);
    totalTokens += batch.count;
  }
  console.log(`\nTotal: ${totalTokens} tokens`);

  if (totalTokens !== 36) {
    throw new Error(`Expected 36 tokens, got ${totalTokens}. Check AIRDROP_LIST!`);
  }

  // ===== EXECUTE AIRDROP =====
  console.log("\n===== EXECUTING AIRDROP =====");

  let mintedSoFar = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n[${i + 1}/${batches.length}] Minting ${batch.count} to ${batch.owner}...`);

    const tx = await nft.adminMint(batch.owner, batch.count);
    const receipt = await tx.wait();

    mintedSoFar += batch.count;
    const newSupply = Number(await nft.totalSupply());
    console.log(`  TX: ${receipt.hash}`);
    console.log(`  Supply now: ${newSupply} (${mintedSoFar} minted in airdrop)`);

    // Small delay between transactions to avoid nonce issues
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // ===== VERIFY AIRDROP =====
  console.log("\n===== VERIFICATION =====");
  const finalSupply = Number(await nft.totalSupply());
  console.log("Final supply:", finalSupply);

  if (finalSupply !== 36) {
    console.log("WARNING: Expected 36, got", finalSupply);
  }

  // Spot-check a few owners
  console.log("\nSpot-checking token owners:");
  const checks = [1, 2, 13, 14, 17, 25, 33, 35, 36];
  for (const tokenId of checks) {
    try {
      const owner = await nft.ownerOf(tokenId);
      const expected = AIRDROP_LIST.find(t => t[0] === tokenId)?.[1];
      const match = owner.toLowerCase() === expected?.toLowerCase() ? "OK" : "MISMATCH!";
      console.log(`  Token #${tokenId}: ${owner} ${match}`);
    } catch (e) {
      console.log(`  Token #${tokenId}: ERROR - ${e.message}`);
    }
  }

  console.log("\n===== AIRDROP COMPLETE =====");
  console.log("All 36 NFTs have been airdropped to their legitimate owners!");
  console.log("Next: Update the NFT_CONTRACT_ADDRESS in your frontend and API.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
