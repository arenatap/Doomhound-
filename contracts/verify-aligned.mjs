// ALIGNED VERIFICATION - Check that IPFS metadata matches local, 
// that shuffle mapping is consistent, and contract state is correct

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

const IMAGE_CID = "bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje";
const METADATA_CID = "bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4";
const CONTRACT_ADDRESS = "0x851ba0903c345676369634660e2757026418dced";
const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.json();
}

async function fetchStatus(url) {
  try {
    const resp = await fetch(url, { method: "HEAD" });
    return resp.status;
  } catch { return -1; }
}

async function main() {
  let totalChecks = 0;
  let passed = 0;
  let failed = 0;
  const errors = [];

  function check(name, ok, detail = "") {
    totalChecks++;
    if (ok) {
      passed++;
      console.log(`✅ ${name}`);
    } else {
      failed++;
      console.log(`❌ ${name} ${detail}`);
      errors.push(`${name}: ${detail}`);
    }
  }

  console.log("=".repeat(60));
  console.log("DOOMHOUND NFT v2 — ALIGNED VERIFICATION");
  console.log("=".repeat(60));

  // ==========================================
  // SECTION 1: IPFS Images (all 101)
  // ==========================================
  console.log("\n📷 SECTION 1: IPFS IMAGES (101 files)");
  console.log("-".repeat(40));
  
  let imagesOk = 0;
  let imagesFail = 0;
  for (let i = 1; i <= 100; i++) {
    const status = await fetchStatus(`${IPFS_GATEWAY}${IMAGE_CID}/${i}.png`);
    if (status === 200) imagesOk++; else imagesFail++;
  }
  const unrevealedImg = await fetchStatus(`${IPFS_GATEWAY}${IMAGE_CID}/unrevealed.png`);
  if (unrevealedImg === 200) imagesOk++; else imagesFail++;
  
  check("All 101 images accessible on IPFS", imagesFail === 0, `${imagesOk}/101 OK, ${imagesFail} failed`);

  // ==========================================
  // SECTION 2: IPFS Metadata (all 101)
  // ==========================================
  console.log("\n📄 SECTION 2: IPFS METADATA (101 files)");
  console.log("-".repeat(40));

  let metaOk = 0;
  let metaFail = 0;
  let metaDetails = [];
  
  for (let i = 1; i <= 100; i++) {
    try {
      const meta = await fetchJSON(`${IPFS_GATEWAY}${METADATA_CID}/${i}.json`);
      if (!meta.name || !meta.image || !Array.isArray(meta.attributes)) {
        metaFail++;
        metaDetails.push(`${i}: missing fields`);
      } else {
        metaOk++;
      }
    } catch (e) {
      metaFail++;
      metaDetails.push(`${i}: ${e.message}`);
    }
  }
  
  // Check unrevealed.json
  try {
    const unrevealed = await fetchJSON(`${IPFS_GATEWAY}${METADATA_CID}/unrevealed.json`);
    if (!unrevealed.name || !unrevealed.image) {
      metaFail++;
      metaDetails.push("unrevealed: missing fields");
    } else {
      metaOk++;
    }
  } catch (e) {
    metaFail++;
    metaDetails.push(`unrevealed: ${e.message}`);
  }
  
  check("All 101 metadata files accessible on IPFS", metaFail === 0, `${metaOk}/101 OK, ${metaFail} failed ${metaDetails.slice(0, 3).join("; ")}`);

  // ==========================================
  // SECTION 3: Shuffle Mapping Alignment
  // ==========================================
  console.log("\n🔀 SECTION 3: SHUFFLE MAPPING ALIGNMENT");
  console.log("-".repeat(40));

  const provenance = JSON.parse(readFileSync(join(__dirname, "../metadata-shuffled/provenance.json"), "utf-8"));
  const shuffleMap = {};
  for (const entry of provenance.shuffleMapping) {
    shuffleMap[entry.newTokenId] = entry.originalTokenId;
  }
  
  check("Provenance hash present", !!provenance.provenanceHash, provenance.provenanceHash);
  check("Shuffle mapping has 100 entries", Object.keys(shuffleMap).length === 100);
  
  // All original IDs 1-100 present as values
  const origIds = Object.values(shuffleMap);
  const allOrigPresent = Array.from({length: 100}, (_, i) => i + 1).every(id => origIds.includes(id));
  check("All original IDs 1-100 are values in mapping", allOrigPresent);

  // ==========================================
  // SECTION 4: Metadata → Image Link Consistency
  // (Token N.json should point to image ORIGINAL_ID.png per shuffle)
  // ==========================================
  console.log("\n🔗 SECTION 4: METADATA → IMAGE LINK (Shuffle-Aligned)");
  console.log("-".repeat(40));

  // Check ALL 100 tokens on IPFS
  let linkOk = 0;
  let linkFail = 0;
  let linkDetails = [];

  for (let tokenId = 1; tokenId <= 100; tokenId++) {
    const expectedOrigId = shuffleMap[tokenId];
    const expectedImage = `ipfs://${IMAGE_CID}/${expectedOrigId}.png`;
    
    try {
      const meta = await fetchJSON(`${IPFS_GATEWAY}${METADATA_CID}/${tokenId}.json`);
      if (meta.image === expectedImage) {
        linkOk++;
      } else {
        linkFail++;
        if (linkFail <= 5) {
          linkDetails.push(`Token ${tokenId}: got "${meta.image}" expected "${expectedImage}"`);
        }
      }
    } catch (e) {
      linkFail++;
      linkDetails.push(`Token ${tokenId}: fetch error`);
    }
  }

  check("All 100 IPFS metadata image links match shuffle mapping", linkFail === 0, 
    `${linkOk}/100 OK, ${linkFail} failed. ${linkDetails.join("; ")}`);

  // ==========================================
  // SECTION 5: Local Metadata vs IPFS Metadata
  // ==========================================
  console.log("\n📂 SECTION 5: LOCAL vs IPFS METADATA CONSISTENCY");
  console.log("-".repeat(40));

  // Check a sample of 10 tokens
  const sampleIds = [1, 17, 33, 42, 55, 67, 75, 88, 95, 100];
  let localVsIpfsOk = 0;
  let localVsIpfsFail = 0;
  let localVsIpfsDetails = [];

  for (const id of sampleIds) {
    try {
      const localMeta = JSON.parse(readFileSync(join(__dirname, `../metadata-shuffled/${id}.json`), "utf-8"));
      const ipfsMeta = await fetchJSON(`${IPFS_GATEWAY}${METADATA_CID}/${id}.json`);
      
      if (localMeta.name !== ipfsMeta.name || localMeta.image !== ipfsMeta.image) {
        localVsIpfsFail++;
        localVsIpfsDetails.push(`Token ${id}: local name="${localMeta.name}" ipfs name="${ipfsMeta.name}"`);
      } else {
        localVsIpfsOk++;
      }
    } catch (e) {
      localVsIpfsFail++;
      localVsIpfsDetails.push(`Token ${id}: ${e.message}`);
    }
  }

  check("Local metadata matches IPFS metadata (10 sampled)", localVsIpfsFail === 0,
    `${localVsIpfsOk}/10 OK, ${localVsIpfsFail} failed. ${localVsIpfsDetails.join("; ")}`);

  // ==========================================
  // SECTION 6: Contract On-Chain State
  // ==========================================
  console.log("\n⛓️ SECTION 6: CONTRACT ON-CHAIN STATE");
  console.log("-".repeat(40));

  try {
    const { createPublicClient, http, formatEther } = await import("viem");
    const { avalanche } = await import("viem/chains");
    
    const artifactPath = join(__dirname, "deploy/artifacts/contracts/DoomhoundNFTv2.sol/DoomhoundNFTv2.json");
    const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
    const publicClient = createPublicClient({ chain: avalanche, transport: http() });
    
    const contractReads = {
      name: "Hounds of the Hell",
      symbol: "HOTH",
      MAX_SUPPLY: 100n,
      paidMintPrice: parseEther("0.69"),
      tokenMintPrice: BigInt("11000000000000000000000000"),
      doomhoundToken: "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb",
      BURN_ADDRESS: "0x000000000000000000000000000000000000dEaD",
      signer: "0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa",
      revealed: false,
      freeMintActive: false,
      paidMintActive: false,
      tokenMintActive: false,
      totalSupply: 0n,
    };
    
    for (const [key, expected] of Object.entries(contractReads)) {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: artifact.abi,
        functionName: key,
      });
      const match = result === expected || result.toString() === expected.toString();
      check(`Contract ${key}`, match, `got: ${result}, expected: ${expected}`);
    }
    
    // Check unrevealedURI (should be JSON, not PNG)
    const unrevealedURI = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: artifact.abi,
      functionName: "unrevealedURI",
    });
    check("unrevealedURI is JSON (not PNG)", unrevealedURI.endsWith(".json"), `got: ${unrevealedURI}`);
    check("unrevealedURI points to correct CID", unrevealedURI === `ipfs://${METADATA_CID}/unrevealed.json`,
      `got: ${unrevealedURI}`);
    
    // baseURI should point to metadata CID
    // We can't read it directly (it's private), but we know it was set in constructor
    console.log(`   📌 Expected baseURI: ipfs://${METADATA_CID}/`);
    console.log(`   📌 unrevealedURI: ${unrevealedURI}`);
    
  } catch (e) {
    check("Contract verification", false, e.message);
  }

  // ==========================================
  // SECTION 7: Frontend Alignment
  // ==========================================
  console.log("\n🖥️ SECTION 7: FRONTEND ↔ CONTRACT ALIGNMENT");
  console.log("-".repeat(40));

  const nftPage = readFileSync(join(__dirname, "../src/app/nft/page.tsx"), "utf-8");
  check("NFT page contract address matches on-chain", nftPage.includes(CONTRACT_ADDRESS));
  check("NFT page references DOOMHOUND token", nftPage.includes("0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb"));
  check("No old contract reference", !nftPage.includes("0xfd269a2e7067d775d21fb8d2efd7301246c939fd"));

  // Check API route references
  const apiNft = readFileSync(join(__dirname, "../src/app/api/nft/route.ts"), "utf-8");
  check("API /nft route exists", apiNft.length > 0);

  // ==========================================
  // SECTION 8: Provenance Hash Verification
  // ==========================================
  console.log("\n🔐 SECTION 8: PROVENANCE HASH VERIFICATION");
  console.log("-".repeat(40));

  try {
    // Recompute provenance hash from original metadata
    // The provenance was computed from ORIGINAL (pre-shuffle) metadata
    // We need to check if the hash matches
    const originalHashes = provenance.originalHashes;
    
    // Concatenate all hashes and compute SHA-256
    const concatenated = originalHashes.map(h => h.hash).join("");
    const computedHash = createHash("sha256").update(concatenated).digest("hex");
    
    check("Provenance hash matches recomputed hash", computedHash === provenance.provenanceHash,
      `computed: ${computedHash}, stored: ${provenance.provenanceHash}`);
    
    console.log(`   📌 Provenance hash: ${provenance.provenanceHash}`);
    console.log(`   📌 Computed hash:   ${computedHash}`);
  } catch (e) {
    check("Provenance hash verification", false, e.message);
  }

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("FINAL SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  
  if (errors.length > 0) {
    console.log("\n❌ ERRORS FOUND:");
    errors.forEach(e => console.log(`   - ${e}`));
  } else {
    console.log("\n🎉 ALL CHECKS PASSED! System is fully aligned.");
  }
}

function parseEther(value) {
  return BigInt(Math.floor(parseFloat(value) * 1e18));
}

main().catch(console.error);
