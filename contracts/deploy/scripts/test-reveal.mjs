import { createWalletClient, createPublicClient, http, formatEther } from "viem";
import { avalanche } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT_ADDRESS = "0xee29d3dcf6f74e77247404ee2c49acc1861c3cc1";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

async function main() {
  const pk = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : "0x" + PRIVATE_KEY;
  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({ account, chain: avalanche, transport: http() });
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });

  const artifactPath = join(__dirname, "../artifacts/contracts/DoomhoundNFT.sol/DoomhoundNFT.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  console.log("=== TEST 5: REVEAL ===");

  // Before reveal
  const tokenURI1 = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "tokenURI",
    args: [1n],
  });
  console.log("  tokenURI(1) PRIMA del reveal:", tokenURI1);
  console.log("  (Deve essere unrevealedURI)");

  // Reveal
  const baseURI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/";
  console.log("\n  Chiamando reveal()...");
  const tx = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "reveal",
    args: [baseURI],
  });
  console.log("  Tx hash:", tx);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log("  Status:", receipt.status === "success" ? "✅ SUCCESS" : "❌ FAILED");

  // After reveal
  const revealed = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "revealed",
  });
  console.log("\n  revealed:", revealed);

  const tokenURI2 = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "tokenURI",
    args: [1n],
  });
  console.log("  tokenURI(1) DOPO il reveal:", tokenURI2);

  // Resolve and check metadata
  const httpURL = tokenURI2.replace("ipfs://", "https://ipfs.io/ipfs/");
  console.log("\n  Scaricando metadata rivelato...");
  try {
    const metadata = await fetchJSON(httpURL);
    console.log("  ✅ Nome:", metadata.name);
    console.log("  ✅ Attributi:");
    for (const attr of metadata.attributes) {
      if (attr.trait_type) {
        console.log(`     - ${attr.trait_type}: ${attr.value}`);
      }
    }
    console.log("  ✅ Immagine:", metadata.image);

    // Check image
    const imgURL = metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
    const imgResp = await new Promise((resolve) => {
      https.get(imgURL, (res) => {
        resolve({ status: res.statusCode, size: res.headers['content-length'] });
      }).on('error', () => resolve({ status: 0, size: 0 }));
    });
    console.log("  Immagine status:", imgResp.status, imgResp.status === 200 ? "✅" : "❌");
    console.log("  Immagine size:", (imgResp.size / 1024).toFixed(0), "KB");

    // Also check token #2
    console.log("\n  --- Token #2 ---");
    const tokenURI2b = await publicClient.readContract({
      address: CONTRACT_ADDRESS, abi,
      functionName: "tokenURI",
      args: [2n],
    });
    const httpURL2 = tokenURI2b.replace("ipfs://", "https://ipfs.io/ipfs/");
    const meta2 = await fetchJSON(httpURL2);
    console.log("  ✅ Nome:", meta2.name);
    console.log("  ✅ Rarità:", meta2.attributes.find(a => a.trait_type === 'Rarity')?.value);
    console.log("  ✅ Breed:", meta2.attributes.find(a => a.trait_type === 'Breed')?.value);
  } catch(e) {
    console.log("  ❌ Errore:", e.message);
  }

  console.log("\n=== TEST 5 COMPLETO ✅ ===");
}

main().catch(e => { console.error("ERROR:", e.message || e); process.exit(1); });
