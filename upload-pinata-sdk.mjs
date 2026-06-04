import { PinataSDK } from 'pinata';
import * as fs from 'fs';
import * as path from 'path';

const pinata = new PinataSDK({
  pinataJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyNTQyNGVjZi1jMmJmLTRjMmMtYThkMy1kYWU3OTU1MGU1MGQiLCJlbWFpbCI6ImludmVzdGltZW50bzIwMjJAcHJvdG9ubWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMWUyMzExMmUwODBkNDkwMTFhYzUiLCJzY29wZWRLZXlTZWNyZXQiOiI3M2JmZTc2NmJlOWI2ZTkzYTc2OGVhMWQ1OGYzZDIxNDc5MDBjM2JhNjRmNzcyMjVmYjhmMWU0Y2NmNDQ3NzE1IiwiZXhwIjoxODExMjg3MTM1fQ.o4lEcwfKtCif7j9LF29JWMbhmDTFyTk7IU1fZcL6WVs',
  pinataGateway: 'gateway.pinata.cloud',
});

async function uploadFolder() {
  console.log('📤 Uploading via Pinata SDK...');
  
  // Check what methods are available
  console.log('Upload methods:', Object.keys(pinata.upload));
  console.log('Upload.public methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(pinata.upload.public)));
  console.log('Upload.private methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(pinata.upload.private)));
  
  // Try the public upload
  try {
    const folderPath = '/home/z/my-project/metadata-shuffled';
    
    // The SDK expects a File[] array
    const fileArray = [];
    const files = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.json') && f !== 'provenance.json' && f !== 'provenance-compact.json' && f !== 'UPLOAD_INFO.json')
      .sort((a, b) => {
        const numA = parseInt(a), numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(folderPath, file));
      fileArray.push(new File([content], file, { type: 'application/json' }));
    }
    
    console.log(`Uploading ${fileArray.length} files...`);
    
    const result = await pinata.upload.public.fileArray(fileArray, {
      metadata: { name: 'doomhound-nft-metadata' }
    });
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    
  } catch(e) {
    console.log('fileArray failed:', e.message?.substring(0, 300));
    
    // Try creating individual files
    try {
      const testContent = fs.readFileSync('/home/z/my-project/metadata-shuffled/1.json');
      const file = new File([testContent], '1.json', { type: 'application/json' });
      const result = await pinata.upload.public.file(file);
      console.log('Single file result:', JSON.stringify(result, null, 2));
    } catch(e2) {
      console.log('Single file failed:', e2.message?.substring(0, 300));
    }
  }
}

uploadFolder();
