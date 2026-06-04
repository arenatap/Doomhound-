import { create } from 'kubo-rpc-client';
import * as fs from 'fs';
import * as path from 'path';

async function uploadToIPFS() {
  console.log('📤 Trying to upload to IPFS via public gateway...');
  
  const nodes = [
    'https://ipfs.infura.io:5001',
    'https://ipfs.eth.aragon.network',
  ];
  
  for (const node of nodes) {
    try {
      console.log(`Trying ${node}...`);
      const ipfs = create({ url: node });
      const id = await ipfs.id();
      console.log(`Connected! Node ID: ${id.id}`);
      
      // Upload files
      const inputDir = '/home/z/my-project/metadata-shuffled';
      const dirEntries = fs.readdirSync(inputDir).filter(f => f.endsWith('.json')).sort();
      
      for (const file of dirEntries) {
        const content = fs.readFileSync(path.join(inputDir, file));
        const result = await ipfs.add({ path: file, content });
        console.log(`Added: ${result.path} → ${result.cid}`);
      }
      
      break;
    } catch(e) {
      console.log(`Failed: ${e.message?.substring(0, 100)}`);
    }
  }
}

uploadToIPFS();
