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

  // Load ABI
  const artifactPath = join(__dirname, "../artifacts/contracts/DoomhoundNFT.sol/DoomhoundNFT.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  console.log("=== TEST 1: STATO CONTRATTO ===");
  
  const freeMintActive = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "freeMintActive",
  });
  console.log("  freeMintActive:", freeMintActive);

  const paidMintActive = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "paidMintActive",
  });
  console.log("  paidMintActive:", paidMintActive);

  const totalSupply = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "totalSupply",
  });
  console.log("  totalSupply:", totalSupply.toString());

  const maxSupply = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "MAX_SUPPLY",
  });
  console.log("  MAX_SUPPLY:", maxSupply.toString());

  const mintPrice = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "paidMintPrice",
  });
  console.log("  paidMintPrice:", formatEther(mintPrice), "AVAX");

  const revealed = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "revealed",
  });
  console.log("  revealed:", revealed);

  const signer = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "signer",
  });
  console.log("  signer:", signer);

  const owner = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "owner",
  });
  console.log("  owner:", owner);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("  wallet balance:", formatEther(balance), "AVAX");
  console.log("  wallet address:", account.address);

  // Check unrevealedURI
  const unrevealedURI = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "unrevealedURI",
  });
  console.log("  unrevealedURI:", unrevealedURI);

  console.log("\n=== TEST 1 COMPLETO ✅ ===");
}

main().catch(e => { console.error("ERROR:", e.message || e); process.exit(1); });
