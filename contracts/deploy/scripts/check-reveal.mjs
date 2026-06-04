import { createPublicClient, http } from "viem";
import { avalanche } from "viem/chains";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT_ADDRESS = "0xee29d3dcf6f74e77247404ee2c49acc1861c3cc1";

async function main() {
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });
  const artifactPath = join(__dirname, "../artifacts/contracts/DoomhoundNFT.sol/DoomhoundNFT.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  const revealed = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "revealed",
  });
  
  console.log("revealed:", revealed);
  console.log("");
  
  if (revealed) {
    console.log("⚠️  Il contratto è GIA' RIVELATO.");
    console.log("Non esiste setRevealed(false) nel contratto.");
    console.log("");
    console.log("Opzioni:");
    console.log("  A) Redeployare un nuovo contratto (costa ~0.017 AVAX di gas)");
    console.log("  B) Tenere reveal immediato (niente fase mystery)");
  } else {
    console.log("✅ Contratto non rivelato — gli utenti vedranno l'immagine unrevealed");
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
