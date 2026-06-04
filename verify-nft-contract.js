/**
 * NFT Contract Verification Script
 * Reads on-chain state from the Hounds of Hell NFT on Avalanche C-Chain
 * Also verifies the $DOOMHOUND ERC-20 token contract
 */

const { ethers } = require("ethers");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────────
const AVAX_RPC = "https://api.avax.network/ext/bc/C/rpc";
const NFT_ADDRESS = "0x851ba0903c345676369634660e2757026418dced";
const DOOMHOUND_TOKEN_ADDRESS = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";
const EXPECTED_SIGNER = "0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa";
const EXPECTED_PAID_MINT_PRICE = ethers.parseEther("0.69"); // 690000000000000000 wei

// ── ABIs ────────────────────────────────────────────────────────────────
const nftAbi = require(path.join(__dirname, "src", "lib", "nft-abi.json"));

const erc20Abi = [
  { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

// ── Helpers ─────────────────────────────────────────────────────────────
const ZERO_ADDR = ethers.ZeroAddress;

function check(label, actual, expected) {
  const pass = String(actual).toLowerCase() === String(expected).toLowerCase();
  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon} ${label}: ${actual} ${pass ? "" : `(expected: ${expected})`}`);
  return pass;
}

async function safeCall(fn, label) {
  try {
    return await fn();
  } catch (err) {
    console.log(`  ⚠️  ${label}: CALL FAILED — ${err.message}`);
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log("━".repeat(70));
  console.log("  NFT CONTRACT VERIFICATION — Avalanche C-Chain");
  console.log("━".repeat(70));
  console.log(`  Contract : ${NFT_ADDRESS}`);
  console.log(`  RPC      : ${AVAX_RPC}`);
  console.log("━".repeat(70));

  const provider = new ethers.JsonRpcProvider(AVAX_RPC);
  const nft = new ethers.Contract(NFT_ADDRESS, nftAbi, provider);

  // ── Basic ERC-721 metadata ──────────────────────────────────────────
  console.log("\n▸ ERC-721 Metadata");
  const name = await safeCall(() => nft.name(), "name");
  const symbol = await safeCall(() => nft.symbol(), "symbol");
  if (name !== null) console.log(`  ℹ️  name    : ${name}`);
  if (symbol !== null) console.log(`  ℹ️  symbol  : ${symbol}`);

  // ── Supply & Limits ─────────────────────────────────────────────────
  console.log("\n▸ Supply & Mint Limits");
  const maxSupply = await safeCall(() => nft.MAX_SUPPLY(), "MAX_SUPPLY");
  const maxFreePerWallet = await safeCall(() => nft.MAX_FREE_PER_WALLET(), "MAX_FREE_PER_WALLET");
  const maxPaidPerWallet = await safeCall(() => nft.MAX_PAID_PER_WALLET(), "MAX_PAID_PER_WALLET");
  const totalSupply = await safeCall(() => nft.totalSupply(), "totalSupply");
  const paidMintPrice = await safeCall(() => nft.paidMintPrice(), "paidMintPrice");

  if (maxSupply !== null) check("MAX_SUPPLY", maxSupply.toString(), "100");
  if (maxFreePerWallet !== null) check("MAX_FREE_PER_WALLET", maxFreePerWallet.toString(), "1");
  if (maxPaidPerWallet !== null) check("MAX_PAID_PER_WALLET", maxPaidPerWallet.toString(), "2");
  if (totalSupply !== null) console.log(`  ℹ️  totalSupply : ${totalSupply}`);
  if (paidMintPrice !== null) {
    check("paidMintPrice (wei)", paidMintPrice.toString(), EXPECTED_PAID_MINT_PRICE.toString());
    console.log(`  ℹ️  paidMintPrice (AVAX) : ${ethers.formatEther(paidMintPrice)}`);
  }

  // ── Mint Status ─────────────────────────────────────────────────────
  console.log("\n▸ Mint Status");
  const freeMintActive = await safeCall(() => nft.freeMintActive(), "freeMintActive");
  const paidMintActive = await safeCall(() => nft.paidMintActive(), "paidMintActive");
  const revealed = await safeCall(() => nft.revealed(), "revealed");

  if (freeMintActive !== null) console.log(`  ℹ️  freeMintActive : ${freeMintActive}`);
  if (paidMintActive !== null) console.log(`  ℹ️  paidMintActive : ${paidMintActive}`);
  if (revealed !== null) console.log(`  ℹ️  revealed       : ${revealed}`);

  // ── Admin / Signer ──────────────────────────────────────────────────
  console.log("\n▸ Admin & Signer");
  const signer = await safeCall(() => nft.signer(), "signer");
  const owner = await safeCall(() => nft.owner(), "owner");

  if (signer !== null) check("signer", signer, EXPECTED_SIGNER);
  if (owner !== null) check("owner", owner, EXPECTED_SIGNER);
  if (signer !== null && owner !== null) {
    const match = signer.toLowerCase() === owner.toLowerCase();
    console.log(`  ${match ? "✅" : "❌"} signer === owner : ${match}`);
  }

  // ── Claimed counts for zero address (as baseline) ──────────────────
  console.log("\n▸ freeMintClaimed / paidMintClaimed (zero address baseline)");
  const freeClaimedZero = await safeCall(() => nft.freeMintClaimed(ZERO_ADDR), "freeMintClaimed(0x0)");
  const paidClaimedZero = await safeCall(() => nft.paidMintClaimed(ZERO_ADDR), "paidMintClaimed(0x0)");
  if (freeClaimedZero !== null) console.log(`  ℹ️  freeMintClaimed(0x0) : ${freeClaimedZero}`);
  if (paidClaimedZero !== null) console.log(`  ℹ️  paidMintClaimed(0x0) : ${paidClaimedZero}`);

  // ── Token URI / Reveal Status ───────────────────────────────────────
  console.log("\n▸ Token URI & Reveal Status");
  const tokenURI1 = await safeCall(() => nft.tokenURI(1), "tokenURI(1)");
  let unrevealedURI = null;
  if (tokenURI1 !== null) {
    console.log(`  ℹ️  tokenURI(1) : ${tokenURI1}`);
    if (tokenURI1.startsWith("ipfs://")) {
      console.log("  ℹ️  → IPFS-based URI (likely revealed metadata)");
    } else if (tokenURI1.includes("unrevealed") || tokenURI1.includes("placeholder")) {
      console.log("  ℹ️  → Appears to be an UNREVEALED placeholder URI");
    } else if (tokenURI1.startsWith("data:")) {
      console.log("  ℹ️  → Base64-encoded on-chain metadata");
    } else if (tokenURI1.startsWith("http")) {
      console.log("  ℹ️  → HTTP-based URI");
    }
  } else {
    console.log("  ⚠️  tokenURI(1) reverted — expected since totalSupply=0 (no tokens minted yet)");
  }

  // Probe unrevealedURI() via raw call (not in standard ABI)
  try {
    const sel = ethers.id("unrevealedURI()").slice(0, 10);
    const rawRes = await provider.call({ to: NFT_ADDRESS, data: sel });
    if (rawRes !== "0x" && rawRes.length > 2) {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], rawRes);
      unrevealedURI = decoded[0];
      console.log(`  ℹ️  unrevealedURI() : ${unrevealedURI}`);
      if (unrevealedURI.includes("unrevealed")) {
        console.log("  ℹ️  → Points to an UNREVEALED placeholder on IPFS — collection is NOT revealed");
      }
    }
  } catch (e) {
    console.log("  ⚠️  unrevealedURI() : not available —", e.message.slice(0, 80));
  }

  // ── Contract bytecode check ─────────────────────────────────────────
  console.log("\n▸ Contract Bytecode Check");
  const code = await provider.getCode(NFT_ADDRESS);
  const codeLen = (code.length - 2) / 2; // bytes
  console.log(`  ℹ️  Bytecode size : ${codeLen} bytes`);
  if (code === "0x") {
    console.log("  ❌ No bytecode found — contract does not exist at this address!");
  } else {
    console.log("  ✅ Contract bytecode present");
  }

  // ── $DOOMHOUND ERC-20 Verification ──────────────────────────────────
  console.log("\n" + "━".repeat(70));
  console.log("  $DOOMHOUND TOKEN VERIFICATION");
  console.log("━".repeat(70));
  console.log(`  Contract : ${DOOMHOUND_TOKEN_ADDRESS}`);

  const doomCode = await provider.getCode(DOOMHOUND_TOKEN_ADDRESS);
  let tName = null, tSymbol = null, tDecimals = null, tSupply = null;
  if (doomCode === "0x") {
    console.log("  ❌ No bytecode found — token contract does not exist!");
  } else {
    console.log(`  ✅ Contract bytecode present (${(doomCode.length - 2) / 2} bytes)`);
    const token = new ethers.Contract(DOOMHOUND_TOKEN_ADDRESS, erc20Abi, provider);
    tName = await safeCall(() => token.name(), "name");
    tSymbol = await safeCall(() => token.symbol(), "symbol");
    tDecimals = await safeCall(() => token.decimals(), "decimals");
    tSupply = await safeCall(() => token.totalSupply(), "totalSupply");

    if (tName !== null) console.log(`  ℹ️  name        : ${tName}`);
    if (tSymbol !== null) console.log(`  ℹ️  symbol      : ${tSymbol}`);
    if (tDecimals !== null) console.log(`  ℹ️  decimals    : ${tDecimals}`);
    if (tSupply !== null) console.log(`  ℹ️  totalSupply : ${ethers.formatUnits(tSupply, tDecimals || 18)}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────
  console.log("\n" + "━".repeat(70));
  console.log("  ALL ON-CHAIN VALUES READ — SUMMARY");
  console.log("━".repeat(70));

  const summary = {
    nftContract: NFT_ADDRESS,
    nftName: name,
    nftSymbol: symbol,
    bytecodePresent: code !== "0x",
    bytecodeSizeBytes: codeLen,
    MAX_SUPPLY: maxSupply?.toString(),
    MAX_FREE_PER_WALLET: maxFreePerWallet?.toString(),
    MAX_PAID_PER_WALLET: maxPaidPerWallet?.toString(),
    totalSupply: totalSupply?.toString(),
    paidMintPrice_wei: paidMintPrice?.toString(),
    paidMintPrice_AVAX: paidMintPrice ? ethers.formatEther(paidMintPrice) : null,
    freeMintActive: freeMintActive?.toString(),
    paidMintActive: paidMintActive?.toString(),
    revealed: revealed?.toString(),
    signer: signer,
    owner: owner,
    signerMatchesOwner: signer && owner ? signer.toLowerCase() === owner.toLowerCase() : null,
    signerMatchesExpected: signer ? signer.toLowerCase() === EXPECTED_SIGNER.toLowerCase() : null,
    tokenURI_1: tokenURI1,
    unrevealedURI: unrevealedURI,
    revealStatus: revealed ? "REVEALED" : (unrevealedURI ? "UNREVEALED (unrevealedURI set on IPFS)" : "UNREVEALED (no unrevealedURI found)"),
    freeMintClaimed_zero: freeClaimedZero?.toString(),
    paidMintClaimed_zero: paidClaimedZero?.toString(),
    doomhoundToken: {
      address: DOOMHOUND_TOKEN_ADDRESS,
      bytecodePresent: doomCode !== "0x",
      name: tName,
      symbol: tSymbol,
      decimals: tDecimals?.toString(),
      totalSupply: tSupply?.toString(),
    }
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
