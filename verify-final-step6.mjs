import * as fs from 'fs';
import * as path from 'path';

const METADATA_CID = 'bafybeibdg3jgysee4aejlurdfhvrrtleq5vgeirmp64b6drpcsr56knhme';
const IMAGES_CID = 'bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje';
const GW = 'https://gateway.pinata.cloud/ipfs';

const SHUFFLED_DIR = '/home/z/my-project/metadata-shuffled';
const ORIGINAL_DIR = '/home/z/my-project/ipfs-upload/metadata';

async function verify() {
  console.log('🔍 STEP 6 & 7: Final comprehensive verification');
  console.log('');
  
  // Read all shuffled metadata locally and compare with what should be on IPFS
  const localData = {};
  const files = fs.readdirSync(SHUFFLED_DIR)
    .filter(f => f.endsWith('.json') && !['provenance.json','provenance-compact.json','UPLOAD_INFO.json','update-verification.json','FINAL_UPLOAD_INFO.json'].includes(f))
    .sort((a, b) => {
      const numA = parseInt(a), numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, file), 'utf-8'));
    localData[file] = data;
  }
  
  console.log(`Loaded ${Object.keys(localData).length} local metadata files`);
  console.log('');
  
  // Check 1: Every file has correct image CID
  let imgCidOk = 0, imgCidFail = 0;
  for (const [file, data] of Object.entries(localData)) {
    if (data.image && data.image.includes(IMAGES_CID)) {
      imgCidOk++;
    } else {
      console.log(`❌ ${file}: Wrong image CID: ${data.image}`);
      imgCidFail++;
    }
  }
  console.log(`Image CID check: ${imgCidOk} OK, ${imgCidFail} FAIL`);
  
  // Check 2: Every numbered file (1-100) references an image 1-100
  let imgRangeOk = 0, imgRangeFail = 0;
  for (let i = 1; i <= 100; i++) {
    const data = localData[`${i}.json`];
    if (!data) { console.log(`❌ Missing ${i}.json`); imgRangeFail++; continue; }
    const imgNum = parseInt(data.image.split('/').pop().replace('.png', ''));
    if (imgNum >= 1 && imgNum <= 100) {
      imgRangeOk++;
    } else {
      console.log(`❌ ${i}.json: Image out of range: ${data.image}`);
      imgRangeFail++;
    }
  }
  console.log(`Image range check: ${imgRangeOk} OK, ${imgRangeFail} FAIL`);
  
  // Check 3: No duplicate image references
  const imageRefs = {};
  let dupFail = 0;
  for (let i = 1; i <= 100; i++) {
    const data = localData[`${i}.json`];
    const imgFile = data.image.split('/').pop();
    if (imageRefs[imgFile]) {
      console.log(`❌ Duplicate: ${imgFile} used in ${imageRefs[imgFile]} and ${i}.json`);
      dupFail++;
    }
    imageRefs[imgFile] = `${i}.json`;
  }
  console.log(`Duplicate check: ${dupFail === 0 ? 'OK - no duplicates' : dupFail + ' FAIL'}`);
  
  // Check 4: Rarity distribution
  const rarityCount = {};
  for (let i = 1; i <= 100; i++) {
    const data = localData[`${i}.json`];
    const r = data.attributes?.find(a => a.trait_type === 'Rarity')?.value;
    rarityCount[r] = (rarityCount[r] || 0) + 1;
  }
  console.log(`Rarity distribution: ${JSON.stringify(rarityCount)}`);
  const rarityOk = rarityCount.Legendary === 5 && rarityCount.Epic === 15 && rarityCount.Rare === 30 && rarityCount.Common === 50;
  console.log(`Rarity check: ${rarityOk ? 'OK' : 'FAIL'}`);
  
  // Check 5: Traits match originals
  let traitOk = 0, traitFail = 0;
  for (let i = 1; i <= 100; i++) {
    const shuffled = localData[`${i}.json`];
    const origImgNum = parseInt(shuffled.image.split('/').pop().replace('.png', ''));
    const origPath = path.join(ORIGINAL_DIR, `${origImgNum}.json`);
    const origData = JSON.parse(fs.readFileSync(origPath, 'utf-8'));
    
    // Compare all attributes
    const shuffledAttrs = shuffled.attributes.reduce((m, a) => { m[a.trait_type] = a.value; return m; }, {});
    const origAttrs = origData.attributes.reduce((m, a) => { m[a.trait_type] = a.value; return m; }, {});
    
    let match = true;
    for (const [key, val] of Object.entries(origAttrs)) {
      if (shuffledAttrs[key] !== val) {
        console.log(`❌ ${i}.json: Trait mismatch on ${key}: shuffled=${shuffledAttrs[key]}, orig=${val}`);
        match = false;
        traitFail++;
        break;
      }
    }
    if (match) traitOk++;
  }
  console.log(`Trait consistency check: ${traitOk} OK, ${traitFail} FAIL`);
  
  // Check 6: All 100 images are referenced exactly once
  const referencedImages = new Set();
  for (let i = 1; i <= 100; i++) {
    const data = localData[`${i}.json`];
    const imgNum = parseInt(data.image.split('/').pop().replace('.png', ''));
    referencedImages.add(imgNum);
  }
  let allImagesOk = true;
  for (let i = 1; i <= 100; i++) {
    if (!referencedImages.has(i)) {
      console.log(`❌ Image ${i}.png not referenced by any token`);
      allImagesOk = false;
    }
  }
  console.log(`All images referenced: ${allImagesOk ? 'OK' : 'FAIL'}`);
  
  // Check 7: Verify the unrevealed.json
  const unrevealed = localData['unrevealed.json'];
  const unrevealedOk = unrevealed && unrevealed.image && unrevealed.image.includes(IMAGES_CID) && unrevealed.image.includes('unrevealed.png');
  console.log(`Unrevealed check: ${unrevealedOk ? 'OK' : 'FAIL'}`);
  
  // Check 8: Provenance hash still valid
  // Read original metadata in order and compute hash
  const crypto = await import('crypto');
  const hashes = [];
  for (let i = 1; i <= 100; i++) {
    const content = fs.readFileSync(path.join(ORIGINAL_DIR, `${i}.json`), 'utf-8').trim();
    hashes.push(crypto.createHash('sha256').update(content).digest('hex'));
  }
  const provenanceHash = crypto.createHash('sha256').update(hashes.join('')).digest('hex');
  const provenanceOk = provenanceHash === '15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0';
  console.log(`Provenance hash check: ${provenanceOk ? 'OK' : 'FAIL - ' + provenanceHash}`);
  
  // FINAL SUMMARY
  console.log('');
  console.log('='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  const allOk = imgCidFail === 0 && imgRangeFail === 0 && dupFail === 0 && rarityOk && traitFail === 0 && allImagesOk && unrevealedOk && provenanceOk;
  
  console.log(`Image CID:          ${imgCidFail === 0 ? '✅' : '❌'}`);
  console.log(`Image range:        ${imgRangeFail === 0 ? '✅' : '❌'}`);
  console.log(`No duplicates:      ${dupFail === 0 ? '✅' : '❌'}`);
  console.log(`Rarity (5/15/30/50): ${rarityOk ? '✅' : '❌'}`);
  console.log(`Traits match:       ${traitFail === 0 ? '✅' : '❌'}`);
  console.log(`All images used:    ${allImagesOk ? '✅' : '❌'}`);
  console.log(`Unrevealed:         ${unrevealedOk ? '✅' : '❌'}`);
  console.log(`Provenance hash:    ${provenanceOk ? '✅' : '❌'}`);
  console.log('');
  
  if (allOk) {
    console.log('🎉 ALL CHECKS PASSED!');
    console.log('');
    console.log('📋 CONTRACT UPDATE INFO:');
    console.log(`   setBaseURI("ipfs://${METADATA_CID}/")`);
    console.log(`   setUnrevealedURI("ipfs://${IMAGES_CID}/images/unrevealed.png")`);
    console.log(`   Provenance: 15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0`);
  } else {
    console.log('⚠️ SOME CHECKS FAILED!');
  }
}

verify();
