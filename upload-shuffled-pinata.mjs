import { PinataSDK } from 'pinata';
import * as fs from 'fs';
import * as path from 'path';

const pinata = new PinataSDK({
  pinataJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkY2VjNzcxYy0wODI0LTRhNjgtYTlkYi04YmQ2MTRhNWVkNzgiLCJpYXQiOjE3NDc5NjUyMjUsImV4cCI6MTc3OTUwMTMyNX0.4srJJMhSb-LHb1JIbGfdqmXNN1aVW0hk0J3MWgNMJkU',
  pinataGateway: 'green-obvious-fly-685.mypinata.cloud',
});

async function upload() {
  const folderPath = path.join(process.cwd(), 'metadata-shuffled');
  console.log('📤 Uploading shuffled metadata to Pinata...');
  
  try {
    // Try the upload.file method for individual files, or upload.folder
    console.log('Available methods:', Object.keys(pinata.upload));
    console.log('Available public methods:', Object.keys(pinata.upload.public || {}));
  } catch(e) {
    console.log('Error checking methods:', e.message);
  }

  try {
    // Create a File array for the upload
    const files = [];
    const dirFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));
    
    for (const file of dirFiles) {
      const content = fs.readFileSync(path.join(folderPath, file));
      files.push(new File([content], file, { type: 'application/json' }));
    }
    
    console.log(`Uploading ${files.length} files...`);
    
    const result = await pinata.upload.fileArray(files, {
      metadata: {
        name: 'doomhound-metadata-shuffled',
      }
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.log('fileArray failed:', e.message);
    
    // Try alternative: upload individual files
    try {
      console.log('Trying single file upload...');
      const testFile = fs.readFileSync(path.join(folderPath, '1.json'));
      const file = new File([testFile], '1.json', { type: 'application/json' });
      const result = await pinata.upload.file(file);
      console.log('Single file result:', JSON.stringify(result, null, 2));
    } catch(e2) {
      console.log('Single file also failed:', e2.message);
    }
  }
}

upload();
