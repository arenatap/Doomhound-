/**
 * Seed NFT Whitelist — CORRECT VERSION
 * 
 * FORMULA: 20 top holders + 1 Founder (Toff) + 5 Saturday leaderboard = 26
 * Toff gets 1 claimFreeMint + 1 adminMint (on-chain, owner-only) = 2 NFTs total
 * 
 * EXCLUDED from top holders:
 *   - 0x06380c0e... (Liquidity Pool)
 *   - 0x0000...dead (Burn address)
 *   - 0x5be21a8c... (External Account / no Arena profile → replaced by @jasonmdesimone)
 *   - Toff's wallet (he's counted separately as Founder)
 * 
 * TOTAL: 20 holders + 1 founder = 21 entries now
 *        + 5 Saturday = 26 claimFreeMint slots
 *        + 1 adminMint for Toff's 2nd NFT = 27 total free NFTs
 */
const { PrismaClient } = require("@prisma/client");

const TOFF_WALLET = "0x51b2902cd06270a90a2fef33447eb4c1006ea790";
const TOFF_HANDLE = "toff083249361";

// Top 20 $DOOMHOUND holders (excluding LP, Burn, External Account, and Toff)
// Handles verified via Arena API + app screenshots
const TOP_20_HOLDERS = [
  { addr: "0x004ec902c941139e177d92ff17614b339655499e", handle: "sarveshd1981",     bal: "625M" },
  { addr: "0x060cb35d8a06497f8675871b93b18ee704aabc76", handle: "tedcrawford187",   bal: "433M" },
  { addr: "0xa327639f0285a19d872a9b7971cfe2d41505edb9", handle: "chartshaman",      bal: "372M" },
  { addr: "0x86eba2434681ff58b8ad717a13b2f6dd63c2c181", handle: "keezerdrumz",      bal: "345M" },
  { addr: "0x55d594c142b4edfbb920bcf910326a21106bf406", handle: "hegi____",         bal: "310M" },
  { addr: "0xc2ee02c8a0a7bedc7aca459ae7d07c0d12a37d5e", handle: "redtreader",       bal: "254M" },
  { addr: "0x42b9a303a2c5e5df4f6d79a8eea24e884b94b92a", handle: "quietednights",    bal: "242M" },
  { addr: "0xa8d877197e6d82c3c31ff240af0dd36650bcf7bb", handle: "ladyredpepe",      bal: "203M" },
  { addr: "0x4dd9c7062a6dd52453862860356f6b1a16df209c", handle: "702philip",        bal: "200M" },
  { addr: "0x1c7fc21f3f57b1362ccd38143370db1e8770ed49", handle: "slowpete_",        bal: "198M" },
  { addr: "0xeead31aa69a5afaa902ddffaa758d8d81c992a73", handle: "florida__man__",   bal: "170M" },
  { addr: "0x7261b1bde8c01065e33fd74e9021cd5d3300156d", handle: "chheezzeee",       bal: "149M" },
  { addr: "0x178dc49367edf33fbfa66023a876c96e0c8a7446", handle: "dj_rustbucket",    bal: "143M" },
  { addr: "0xe458ca2d2ee3b314cc6a3f041c20d35cec639cbf", handle: "aidog_nft",        bal: "133M" },
  { addr: "0x57ed488dbb96a314c93c846e0ae2cdf1ab73980b", handle: "luckshsadi",       bal: "126M" },
  { addr: "0x0d37517a9c43d01eec4649b89125ebc11bd7b3c8", handle: "iimido_",          bal: "118M" },
  { addr: "0x56fecd3294e493e776f948a006a9eea0b094f630", handle: "onesimu_s",        bal: "104M" },
  { addr: "0xb1fe2e973b311a6dafb323de15a9de302fd0a905", handle: "chloefan41230",    bal: "95M"  },
  { addr: "0xd910bf90fc49913ec5192af7690c6efdcf3e2396", handle: "jasonmdesimone",   bal: "91M"  },
  { addr: "0x47fbe4f7b7c2f77d3c74868e98e27b32353baa19", handle: "yunusay",          bal: "80M"  },
];

async function main() {
  const prisma = new PrismaClient();
  console.log("=== NFT Whitelist Seed ===\n");
  console.log("Formula: 20 holders + 1 Founder (Toff) + 5 Saturday = 26 claimFreeMint");
  console.log("Toff's 2nd NFT via adminMint() on-chain\n");

  // Clear existing
  await prisma.nftWhitelist.deleteMany();
  console.log("Cleared existing whitelist entries\n");

  // 1. Seed top 20 holders
  console.log("Top 20 Holders:");
  for (let i = 0; i < TOP_20_HOLDERS.length; i++) {
    const h = TOP_20_HOLDERS[i];
    const addr = h.addr.toLowerCase();
    await prisma.nftWhitelist.create({
      data: {
        handle: h.handle.toLowerCase(),
        walletAddress: addr,
        reason: "top_holder",
        mintAllowance: 1,
        mintClaimed: 0,
        claimed: false,
      },
    });
    console.log(`  #${i + 1} @${h.handle} | ${addr.slice(0, 10)}... | ${h.bal}`);
  }

  // 2. Seed Founder (Toff) — mintAllowance=1 because MAX_FREE_PER_WALLET=1 in contract
  //    Toff's 2nd NFT is minted via adminMint() directly on-chain by the contract owner
  console.log("\nFounder:");
  await prisma.nftWhitelist.create({
    data: {
      handle: TOFF_HANDLE,
      walletAddress: TOFF_WALLET.toLowerCase(),
      reason: "founder",
      mintAllowance: 1,  // Contract enforces MAX_FREE_PER_WALLET=1; 2nd mint via adminMint()
      mintClaimed: 0,
      claimed: false,
    },
  });
  console.log(`  @${TOFF_HANDLE} | ${TOFF_WALLET.slice(0, 10)}... | 1 claimFreeMint + 1 adminMint = 2 NFTs`);

  // Summary
  const total = await prisma.nftWhitelist.count();
  console.log("\n=== Summary ===");
  console.log(`  Seeded: ${total} entries (20 holders + 1 founder)`);
  console.log(`  + 5 Saturday leaderboard = ${total + 5} total claimFreeMint slots`);
  console.log(`  + 1 adminMint for Toff = ${total + 6} total free NFTs`);
  console.log(`  Contract MAX_FREE_PER_WALLET = 1 (Toff's 2nd via adminMint)`);

  await prisma.$disconnect();
}

main().catch(function(e) { console.error(e); process.exit(1); });
