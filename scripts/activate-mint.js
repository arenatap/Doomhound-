/**
 * Activate NFT Mint on DoomhoundNFTv2 contract
 * - setFreeMintActive(true)
 * - setPaidMintActive(true)
 * - adminMint for Toff's Arena wallet (2 NFTs)
 */

const { ethers } = require("ethers");

const NFT_CONTRACT = process.env.NFT_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const TOFF_WALLET = "0x51b2902cd06270a90a2fef33447eb4c1006ea790";

if (!NFT_CONTRACT || !PRIVATE_KEY) {
  console.error("ERROR: Set NFT_CONTRACT_ADDRESS and DEPLOYER_PRIVATE_KEY env vars");
  process.exit(1);
}

const REVEAL_BASE_URI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/";

const ABI = [
  "function freeMintActive() view returns (bool)",
  "function paidMintActive() view returns (bool)",
  "function revealed() view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function setFreeMintActive(bool active) external",
  "function setPaidMintActive(bool active) external",
  "function reveal(string baseURI) external",
  "function adminMint(address to, uint256 quantity) external",
  "function owner() view returns (address)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(NFT_CONTRACT, ABI, wallet);

  console.log("=== DOOMHOUND NFT MINT ACTIVATION ===");
  console.log("Wallet:", wallet.address);
  console.log("Time:", new Date().toISOString());

  // Verify we're the owner
  const owner = await contract.owner();
  console.log("Contract owner:", owner);
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error("ERROR: Wallet is not the contract owner!");
    process.exit(1);
  }

  // Check current state
  const [freeActive, paidActive, supply] = await Promise.all([
    contract.freeMintActive(),
    contract.paidMintActive(),
    contract.totalSupply(),
  ]);
  console.log("\nCurrent state:");
  console.log("  freeMintActive:", freeActive);
  console.log("  paidMintActive:", paidActive);
  console.log("  totalSupply:", supply.toString());

  // Activate free mint
  if (!freeActive) {
    console.log("\nActivating free mint...");
    const tx1 = await contract.setFreeMintActive(true);
    console.log("  tx hash:", tx1.hash);
    const receipt1 = await tx1.wait();
    console.log("  confirmed! block:", receipt1.blockNumber);
  } else {
    console.log("\nFree mint already active!");
  }

  // Activate paid mint
  if (!paidActive) {
    console.log("\nActivating paid mint...");
    const tx2 = await contract.setPaidMintActive(true);
    console.log("  tx hash:", tx2.hash);
    const receipt2 = await tx2.wait();
    console.log("  confirmed! block:", receipt2.blockNumber);
  } else {
    console.log("\nPaid mint already active!");
  }

  // Admin mint for Toff
  console.log("\nAdmin minting 2 NFTs for Toff's Arena wallet...");
  const tx3 = await contract.adminMint(TOFF_WALLET, 2);
  console.log("  tx hash:", tx3.hash);
  const receipt3 = await tx3.wait();
  console.log("  confirmed! block:", receipt3.blockNumber);

  // Reveal the collection
  const isRevealed = await contract.revealed();
  if (!isRevealed) {
    console.log("\nRevealing collection with baseURI:", REVEAL_BASE_URI);
    const tx4 = await contract.reveal(REVEAL_BASE_URI);
    console.log("  tx hash:", tx4.hash);
    const receipt4 = await tx4.wait();
    console.log("  confirmed! block:", receipt4.blockNumber);
  } else {
    console.log("\nCollection already revealed!");
  }

  // Verify final state
  const [freeActive2, paidActive2, supply2, revealed2] = await Promise.all([
    contract.freeMintActive(),
    contract.paidMintActive(),
    contract.totalSupply(),
    contract.revealed(),
  ]);
  console.log("\n=== FINAL STATE ===");
  console.log("  freeMintActive:", freeActive2);
  console.log("  paidMintActive:", paidActive2);
  console.log("  revealed:", revealed2);
  console.log("  totalSupply:", supply2.toString(), "/ 100");
  console.log("\nMINT IS LIVE! 🐺🔥");
}

main().catch(e => {
  console.error("FATAL ERROR:", e.message);
  process.exit(1);
});
