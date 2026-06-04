import * as fs from 'fs';
import * as path from 'path';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyNTQyNGVjZi1jMmJmLTRjMmMtYThkMy1kYWU3OTU1MGU1MGQiLCJlbWFpbCI6ImludmVzdGltZW50bzIwMjJAcHJvdG9ubWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMWUyMzExMmUwODBkNDkwMTFhYzUiLCJzY29wZWRLZXlTZWNyZXQiOiI3M2JmZTc2NmJlOWI2ZTkzYTc2OGVhMWQ1OGYzZDIxNDc5MDBjM2JhNjRmNzcyMjVmYjhmMWU0Y2NmNDQ3NzE1IiwiZXhwIjoxODExMjg3MTM1fQ.o4lEcwfKtCif7j9LF29JWMbhmDTFyTk7IU1fZcL6WVs';

const FormData = (await import('undici')).FormData;
const { fetch } = await import('undici');

// The trick with Pinata folder upload is that EACH file needs a path prefix
// that creates the directory structure. All files must share the same directory name.
// The directory name becomes the wrapping directory on IPFS.

const folderPath = '/home/z/my-project/metadata-shuffled';
const formData = new FormData();

const files = fs.readdirSync(folderPath)
  .filter(f => f.endsWith('.json') && f !== 'provenance.json' && f !== 'provenance-compact.json' && f !== 'UPLOAD_INFO.json')
  .sort((a, b) => {
    const numA = parseInt(a), numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

console.log(`Uploading ${files.length} files as folder...`);

// Key: each file must have the SAME directory prefix
// This creates: CID/metadata/1.json, CID/metadata/2.json, etc.
// Then baseURI = ipfs://CID/metadata/

for (const file of files) {
  const content = fs.readFileSync(path.join(folderPath, file));
  formData.append('file', new Blob([content], { type: 'application/json' }), {
    filename: `metadata/${file}`,  // All files under "metadata/" directory
    type: 'application/json',
  });
}

formData.append('pinataMetadata', JSON.stringify({
  name: 'doomhound-nft-metadata-folder',
  keyValues: { type: 'nft-metadata', collection: 'hounds-of-the-hell' }
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
    console.log('Root CID:', result.IpfsHash);
    console.log('');
    console.log('New baseURI for contract:');
    console.log(`ipfs://${result.IpfsHash}/metadata/`);
    console.log('');
    console.log('Token URI for token #1:');
    console.log(`ipfs://${result.IpfsHash}/metadata/1.json`);
    
    // Save upload info
    fs.writeFileSync('/home/z/my-project/metadata-shuffled/UPLOAD_INFO.json', 
      JSON.stringify({
        cid: result.IpfsHash,
        baseURI: `ipfs://${result.IpfsHash}/metadata/`,
        uploadedAt: new Date().toISOString(),
        provenanceHash: '15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0',
        contractFunction: 'setBaseURI',
        contractParam: `ipfs://${result.IpfsHash}/metadata/`,
      }, null, 2)
    );
    
    // Verify
    console.log('');
    console.log('Waiting 10 seconds for IPFS propagation...');
    await new Promise(r => setTimeout(r, 10000));
    
    const verifyResp = await fetch(`https://gateway.pinata.cloud/ipfs/${result.IpfsHash}/metadata/1.json`);
    if (verifyResp.ok) {
      const data = await verifyResp.json();
      const rarity = data.attributes?.find(a => a.trait_type === 'Rarity')?.value;
      console.log(`✅ Token #1 verified: ${data.name} → Rarity: ${rarity}`);
    } else {
      const text = await verifyResp.text();
      console.log(`⚠️ Verification pending: ${verifyResp.status} - ${text.substring(0, 100)}`);
      console.log('This is normal - IPFS propagation can take a few minutes.');
      console.log(`Verify manually: https://gateway.pinata.cloud/ipfs/${result.IpfsHash}/metadata/1.json`);
    }
    
  } else {
    console.log('❌ Unexpected response:', JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error('❌ Upload failed:', error.message);
}
