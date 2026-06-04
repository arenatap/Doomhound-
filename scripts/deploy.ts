/**
 * Deploy Script — DoomhoundNFT (Hounds of the Hell)
 * 
 * Deploys the new NFT contract on Avalanche C-Chain.
 * The contract is identical to v2 but with two-step ownership transfer.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... bun run scripts/deploy.ts
 *
 * IMPORTANT: The DEPLOYER_PRIVATE_KEY must be the NEW owner wallet.
 * NEVER commit this key to the repository!
 *
 * Constructor parameters:
 *   - initialSigner:      The new signer wallet address (signs free mint signatures)
 *   - initialTokenAddress: The $DOOMHOUND ERC-20 token address
 *   - initialBaseURI:     IPFS base URI for revealed metadata
 *   - initialUnrevealedURI: IPFS URI for unrevealed placeholder
 */

import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { avalanche } from "wagmi/chains";
import { privateKeyToAccount } from "viem/accounts";
import { parse } from "viem";

// ===== CONFIGURATION =====
const DEPLOYER_PRIVATE_KEY = (process.env.DEPLOYER_PRIVATE_KEY || "") as `0x${string}`;
const NFT_SIGNER_PRIVATE_KEY = (process.env.NFT_SIGNER_PRIVATE_KEY || "") as `0x${string}`;
const AVAX_RPC_URL = process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";

// Constructor parameters — same as v2 contract
const DOOMHOUND_TOKEN_ADDRESS = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb" as `0x${string}`;
const BASE_URI = "ipfs://bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/";
const UNREVEALED_URI = "ipfs://bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/";

// Compiled contract ABI + bytecode (will be replaced after compilation)
const CONTRACT_ABI = [
  // Constructor
  {
    inputs: [
      { internalType: "address", name: "initialSigner", type: "address" },
      { internalType: "address", name: "initialTokenAddress", type: "address" },
      { internalType: "string", name: "initialBaseURI", type: "string" },
      { internalType: "string", name: "initialUnrevealedURI", type: "string" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
] as const;

async function main() {
  // Validate configuration
  if (!DEPLOYER_PRIVATE_KEY || DEPLOYER_PRIVATE_KEY === "0x") {
    console.error("❌ DEPLOYER_PRIVATE_KEY not set.");
    console.error("   Run with: DEPLOYER_PRIVATE_KEY=0x... bun run scripts/deploy.ts");
    process.exit(1);
  }

  if (!NFT_SIGNER_PRIVATE_KEY || NFT_SIGNER_PRIVATE_KEY === "0x") {
    console.error("❌ NFT_SIGNER_PRIVATE_KEY not set.");
    console.error("   The signer wallet MUST be different from the owner wallet!");
    process.exit(1);
  }

  // Derive addresses from private keys
  const ownerAccount = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  const signerAccount = privateKeyToAccount(NFT_SIGNER_PRIVATE_KEY);

  console.log("\n🔥 DOOMHOUND NFT — NEW CONTRACT DEPLOYMENT");
  console.log("=".repeat(60));
  console.log(`👤 Owner wallet:   ${ownerAccount.address}`);
  console.log(`✍️  Signer wallet:  ${signerAccount.address}`);
  console.log(`🪙  $DOOMHOUND:     ${DOOMHOUND_TOKEN_ADDRESS}`);
  console.log(`📁 BaseURI:        ${BASE_URI}`);
  console.log(`🔒 UnrevealedURI:  ${UNREVEALED_URI}`);
  console.log("=".repeat(60));

  // Verify owner and signer are different
  if (ownerAccount.address.toLowerCase() === signerAccount.address.toLowerCase()) {
    console.error("\n❌ CRITICAL: Owner and Signer wallets are the SAME!");
    console.error("   This was the vulnerability that got the old contract hacked.");
    console.error("   Generate TWO separate wallets and try again.");
    process.exit(1);
  }

  // Setup clients
  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(AVAX_RPC_URL),
  });

  const walletClient = createWalletClient({
    account: ownerAccount,
    chain: avalanche,
    transport: http(AVAX_RPC_URL),
  });

  // Check deployer balance
  const balance = await publicClient.getBalance({ address: ownerAccount.address });
  console.log(`💰 Owner balance: ${formatEther(balance)} AVAX`);

  if (balance === 0n) {
    console.error("❌ Owner wallet has no AVAX for gas!");
    console.error("   Send at least 0.5 AVAX to", ownerAccount.address);
    process.exit(1);
  }

  console.log("\n⏳ Deploying contract...");
  console.log("⚠️  You need to compile the contract first and provide the bytecode.");
  console.log("   This script is a template — fill in the bytecode after compilation.\n");

  // NOTE: To deploy, you need the compiled bytecode. Use Hardhat or Remix:
  // 1. Compile contracts/DoomhoundNFT.sol with Hardhat
  // 2. Get the bytecode from artifacts/
  // 3. Use the deploy function below

  console.log("📋 POST-DEPLOY CHECKLIST:");
  console.log("1. Set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS in Render Dashboard");
  console.log("2. Set NFT_SIGNER_PRIVATE_KEY in Render Dashboard");
  console.log("3. Set DEPLOYER_PRIVATE_KEY in Render Dashboard");
  console.log("4. Run: bun run scripts/airdrop.ts");
  console.log("5. Call: setFreeMintActive(true)");
  console.log("6. Call: setPaidMintActive(true)");
  console.log("7. Call: reveal(baseURI)");
  console.log("");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
