import * as fs from 'fs';
import * as path from 'path';

const OLD_CID = 'bafybeibxjrmhqp6glz72cqst7gufrpv6q24f7kucignyxur5irxiuqzphq';
const NEW_CID = 'bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje';

const SHUFFLED_DIR = '/home/z/my-project/metadata-shuffled';

console.log('📝 STEP 3: Updating image CID in all shuffled metadata files...');
console.log(`Old CID: ${OLD_CID}`);
console.log(`New CID: ${NEW_CID}`);
console.log('');

// Get all JSON files (excluding provenance and upload info)
const files = fs.readdirSync(SHUFFLED_DIR)
  .filter(f => f.endsWith('.json') && f !== 'provenance.json' && f !== 'provenance-compact.json' && f !== 'UPLOAD_INFO.json')
  .sort((a, b) => {
    const numA = parseInt(a), numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

console.log(`Found ${files.length} metadata files to update`);
console.log('');

let updated = 0;
let errors = 0;
const verificationLog = [];

for (const file of files) {
  const filePath = path.join(SHUFFLED_DIR, file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = JSON.parse(content);
    
    // Check current image path
    const oldImage = metadata.image;
    if (!oldImage.includes(OLD_CID)) {
      console.log(`⚠️ ${file}: Image doesn't contain old CID! Current: ${oldImage}`);
      errors++;
      continue;
    }
    
    // Replace CID
    metadata.image = metadata.image.replace(OLD_CID, NEW_CID);
    
    // Verify the new path is correct
    const expectedPattern = `ipfs://${NEW_CID}/images/`;
    if (!metadata.image.startsWith(expectedPattern)) {
      console.log(`⚠️ ${file}: Updated image path doesn't match expected pattern! Got: ${metadata.image}`);
      errors++;
      continue;
    }
    
    // Write back with proper formatting
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    
    // Log for verification
    const tokenId = parseInt(file);
    const rarity = metadata.attributes?.find(a => a.trait_type === 'Rarity')?.value || 'N/A';
    const imageFile = metadata.image.split('/').pop(); // e.g. "95.png"
    
    verificationLog.push({
      file,
      tokenId: metadata.edition || tokenId,
      rarity,
      imageFile,
      newImagePath: metadata.image,
    });
    
    updated++;
  } catch(e) {
    console.log(`❌ ${file}: ${e.message}`);
    errors++;
  }
}

console.log(`Updated: ${updated} files`);
console.log(`Errors: ${errors}`);
console.log('');

// Save verification log
fs.writeFileSync(
  path.join(SHUFFLED_DIR, 'update-verification.json'),
  JSON.stringify({ updated, errors, log: verificationLog }, null, 2)
);

// Show sample entries
console.log('Sample updated entries:');
for (const entry of verificationLog.slice(0, 5)) {
  console.log(`  ${entry.file}: tokenId=${entry.tokenId}, rarity=${entry.rarity}, image=${entry.imageFile}`);
}
console.log('  ...');
console.log(`  (${verificationLog.length} total)`);

if (errors === 0) {
  console.log('');
  console.log('✅ ALL metadata files updated successfully!');
} else {
  console.log('');
  console.log('❌ Some errors occurred. Check above.');
}
