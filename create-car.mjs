import { createDirectoryEncoderStream, CAREncoderStream } from 'ipfs-car';
import * as fs from 'fs';
import * as path from 'path';

async function createCar() {
  const inputDir = '/home/z/my-project/metadata-shuffled';
  const outputCar = '/home/z/my-project/metadata-shuffled.car';
  
  console.log('📦 Creating CAR file from shuffled metadata...');
  
  // FileLike needs: name (string) and stream() => ReadableStream
  const files = [];
  const dirEntries = fs.readdirSync(inputDir).filter(f => f.endsWith('.json')).sort((a, b) => {
    const numA = parseInt(a), numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
  
  for (const file of dirEntries) {
    const content = fs.readFileSync(path.join(inputDir, file));
    files.push({
      name: file,
      stream: () => new Blob([content]).stream(),
    });
  }
  
  console.log(`Found ${files.length} files`);
  
  try {
    const readable = createDirectoryEncoderStream(files)
      .pipeThrough(new CAREncoderStream());
    
    const chunks = [];
    for await (const chunk of readable) {
      chunks.push(chunk);
    }
    
    const carData = Buffer.concat(chunks);
    fs.writeFileSync(outputCar, carData);
    
    console.log('✅ CAR file created!');
    console.log('CAR file:', outputCar);
    console.log('File size:', (carData.length / 1024).toFixed(1), 'KB');
    
  } catch (error) {
    console.error('❌ CAR creation failed:', error.message);
    console.error(error.stack);
  }
}

createCar();
