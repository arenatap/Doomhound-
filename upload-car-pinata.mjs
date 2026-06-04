import * as fs from 'fs';
import { execSync } from 'child_process';

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkY2VjNzcxYy0wODI0LTRhNjgtYTlkYi04YmQ2MTRhNWVkNzgiLCJpYXQiOjE3NDc5NjUyMjUsImV4cCI6MTc3OTUwMTMyNX0.4srJJMhSb-LHb1JIbGfdqmXNN1aVW0hk0J3MWgNMJkU';

// Try uploading the CAR file to Pinata
console.log('📤 Uploading CAR file to Pinata...');

try {
  const result = execSync(
    `curl -s -X POST "https://api.pinata.cloud/pinning/pinCARToIPFS" ` +
    `-H "Authorization: Bearer ${JWT}" ` +
    `-H "Content-Type: application/vnd.ipfs.car" ` +
    `--data-binary @/home/z/my-project/metadata-shuffled.car`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
  
  console.log('Pinata CAR response:', result);
} catch(e) {
  console.log('CAR upload failed:', e.message?.substring(0, 200));
  if (e.stdout) console.log('stdout:', e.stdout.toString().substring(0, 500));
}

// Also try the regular pinFileToIPFS with individual files using form data
console.log('');
console.log('Trying individual file upload approach...');

try {
  // Create a simple test with just 1 file
  const result = execSync(
    `curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" ` +
    `-H "Authorization: Bearer ${JWT}" ` +
    `-F "file=@/home/z/my-project/metadata-shuffled/1.json;filename=1.json" ` +
    `-F "pinataMetadata={\\"name\\":\\"doomhound-test\\"}"`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
  
  console.log('Single file response:', result);
} catch(e) {
  console.log('Single file failed:', e.message?.substring(0, 200));
}
