// ===== NFT METADATA GENERATOR =====
// Generates 100 metadata JSON files for IPFS upload
// 
// Usage: bun run scripts/generate-nft-metadata.ts
// Then upload the /metadata folder to IPFS (Pinata/nft.storage)

import * as fs from 'fs';
import * as path from 'path';

// ===== CONFIGURATION =====
const COLLECTION_NAME = "Hounds of the Hell";
const DESCRIPTION = "100 unique hounds from the Hounds of the Hell collection on Avalanche. Holders gain exclusive perks in the DOOMHOUND ecosystem.";
const EXTERNAL_URL = "https://doomhound.onrender.com";

// Rarity distribution: 5 Legendary, 15 Epic, 30 Rare, 50 Common = 100 total
const RARITIES = [
  { name: "Legendary", count: 5, traits: { rarity: "Legendary", background: "Hellfire" } },
  { name: "Epic", count: 15, traits: { rarity: "Epic", background: "Blood Moon" } },
  { name: "Rare", count: 30, traits: { rarity: "Rare", background: "Shadow" } },
  { name: "Common", count: 50, traits: { rarity: "Common", background: "Dark" } },
];

// Trait options for variety
const BREEDS = ["Shadow Fang", "Hell Hound", "Frost Wolf", "Blood Hunter", "Ghost Howler", "Doom Bringer", "Night Stalker", "Soul Reaper"];
const EYES = ["Crimson Fire", "Ice Blue", "Golden Glow", "Void Black", "Toxic Green", "Soul Purple"];
const ARMOR = ["None", "Bone Chain", "Iron Collar", "Diamond Plate", "Shadow Cloak", "Hellfire Helm"];
const SPECIAL = ["None", "Scar", "Glowing Mark", "Chained", "Winged", "Crowned"];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateMetadata() {
  const outputDir = path.join(__dirname, '..', 'metadata');
  
  // Clean output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Generate token IDs in random order (for reveal randomness)
  const tokenIds: number[] = [];
  let currentId = 1;
  
  for (const rarity of RARITIES) {
    for (let i = 0; i < rarity.count; i++) {
      tokenIds.push(currentId++);
    }
  }
  
  // Shuffle token IDs for random rarity assignment
  const rng = seededRandom(42); // Deterministic for reproducibility
  const shuffled = [...tokenIds].sort(() => rng() - 0.5);

  // Assign rarities in order: 5 Legendary, 15 Epic, 30 Rare, 50 Common
  const assignments: { tokenId: number; rarity: typeof RARITIES[number] }[] = [];
  let idx = 0;
  for (const rarity of RARITIES) {
    for (let i = 0; i < rarity.count; i++) {
      assignments.push({ tokenId: shuffled[idx], rarity });
      idx++;
    }
  }

  // Sort by token ID for final output
  assignments.sort((a, b) => a.tokenId - b.tokenId);

  // Generate metadata for each token
  for (const { tokenId, rarity } of assignments) {
    const tokenRng = seededRandom(tokenId * 7 + 13);
    
    const metadata = {
      name: `${COLLECTION_NAME} #${tokenId}`,
      description: DESCRIPTION,
      image: `ipfs://REPLACE_WITH_IMAGES_CID/${tokenId}.png`,
      external_url: EXTERNAL_URL,
      edition: tokenId,
      attributes: [
        { trait_type: "Rarity", value: rarity.name },
        { trait_type: "Breed", value: pick(BREEDS, tokenRng) },
        { trait_type: "Eyes", value: pick(EYES, tokenRng) },
        { trait_type: "Armor", value: pick(ARMOR, tokenRng) },
        { trait_type: "Special", value: pick(SPECIAL, tokenRng) },
        { trait_type: "Background", value: rarity.traits.background },
        { display_type: "number", trait_type: "Generation", value: 1 },
      ],
    };

    const filePath = path.join(outputDir, `${tokenId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  }

  // Generate unrevealed metadata
  const unrevealed = {
    name: `${COLLECTION_NAME} — Unrevealed`,
    description: "This hound has not been revealed yet. Stay tuned...",
    image: "ipfs://REPLACE_WITH_UNREVEALED_CID/unrevealed.png",
    external_url: EXTERNAL_URL,
  };
  fs.writeFileSync(path.join(outputDir, 'unrevealed.json'), JSON.stringify(unrevealed, null, 2));

  // Stats
  console.log('✅ Generated metadata for 100 NFTs + unrevealed.json');
  console.log(`📁 Output: ${outputDir}`);
  console.log('');
  console.log('Rarity distribution:');
  for (const r of RARITIES) {
    console.log(`  ${r.name}: ${r.count} (${r.count}%)`);
  }
  console.log('');
  console.log('⚠️  BEFORE UPLOADING TO IPFS:');
  console.log('1. Replace "REPLACE_WITH_IMAGES_CID" in each JSON with the actual CID');
  console.log('2. Upload all images to IPFS first');
  console.log('3. Upload metadata folder to IPFS');
  console.log('4. Set baseURI on contract: ipfs://METADATA_CID/');
}

generateMetadata();
