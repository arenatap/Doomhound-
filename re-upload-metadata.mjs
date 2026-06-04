import { PinataSDK } from 'pinata';
import * as fs from 'fs';
import * as path from 'path';

const pinata = new PinataSDK({
  pinataJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyNTQyNGVjZi1jMmJmLTRjMmMtYThkMy1kYWU3OTU1MGU1MGQiLCJlbWFpbCI6ImludmVzdGltZW50bzIwMjJAcHJvdG9ubWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMWUyMzExMmUwODBkNDkwMTFhYzUiLCJzY29wZWRLZXlTZWNyZXQiOiI3M2JmZTc2NmJlOWI2ZTkzYTc2OGVhMWQ1OGYzZDIxNDc5MDBjM2JhNjRmNzcyMjVmYjhmMWU0Y2NmNDQ3NzE1IiwiZXhwIjoxODExMjg3MTM1fQ.o4lEcwfKtCif7j9LF29JWMbhmDTFyTk7IU1fZcL6WVs',
  pinataGateway: 'gateway.pinata.cloud',
});

async function upload() {
  console.log('📤 Re-uploading fixed metadata to Pinata...');
  
  const metadataDir = '/home/z/my-project/metadata-shuffled';
  const fileArray = [];
  
  const files = fs.readdirSync(metadataDir)
    .filter(f => f.endsWith('.json') && !['provenance.json','provenance-compact.json','UPLOAD_INFO.json','update-verification.json','FINAL_UPLOAD_INFO.json'].includes(f))
    .sort((a, b) => {
      const numA = parseInt(a), numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  
  console.log(`Uploading ${files.length} metadata files...`);
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(metadataDir, file));
    fileArray.push(new File([content], file, { type: 'application/json' }));
  }
  
  const result = await pinata.upload.public.fileArray(fileArray, {
    metadata: { name: 'doomhound-nft-metadata-v2' }
  });
  
  console.log('');
  console.log('✅ Upload successful!');
  console.log('New CID:', result.cid);
  console.log('');
  console.log('New baseURI: ipfs://' + result.cid + '/');
  
  // Save
  fs.writeFileSync('/home/z/my-project/metadata-shuffled/FINAL_UPLOAD_V2.json', 
    JSON.stringify({
      metadataCid: result.cid,
      baseURI: `ipfs://${result.cid}/`,
      uploadedAt: new Date().toISOString(),
    }, null, 2)
  );
  
  return result.cid;
}

upload();
