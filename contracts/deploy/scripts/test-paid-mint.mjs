import { createWalletClient, createPublicClient, http, formatEther, parseEther } from "viem";
import { avalanche } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT_ADDRESS = "0xee29d3dcf6f74e77247404ee2c49acc1861c3cc1";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  const pk = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : "0x" + PRIVATE_KEY;
  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({ account, chain: avalanche, transport: http() });
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });

  const artifactPath = join(__dirname, "../artifacts/contracts/DoomhoundNFT.sol/DoomhoundNFT.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  console.log("=== TEST 2: ATTIVARE PAID MINT ===");
  
  // Step 1: Activate paid mint
  console.log("  Attivando paidMintActive...");
  const tx1 = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "setPaidMintActive",
    args: [true],
  });
  console.log("  Tx hash:", tx1);
  await publicClient.waitForTransactionReceipt({ hash: tx1 });
  
  const paidActive = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "paidMintActive",
  });
  console.log("  paidMintActive:", paidActive, paidActive ? "✅" : "❌");

  // Step 2: Mint 1 NFT (paid)
  console.log("\n  Mintando 1 NFT (0.69 AVAX)...");
  const mintPrice = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "paidMintPrice",
  });
  console.log("  Prezzo:", formatEther(mintPrice), "AVAX");

  const tx2 = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "mintPaid",
    args: [1n],
    value: mintPrice,
  });
  console.log("  Mint tx hash:", tx2);
  const receipt2 = await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log("  Mint status:", receipt2.status === "success" ? "✅ SUCCESS" : "❌ FAILED");
  console.log("  Gas used:", receipt2.gasUsed.toString());

  // Step 3: Verify
  const totalSupply = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "totalSupply",
  });
  console.log("\n  totalSupply dopo mint:", totalSupply.toString());

  const ownerOf1 = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "ownerOf",
    args: [1n],
  });
  console.log("  ownerOf(1):", ownerOf1);
  console.log("  È il tuo wallet?", ownerOf1.toLowerCase() === account.address.toLowerCase() ? "✅ SÌ" : "❌ NO");

  // Check contract balance (0.69 AVAX should be in the contract)
  const contractBalance = await publicClient.getBalance({ address: CONTRACT_ADDRESS });
  console.log("  Contratto balance:", formatEther(contractBalance), "AVAX");

  console.log("\n=== TEST 2 COMPLETO ✅ ===");
}

main().catch(e => { console.error("ERROR:", e.message || e); process.exit(1); });
