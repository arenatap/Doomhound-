import * as fs from 'fs';
import * as path from 'path';

const NEW_CID = 'bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje';
const SHUFFLED_DIR = '/home/z/my-project/metadata-shuffled';
const ORIGINAL_DIR = '/home/z/my-project/ipfs-upload/metadata';

console.log('🔍 STEP 4: Deep verification of all metadata files...');
console.log('');

// 1. Check that every shuffled metadata points to an image on the NEW CID
console.log('=== CHECK 1: All images point to new CID ===');
const files = fs.readdirSync(SHUFFLED_DIR)
  .filter(f => f.endsWith('.json') && f !== 'provenance.json' && f !== 'provenance-compact.json' && f !== 'UPLOAD_INFO.json' && f !== 'update-verification.json')
  .sort((a, b) => {
    const numA = parseInt(a), numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

let check1Pass = true;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, file), 'utf-8'));
  if (data.image && !data.image.includes(NEW_CID)) {
    console.log(`❌ ${file}: Image still has old CID: ${data.image}`);
    check1Pass = false;
  }
}
if (check1Pass) console.log('✅ All images point to new CID');

// 2. Verify rarity distribution
console.log('');
console.log('=== CHECK 2: Rarity distribution ===');
const rarityCount = {};
const shuffledRarityMap = {};
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, file), 'utf-8'));
  const rarity = data.attributes?.find(a => a.trait_type === 'Rarity')?.value;
  if (!rarity) {
    console.log(`❌ ${file}: No rarity found!`);
    continue;
  }
  rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
  
  // Map: new tokenId → { rarity, originalImage }
  const newTokenId = parseInt(file);
  const imageNum = data.image.split('/').pop().replace('.png', '');
  shuffledRarityMap[newTokenId] = { rarity, originalImageId: parseInt(imageNum) || imageNum };
}
console.log('Distribution:', rarityCount);
const expectedRarity = { Legendary: 5, Epic: 15, Rare: 30, Common: 50 };
let check2Pass = true;
for (const [rarity, count] of Object.entries(expectedRarity)) {
  if (rarityCount[rarity] !== count) {
    console.log(`❌ Rarity ${rarity}: expected ${count}, got ${rarityCount[rarity]}`);
    check2Pass = false;
  }
}
if (check2Pass) console.log('✅ Rarity distribution matches expected: 5 Legendary, 15 Epic, 30 Rare, 50 Common');

// 3. Verify shuffle consistency: shuffled metadata traits should match original metadata
console.log('');
console.log('=== CHECK 3: Shuffle mapping consistency ===');
let check3Pass = true;
let checkedCount = 0;

for (const file of files) {
  const newTokenId = parseInt(file);
  if (isNaN(newTokenId) || newTokenId < 1 || newTokenId > 100) continue; // Skip unrevealed.json
  
  const shuffledData = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, file), 'utf-8'));
  const originalImageId = shuffledData.image.split('/').pop().replace('.png', '');
  const origImageNum = parseInt(originalImageId);
  
  if (isNaN(origImageNum)) continue; // Skip unrevealed
  
  // Read the ORIGINAL metadata for that image number
  const originalPath = path.join(ORIGINAL_DIR, `${origImageNum}.json`);
  if (!fs.existsSync(originalPath)) {
    console.log(`❌ Original metadata missing for image ${origImageNum}`);
    check3Pass = false;
    continue;
  }
  
  const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf-8'));
  
  // Compare traits - shuffled metadata should have same traits as original
  const shuffledRarity = shuffledData.attributes?.find(a => a.trait_type === 'Rarity')?.value;
  const originalRarity = originalData.attributes?.find(a => a.trait_type === 'Rarity')?.value;
  
  const shuffledBreed = shuffledData.attributes?.find(a => a.trait_type === 'Breed')?.value;
  const originalBreed = originalData.attributes?.find(a => a.trait_type === 'Breed')?.value;
  
  const shuffledEyes = shuffledData.attributes?.find(a => a.trait_type === 'Eyes')?.value;
  const originalEyes = originalData.attributes?.find(a => a.trait_type === 'Eyes')?.value;
  
  if (shuffledRarity !== originalRarity) {
    console.log(`❌ Token #${newTokenId}: Rarity mismatch! Shuffled=${shuffledRarity}, Original(${origImageNum})=${originalRarity}`);
    check3Pass = false;
  }
  if (shuffledBreed !== originalBreed) {
    console.log(`❌ Token #${newTokenId}: Breed mismatch! Shuffled=${shuffledBreed}, Original(${origImageNum})=${originalBreed}`);
    check3Pass = false;
  }
  if (shuffledEyes !== originalEyes) {
    console.log(`❌ Token #${newTokenId}: Eyes mismatch! Shuffled=${shuffledEyes}, Original(${origImageNum})=${originalEyes}`);
    check3Pass = false;
  }
  
  checkedCount++;
}

console.log(`Checked ${checkedCount} tokens against original metadata`);
if (check3Pass) console.log('✅ All shuffled traits match their original source metadata');

// 4. Verify no duplicate image references
console.log('');
console.log('=== CHECK 4: No duplicate image references ===');
const imageRefs = {};
let check4Pass = true;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, file), 'utf-8'));
  if (!data.image) continue;
  const imageFile = data.image.split('/').pop();
  if (imageRefs[imageFile]) {
    console.log(`❌ Duplicate image reference: ${imageFile} used in both ${imageRefs[imageFile]} and ${file}`);
    check4Pass = false;
  }
  imageRefs[imageFile] = file;
}
if (check4Pass) console.log('✅ No duplicate image references - each token has a unique image');

// 5. Verify all 100 images are referenced (1.png - 100.png)
console.log('');
console.log('=== CHECK 5: All 100 images are referenced ===');
const referencedImages = new Set();
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, file), 'utf-8'));
  if (!data.image) continue;
  const imageFile = data.image.split('/').pop();
  const num = parseInt(imageFile);
  if (!isNaN(num)) referencedImages.add(num);
}
let check5Pass = true;
for (let i = 1; i <= 100; i++) {
  if (!referencedImages.has(i)) {
    console.log(`❌ Image ${i}.png is NOT referenced by any metadata!`);
    check5Pass = false;
  }
}
if (check5Pass) console.log('✅ All 100 images (1.png - 100.png) are referenced');

// Final summary
console.log('');
console.log('='.repeat(50));
console.log('FINAL VERIFICATION SUMMARY');
console.log('='.repeat(50));
console.log(`Check 1 (New CID):      ${check1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Check 2 (Rarity):       ${check2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Check 3 (Traits match): ${check3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Check 4 (No dupes):     ${check4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Check 5 (All images):   ${check5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

const allPass = check1Pass && check2Pass && check3Pass && check4Pass && check5Pass;
if (allPass) {
  console.log('🎉 ALL CHECKS PASSED! Metadata is ready for upload.');
} else {
  console.log('⚠️ SOME CHECKS FAILED! Fix issues before uploading.');
}
