import { createPublicClient, http } from "viem";
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

  console.log("=== COSA VEDE L'UTENTE ===\n");

  const revealed = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi, functionName: "revealed",
  });
  console.log("Contratto revealed:", revealed);

  for (const id of [1, 2]) {
    const uri = await publicClient.readContract({
      address: CONTRACT_ADDRESS, abi, functionName: "tokenURI", args: [BigInt(id)],
    });
    console.log("\ntokenURI(" + id + "):", uri);
    
    const httpURL = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    const meta = await fetchJSON(httpURL);
    console.log("  Nome:", meta.name);
    console.log("  Immagine IPFS:", meta.image);
    
    const imgURL = meta.image.replace("ipfs://", "https://ipfs.io/ipfs/");
    
    const imgCheck = await new Promise((resolve) => {
      https.get(imgURL, (res) => {
        resolve({ status: res.statusCode, type: res.headers['content-type'], size: res.headers['content-length'] });
      }).on('error', () => resolve({ status: 0 }));
    });
    
    if (imgCheck.status === 200) {
      console.log("  Immagine: ACCESSIBILE (" + (imgCheck.size/1024).toFixed(0) + " KB) ✅");
    } else {
      console.log("  Immagine: NON accessibile (HTTP " + imgCheck.status + ") ❌");
    }
  }

  console.log("\n--- LINK PER VEDERE ---");
  console.log("Snowtrace: https://snowtrace.io/token/" + CONTRACT_ADDRESS);
  console.log("NFT #1: https://snowtrace.io/token/" + CONTRACT_ADDRESS + "?a=1");
  console.log("NFT #2: https://snowtrace.io/token/" + CONTRACT_ADDRESS + "?a=2");
}

main().catch(e => { console.error(e.message); process.exit(1); });
