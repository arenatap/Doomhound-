import { fetch } from 'undici';

const CID = 'bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje';
const GW = 'https://gateway.pinata.cloud/ipfs';

async function verify() {
  console.log('🔍 STEP 2: Verifying ALL images are accessible...');
  console.log('');
  
  let success = 0;
  let failed = 0;
  const errors = [];
  
  // Test all 100 numbered images + unrevealed
  const testFiles = [];
  for (let i = 1; i <= 100; i++) testFiles.push(`${i}.png`);
  testFiles.push('unrevealed.png');
  
  for (const file of testFiles) {
    try {
      const resp = await fetch(`${GW}/${CID}/${file}`, { method: 'HEAD' });
      if (resp.ok) {
        success++;
      } else {
        failed++;
        errors.push(`${file}: HTTP ${resp.status}`);
      }
    } catch(e) {
      failed++;
      errors.push(`${file}: ${e.message}`);
    }
  }
  
  console.log(`Results: ${success} OK, ${failed} FAILED out of ${testFiles.length} files`);
  
  if (errors.length > 0) {
    console.log('');
    console.log('❌ Errors:');
    errors.forEach(e => console.log(`  ${e}`));
  }
  
  if (failed === 0) {
    console.log('');
    console.log('✅ ALL 101 images verified successfully!');
    console.log(`   Image path format: ipfs://${CID}/{number}.png`);
    console.log(`   Unrevealed: ipfs://${CID}/unrevealed.png`);
  }
  
  return failed === 0;
}

verify();
