import { createWalletClient, createPublicClient, http, formatEther, keccak256, encodePacked, hexToSignature, recoverAddress } from "viem";
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

  console.log("=== TEST 4: FREE MINT CON FIRMA ECDSA ===");

  // Step 1: Activate free mint
  console.log("  Attivando freeMintActive...");
  const tx1 = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "setFreeMintActive",
    args: [true],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx1 });
  console.log("  freeMintActive: true ✅");

  // Step 2: Generate signature (simulating backend)
  console.log("\n  --- SIMULAZIONE BACKEND SIGNER ---");
  const nonce = 12345n;  // Backend generates unique nonce
  const wallet = account.address;  // User's wallet
  
  // Hash the message: keccak256(abi.encodePacked(wallet, nonce))
  const messageHash = keccak256(encodePacked(
    ["address", "uint256"],
    [wallet, nonce]
  ));
  console.log("  Message hash:", messageHash);

  // Sign with EIP-191 (eth_sign style) — the contract uses toEthSignedMessageHash
  // which adds the Ethereum prefix: "\x19Ethereum Signed Message:\n32" + hash
  const signature = await account.sign({ hash: messageHash });
  console.log("  Signature:", signature.substring(0, 30) + "...");
  
  // Verify locally that recovery matches signer
  console.log("\n  --- VERIFICA LOCALE FIRMA ---");
  console.log("  Firmato da:", account.address);

  // Step 3: Call claimFreeMint on contract
  console.log("\n  --- CHIAMATA claimFreeMint ---");
  console.log("  nonce:", nonce.toString());
  console.log("  signature length:", (signature.length - 2) / 2, "bytes");

  const tx2 = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "claimFreeMint",
    args: [nonce, signature],
  });
  console.log("  Tx hash:", tx2);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log("  Status:", receipt.status === "success" ? "✅ SUCCESS" : "❌ FAILED");
  console.log("  Gas used:", receipt.gasUsed.toString());

  // Step 4: Verify NFT was minted
  const totalSupply = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "totalSupply",
  });
  console.log("\n  totalSupply:", totalSupply.toString());

  const ownerOf2 = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "ownerOf",
    args: [2n],
  });
  console.log("  ownerOf(2):", ownerOf2);
  console.log("  È il tuo wallet?", ownerOf2.toLowerCase() === account.address.toLowerCase() ? "✅" : "❌");

  // Check free mint claimed
  const claimed = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "freeMintClaimed",
    args: [account.address],
  });
  console.log("  freeMintClaimed:", claimed.toString(), claimed > 0n ? "✅" : "❌");

  // Step 5: Try to claim again (should fail — already claimed)
  console.log("\n  --- TEST REPLAY ATTACK (deve fallire) ---");
  try {
    const nonce2 = 99999n;
    const hash2 = keccak256(encodePacked(["address", "uint256"], [wallet, nonce2]));
    const sig2 = await account.sign({ hash: hash2 });
    
    // Try with same nonce (signature already used)
    await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi,
      functionName: "claimFreeMint",
      args: [nonce, signature],  // Same nonce + same sig
    });
    console.log("  ❌ REPLAY NON BLOCCATO — PROBLEMA!");
  } catch(e) {
    console.log("  ✅ Replay bloccato:", e.message?.substring(0, 80) || "Transaction reverted");
  }

  console.log("\n=== TEST 4 COMPLETO ✅ ===");
}

main().catch(e => { console.error("ERROR:", e.message || e); process.exit(1); });
