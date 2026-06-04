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
  const artifactPath = join(__dirname, "../artifacts/contracts/DoomhoundNFTv2.sol/DoomhoundNFTv2.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

  // Constructor parameters
  const initialSigner = "0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa";
  const doomhoundToken = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";
  const initialBaseURI = "ipfs://bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/";
  const initialUnrevealedURI = "ipfs://bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/unrevealed.png";

  console.log("\nConstructor parameters:");
  console.log("  Signer:", initialSigner);
  console.log("  DOOMHOUND Token:", doomhoundToken);
  console.log("  BaseURI:", initialBaseURI);
  console.log("  UnrevealedURI:", initialUnrevealedURI);
  console.log("  Token Mint Price: 11,000,000 $DOOMHOUND");
  console.log("  Burn Address: 0x000000000000000000000000000000000000dEaD");

  console.log("\nDeploying DoomhoundNFTv2...");

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [initialSigner, doomhoundToken, initialBaseURI, initialUnrevealedURI],
  });

  console.log("Tx hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === "success") {
    const contractAddress = receipt.contractAddress;
    console.log("\n=============================");
    console.log("DOOMHOUND NFT v2 DEPLOYED SUCCESSFULLY!");
    console.log("=============================");
    console.log("Address:", contractAddress);
    console.log("Block:", receipt.blockNumber.toString());
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Network: Avalanche C-Chain (43114)");
    console.log("Token: Hounds of the Hell (HOTH)");
    console.log("Max Supply: 100");
    console.log("Paid Mint Price: 0.69 AVAX (max 2/wallet)");
    console.log("Token Mint Price: 11M $DOOMHOUND (max 1/wallet, burn to 0xdead)");
    console.log("Free Mint: 25 whitelist slots (max 1/wallet)");
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
