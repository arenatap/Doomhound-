import * as fs from 'fs';
import * as path from 'path';

const SHUFFLED_DIR = '/home/z/my-project/metadata-shuffled';
const IMAGES_CID = 'bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje';

// Current (WRONG): ipfs://CID/images/95.png
// Fixed (CORRECT): ipfs://CID/95.png
const WRONG_PATH = `ipfs://${IMAGES_CID}/images/`;
const CORRECT_PATH = `ipfs://${IMAGES_CID}/`;

console.log('🔧 Fixing image paths in metadata...');
console.log(`Wrong: ${WRONG_PATH}`);
console.log(`Correct: ${CORRECT_PATH}`);
console.log('');

const files = fs.readdirSync(SHUFFLED_DIR)
  .filter(f => f.endsWith('.json') && !['provenance.json','provenance-compact.json','UPLOAD_INFO.json','update-verification.json','FINAL_UPLOAD_INFO.json'].includes(f))
  .sort((a, b) => {
    const numA = parseInt(a), numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

let fixed = 0;
let errors = 0;

for (const file of files) {
  const filePath = path.join(SHUFFLED_DIR, file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = JSON.parse(content);
    
    if (!metadata.image) continue;
    
    if (metadata.image.includes('/images/')) {
      metadata.image = metadata.image.replace('/images/', '/');
      
      // Verify the new path
      if (!metadata.image.startsWith(CORRECT_PATH)) {
        console.log(`❌ ${file}: Fixed path doesn't start with correct prefix: ${metadata.image}`);
        errors++;
        continue;
      }
      
      fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
      fixed++;
    } else if (metadata.image.startsWith(`ipfs://${IMAGES_CID}/`)) {
      // Already correct (no /images/ prefix)
      fixed++;
    } else {
      console.log(`⚠️ ${file}: Unexpected image path: ${metadata.image}`);
      errors++;
    }
  } catch(e) {
    console.log(`❌ ${file}: ${e.message}`);
    errors++;
  }
}

console.log(`Fixed: ${fixed} files`);
console.log(`Errors: ${errors}`);
console.log('');

if (errors === 0) {
  console.log('✅ All image paths fixed!');
  console.log('');
  console.log('New format: ipfs://CID/95.png (no /images/ prefix)');
  
  // Show samples
  const sample1 = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, '1.json'), 'utf-8'));
  const sample50 = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, '50.json'), 'utf-8'));
  const sampleUnrevealed = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, 'unrevealed.json'), 'utf-8'));
  
  console.log('');
  console.log('Sample verification:');
  console.log('  1.json image:', sample1.image);
  console.log('  50.json image:', sample50.image);
  console.log('  unrevealed.json image:', sampleUnrevealed.image);
} else {
  console.log('❌ Some errors occurred!');
}
