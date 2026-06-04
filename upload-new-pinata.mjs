import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyNTQyNGVjZi1jMmJmLTRjMmMtYThkMy1kYWU3OTU1MGU1MGQiLCJlbWFpbCI6ImludmVzdGltZW50bzIwMjJAcHJvdG9ubWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMWUyMzExMmUwODBkNDkwMTFhYzUiLCJzY29wZWRLZXlTZWNyZXQiOiI3M2JmZTc2NmJlOWI2ZTkzYTc2OGVhMWQ1OGYzZDIxNDc5MDBjM2JhNjRmNzcyMjVmYjhmMWU0Y2NmNDQ3NzE1IiwiZXhwIjoxODExMjg3MTM1fQ.o4lEcwfKtCif7j9LF29JWMbhmDTFyTk7IU1fZcL6WVs';

console.log('📤 Uploading shuffled metadata to new Pinata account...');

// Test single file first
try {
  const testResult = execSync(
    `curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" ` +
    `-H "Authorization: Bearer ${PINATA_JWT}" ` +
    `-F "file=@/home/z/my-project/metadata-shuffled/1.json" ` +
    `-F 'pinataMetadata={"name":"doomhound-test"}'`,
    { maxBuffer: 5 * 1024 * 1024 }
  ).toString();
  console.log('Test upload:', testResult);
} catch(e) {
  console.log('Test failed:', e.stderr?.toString()?.substring(0, 300) || e.message);
}

// If test works, upload all files as folder
console.log('');
console.log('Uploading full folder...');

const FormData = (await import('undici')).FormData;
const { fetch } = await import('undici');

const formData = new FormData();
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

formData.append('pinataMetadata', JSON.stringify({
  name: 'doomhound-metadata-shuffled',
  keyValues: { type: 'metadata-shuffled', collection: 'hounds-of-the-hell' }
}));

try {
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
    body: formData,
  });
  
  const result = await response.json();
  
  if (result.IpfsHash) {
    console.log('');
    console.log('✅ UPLOAD SUCCESSFUL!');
    console.log('CID:', result.IpfsHash);
    console.log('');
    console.log('New baseURI for contract:');
    console.log(`ipfs://${result.IpfsHash}/metadata-shuffled/`);
    
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
  console.error('❌ Folder upload failed:', error.message);
}
