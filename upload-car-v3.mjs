import * as fs from 'fs';
import { execSync } from 'child_process';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiMzU5MGRhNC1kNjc2LTQ0ZjAtOGEzNS04MDI1NzJmNGE4OTYiLCJlbWFpbCI6Imd0b2Zmb2xpOTBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjA2YmI2NzEyODNjMDc3YzI2ZGQ5Iiwic2NvcGVkS2V5U2VjcmV0IjoiODY3YmEzZDRhOWZhNzU2NmNlYWRiOTI1MzI1MzUzZjQ4NDk2ODA1ZGIzMWE2OGQ3MmI5N2E0OTc1MjkxYjI5ZSIsImV4cCI6MTgxMTI1NzA1OH0.oc1Q--u2HnN6duF3dJFw94-XOy2zicUztXuEv_aVhRE';

console.log('📤 Trying Pinata CAR upload...');

try {
  // Try uploading the CAR file directly
  const result = execSync(
    `curl -s -X POST "https://api.pinata.cloud/v3/files/upload" ` +
    `-H "Authorization: Bearer ${PINATA_JWT}" ` +
    `-F "file=@/home/z/my-project/metadata-shuffled.car;type=application/vnd.ipfs.car" ` +
    `-F 'network=public'`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
  console.log('V3 CAR response:', result.substring(0, 500));
} catch(e) {
  console.log('V3 CAR failed:', e.stderr?.toString().substring(0, 500) || e.message?.substring(0, 200));
}

console.log('');

// Also try the old API with individual file as test
console.log('Testing single file upload...');
try {
  const result = execSync(
    `curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" ` +
    `-H "Authorization: Bearer ${PINATA_JWT}" ` +
    `-F "file=@/home/z/my-project/metadata-shuffled/1.json" ` +
    `-F 'pinataMetadata={"name":"test-1"}'`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
  console.log('Single file response:', result);
} catch(e) {
  console.log('Single file failed:', e.stderr?.toString().substring(0, 500) || e.message?.substring(0, 200));
}
