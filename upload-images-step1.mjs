import { PinataSDK } from 'pinata';
import * as fs from 'fs';
import * as path from 'path';

const pinata = new PinataSDK({
  pinataJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyNTQyNGVjZi1jMmJmLTRjMmMtYThkMy1kYWU3OTU1MGU1MGQiLCJlbWFpbCI6ImludmVzdGltZW50bzIwMjJAcHJvdG9ubWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMWUyMzExMmUwODBkNDkwMTFhYzUiLCJzY29wZWRLZXlTZWNyZXQiOiI3M2JmZTc2NmJlOWI2ZTkzYTc2OGVhMWQ1OGYzZDIxNDc5MDBjM2JhNjRmNzcyMjVmYjhmMWU0Y2NmNDQ3NzE1IiwiZXhwIjoxODExMjg3MTM1fQ.o4lEcwfKtCif7j9LF29JWMbhmDTFyTk7IU1fZcL6WVs',
  pinataGateway: 'gateway.pinata.cloud',
});

async function uploadImages() {
  console.log('📤 STEP 1: Uploading images to new Pinata account...');
  console.log('');
  
  const imagesDir = '/home/z/my-project/ipfs-upload/images';
  const files = [];
  
  // Get all PNG files sorted numerically
  const imageFiles = fs.readdirSync(imagesDir)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a), numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  
  console.log(`Found ${imageFiles.length} image files`);
  
  for (const file of imageFiles) {
    const content = fs.readFileSync(path.join(imagesDir, file));
    files.push(new File([content], file, { type: 'image/png' }));
  }
  
  console.log(`Uploading ${files.length} images as IPFS directory...`);
  
  try {
    const result = await pinata.upload.public.fileArray(files, {
      metadata: { 
        name: 'doomhound-nft-images',
        keyValues: { type: 'nft-images', collection: 'hounds-of-the-hell' }
      }
    });
    
    console.log('');
    console.log('✅ Images uploaded successfully!');
    console.log('CID:', result.cid);
    console.log('Number of files:', result.number_of_files);
    console.log('MIME type:', result.mime_type);
    console.log('');
    console.log('Image base path: ipfs://' + result.cid + '/images/');
    console.log('Example: ipfs://' + result.cid + '/images/1.png');
    
    // Save info
    fs.writeFileSync('/home/z/my-project/ipfs-upload/IMAGES_UPLOAD_INFO.json', 
      JSON.stringify({
        cid: result.cid,
        imageBasePath: `ipfs://${result.cid}/images/`,
        uploadedAt: new Date().toISOString(),
        numberOfFiles: result.number_of_files,
      }, null, 2)
    );
    
    console.log('');
    console.log('Info saved to /home/z/my-project/ipfs-upload/IMAGES_UPLOAD_INFO.json');
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
}

uploadImages();
