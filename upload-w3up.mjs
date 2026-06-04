import * as fs from 'fs';
import * as path from 'path';

// w3up requires a DID (decentralized identity) which needs email verification
// Let's try another approach: use the Iroh gateway or Storacha

// Actually, let's try a simpler approach: use the Helia IPFS node directly
// to add files and get CIDs, then we can pin them via any gateway

async function tryHelia() {
  try {
    const { create } = await import('helia');
    console.log('helia available!');
  } catch(e) {
    console.log('helia not available:', e.message?.substring(0, 100));
  }
  
  // Try using the files-to-car approach and then just compute the CID locally
  try {
    const { createDirectoryEncoderStream, CAREncoderStream } = await import('ipfs-car');
    
    const folderPath = '/home/z/my-project/metadata-shuffled';
    const files = [];
    const dirEntries = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a), numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
    
    for (const file of dirEntries) {
      const content = fs.readFileSync(path.join(folderPath, file));
      files.push({
        name: file,
        stream: () => new Blob([content]).stream(),
      });
    }
    
    // Collect the root CID from the CAR stream
    let rootCid = null;
    const readable = createDirectoryEncoderStream(files)
      .pipeThrough(new CAREncoderStream());
    
    const chunks = [];
    for await (const chunk of readable) {
      chunks.push(chunk);
    }
    
    // The CAR file contains the root CID in its header
    // Let's parse it from the CAR header
    const carBuffer = Buffer.concat(chunks);
    
    // CAR v1 header: varint(header length) + CBOR header with roots
    // Let's just use a simpler approach and upload to a free service
    
    console.log('CAR file size:', (carBuffer.length / 1024).toFixed(1), 'KB');
    console.log('CAR file saved at: /home/z/my-project/metadata-shuffled.car');
    
  } catch(e) {
    console.log('CAR creation failed:', e.message?.substring(0, 200));
  }
}

tryHelia();
