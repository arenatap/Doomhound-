import * as fs from 'fs';
import * as path from 'path';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyNTQyNGVjZi1jMmJmLTRjMmMtYThkMy1kYWU3OTU1MGU1MGQiLCJlbWFpbCI6ImludmVzdGltZW50bzIwMjJAcHJvdG9ubWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMWUyMzExMmUwODBkNDkwMTFhYzUiLCJzY29wZWRLZXlTZWNyZXQiOiI3M2JmZTc2NmJlOWI2ZTkzYTc2OGVhMWQ1OGYzZDIxNDc5MDBjM2JhNjRmNzcyMjVmYjhmMWU0Y2NmNDQ3NzE1IiwiZXhwIjoxODExMjg3MTM1fQ.o4lEcwfKtCif7j9LF29JWMbhmDTFyTk7IU1fZcL6WVs';

const FormData = (await import('undici')).FormData;
const { fetch } = await import('undici');

// The contract expects: baseURI + tokenId + ".json"
// So if baseURI = "ipfs://CID/", it will look for ipfs://CID/1.json, ipfs://CID/2.json, etc.
// 
// We need to upload all files into a single directory on IPFS.
// Pinata's folder upload creates the structure based on the filename path.
// The key is to NOT include a subdirectory prefix.

// Create a clean directory with just the numbered files
const folderPath = '/home/z/my-project/metadata-shuffled';

const formData = new FormData();

// Get only numbered JSON files (1.json to 100.json), plus unrevealed.json
const files = fs.readdirSync(folderPath)
  .filter(f => f.endsWith('.json') && f !== 'provenance.json' && f !== 'provenance-compact.json' && f !== 'UPLOAD_INFO.json')
  .sort((a, b) => {
    const numA = parseInt(a), numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

console.log(`Uploading ${files.length} files...`);

for (const file of files) {
  const content = fs.readFileSync(path.join(folderPath, file));
  // Use just the filename without any directory prefix
  // This creates a flat directory structure on IPFS
  formData.append('file', new Blob([content], { type: 'application/json' }), {
    filename: file,
    type: 'application/json',
  });
}

formData.append('pinataMetadata', JSON.stringify({
  name: 'doomhound-nft-metadata',
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
    console.log('CID:', result.IpfsHash);
    console.log('');
    console.log('New baseURI for contract:');
    console.log(`ipfs://${result.IpfsHash}/`);
    console.log('');
    console.log('Token URI for token #1:');
    console.log(`ipfs://${result.IpfsHash}/1.json`);
    
    // Save upload info
    fs.writeFileSync('/home/z/my-project/metadata-shuffled/UPLOAD_INFO.json', 
      JSON.stringify({
        cid: result.IpfsHash,
        baseURI: `ipfs://${result.IpfsHash}/`,
        uploadedAt: new Date().toISOString(),
        provenanceHash: '15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0',
        contractFunction: 'setBaseURI',
        contractParam: `ipfs://${result.IpfsHash}/`,
      }, null, 2)
    );
    
    // Verify the upload
    console.log('');
    console.log('Verifying...');
    const verifyResp = await fetch(`https://ipfs.io/ipfs/${result.IpfsHash}/1.json`);
    if (verifyResp.ok) {
      const data = await verifyResp.json();
      console.log('✅ Token #1 verified:', data.name, '→', data.attributes.find(a => a.trait_type === 'Rarity')?.value);
    } else {
      console.log('⚠️ Gateway slow, trying pinata gateway...');
      const gwResp = await fetch(`https://gateway.pinata.cloud/ipfs/${result.IpfsHash}/1.json`);
      if (gwResp.ok) {
        const data = await gwResp.json();
        console.log('✅ Token #1 verified via Pinata gateway:', data.name, '→', data.attributes.find(a => a.trait_type === 'Rarity')?.value);
      }
    }
    
  } else {
    console.log('❌ Unexpected response:', JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error('❌ Upload failed:', error.message);
}
