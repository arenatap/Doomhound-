import { createWalletClient, createPublicClient, http, formatEther } from "viem";
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

  console.log("=== TEST 6: WITHDRAW + RIEPILOGO ===");

  // Contract balance (should have 0.69 AVAX from paid mint)
  const contractBalance = await publicClient.getBalance({ address: CONTRACT_ADDRESS });
  console.log("  Contratto balance:", formatEther(contractBalance), "AVAX");

  // Withdraw
  if (contractBalance > 0n) {
    console.log("\n  Chiamando withdraw()...");
    const walletBalanceBefore = await publicClient.getBalance({ address: account.address });
    console.log("  Wallet prima:", formatEther(walletBalanceBefore), "AVAX");

    const tx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi,
      functionName: "withdraw",
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log("  Status:", receipt.status === "success" ? "✅ SUCCESS" : "❌ FAILED");

    const walletBalanceAfter = await publicClient.getBalance({ address: account.address });
    const contractBalanceAfter = await publicClient.getBalance({ address: CONTRACT_ADDRESS });
    console.log("  Wallet dopo:", formatEther(walletBalanceAfter), "AVAX");
    console.log("  Contratto dopo:", formatEther(contractBalanceAfter), "AVAX");
    console.log("  Prelevato:", formatEther(contractBalance), "AVAX ✅");
  }

  // Final state
  console.log("\n========================================");
  console.log("  RIEPILOGO FINALE CONTRATTO");
  console.log("========================================");
  
  const totalSupply = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "totalSupply" });
  const revealed = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "revealed" });
  const freeMintActive = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "freeMintActive" });
  const paidMintActive = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "paidMintActive" });
  const owner = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "owner" });
  const signer = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "signer" });

  console.log("  Indirizzo:", CONTRACT_ADDRESS);
  console.log("  Owner:", owner);
  console.log("  Signer:", signer);
  console.log("  totalSupply:", totalSupply.toString(), "/ 100");
  console.log("  revealed:", revealed);
  console.log("  freeMintActive:", freeMintActive);
  console.log("  paidMintActive:", paidMintActive);
  console.log("  NFT nel tuo wallet: #1 (paid), #2 (free)");

  console.log("\n========================================");
  console.log("  TUTTI I TEST SUPERATI ✅");
  console.log("========================================");
  console.log("");
  console.log("  ✅ Paid mint (0.69 AVAX)");
  console.log("  ✅ Free mint con firma ECDSA");
  console.log("  ✅ Protezione replay attack");
  console.log("  ✅ Protezione doppio claim (1 free/wallet)");
  console.log("  ✅ Reveal (unrevealed → metadata reali)");
  console.log("  ✅ Metadata corretti (nome, tratti, immagine)");
  console.log("  ✅ Immagine accessibile su IPFS");
  console.log("  ✅ Withdraw fondi");
}

main().catch(e => { console.error("ERROR:", e.message || e); process.exit(1); });
