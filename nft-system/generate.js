// Hounds of Hell — NFT Generation System
// Assigns 666 unique trait combinations using weighted random selection

const TRAITS = {
  background: [
    { name: "Inferno", weight: 15 },
    { name: "Void", weight: 15 },
    { name: "Ashes", weight: 15 },
    { name: "Lava", weight: 10 },
    { name: "Ice Hell", weight: 10 },
    { name: "Bone Yard", weight: 10 },
    { name: "Storm", weight: 10 },
    { name: "Blood Moon", weight: 5 },
    { name: "Plasma", weight: 5 },
    { name: "The Abyss", weight: 5 }
  ],
  fur: [
    { name: "Shadow Black", weight: 18 },
    { name: "Blood Red", weight: 14 },
    { name: "Bone White", weight: 12 },
    { name: "Inferno Orange", weight: 10 },
    { name: "Toxic Green", weight: 10 },
    { name: "Frost Blue", weight: 8 },
    { name: "Void Purple", weight: 8 },
    { name: "Ember Glow", weight: 6 },
    { name: "Ghost", weight: 5 },
    { name: "Molten Gold", weight: 4 },
    { name: "Shadow Flame", weight: 3 },
    { name: "Cosmic", weight: 2 }
  ],
  eyes: [
    { name: "Crimson", weight: 20 },
    { name: "Gold", weight: 15 },
    { name: "Heterochromia", weight: 12 },
    { name: "Laser", weight: 10 },
    { name: "Void", weight: 10 },
    { name: "Cyclops", weight: 8 },
    { name: "Soul Fire", weight: 7 },
    { name: "Snake", weight: 6 },
    { name: "X Marks", weight: 5 },
    { name: "Third Eye", weight: 4 },
    { name: "Hypnotic", weight: 3 }
  ],
  horns: [
    { name: "None", weight: 15 },
    { name: "Small Devil", weight: 20 },
    { name: "Ram", weight: 14 },
    { name: "Twisted", weight: 12 },
    { name: "Flame", weight: 10 },
    { name: "Bone", weight: 8 },
    { name: "Crystal", weight: 7 },
    { name: "Crown of Horns", weight: 5 },
    { name: "Oni", weight: 4 },
    { name: "Dragon", weight: 3 },
    { name: "Halo of Fire", weight: 2 }
  ],
  collar: [
    { name: "Spiked", weight: 18 },
    { name: "Chains", weight: 15 },
    { name: "Bone Tag", weight: 13 },
    { name: "Skull Tag", weight: 12 },
    { name: "None", weight: 12 },
    { name: "Lava Drip", weight: 8 },
    { name: "Soul Chain", weight: 6 },
    { name: "Barbed Wire", weight: 5 },
    { name: "Demon Bell", weight: 4 },
    { name: "Ribcage", weight: 4 },
    { name: "Royal", weight: 3 }
  ],
  tail: [
    { name: "Fire", weight: 20 },
    { name: "Chain", weight: 16 },
    { name: "Bone", weight: 14 },
    { name: "Demon", weight: 12 },
    { name: "Ghost", weight: 8 },
    { name: "Serpent", weight: 7 },
    { name: "Lava Whip", weight: 6 },
    { name: "Scorpion", weight: 5 },
    { name: "Abyssal Tentacle", weight: 4 },
    { name: "Multi-Flame", weight: 4 },
    { name: "Soul Eater", weight: 4 }
  ],
  special: [
    { name: "None", weight: 25 },
    { name: "Bat Wings", weight: 15 },
    { name: "Skeleton Wings", weight: 10 },
    { name: "Fire Breath", weight: 10 },
    { name: "Pitchfork", weight: 8 },
    { name: "Shadow Aura", weight: 7 },
    { name: "Demon Sword", weight: 5 },
    { name: "Skull Shield", weight: 4 },
    { name: "Flame Crown", weight: 4 },
    { name: "Angel Wings", weight: 3 },
    { name: "Trident", weight: 3 },
    { name: "Chaos Orb", weight: 3 },
    { name: "Doom Scroll", weight: 2 },
    { name: "Hell Guitar", weight: 1 }
  ]
};

// Trait prompt descriptions for AI generation
const TRAIT_PROMPTS = {
  background: {
    "Inferno": "dark inferno background with red and orange flames",
    "Void": "deep void black background with subtle purple nebula",
    "Ashes": "grey ashen background with floating ember particles",
    "Lava": "molten lava background with glowing orange cracks",
    "Ice Hell": "frozen hellscape background with blue ice and frost",
    "Bone Yard": "bone yard background with scattered bones and skulls",
    "Storm": "dark storm background with purple lightning",
    "Blood Moon": "blood moon background, deep red with crimson moon",
    "Plasma": "plasma energy background with green and blue electric arcs",
    "The Abyss": "pure abyss black background with a single red glow"
  },
  fur: {
    "Shadow Black": "solid black fur with a slight sheen",
    "Blood Red": "deep blood-red fur",
    "Bone White": "pale bone-white fur with visible skeleton patches",
    "Inferno Orange": "bright orange fur with ember glow",
    "Toxic Green": "neon toxic green fur",
    "Frost Blue": "icy frost-blue fur with white tips",
    "Void Purple": "deep void-purple fur with star-like specks",
    "Ember Glow": "dark fur with glowing ember-orange cracks",
    "Ghost": "semi-transparent ghostly white fur, spectral and ethereal",
    "Molten Gold": "shimmering molten gold fur, metallic sheen",
    "Shadow Flame": "black fur with purple and red flame patterns moving across it",
    "Cosmic": "fur with galaxy and nebula patterns, tiny stars embedded"
  },
  eyes: {
    "Crimson": "glowing crimson red eyes",
    "Gold": "bright golden eyes with a fierce glow",
    "Heterochromia": "one red eye and one gold eye, heterochromia",
    "Laser": "laser beams shooting from eyes, bright red beams",
    "Void": "completely black void eyes with no pupils",
    "Cyclops": "single large eye in the center of forehead",
    "Soul Fire": "hollow eyes with blue-white fire burning inside",
    "Snake": "vertical slit snake pupils, glowing green",
    "X Marks": "X-shaped eyes like a cartoon KO",
    "Third Eye": "three eyes, the third on forehead glowing purple",
    "Hypnotic": "swirling spiral eyes, mesmerizing pattern"
  },
  horns: {
    "None": "no horns on head",
    "Small Devil": "small classic red devil horns on top of head",
    "Ram": "curved ram horns on sides of head",
    "Twisted": "twisted spiraling horns going upward",
    "Flame": "horns made of living fire on top of head",
    "Bone": "exposed bone horns, cracked and ancient looking",
    "Crystal": "glowing crystal horns with inner light",
    "Crown of Horns": "a crown of multiple small horns circling the head",
    "Oni": "single long oni demon horn from forehead",
    "Dragon": "large dragon-like horns sweeping backward",
    "Halo of Fire": "a burning fiery halo floating above the head"
  },
  collar: {
    "Spiked": "spiked leather collar around neck",
    "Chains": "heavy chain collar around neck",
    "Bone Tag": "collar with bone-shaped tag hanging",
    "Skull Tag": "collar with small skull-shaped tag hanging",
    "None": "no collar on neck",
    "Lava Drip": "collar made of dripping lava around neck",
    "Soul Chain": "ethereal chain collar with floating soul orbs",
    "Barbed Wire": "barbed wire wrapped around neck",
    "Demon Bell": "collar with a small demon bell that glows",
    "Ribcage": "a ribcage wrapped around the neck like a collar",
    "Royal": "ornate golden royal collar with red gems"
  },
  tail: {
    "Fire": "tail made of fire, blazing",
    "Chain": "chain tail with a spike ball at the end",
    "Bone": "exposed bone tail, skeletal",
    "Demon": "classic demon tail with arrow-shaped tip",
    "Ghost": "semi-transparent ghostly tail fading at the end",
    "Serpent": "tail that ends in a living serpent head",
    "Lava Whip": "whip-like tail dripping hot lava",
    "Scorpion": "scorpion tail curving up with venomous stinger",
    "Abyssal Tentacle": "tentacle tail from the abyss with suckers",
    "Multi-Flame": "tail that splits into three flame tips",
    "Soul Eater": "tail ending in a small mouth that devours souls"
  },
  special: {
    "None": "no special feature",
    "Bat Wings": "small bat wings on the back",
    "Skeleton Wings": "exposed skeleton bone wings on the back",
    "Fire Breath": "breathing small fire from mouth",
    "Pitchfork": "holding a tiny pitchfork in one paw",
    "Shadow Aura": "dark shadow aura emanating from the body",
    "Demon Sword": "carrying a small demon sword in one paw",
    "Skull Shield": "carrying a shield made of skulls in one paw",
    "Flame Crown": "wearing a crown of living flames on head",
    "Angel Wings": "feathered angel wings on the back, fallen angel look",
    "Trident": "holding a glowing trident in one paw",
    "Chaos Orb": "a floating chaotic orb of energy hovering nearby",
    "Doom Scroll": "holding an ancient scroll of doom in one paw",
    "Hell Guitar": "playing a guitar made of hellfire"
  }
};

// Weighted random selection
function weightedRandom(options) {
  const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;
  for (const option of options) {
    random -= option.weight;
    if (random <= 0) return option.name;
  }
  return options[options.length - 1].name;
}

// Calculate rarity score — sum of individual trait rarities
// Each trait's rarity = 1 / (weight / totalWeight) = totalWeight / weight
// Normalized to 0-100 per trait, then summed across 7 categories
function calculateRarityScore(traits) {
  let score = 0;
  for (const [category, value] of Object.entries(traits)) {
    const options = TRAITS[category];
    const option = options.find(o => o.name === value);
    if (option) {
      const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
      // Rarity factor: how much rarer than average (1.0 = average)
      // Average weight = totalWeight / numOptions
      const avgWeight = totalWeight / options.length;
      const rarityFactor = avgWeight / option.weight; // >1 if rarer, <1 if common
      score += Math.min(rarityFactor * 10, 20); // cap per trait at 20, scale to 0-20
    }
  }
  return Math.round(score * 10); // final score 0-1400 range roughly
}

// Assign rarity tier based on score percentiles
function getRarityTier(score, allScores) {
  if (!allScores) {
    // Fallback: absolute thresholds
    if (score >= 900) return "Demonic";
    if (score >= 750) return "Legendary";
    if (score >= 600) return "Rare";
    if (score >= 450) return "Uncommon";
    return "Common";
  }
  // Percentile-based with exact target counts
  const sorted = [...allScores].sort((a, b) => b - a); // descending
  const rank = sorted.indexOf(score);
  if (rank < 6) return "Demonic";          // exactly 6
  if (rank < 56) return "Legendary";       // 50
  if (rank < 167) return "Rare";           // 111
  if (rank < 333) return "Uncommon";       // 166
  return "Common";                          // 333
}

// Generate a unique trait combination
function generateTraits(tokenId) {
  return {
    background: weightedRandom(TRAITS.background),
    fur: weightedRandom(TRAITS.fur),
    eyes: weightedRandom(TRAITS.eyes),
    horns: weightedRandom(TRAITS.horns),
    collar: weightedRandom(TRAITS.collar),
    tail: weightedRandom(TRAITS.tail),
    special: weightedRandom(TRAITS.special)
  };
}

// Create a trait hash for uniqueness checking
function traitHash(traits) {
  return Object.values(traits).join("|");
}

// Generate all 666 unique NFTs
function generateAllNFTs() {
  const nfts = [];
  const usedHashes = new Set();
  let attempts = 0;
  const maxAttempts = 100000;

  while (nfts.length < 666 && attempts < maxAttempts) {
    attempts++;
    const tokenId = nfts.length + 1;
    const traits = generateTraits(tokenId);
    const hash = traitHash(traits);

    if (!usedHashes.has(hash)) {
      usedHashes.add(hash);
      const rarityScore = calculateRarityScore(traits);

      nfts.push({
        tokenId,
        name: `Hound #${String(tokenId).padStart(3, '0')}`,
        traits,
        rarityScore,
        rarityTier: "", // assigned after all scores calculated
        hash
      });
    }
  }

  // Assign tiers based on score percentiles
  const allScores = nfts.map(n => n.rarityScore);
  nfts.forEach(nft => {
    nft.rarityTier = getRarityTier(nft.rarityScore, allScores);
  });

  console.log(`Generated ${nfts.length} unique NFTs in ${attempts} attempts`);
  
  return nfts;
}

// Generate AI prompt for a specific NFT
function generatePrompt(nft) {
  const { traits } = nft;
  
  const bgPrompt = TRAIT_PROMPTS.background[traits.background];
  const furPrompt = TRAIT_PROMPTS.fur[traits.fur];
  const eyesPrompt = TRAIT_PROMPTS.eyes[traits.eyes];
  const hornsPrompt = TRAIT_PROMPTS.horns[traits.horns];
  const collarPrompt = TRAIT_PROMPTS.collar[traits.collar];
  const tailPrompt = TRAIT_PROMPTS.tail[traits.tail];
  const specialPrompt = TRAIT_PROMPTS.special[traits.special];

  // Style anchor — same for EVERY NFT to ensure consistency
  const styleAnchor = "A cartoon demonic hound, front-facing symmetric pose. Flat vector art with thick black outlines and vibrant solid colors. Stocky body, large head, short legs, exaggerated cartoon proportions. Vinyl designer toy collectible aesthetic. Clean consistent line work. 1024x1024 square format.";

  return `${styleAnchor} The hound has ${furPrompt}, ${eyesPrompt}, ${hornsPrompt}, ${collarPrompt}, ${tailPrompt}, and ${specialPrompt}. ${bgPrompt}. No text, no watermark, no border.`;
}

// Generate ERC-721 metadata JSON
function generateMetadata(nft, imageUrl) {
  return {
    name: nft.name,
    description: `Hounds of Hell #${nft.tokenId} — ${nft.rarityTier} tier. 666 demonic hounds from the underworld. Hold to unlock DOOMHOUND Pack bonuses.`,
    image: imageUrl,
    external_url: "https://doomhound.fun",
    attributes: [
      { trait_type: "Background", value: nft.traits.background },
      { trait_type: "Fur", value: nft.traits.fur },
      { trait_type: "Eyes", value: nft.traits.eyes },
      { trait_type: "Horns", value: nft.traits.horns },
      { trait_type: "Collar", value: nft.traits.collar },
      { trait_type: "Tail", value: nft.traits.tail },
      { trait_type: "Special", value: nft.traits.special },
      { trait_type: "Rarity Tier", value: nft.rarityTier },
      { display_type: "number", trait_type: "Rarity Score", value: nft.rarityScore }
    ],
    properties: {
      category: "image",
      files: [{ uri: imageUrl, type: "image/png" }],
      creators: [{ address: "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb", share: 100 }]
    }
  };
}

// Main execution
function main() {
  console.log("🔥 HOUNDS OF HELL — NFT Generation System");
  console.log("==========================================\n");

  // Generate all 666 NFTs
  const nfts = generateAllNFTs();

  // Distribution analysis
  const tierCounts = {};
  nfts.forEach(n => { tierCounts[n.rarityTier] = (tierCounts[n.rarityTier] || 0) + 1; });
  console.log("\n📊 Final Tier Distribution:");
  Object.entries(tierCounts).sort((a, b) => {
    const order = { "Demonic": 0, "Legendary": 1, "Rare": 2, "Uncommon": 3, "Common": 4 };
    return order[a[0]] - order[b[0]];
  }).forEach(([tier, count]) => {
    console.log(`  ${tier}: ${count} (${(count/666*100).toFixed(1)}%)`);
  });

  // Sample outputs
  console.log("\n🐺 Sample NFTs:");
  [1, 2, 3, 66, 333, 666].forEach(id => {
    const nft = nfts[id - 1];
    if (nft) {
      console.log(`\n  ${nft.name} [${nft.rarityTier}] (Score: ${nft.rarityScore})`);
      Object.entries(nft.traits).forEach(([k, v]) => console.log(`    ${k}: ${v}`));
    }
  });

  return nfts;
}

// Export for use in generation pipeline
module.exports = { TRAITS, TRAIT_PROMPTS, generateAllNFTs, generatePrompt, generateMetadata, calculateRarityScore, getRarityTier };

// Run if called directly
if (require.main === module) {
  const nfts = main();
  
  // Save all NFT data
  const fs = require('fs');
  fs.writeFileSync('/home/z/my-project/nft-system/all_nfts.json', JSON.stringify(nfts, null, 2));
  console.log("\n✅ Saved all 666 NFTs to all_nfts.json");
  
  // Save prompts for batch generation
  const prompts = nfts.map(nft => ({
    tokenId: nft.tokenId,
    name: nft.name,
    prompt: generatePrompt(nft)
  }));
  fs.writeFileSync('/home/z/my-project/nft-system/all_prompts.json', JSON.stringify(prompts, null, 2));
  console.log("✅ Saved all 666 prompts to all_prompts.json");
  
  // Save sample metadata
  const sampleMetadata = generateMetadata(nfts[0], "ipfs://Qm.../1.png");
  fs.writeFileSync('/home/z/my-project/nft-system/sample_metadata.json', JSON.stringify(sampleMetadata, null, 2));
  console.log("✅ Saved sample metadata to sample_metadata.json");
}
