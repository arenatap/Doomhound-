import { execSync } from 'child_process';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiMzU5MGRhNC1kNjc2LTQ0ZjAtOGEzNS04MDI1NzJmNGE4OTYiLCJlbWFpbCI6Imd0b2Zmb2xpOTBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjA2YmI2NzEyODNjMDc3YzI2ZGQ5Iiwic2NvcGVkS2V5U2VjcmV0IjoiODY3YmEzZDRhOWZhNzU2NmNlYWRiOTI1MzI1MzUzZjQ4NDk2ODA1ZGIzMWE2OGQ3MmI5N2E0OTc1MjkxYjI5ZSIsImV4cCI6MTgxMTI1NzA1OH0.oc1Q--u2HnN6duF3dJFw94-XOy2zicUztXuEv_aVhRE';

// The v3 API seems to use a different upload mechanism
// Based on Pinata docs, the new API uses:
// POST /v3/files/upload for single file
// POST /v3/files/uploadfolder for folder upload
// Let's try these

console.log('Testing Pinata V3 upload endpoints...');

// Single file upload
try {
  const result = execSync(
    `curl -sv -X POST "https://api.pinata.cloud/v3/files/upload" ` +
    `-H "Authorization: Bearer ${PINATA_JWT}" ` +
    `-F "file=@/home/z/my-project/metadata-shuffled/1.json" ` +
    `-F "network=public" ` +
    `2>&1 | tail -30`,
    { maxBuffer: 5 * 1024 * 1024 }
  ).toString();
  console.log('upload result:', result);
} catch(e) {
  console.log('upload error:', e.stderr?.toString()?.substring(0, 300) || e.message);
}

// Try with different content types
try {
  const result = execSync(
    `curl -sv -X POST "https://api.pinata.cloud/v3/files/upload" ` +
    `-H "Authorization: Bearer ${PINATA_JWT}" ` +
    `-H "Content-Type: multipart/form-data" ` +
    `-F "file=@/home/z/my-project/metadata-shuffled/1.json;type=application/json" ` +
    `2>&1 | tail -30`,
    { maxBuffer: 5 * 1024 * 1024 }
  ).toString();
  console.log('upload2 result:', result);
} catch(e) {
  console.log('upload2 error:', e.stderr?.toString()?.substring(0, 300) || e.message);
}

// Try the scoped API key with the old endpoint (different auth)
const API_KEY = '06bb671283c077c26dd9';
const API_SECRET = '867ba3d4a9fa7566ceadb925325353f48496805db31a68d72b97a4975291b29e';

console.log('');
console.log('Trying with API key + secret...');
try {
  const result = execSync(
    `curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" ` +
    `-H "pinata_api_key: ${API_KEY}" ` +
    `-H "pinata_secret_api_key: ${API_SECRET}" ` +
    `-F "file=@/home/z/my-project/metadata-shuffled/1.json" ` +
    `-F 'pinataMetadata={"name":"test-upload"}'`,
    { maxBuffer: 5 * 1024 * 1024 }
  ).toString();
  console.log('API key result:', result);
} catch(e) {
  console.log('API key error:', e.stderr?.toString()?.substring(0, 300) || e.message);
}
