import { PinataSDK } from 'pinata';
import * as fs from 'fs';
import * as path from 'path';

const pinata = new PinataSDK({
  pinataJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyNTQyNGVjZi1jMmJmLTRjMmMtYThkMy1kYWU3OTU1MGU1MGQiLCJlbWFpbCI6ImludmVzdGltZW50bzIwMjJAcHJvdG9ubWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMWUyMzExMmUwODBkNDkwMTFhYzUiLCJzY29wZWRLZXlTZWNyZXQiOiI3M2JmZTc2NmJlOWI2ZTkzYTc2OGVhMWQ1OGYzZDIxNDc5MDBjM2JhNjRmNzcyMjVmYjhmMWU0Y2NmNDQ3NzE1IiwiZXhwIjoxODExMjg3MTM1fQ.o4lEcwfKtCif7j9LF29JWMbhmDTFyTk7IU1fZcL6WVs',
  pinataGateway: 'gateway.pinata.cloud',
});

async function uploadMetadata() {
  console.log('📤 STEP 5: Uploading updated shuffled metadata to Pinata...');
  console.log('');
  
  const metadataDir = '/home/z/my-project/metadata-shuffled';
  const fileArray = [];
  
  // Only upload numbered metadata + unrevealed.json (NOT provenance files)
  const files = fs.readdirSync(metadataDir)
    .filter(f => f.endsWith('.json') && f !== 'provenance.json' && f !== 'provenance-compact.json' && f !== 'UPLOAD_INFO.json' && f !== 'update-verification.json')
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
  
  try {
    const result = await pinata.upload.public.fileArray(fileArray, {
      metadata: { 
        name: 'doomhound-nft-metadata-final',
        keyValues: { type: 'nft-metadata-shuffled', collection: 'hounds-of-the-hell' }
      }
    });
    
    console.log('');
    console.log('✅ Metadata uploaded successfully!');
    console.log('CID:', result.cid);
    console.log('Number of files:', result.number_of_files);
    console.log('MIME type:', result.mime_type);
    console.log('');
    console.log('🔑 CONTRACT BASE URI:');
    console.log(`ipfs://${result.cid}/metadata/`);
    console.log('');
    console.log('Token #1 URI:');
    console.log(`ipfs://${result.cid}/metadata/1.json`);
    console.log('');
    console.log('Unrevealed URI:');
    console.log(`ipfs://${result.cid}/metadata/unrevealed.json`);
    
    // Save final upload info
    fs.writeFileSync('/home/z/my-project/metadata-shuffled/FINAL_UPLOAD_INFO.json', 
      JSON.stringify({
        metadataCid: result.cid,
        imagesCid: 'bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje',
        baseURI: `ipfs://${result.cid}/metadata/`,
        unrevealedURI: `ipfs://${result.cid}/metadata/unrevealed.json`,
        provenanceHash: '15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0',
        contractAddress: '0xfd269a2e7067d775d21fb8d2efd7301246c939fd',
        contractFunction: 'setBaseURI',
        contractParam: `ipfs://${result.cid}/metadata/`,
        uploadedAt: new Date().toISOString(),
      }, null, 2)
    );
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
}

uploadMetadata();
