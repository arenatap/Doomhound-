import { createWalletClient, createPublicClient, http, formatEther } from "viem";
import { avalanche } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY env var required");
    process.exit(1);
  }

  const pk = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey;
  const account = privateKeyToAccount(pk);
  console.log("Deploying with account:", account.address);

  // Setup clients
  const walletClient = createWalletClient({
    account,
    chain: avalanche,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", formatEther(balance), "AVAX");

  // Read compiled artifact
  const artifactPath = join(__dirname, "../artifacts/contracts/DoomhoundNFT.sol/DoomhoundNFT.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

  // Constructor parameters
  const initialSigner = "0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa";
  const initialBaseURI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/";
  const initialUnrevealedURI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/unrevealed.json";

  console.log("\nConstructor parameters:");
  console.log("  Signer:", initialSigner);
  console.log("  BaseURI:", initialBaseURI);
  console.log("  UnrevealedURI:", initialUnrevealedURI);

  console.log("\nDeploying contract...");

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [initialSigner, initialBaseURI, initialUnrevealedURI],
  });

  console.log("Tx hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === "success") {
    const contractAddress = receipt.contractAddress;
    console.log("\n=============================");
    console.log("CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("=============================");
    console.log("Address:", contractAddress);
    console.log("Block:", receipt.blockNumber.toString());
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Network: Avalanche C-Chain (43114)");
    console.log("Token: Hounds of the Hell (HOTH)");
    console.log("Max Supply: 100");
    console.log("Mint Price: 0.69 AVAX");
    console.log("=============================");
    console.log("\nSnowtrace: https://snowtrace.io/address/" + contractAddress);
  } else {
    console.error("DEPLOY FAILED! Receipt status:", receipt.status);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deploy failed:", error.message || error);
    process.exit(1);
  });
