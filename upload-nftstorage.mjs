import { NFTStorage, Blob, File } from 'nft.storage';
import * as fs from 'fs';
import * as path from 'path';

// nft.storage requires an API key. Let's try using web3.storage instead
// or try the Pinata dedicated gateway upload

// Actually, let's try uploading via Pinata's v3 API (newer endpoint)
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiMzU5MGRhNC1kNjc2LTQ0ZjAtOGEzNS04MDI1NzJmNGE4OTYiLCJlbWFpbCI6Imd0b2Zmb2xpOTBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjA2YmI2NzEyODNjMDc3YzI2ZGQ5Iiwic2NvcGVkS2V5U2VjcmV0IjoiODY3YmEzZDRhOWZhNzU2NmNlYWRiOTI1MzI1MzUzZjQ4NDk2ODA1ZGIzMWE2OGQ3MmI5N2E0OTc1MjkxYjI5ZSIsImV4cCI6MTgxMTI1NzA1OH0.oc1Q--u2HnN6duF3dJFw94-XOy2zicUztXuEv_aVhRE';

async function uploadToPinataV3() {
  const { fetch } = await import('undici');
  
  console.log('📤 Trying Pinata API v3...');
  
  // Try the /v3/files endpoint (newer Pinata API)
  const formData = new (await import('undici')).FormData();
  
  const folderPath = '/home/z/my-project/metadata-shuffled';
  const files = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => {
      const numA = parseInt(a), numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(folderPath, file));
    formData.append('file', new Blob([content], { type: 'application/json' }), {
      filename: `metadata-shuffled/${file}`,
      type: 'application/json',
    });
  }
  
  try {
    // Try v3 API
    const resp = await fetch('https://api.pinata.cloud/v3/files/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
      body: formData,
    });
    const result = await resp.json();
    console.log('V3 response:', JSON.stringify(result, null, 2).substring(0, 500));
  } catch(e) {
    console.log('V3 failed:', e.message?.substring(0, 200));
  }
  
  // Also try the dedicated gateway upload
  console.log('');
  console.log('Trying dedicated gateway...');
  try {
    const resp = await fetch('https://green-obvious-fly-685.mypinata.cloud', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
    });
    console.log('Gateway status:', resp.status);
  } catch(e) {
    console.log('Gateway failed:', e.message?.substring(0, 200));
  }
}

uploadToPinataV3();
