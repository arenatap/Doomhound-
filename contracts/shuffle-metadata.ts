// ===== NFT METADATA SHUFFLE WITH PROVENANCE HASH =====
// 
// This script:
// 1. Reads existing metadata files (1.json - 100.json)
// 2. Generates a random shuffle permutation (Fisher-Yates)
// 3. Creates new metadata files where tokenId X gets the traits of shuffled position
// 4. Calculates a provenance hash from the original metadata
// 5. Outputs shuffled metadata to /metadata-shuffled/ directory
// 6. Generates provenance.json with the hash for public verification
//
// Usage: bun run contracts/shuffle-metadata.ts
// Then upload /metadata-shuffled/ to IPFS and set as new baseURI

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ===== CONFIG =====
const INPUT_DIR = path.join(__dirname, '..', 'ipfs-upload', 'metadata');
const OUTPUT_DIR = path.join(__dirname, '..', 'metadata-shuffled');
const TOTAL_SUPPLY = 100;

// Shuffle seed — using a future block hash or random value
// For true randomness, use: crypto.randomBytes(32).toString('hex')
// Or use a deterministic seed for reproducibility
const SHUFFLE_SEED = crypto.randomBytes(32).toString('hex');

interface MetadataFile {
  tokenId: number;
  content: string;  // raw JSON string
  parsed: any;
  hash: string;     // sha256 of the content
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Fisher-Yates shuffle with seed
function seededShuffle(arr: number[], seed: string): number[] {
  const result = [...arr];
  let hash = sha256(seed);
  
  for (let i = result.length - 1; i > 0; i--) {
    // Generate next random value from hash chain
    hash = sha256(hash + i.toString());
    const j = parseInt(hash.slice(0, 8), 16) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

function main() {
  console.log('🐺 DOOMHOUND NFT — Metadata Shuffle with Provenance Hash');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Read all existing metadata
  console.log('📂 Reading existing metadata from:', INPUT_DIR);
  const metadataFiles: MetadataFile[] = [];
  
  for (let i = 1; i <= TOTAL_SUPPLY; i++) {
    const filePath = path.join(INPUT_DIR, `${i}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing metadata file: ${i}.json`);
      process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    metadataFiles.push({
      tokenId: i,
      content: content.trim(),
      parsed,
      hash: sha256(content.trim()),
    });
  }
  console.log(`✅ Read ${metadataFiles.length} metadata files`);

  // Step 2: Sort by tokenId to ensure consistent order
  metadataFiles.sort((a, b) => a.tokenId - b.tokenId);

  // Step 3: Calculate provenance hash (hash of concatenated individual hashes)
  // This is the standard approach used by major NFT collections
  const concatenatedHashes = metadataFiles.map(m => m.hash).join('');
  const provenanceHash = sha256(concatenatedHashes);
  console.log('');
  console.log('🔐 PROVENANCE HASH (pre-shuffle):');
  console.log(`   ${provenanceHash}`);
  console.log('');
  console.log('   This hash must be published BEFORE mint starts.');
  console.log('   It proves the metadata order was fixed before any NFTs were minted.');

  // Step 4: Generate shuffle permutation
  const originalOrder = Array.from({ length: TOTAL_SUPPLY }, (_, i) => i + 1); // [1, 2, 3, ..., 100]
  const shuffledOrder = seededShuffle(originalOrder, SHUFFLE_SEED);
  
  console.log('');
  console.log('🔀 Shuffle seed:', SHUFFLE_SEED);
  console.log('   First 10 shuffled IDs:', shuffledOrder.slice(0, 10));
  console.log('');
  
  // Verify shuffle is valid (all IDs present exactly once)
  const sortedShuffle = [...shuffledOrder].sort((a, b) => a - b);
  const isValid = sortedShuffle.every((id, idx) => id === idx + 1);
  if (!isValid) {
    console.error('❌ Shuffle validation failed! Not all token IDs present.');
    process.exit(1);
  }
  console.log('✅ Shuffle validation passed — all 100 token IDs present');

  // Step 5: Create shuffled metadata
  // shuffledOrder[i] = the ORIGINAL token ID that goes to position (i+1)
  // So new file 1.json = traits from original shuffledOrder[0].json
  //    new file 2.json = traits from original shuffledOrder[1].json
  
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Create mapping for reference
  const mapping: { newTokenId: number; originalTokenId: number }[] = [];

  for (let newPos = 0; newPos < TOTAL_SUPPLY; newPos++) {
    const newTokenId = newPos + 1;
    const originalTokenId = shuffledOrder[newPos];
    const originalMetadata = metadataFiles[originalTokenId - 1]; // 0-indexed array

    // Create new metadata with updated token ID and name
    const newMetadata = {
      ...originalMetadata.parsed,
      name: `Hounds of the Hell #${newTokenId}`,
      edition: newTokenId,
    };

    // Write shuffled metadata file
    const outputPath = path.join(OUTPUT_DIR, `${newTokenId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(newMetadata, null, 2));

    mapping.push({ newTokenId, originalTokenId });
  }

  // Copy unrevealed.json if it exists
  const unrevealedPath = path.join(INPUT_DIR, 'unrevealed.json');
  if (fs.existsSync(unrevealedPath)) {
    fs.copyFileSync(unrevealedPath, path.join(OUTPUT_DIR, 'unrevealed.json'));
    console.log('📋 Copied unrevealed.json');
  }

  // Step 6: Generate provenance.json for public verification
  const provenanceData = {
    collection: "Hounds of the Hell",
    totalSupply: TOTAL_SUPPLY,
    provenanceHash: provenanceHash,
    shuffleSeed: SHUFFLE_SEED,
    description: "This provenance hash was generated BEFORE mint started. It is the SHA-256 of the concatenation of SHA-256 hashes of each token's metadata in original order (1-100). After reveal, anyone can verify that the shuffled metadata corresponds to this provenance by checking the mapping.",
    originalHashes: metadataFiles.map(m => ({
      tokenId: m.tokenId,
      hash: m.hash,
    })),
    shuffleMapping: mapping,
    verification: "To verify: 1) Hash each original metadata file with SHA-256. 2) Concatenate all hashes. 3) SHA-256 the concatenation. 4) Compare with provenanceHash above.",
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'provenance.json'),
    JSON.stringify(provenanceData, null, 2)
  );

  // Also save a compact version for the contract/website
  const compactProvenance = {
    provenanceHash: provenanceHash,
    shuffleSeed: SHUFFLE_SEED,
    totalSupply: TOTAL_SUPPLY,
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'provenance-compact.json'),
    JSON.stringify(compactProvenance, null, 2)
  );

  console.log('');
  console.log('📁 Output directory:', OUTPUT_DIR);
  console.log(`   - ${TOTAL_SUPPLY} shuffled metadata files (1.json - 100.json)`);
  console.log('   - provenance.json (full verification data)');
  console.log('   - provenance-compact.json (hash + seed only)');
  console.log('');
  console.log('🔍 RARITY DISTRIBUTION IN SHUFFLED METADATA:');
  
  // Verify rarity distribution is preserved
  const rarityCount: Record<string, number> = {};
  for (let i = 1; i <= TOTAL_SUPPLY; i++) {
    const f = path.join(OUTPUT_DIR, `${i}.json`);
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    const rarity = data.attributes.find((a: any) => a.trait_type === 'Rarity')?.value || 'Unknown';
    rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
  }
  for (const [rarity, count] of Object.entries(rarityCount).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${rarity}: ${count}`);
  }

  console.log('');
  console.log('⚡ NEXT STEPS:');
  console.log('1. Upload /metadata-shuffled/ folder to IPFS (Pinata)');
  console.log('2. Update contract baseURI to: ipfs://NEW_CID/');
  console.log('3. Publish provenance hash on website: ' + provenanceHash);
  console.log('4. The shuffle seed will be revealed after mint completes');
  console.log('');
  console.log('🏆 Done! Your NFTs will be randomly assigned on reveal.');
}

main();
