import { createWalletClient, createPublicClient, http } from "viem";
import { avalanche } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const pk = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;
  const account = privateKeyToAccount(pk);
  
  const walletClient = createWalletClient({ account, chain: avalanche, transport: http() });
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });

  const artifactPath = join(__dirname, "deploy/artifacts/contracts/DoomhoundNFTv2.sol/DoomhoundNFTv2.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  const contractAddress = "0x851ba0903c345676369634660e2757026418dced";

  // FIX: Set unrevealedURI to the JSON metadata, not the PNG
  const correctUnrevealedURI = "ipfs://bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/unrevealed.json";

  console.log("Current unrevealedURI on contract:");
  const current = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "unrevealedURI",
  });
  console.log("  Current:", current);
  console.log("  Correct:", correctUnrevealedURI);

  if (current === correctUnrevealedURI) {
    console.log("\n✅ unrevealedURI is already correct! No update needed.");
    return;
  }

  console.log("\n🔧 Fixing unrevealedURI...");
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: "setUnrevealedURI",
    args: [correctUnrevealedURI],
  });

  console.log("Tx hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "success") {
    // Verify
    const updated = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "unrevealedURI",
    });
    console.log("\n✅ unrevealedURI updated!");
    console.log("  New value:", updated);
  } else {
    console.error("❌ Update failed!");
  }
}

main().catch(console.error);
