/**
 * Seed NFT Whitelist via Admin API
 * 
 * Run: node scripts/seed-whitelist-api.mjs <BASE_URL> <ADMIN_PASSWORD>
 * Example: node scripts/seed-whitelist-api.mjs https://doomhound.onrender.com mypassword123
 * 
 * FORMULA: 20 top holders + 1 Founder (Toff) + 5 Saturday leaderboard = 26
 * Toff gets 1 claimFreeMint + 1 adminMint (on-chain) = 2 NFTs total
 */

const BASE_URL = process.argv[2] || "https://doomhound.onrender.com";
const ADMIN_PASSWORD = process.argv[3];

if (!ADMIN_PASSWORD) {
  console.error("Usage: node seed-whitelist-api.mjs <BASE_URL> <ADMIN_PASSWORD>");
  process.exit(1);
}

const TOFF_WALLET = "0x51b2902cd06270a90a2fef33447eb4c1006ea790";
const TOFF_HANDLE = "toff083249361";

const TOP_20_HOLDERS = [
  { addr: "0x004ec902c941139e177d92ff17614b339655499e", handle: "sarveshd1981" },
  { addr: "0x060cb35d8a06497f8675871b93b18ee704aabc76", handle: "tedcrawford187" },
  { addr: "0xa327639f0285a19d872a9b7971cfe2d41505edb9", handle: "chartshaman" },
  { addr: "0x86eba2434681ff58b8ad717a13b2f6dd63c2c181", handle: "keezerdrumz" },
  { addr: "0x55d594c142b4edfbb920bcf910326a21106bf406", handle: "hegi____" },
  { addr: "0xc2ee02c8a0a7bedc7aca459ae7d07c0d12a37d5e", handle: "redtreader" },
  { addr: "0x42b9a303a2c5e5df4f6d79a8eea24e884b94b92a", handle: "quietednights" },
  { addr: "0xa8d877197e6d82c3c31ff240af0dd36650bcf7bb", handle: "ladyredpepe" },
  { addr: "0x4dd9c7062a6dd52453862860356f6b1a16df209c", handle: "702philip" },
  { addr: "0x1c7fc21f3f57b1362ccd38143370db1e8770ed49", handle: "slowpete_" },
  { addr: "0xeead31aa69a5afaa902ddffaa758d8d81c992a73", handle: "florida__man__" },
  { addr: "0x7261b1bde8c01065e33fd74e9021cd5d3300156d", handle: "chheezzeee" },
  { addr: "0x178dc49367edf33fbfa66023a876c96e0c8a7446", handle: "dj_rustbucket" },
  { addr: "0xe458ca2d2ee3b314cc6a3f041c20d35cec639cbf", handle: "aidog_nft" },
  { addr: "0x57ed488dbb96a314c93c846e0ae2cdf1ab73980b", handle: "luckshsadi" },
  { addr: "0x0d37517a9c43d01eec4649b89125ebc11bd7b3c8", handle: "iimido_" },
  { addr: "0x56fecd3294e493e776f948a006a9eea0b094f630", handle: "onesimu_s" },
  { addr: "0xb1fe2e973b311a6dafb323de15a9de302fd0a905", handle: "chloefan41230" },
  { addr: "0xd910bf90fc49913ec5192af7690c6efdcf3e2396", handle: "jasonmdesimone" },
  { addr: "0x47fbe4f7b7c2f77d3c74868e98e27b32353baa19", handle: "yunusay" },
];

async function seedWhitelist() {
  console.log("=== NFT Whitelist Seed via Admin API ===\n");
  console.log(`Target: ${BASE_URL}\n`);

  // Build entries: 20 top holders + 1 founder
  const entries = [
    ...TOP_20_HOLDERS.map((h, i) => ({
      walletAddress: h.addr.toLowerCase(),
      handle: h.handle.toLowerCase(),
      reason: "top_holder",
      mintAllowance: 1,
    })),
    {
      walletAddress: TOFF_WALLET.toLowerCase(),
      handle: TOFF_HANDLE,
      reason: "founder",
      mintAllowance: 1, // 2nd NFT via adminMint() on-chain
    },
  ];

  console.log(`Sending ${entries.length} entries (20 holders + 1 founder)...\n`);

  try {
    const resp = await fetch(`${BASE_URL}/api/admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": ADMIN_PASSWORD,
      },
      body: JSON.stringify({
        action: "nft_whitelist",
        entries,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("❌ Error:", data.error || resp.statusText);
      process.exit(1);
    }

    console.log("✅ Whitelist populated successfully!\n");
    console.log(`  Added: ${data.added}`);
    console.log(`  Updated: ${data.updated}`);
    console.log(`  Skipped: ${data.skipped}`);
    console.log(`  Total whitelisted: ${data.totalWhitelisted}`);
    console.log(`  Total mint allowance: ${data.totalMintAllowance}`);
    console.log("\nDetails:");
    data.results.forEach((r: string) => console.log(`  ${r}`));

    console.log("\n=== Next Steps ===");
    console.log("  1. Add 5 Saturday leaderboard winners via admin API");
    console.log("  2. Call setFreeMintActive(true) on contract");
    console.log("  3. Call setPaidMintActive(true) on contract");
    console.log("  4. Call setTokenMintActive(true) on contract");
    console.log("  5. Call adminMint(Toff's wallet, 1) for Toff's 2nd NFT");
  } catch (e: any) {
    console.error("❌ Failed:", e.message);
    process.exit(1);
  }
}

seedWhitelist();
