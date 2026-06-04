// Use web3.storage / w3up as alternative IPFS upload
import * as fs from 'fs';
import * as path from 'path';

async function uploadWithW3up() {
  try {
    // Try using @web3-storage/w3up-client
    const { create } = await import('@web3-storage/w3up-client');
    console.log('w3up-client available!');
  } catch(e) {
    console.log('w3up-client not available:', e.message);
  }
  
  // Alternative: use ipfs-http-client with a public gateway
  try {
    const { create } = await import('ipfs-http-client');
    console.log('ipfs-http-client available!');
  } catch(e) {
    console.log('ipfs-http-client not available:', e.message);
  }
  
  // Alternative: use the Pinata dedicated gateway to test if it's working
  try {
    const { fetch } = await import('undici');
    const resp = await fetch('https://green-obvious-fly-685.mypinata.cloud/ipfs/bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii/metadata/1.json');
    console.log('Gateway test status:', resp.status);
    if (resp.ok) {
      const data = await resp.json();
      console.log('Gateway working! Sample metadata name:', data.name);
    }
  } catch(e) {
    console.log('Gateway test failed:', e.message);
  }
}

uploadWithW3up();
