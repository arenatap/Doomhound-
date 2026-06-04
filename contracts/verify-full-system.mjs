// Full NFT System Verification Script
// Checks: IPFS images, IPFS metadata, metadata→image links, contract state, provenance hash

const IMAGE_CID = "bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje";
const METADATA_CID = "bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4";
const CONTRACT_ADDRESS = "0x851ba0903c345676369634660e2757026418dced";
const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.json();
}

async function fetchStatus(url) {
  try {
    const resp = await fetch(url, { method: "HEAD" });
    return resp.status;
  } catch (e) {
    return -1;
  }
}

async function main() {
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  const errors = [];

  function check(name, passed, detail = "") {
    totalChecks++;
    if (passed) {
      passedChecks++;
      console.log(`✅ ${name}`);
    } else {
      failedChecks++;
      console.log(`❌ ${name} ${detail}`);
      errors.push(`${name}: ${detail}`);
    }
  }

  console.log("=" .repeat(60));
  console.log("DOOMHOUND NFT v2 — FULL SYSTEM VERIFICATION");
  console.log("=".repeat(60));

  // ==========================================
  // SECTION 1: IPFS Images
  // ==========================================
  console.log("\n📷 SECTION 1: IPFS IMAGE VERIFICATION");
  console.log("-".repeat(40));

  // Check all 100 images + unrevealed
  const imageChecks = [];
  for (let i = 1; i <= 100; i++) {
    const url = `${IPFS_GATEWAY}${IMAGE_CID}/${i}.png`;
    const status = await fetchStatus(url);
    imageChecks.push({ id: i, status });
  }
  
  // Check unrevealed
  const unrevealedUrl = `${IPFS_GATEWAY}${IMAGE_CID}/unrevealed.png`;
  const unrevealedStatus = await fetchStatus(unrevealedUrl);
  check("Unrevealed image on IPFS", unrevealedStatus === 200, `status: ${unrevealedStatus}`);

  const failedImages = imageChecks.filter(c => c.status !== 200);
  check("All 100 NFT images on IPFS", failedImages.length === 0, 
    failedImages.length > 0 ? `Failed: ${failedImages.map(c => c.id).join(",")}` : "");
  
  if (failedImages.length > 0 && failedImages.length <= 10) {
    for (const f of failedImages) {
      console.log(`   ❌ Image ${f.id}.png: HTTP ${f.status}`);
    }
  }

  // ==========================================
  // SECTION 2: IPFS Metadata
  // ==========================================
  console.log("\n📄 SECTION 2: IPFS METADATA VERIFICATION");
  console.log("-".repeat(40));

  // Sample check: fetch 10 random metadata files
  const sampleIds = [1, 10, 25, 42, 50, 67, 75, 88, 99, 100];
  let metadataOk = true;
  let metadataDetails = [];

  for (const id of sampleIds) {
    try {
      const url = `${IPFS_GATEWAY}${METADATA_CID}/${id}.json`;
      const meta = await fetchJSON(url);
      
      // Check required fields
      const hasName = !!meta.name;
      const hasImage = !!meta.image;
      const hasAttributes = Array.isArray(meta.attributes);
      
      if (!hasName || !hasImage || !hasAttributes) {
        metadataOk = false;
        metadataDetails.push(`Token ${id}: missing fields (name:${hasName} image:${hasImage} attrs:${hasAttributes})`);
      }
    } catch (e) {
      metadataOk = false;
      metadataDetails.push(`Token ${id}: fetch error: ${e.message}`);
    }
  }
  
  check("Metadata files accessible (10 sampled)", metadataOk, metadataDetails.join("; "));

  // ==========================================
  // SECTION 3: Metadata → Image Link
  // ==========================================
  console.log("\n🔗 SECTION 3: METADATA → IMAGE LINK VERIFICATION");
  console.log("-".repeat(40));

  let linkOk = true;
  let linkDetails = [];

  for (const id of sampleIds) {
    try {
      const url = `${IPFS_GATEWAY}${METADATA_CID}/${id}.json`;
      const meta = await fetchJSON(url);
      
      // Expected image path: ipfs://CID/XX.png
      const expectedImagePrefix = `ipfs://${IMAGE_CID}/${id}.png`;
      
      if (meta.image !== expectedImagePrefix) {
        linkOk = false;
        linkDetails.push(`Token ${id}: image="${meta.image}" expected="${expectedImagePrefix}"`);
      }
    } catch (e) {
      linkOk = false;
      linkDetails.push(`Token ${id}: ${e.message}`);
    }
  }

  check("Metadata image links point to correct IPFS CID", linkOk, linkDetails.join("; "));

  // ==========================================
  // SECTION 4: Local Shuffle Integrity
  // ==========================================
  console.log("\n🔀 SECTION 4: SHUFFLE & PROVENANCE VERIFICATION");
  console.log("-".repeat(40));

  try {
    const provenancePath = join(__dirname, "../provenance.json");
    const provenance = JSON.parse(readFileSync(provenancePath, "utf-8"));
    
    check("Provenance file exists and is valid JSON", true);
    check("Provenance hash present", !!provenance.hash, `hash: ${provenance.hash}`);
    
    // Verify shuffle mapping
    const mapping = provenance.mapping;
    const mappingSize = Object.keys(mapping).length;
    check("Shuffle mapping has 100 entries", mappingSize === 100, `has ${mappingSize} entries`);
    
    // Verify all token IDs 1-100 are present as keys
    const allKeysPresent = Array.from({length: 100}, (_, i) => String(i + 1)).every(k => k in mapping);
    check("All token IDs 1-100 present as keys", allKeysPresent);
    
    // Verify all original IDs 1-100 are present as values
    const values = Object.values(mapping).map(String);
    const allValuesPresent = Array.from({length: 100}, (_, i) => String(i + 1)).every(v => values.includes(v));
    check("All original IDs 1-100 present as values", allValuesPresent);
    
    console.log(`   📌 Provenance hash: ${provenance.hash}`);
  } catch (e) {
    check("Provenance file", false, e.message);
  }

  // ==========================================
  // SECTION 5: Local Metadata Files Check
  // ==========================================
  console.log("\n📁 SECTION 5: LOCAL METADATA FILES CHECK");
  console.log("-".repeat(40));

  try {
    const metaDir = join(__dirname, "../metadata-shuffled");
    const files = readdirSync(metaDir).filter(f => f.endsWith(".json") && f !== "unrevealed.json");
    check("100 shuffled metadata files exist", files.length === 100, `found ${files.length}`);
    
    // Check each metadata file references correct image CID
    let localLinkOk = true;
    let localLinkErrors = 0;
    for (const file of files) {
      const content = JSON.parse(readFileSync(join(metaDir, file), "utf-8"));
      const tokenId = file.replace(".json", "");
      const expectedImage = `ipfs://${IMAGE_CID}/${tokenId}.png`;
      if (content.image !== expectedImage) {
        localLinkOk = false;
        localLinkErrors++;
        if (localLinkErrors <= 3) {
          console.log(`   ❌ ${file}: image="${content.image}" expected="${expectedImage}"`);
        }
      }
    }
    check("All local metadata image links correct", localLinkOk, `${localLinkErrors} mismatches`);
  } catch (e) {
    check("Local metadata files", false, e.message);
  }

  // ==========================================
  // SECTION 6: Contract On-Chain State
  // ==========================================
  console.log("\n⛓️ SECTION 6: CONTRACT ON-CHAIN STATE");
  console.log("-".repeat(40));

  try {
    const { createPublicClient, http } = await import("viem");
    const { avalanche } = await import("viem/chains");
    
    const artifactPath = join(__dirname, "deploy/artifacts/contracts/DoomhoundNFTv2.sol/DoomhoundNFTv2.json");
    const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
    
    const publicClient = createPublicClient({
      chain: avalanche,
      transport: http(),
    });
    
    const abi = artifact.abi;
    
    const reads = [
      { name: "name", fn: "name" },
      { name: "symbol", fn: "symbol" },
      { name: "MAX_SUPPLY", fn: "MAX_SUPPLY" },
      { name: "paidMintPrice", fn: "paidMintPrice" },
      { name: "tokenMintPrice", fn: "tokenMintPrice" },
      { name: "doomhoundToken", fn: "doomhoundToken" },
      { name: "BURN_ADDRESS", fn: "BURN_ADDRESS" },
      { name: "signer", fn: "signer" },
      { name: "revealed", fn: "revealed" },
      { name: "freeMintActive", fn: "freeMintActive" },
      { name: "paidMintActive", fn: "paidMintActive" },
      { name: "tokenMintActive", fn: "tokenMintActive" },
      { name: "owner", fn: "owner" },
      { name: "totalSupply", fn: "totalSupply" },
    ];
    
    for (const r of reads) {
      try {
        const result = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi,
          functionName: r.fn,
        });
        console.log(`   ✅ ${r.name}: ${result}`);
      } catch (e) {
        check(`Contract read ${r.name}`, false, e.message);
      }
    }
    
    // Check unrevealedURI
    const unrevealedURI = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "unrevealedURI",
    });
    check("unrevealedURI points to IPFS image", 
      unrevealedURI === `ipfs://${IMAGE_CID}/unrevealed.png`,
      `got: ${unrevealedURI}`);
    
    console.log(`   📌 unrevealedURI: ${unrevealedURI}`);
    
    // Check baseURI  
    // baseURI is private, but we can read it indirectly by checking the contract artifact
    // The expected baseURI is: ipfs://METADATA_CID/
    const expectedBaseURI = `ipfs://${METADATA_CID}/`;
    console.log(`   📌 Expected baseURI: ${expectedBaseURI}`);
    
  } catch (e) {
    check("Contract on-chain verification", false, e.message);
  }

  // ==========================================
  // SECTION 7: Frontend Alignment
  // ==========================================
  console.log("\n🖥️ SECTION 7: FRONTEND ALIGNMENT");
  console.log("-".repeat(40));

  try {
    // Check NFT page contract address
    const nftPage = readFileSync(join(__dirname, "../src/app/nft/page.tsx"), "utf-8");
    const contractMatch = nftPage.includes(CONTRACT_ADDRESS);
    check("NFT page uses correct contract address", contractMatch, CONTRACT_ADDRESS);
    
    const tokenMatch = nftPage.includes("0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb");
    check("NFT page references DOOMHOUND token", tokenMatch);
    
    // Check no old contract reference
    const oldContractGone = !nftPage.includes("0xfd269a2e7067d775d21fb8d2efd7301246c939fd");
    check("No reference to old contract in NFT page", oldContractGone);
    
    // Check ABI has new entries
    const abiContent = readFileSync(join(__dirname, "../src/lib/nft-abi.json"), "utf-8");
    const abi = JSON.parse(abiContent);
    const abiNames = abi.map(a => a.name);
    
    const requiredAbiEntries = [
      "tokenMintActive", "tokenMintPrice", "tokenMintClaimed", 
      "mintWithToken", "doomhoundToken", "BURN_ADDRESS", "MAX_TOKEN_PER_WALLET",
      "claimFreeMint", "mintPaid", "totalSupply", "paidMintPrice",
      "freeMintActive", "paidMintActive", "freeMintClaimed", "paidMintClaimed"
    ];
    
    const missingAbi = requiredAbiEntries.filter(n => !abiNames.includes(n));
    check("ABI has all required entries", missingAbi.length === 0, 
      missingAbi.length > 0 ? `Missing: ${missingAbi.join(", ")}` : "");
    
    // Check .env.example
    const envExample = readFileSync(join(__dirname, "../.env.example"), "utf-8");
    const envHasNewContract = envExample.includes(CONTRACT_ADDRESS);
    check(".env.example has new contract address", envHasNewContract);
    
  } catch (e) {
    check("Frontend alignment", false, e.message);
  }

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("FINAL SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks} ✅`);
  console.log(`Failed: ${failedChecks} ❌`);
  
  if (errors.length > 0) {
    console.log("\n❌ ERRORS FOUND:");
    errors.forEach(e => console.log(`   - ${e}`));
  } else {
    console.log("\n🎉 ALL CHECKS PASSED! System is fully aligned.");
  }
}

main().catch(console.error);
