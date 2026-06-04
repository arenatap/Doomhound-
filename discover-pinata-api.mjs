import { execSync } from 'child_process';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiMzU5MGRhNC1kNjc2LTQ0ZjAtOGEzNS04MDI1NzJmNGE4OTYiLCJlbWFpbCI6Imd0b2Zmb2xpOTBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjA2YmI2NzEyODNjMDc3YzI2ZGQ5Iiwic2NvcGVkS2V5U2VjcmV0IjoiODY3YmEzZDRhOWZhNzU2NmNlYWRiOTI1MzI1MzUzZjQ4NDk2ODA1ZGIzMWE2OGQ3MmI5N2E0OTc1MjkxYjI5ZSIsImV4cCI6MTgxMTI1NzA1OH0.oc1Q--u2HnN6duF3dJFw94-XOy2zicUztXuEv_aVhRE';

// Test various Pinata API v3 endpoints
const endpoints = [
  'https://api.pinata.cloud/v3/files',
  'https://api.pinata.cloud/v3/pin/objects',  
  'https://api.pinata.cloud/v3/content',
  'https://api.pinata.cloud/v3/auth/content',
  'https://api.pinata.cloud/pinning/pinFileToIPFS',
];

// Also try to discover the upload endpoint
console.log('Testing Pinata API endpoints...');

for (const url of endpoints) {
  try {
    const result = execSync(
      `curl -s -X GET "${url}" -H "Authorization: Bearer ${PINATA_JWT}"`,
      { maxBuffer: 2 * 1024 * 1024 }
    ).toString();
    console.log(`GET ${url}:`, result.substring(0, 200));
  } catch(e) {
    const out = e.stdout?.toString()?.substring(0, 100) || '';
    const err = e.stderr?.toString()?.substring(0, 100) || e.message?.substring(0, 100);
    console.log(`GET ${url}: ${out || err}`);
  }
  console.log('');
}

// Try POST to v3/files with different paths
const postEndpoints = [
  'https://api.pinata.cloud/v3/files/add',
  'https://api.pinata.cloud/v3/files/pin',
  'https://api.pinata.cloud/v3/content/add',
  'https://api.pinata.cloud/v3/pin/add',
];

for (const url of postEndpoints) {
  try {
    const result = execSync(
      `curl -s -X POST "${url}" ` +
      `-H "Authorization: Bearer ${PINATA_JWT}" ` +
      `-H "Content-Type: application/json" ` +
      `-d '{"test":true}'`,
      { maxBuffer: 2 * 1024 * 1024 }
    ).toString();
    console.log(`POST ${url}:`, result.substring(0, 200));
  } catch(e) {
    const out = e.stderr?.toString()?.substring(0, 100) || e.message?.substring(0, 100);
    console.log(`POST ${url}: ${out}`);
  }
  console.log('');
}
