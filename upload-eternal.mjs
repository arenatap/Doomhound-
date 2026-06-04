import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Try web3.storage direct upload
const W3S_API = 'https://api.web3.storage/upload';

// Try using the Storacha (formerly web3.storage) HTTP API
// This is the newer API that doesn't require email verification

async function tryStoracha() {
  console.log('Trying Storacha/web3.storage...');
  
  // Actually, let's try a completely different approach.
  // We can use the IPFS HTTP client with a free Infura IPFS endpoint
  // or use the Pinata dedicated gateway with the new JWT to test
  
  // Let me try the Pinata API with proper v2 JWT format
  // The JWT you gave me is for the NEW Pinata API (v3/v2)
  // The old pinFileToIPFS endpoint might need a different JWT format
  
  // Let's try: https://api.pinata.cloud/psa (Pinning Service API)
  console.log('Trying Pinata PSA endpoint...');
  
  const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiMzU5MGRhNC1kNjc2LTQ0ZjAtOGEzNS04MDI1NzJmNGE4OTYiLCJlbWFpbCI6Imd0b2Zmb2xpOTBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjA2YmI2NzEyODNjMDc3YzI2ZGQ5Iiwic2NvcGVkS2V5U2VjcmV0IjoiODY3YmEzZDRhOWZhNzU2NmNlYWRiOTI1MzI1MzUzZjQ4NDk2ODA1ZGIzMWE2OGQ3MmI5N2E0OTc1MjkxYjI5ZSIsImV4cCI6MTgxMTI1NzA1OH0.oc1Q--u2HnN6duF3dJFw94-XOy2zicUztXuEv_aVhRE';

  // Try Pinata's new API endpoints
  const endpoints = [
    { url: 'https://api.pinata.cloud/v3/files', method: 'GET' },
    { url: 'https://api.pinata.cloud/v3/auth/content/add', method: 'GET' },
  ];
  
  for (const ep of endpoints) {
    try {
      const result = execSync(
        `curl -s -X ${ep.method} "${ep.url}" ` +
        `-H "Authorization: Bearer ${PINATA_JWT}"`,
        { maxBuffer: 5 * 1024 * 1024 }
      ).toString();
      console.log(`${ep.url}:`, result.substring(0, 300));
    } catch(e) {
      console.log(`${ep.url}:`, e.stderr?.toString().substring(0, 100) || 'failed');
    }
  }
}

tryStoracha();
