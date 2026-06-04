import hre from "hardhat";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  console.log("Deploying with account:", deployer.account.address);
  
  const balance = await hre.viem.getPublicClient().getBalance({ address: deployer.account.address });
  console.log("Balance:", hre.viem.formatEther(balance), "AVAX");

  // Constructor parameters
  const initialSigner = "0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa";
  const initialBaseURI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/";
  const initialUnrevealedURI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/unrevealed.json";

  console.log("\nConstructor parameters:");
  console.log("  Signer:", initialSigner);
  console.log("  BaseURI:", initialBaseURI);
  console.log("  UnrevealedURI:", initialUnrevealedURI);

  console.log("\nDeploying contract...");
  const doomhound = await hre.viem.deployContract("DoomhoundNFT", [
    initialSigner,
    initialBaseURI,
    initialUnrevealedURI,
  ]);

  console.log("\n✅ CONTRACT DEPLOYED!");
  console.log("===========================================");
  console.log("Address:", doomhound.address);
  console.log("Network: Avalanche C-Chain (43114)");
  console.log("Token: Hounds of the Hell (HOTH)");
  console.log("Max Supply: 100");
  console.log("Mint Price: 0.69 AVAX");
  console.log("===========================================");
  console.log("\nSnowtrace URL: https://snowtrace.io/address/" + doomhound.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deploy failed:", error);
    process.exit(1);
  });
