import * as fs from 'fs';
import * as path from 'path';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiMzU5MGRhNC1kNjc2LTQ0ZjAtOGEzNS04MDI1NzJmNGE4OTYiLCJlbWFpbCI6Imd0b2Zmb2xpOTBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjA2YmI2NzEyODNjMDc3YzI2ZGQ5Iiwic2NvcGVkS2V5U2VjcmV0IjoiODY3YmEzZDRhOWZhNzU2NmNlYWRiOTI1MzI1MzUzZjQ4NDk2ODA1ZGIzMWE2OGQ3MmI5N2E0OTc1MjkxYjI5ZSIsImV4cCI6MTgxMTI1NzA1OH0.oc1Q--u2HnN6duF3dJFw94-XOy2zicUztXuEv_aVhRE';
const PINATA_API = 'https://api.pinata.cloud';

async function uploadFolder() {
  const folderPath = '/home/z/my-project/metadata-shuffled';
  console.log('📤 Uploading shuffled metadata to Pinata...');
  
  const { fetch } = await import('undici');
  const FormData = (await import('undici')).FormData;
  
  const formData = new FormData();
  
  // Add all JSON files with folder path prefix
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
  
  formData.append('pinataMetadata', JSON.stringify({
    name: 'doomhound-metadata-shuffled',
    keyValues: { type: 'metadata-shuffled', collection: 'hounds-of-the-hell' }
  }));
  
  try {
    const response = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
      body: formData,
    });
    
    const result = await response.json();
    
    if (result.IpfsHash) {
      console.log('');
      console.log('✅ Upload successful!');
      console.log('CID:', result.IpfsHash);
      console.log('');
      console.log('New baseURI for contract:');
      console.log(`ipfs://${result.IpfsHash}/`);
      console.log('');
      console.log('Token URI example:');
      console.log(`ipfs://${result.IpfsHash}/metadata-shuffled/1.json`);
      
      // Save upload info
      fs.writeFileSync('/home/z/my-project/metadata-shuffled/UPLOAD_INFO.json', 
        JSON.stringify({
          cid: result.IpfsHash,
          baseURI: `ipfs://${result.IpfsHash}/metadata-shuffled/`,
          uploadedAt: new Date().toISOString(),
          provenanceHash: '15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0',
        }, null, 2)
      );
    } else {
      console.log('❌ Unexpected response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
}

uploadFolder();
