/**
 * DOOMHOUND NFT — Deploy Script for Avalanche C-Chain
 *
 * Deploys the new DoomhoundNFT contract after the hack.
 * Uses the SAME IPFS baseURI and unrevealedURI as the old contract.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network avax
 *
 * Required env vars:
 *   PRIVATE_KEY         — Owner wallet private key (NEVER commit this)
 *   NFT_SIGNER_ADDRESS  — New signer address (separate from owner!)
 *   SNOWTRACE_API_KEY   — For contract verification on Snowtrace
 */

const { ethers } = require("ethers");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "AVAX");

  // ===== CONFIGURATION =====
  // Signer address — SEPARATE from owner wallet for security!
  const SIGNER_ADDRESS = process.env.NFT_SIGNER_ADDRESS;
  if (!SIGNER_ADDRESS) {
    throw new Error("NFT_SIGNER_ADDRESS env var is required (the new signer wallet address)");
  }

  // $DOOMHOUND token on Avalanche
  const DOOMHOUND_TOKEN = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";

  // IPFS URIs — SAME as old contract
  const BASE_URI = "ipfs://bafybeihejmqz3zoqsuonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/";
  const UNREVEALED_URI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/";

  console.log("\n===== DEPLOY CONFIG =====");
  console.log("Signer:", SIGNER_ADDRESS);
  console.log("Token:", DOOMHOUND_TOKEN);
  console.log("BaseURI:", BASE_URI);
  console.log("UnrevealedURI:", UNREVEALED_URI);
  console.log("========================\n");

  // ===== DEPLOY =====
  const DoomhoundNFT = await hre.ethers.getContractFactory("DoomhoundNFT");
  const nft = await DoomhoundNFT.deploy(
    SIGNER_ADDRESS,
    DOOMHOUND_TOKEN,
    BASE_URI,
    UNREVEALED_URI
  );

  await nft.waitForDeployment();
  const contractAddress = await nft.getAddress();

  console.log("DoomhoundNFT deployed to:", contractAddress);

  // ===== POST-DEPLOY SETUP =====
  console.log("\n===== POST-DEPLOY SETUP =====");

  // 1. Reveal (set revealed = true with the same revealed URI)
  console.log("Revealing collection...");
  const revealTx = await nft.reveal(BASE_URI);
  await revealTx.wait();
  console.log("Collection revealed!");

  // 2. Activate mint phases
  console.log("Activating free mint...");
  const freeTx = await nft.setFreeMintActive(true);
  await freeTx.wait();
  console.log("Free mint active!");

  console.log("Activating paid mint...");
  const paidTx = await nft.setPaidMintActive(true);
  await paidTx.wait();
  console.log("Paid mint active!");

  // Token mint is NOT active by default (same as old contract)
  console.log("Token mint: INACTIVE (same as old contract)");

  // ===== VERIFY =====
  console.log("\n===== VERIFICATION =====");
  console.log("Owner:", await nft.owner());
  console.log("Signer:", await nft.signer());
  console.log("Revealed:", await nft.revealed());
  console.log("FreeMintActive:", await nft.freeMintActive());
  console.log("PaidMintActive:", await nft.paidMintActive());
  console.log("TokenMintActive:", await nft.tokenMintActive());
  console.log("PaidMintPrice:", ethers.formatEther(await nft.paidMintPrice()), "AVAX");
  console.log("TotalSupply:", (await nft.totalSupply()).toString());

  // ===== NEXT STEPS =====
  console.log("\n===== NEXT STEPS =====");
  console.log("1. Run airdrop script: npx hardhat run scripts/airdrop.js --network avax");
  console.log("2. Update NFT_CONTRACT_ADDRESS in .env and render.yaml");
  console.log("3. Update NFT_CONTRACT in src/app/nft/page.tsx");
  console.log("4. Verify on Snowtrace: npx hardhat verify --network avax", contractAddress, SIGNER_ADDRESS, DOOMHOUND_TOKEN, `"${BASE_URI}"`, `"${UNREVEALED_URI}"`);

  // Save deployment info
  const fs = require("fs");
  const deployInfo = {
    network: "avalanche-c-chain",
    contractAddress: contractAddress,
    deployer: deployer.address,
    signer: SIGNER_ADDRESS,
    doomhoundToken: DOOMHOUND_TOKEN,
    baseURI: BASE_URI,
    unrevealedURI: UNREVEALED_URI,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
