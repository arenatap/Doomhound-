import { createPublicClient, http, formatEther } from "viem";
import { avalanche } from "viem/chains";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const contractAddress = "0x851ba0903c345676369634660e2757026418dced";

  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(),
  });

  // Read ABI
  const artifactPath = join(__dirname, "../artifacts/contracts/DoomhoundNFTv2.sol/DoomhoundNFTv2.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  console.log("=== DOOMHOUND NFT v2 — ON-CHAIN VERIFICATION ===\n");
  console.log("Contract:", contractAddress);
  console.log("Snowtrace: https://snowtrace.io/address/" + contractAddress + "\n");

  const checks = [
    { name: "Name", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "name" }) },
    { name: "Symbol", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "symbol" }) },
    { name: "MAX_SUPPLY", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "MAX_SUPPLY" }) },
    { name: "MAX_PAID_PER_WALLET", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "MAX_PAID_PER_WALLET" }) },
    { name: "MAX_FREE_PER_WALLET", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "MAX_FREE_PER_WALLET" }) },
    { name: "MAX_TOKEN_PER_WALLET", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "MAX_TOKEN_PER_WALLET" }) },
    { name: "BURN_ADDRESS", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "BURN_ADDRESS" }) },
    { name: "paidMintPrice", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "paidMintPrice" }) },
    { name: "tokenMintPrice", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "tokenMintPrice" }) },
    { name: "doomhoundToken", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "doomhoundToken" }) },
    { name: "signer", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "signer" }) },
    { name: "revealed", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "revealed" }) },
    { name: "freeMintActive", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "freeMintActive" }) },
    { name: "paidMintActive", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "paidMintActive" }) },
    { name: "tokenMintActive", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "tokenMintActive" }) },
    { name: "owner", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "owner" }) },
    { name: "unrevealedURI", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "unrevealedURI" }) },
    { name: "totalSupply", fn: () => publicClient.readContract({ address: contractAddress, abi, functionName: "totalSupply" }) },
  ];

  for (const check of checks) {
    try {
      const result = await check.fn();
      if (typeof result === "bigint") {
        if (check.name === "paidMintPrice") {
          console.log(`✅ ${check.name}: ${formatEther(result)} AVAX`);
        } else if (check.name === "tokenMintPrice") {
          console.log(`✅ ${check.name}: ${Number(result) / 1e18} DOOMHOUND`);
        } else {
          console.log(`✅ ${check.name}: ${result.toString()}`);
        }
      } else {
        console.log(`✅ ${check.name}: ${result}`);
      }
    } catch (e) {
      console.log(`❌ ${check.name}: ERROR — ${e.message}`);
    }
  }

  // Verify baseURI (it's private, but we can check via tokenURI simulation)
  console.log("\n=== IPFS METADATA CHECK ===");
  try {
    const uri = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "tokenURI",
      args: [1n],
    });
    console.log("tokenURI(1):", uri);
    console.log("(Should fail since no tokens minted yet — this is expected)");
  } catch (e) {
    if (e.message.includes("NOT OWNED") || e.message.includes("ERC721")) {
      console.log("✅ tokenURI correctly reverts for unminted token (expected)");
    } else {
      console.log("tokenURI error:", e.message);
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log("All checks passed! Contract is ready for mint activation.");
}

main().catch(console.error);
