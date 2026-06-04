import { createWalletClient, createPublicClient, http, formatEther, keccak256, encodePacked } from "viem";
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

  console.log("=== TEST 4: FREE MINT CON FIRMA ECDSA (FIX) ===");

  // Contract does: keccak256(abi.encodePacked(msg.sender, nonce)).toEthSignedMessageHash()
  // So we need to sign with EIP-191 prefix (personal_sign / signMessage)

  const nonce = 67890n;  // New nonce (different from the failed one)
  const wallet = account.address;
  
  // Step 1: Create the message hash (same as contract)
  const messageHash = keccak256(encodePacked(
    ["address", "uint256"],
    [wallet, nonce]
  ));
  console.log("  Message hash:", messageHash);

  // Step 2: Sign with EIP-191 prefix (personal_sign)
  // The contract uses toEthSignedMessageHash which adds the prefix, 
  // so we sign the raw hash with signMessage (which also adds the prefix)
  const signature = await account.signMessage({ 
    message: { raw: messageHash } 
  });
  console.log("  Signature:", signature.substring(0, 30) + "...");
  console.log("  Signature length:", (signature.length - 2) / 2, "bytes");

  // Step 3: Call claimFreeMint
  console.log("\n  Chiamando claimFreeMint...");
  const tx = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "claimFreeMint",
    args: [nonce, signature],
  });
  console.log("  Tx hash:", tx);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log("  Status:", receipt.status === "success" ? "✅ SUCCESS" : "❌ FAILED");
  console.log("  Gas used:", receipt.gasUsed.toString());

  // Verify
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

  const claimed = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi,
    functionName: "freeMintClaimed",
    args: [account.address],
  });
  console.log("  freeMintClaimed:", claimed.toString(), claimed > 0n ? "✅" : "❌");

  // Test replay protection (same nonce should fail)
  console.log("\n  --- TEST REPLAY (deve fallire) ---");
  try {
    await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi,
      functionName: "claimFreeMint",
      args: [nonce, signature],
    });
    console.log("  ❌ REPLAY NON BLOCCATO!");
  } catch(e) {
    console.log("  ✅ Replay bloccato correttamente");
  }

  // Test double claim (different nonce, but already claimed)
  console.log("\n  --- TEST DOPPIO CLAIM (deve fallire) ---");
  try {
    const nonce3 = 11111n;
    const hash3 = keccak256(encodePacked(["address", "uint256"], [wallet, nonce3]));
    const sig3 = await account.signMessage({ message: { raw: hash3 } });
    await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi,
      functionName: "claimFreeMint",
      args: [nonce3, sig3],
    });
    console.log("  ❌ DOPPIO CLAIM NON BLOCCATO!");
  } catch(e) {
    console.log("  ✅ Doppio claim bloccato (1 free per wallet)");
  }

  console.log("\n=== TEST 4 COMPLETO ✅ ===");
}

main().catch(e => { console.error("ERROR:", e.message || e); process.exit(1); });
