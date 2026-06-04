import { createPublicClient, http, formatEther } from "viem";
import { avalanche } from "viem/chains";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT_ADDRESS = "0xee29d3dcf6f74e77247404ee2c49acc1861c3cc1";

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
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });
  const artifactPath = join(__dirname, "../artifacts/contracts/DoomhoundNFT.sol/DoomhoundNFT.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  console.log("=== TEST 3: TOKEN URI ===");

  // Get tokenURI for NFT #1
  const tokenURI = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "tokenURI",
    args: [1n],
  });
  console.log("  tokenURI(1):", tokenURI);

  // Since revealed=false, it should return unrevealedURI
  console.log("  (Non rivelato → dovrebbe restituire unrevealedURI)");

  // Resolve via gateway
  const httpURL = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
  console.log("  HTTP URL:", httpURL);

  console.log("\n  Scaricando metadata...");
  try {
    const metadata = await fetchJSON(httpURL);
    console.log("  ✅ Nome:", metadata.name);
    console.log("  ✅ Descrizione:", metadata.description?.substring(0, 60) + "...");
    console.log("  ✅ Immagine:", metadata.image);

    // Check if image is accessible
    const imgURL = metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
    console.log("  Immagine HTTP:", imgURL);
    
    const imgResp = await new Promise((resolve) => {
      https.get(imgURL, (res) => {
        resolve({ status: res.statusCode, size: res.headers['content-length'] });
      }).on('error', () => resolve({ status: 0, size: 0 }));
    });
    console.log("  Immagine status:", imgResp.status, imgResp.status === 200 ? "✅" : "❌");
    console.log("  Immagine size:", (imgResp.size / 1024 / 1024).toFixed(2), "MB");
  } catch(e) {
    console.log("  ❌ Errore fetch metadata:", e.message);
  }

  console.log("\n=== TEST 3 COMPLETO ✅ ===");
}

main().catch(e => { console.error("ERROR:", e.message || e); process.exit(1); });
