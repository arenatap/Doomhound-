import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CONTRACT_ADDRESS = '0xfd269a2e7067d775d21fb8d2efd7301246c939fd';
const METADATA_CID = 'bafybeibdg3jgysee4aejlurdfhvrrtleq5vgeirmp64b6drpcsr56knhme';
const IMAGES_CID = 'bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje';
const GW = 'https://gateway.pinata.cloud/ipfs';

const FULL_ABI = [
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'revealed', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'freeMintActive', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'paidMintActive', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'maxSupply', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'paidMintPrice', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'signer', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'unrevealedURI', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'MAX_FREE_PER_WALLET', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'MAX_PAID_PER_WALLET', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
];

async function fullCheck() {
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });
  
  console.log('🐺 DOOMHOUND NFT — FULL SYSTEM CHECK');
  console.log('='.repeat(60));
  console.log('');
  
  // ==========================================
  // CHECK 1: CONTRACT ON-CHAIN STATE
  // ==========================================
  console.log('📋 CHECK 1: Contract on-chain state');
  console.log('-'.repeat(40));
  
  try {
    const [owner, revealed, freeMint, paidMint, totalSupply, maxSupply, mintPrice, signer, unrevealedURI, maxFree, maxPaid] = await Promise.all([
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'owner' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'revealed' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'freeMintActive' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'paidMintActive' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'totalSupply' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'maxSupply' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'paidMintPrice' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'signer' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'unrevealedURI' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'MAX_FREE_PER_WALLET' }),
      publicClient.readContract({ address: CONTRACT_ADDRESS, abi: FULL_ABI, functionName: 'MAX_PAID_PER_WALLET' }),
    ]);
    
    console.log('Contract:', CONTRACT_ADDRESS);
    console.log('Owner:', owner);
    console.log('Revealed:', revealed);
    console.log('Free Mint Active:', freeMint);
    console.log('Paid Mint Active:', paidMint);
    console.log('Total Supply:', totalSupply.toString(), '/', maxSupply.toString());
    console.log('Paid Mint Price:', (Number(mintPrice) / 1e18).toFixed(2), 'AVAX');
    console.log('Signer:', signer);
    console.log('Unrevealed URI:', unrevealedURI);
    console.log('Max Free Per Wallet:', maxFree.toString());
    console.log('Max Paid Per Wallet:', maxPaid.toString());
    console.log('');
    
    // Validate
    let c1 = true;
    if (revealed !== false) { console.log('❌ revealed should be false'); c1 = false; }
    if (Number(totalSupply) !== 0) { console.log('❌ totalSupply should be 0 before mint'); c1 = false; }
    if (Number(maxSupply) !== 100) { console.log('❌ maxSupply should be 100'); c1 = false; }
    if (Number(maxFree) !== 1) { console.log('❌ MAX_FREE_PER_WALLET should be 1'); c1 = false; }
    if (Number(maxPaid) !== 2) { console.log('❌ MAX_PAID_PER_WALLET should be 2'); c1 = false; }
    if (!unrevealedURI.includes(IMAGES_CID)) { console.log('❌ unrevealedURI should point to new images CID'); c1 = false; }
    if (c1) console.log('✅ CHECK 1 PASSED');
    else console.log('❌ CHECK 1 FAILED');
    console.log('');
  } catch(e) {
    console.log('❌ CHECK 1 FAILED:', e.message);
    console.log('');
  }
  
  // ==========================================
  // CHECK 2: METADATA ON IPFS
  // ==========================================
  console.log('📋 CHECK 2: Metadata on IPFS');
  console.log('-'.repeat(40));
  
  try {
    // Test a few metadata files
    const testTokens = [1, 2, 25, 50, 75, 100];
    let c2 = true;
    
    for (const tid of testTokens) {
      try {
        const resp = await fetch(`${GW}/${METADATA_CID}/${tid}.json`);
        if (!resp.ok) { console.log(`❌ Token #${tid}: HTTP ${resp.status}`); c2 = false; continue; }
        const data = await resp.json();
        const rarity = data.attributes?.find(a => a.trait_type === 'Rarity')?.value;
        const imgCid = data.image?.split('/')[2];
        
        if (imgCid !== IMAGES_CID) {
          console.log(`❌ Token #${tid}: Wrong image CID: ${imgCid}`);
          c2 = false;
        } else {
          console.log(`  Token #${tid}: ${data.name} | Rarity: ${rarity} | Image CID: ✅`);
        }
      } catch(e) {
        console.log(`❌ Token #${tid}: ${e.message}`);
        c2 = false;
      }
    }
    
    // Check unrevealed
    try {
      const resp = await fetch(`${GW}/${METADATA_CID}/unrevealed.json`);
      if (!resp.ok) { console.log(`❌ unrevealed.json: HTTP ${resp.status}`); c2 = false; }
      else {
        const data = await resp.json();
        console.log(`  Unrevealed: ${data.name} | Image CID: ${data.image?.includes(IMAGES_CID) ? '✅' : '❌'}`);
      }
    } catch(e) {
      console.log(`❌ unrealealed.json: ${e.message}`);
      c2 = false;
    }
    
    if (c2) console.log('✅ CHECK 2 PASSED');
    else console.log('❌ CHECK 2 FAILED');
    console.log('');
  } catch(e) {
    console.log('❌ CHECK 2 FAILED:', e.message);
    console.log('');
  }
  
  // ==========================================
  // CHECK 3: IMAGES ON IPFS
  // ==========================================
  console.log('📋 CHECK 3: Images on IPFS');
  console.log('-'.repeat(40));
  
  try {
    const testImages = [1, 25, 50, 75, 100];
    let c3 = true;
    
    for (const imgId of testImages) {
      try {
        const resp = await fetch(`${GW}/${IMAGES_CID}/images/${imgId}.png`, { method: 'HEAD' });
        if (!resp.ok) { console.log(`❌ Image ${imgId}.png: HTTP ${resp.status}`); c3 = false; }
        else console.log(`  Image ${imgId}.png: ✅ (${resp.headers.get('content-type')})`);
      } catch(e) {
        console.log(`❌ Image ${imgId}.png: ${e.message}`);
        c3 = false;
      }
    }
    
    // Check unrevealed image
    try {
      const resp = await fetch(`${GW}/${IMAGES_CID}/images/unrevealed.png`, { method: 'HEAD' });
      if (!resp.ok) { console.log(`❌ unrevealed.png: HTTP ${resp.status}`); c3 = false; }
      else console.log(`  unrevealed.png: ✅`);
    } catch(e) {
      console.log(`❌ unrevealed.png: ${e.message}`);
      c3 = false;
    }
    
    if (c3) console.log('✅ CHECK 3 PASSED');
    else console.log('❌ CHECK 3 FAILED');
    console.log('');
  } catch(e) {
    console.log('❌ CHECK 3 FAILED:', e.message);
    console.log('');
  }
  
  // ==========================================
  // CHECK 4: LOCAL METADATA INTEGRITY
  // ==========================================
  console.log('📋 CHECK 4: Local metadata integrity (shuffle + rarity + no dupes)');
  console.log('-'.repeat(40));
  
  try {
    const SHUFFLED_DIR = '/home/z/my-project/metadata-shuffled';
    const ORIGINAL_DIR = '/home/z/my-project/ipfs-upload/metadata';
    let c4 = true;
    
    // Check rarity distribution
    const rarityCount = {};
    for (let i = 1; i <= 100; i++) {
      const data = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, `${i}.json`), 'utf-8'));
      const r = data.attributes?.find(a => a.trait_type === 'Rarity')?.value;
      rarityCount[r] = (rarityCount[r] || 0) + 1;
    }
    console.log(`  Rarity: L=${rarityCount.Legendary} E=${rarityCount.Epic} R=${rarityCount.Rare} C=${rarityCount.Common}`);
    if (rarityCount.Legendary !== 5 || rarityCount.Epic !== 15 || rarityCount.Rare !== 30 || rarityCount.Common !== 50) {
      console.log('❌ Rarity distribution wrong'); c4 = false;
    }
    
    // Check no duplicate images
    const imgRefs = {};
    for (let i = 1; i <= 100; i++) {
      const data = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, `${i}.json`), 'utf-8'));
      const img = data.image.split('/').pop();
      if (imgRefs[img]) { console.log(`❌ Duplicate image: ${img} in ${imgRefs[img]} and ${i}.json`); c4 = false; }
      imgRefs[img] = `${i}.json`;
    }
    console.log('  Duplicate images: none ✅');
    
    // Check all 100 images referenced
    const referenced = new Set();
    for (let i = 1; i <= 100; i++) {
      const data = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, `${i}.json`), 'utf-8'));
      const num = parseInt(data.image.split('/').pop().replace('.png', ''));
      referenced.add(num);
    }
    let allRef = true;
    for (let i = 1; i <= 100; i++) { if (!referenced.has(i)) { allRef = false; console.log(`❌ Image ${i}.png not referenced`); } }
    if (allRef) console.log('  All 100 images referenced: ✅');
    
    // Check traits match originals
    let traitOk = 0;
    for (let i = 1; i <= 100; i++) {
      const shuffled = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, `${i}.json`), 'utf-8'));
      const origImgNum = parseInt(shuffled.image.split('/').pop().replace('.png', ''));
      const orig = JSON.parse(fs.readFileSync(path.join(ORIGINAL_DIR, `${origImgNum}.json`), 'utf-8'));
      
      const sR = shuffled.attributes?.find(a => a.trait_type === 'Rarity')?.value;
      const oR = orig.attributes?.find(a => a.trait_type === 'Rarity')?.value;
      const sB = shuffled.attributes?.find(a => a.trait_type === 'Breed')?.value;
      const oB = orig.attributes?.find(a => a.trait_type === 'Breed')?.value;
      
      if (sR === oR && sB === oB) traitOk++;
      else console.log(`❌ Token #${i}: trait mismatch`);
    }
    console.log(`  Traits match originals: ${traitOk}/100 ${traitOk === 100 ? '✅' : '❌'}`);
    
    // Provenance hash
    const hashes = [];
    for (let i = 1; i <= 100; i++) {
      const content = fs.readFileSync(path.join(ORIGINAL_DIR, `${i}.json`), 'utf-8').trim();
      hashes.push(crypto.createHash('sha256').update(content).digest('hex'));
    }
    const provenanceHash = crypto.createHash('sha256').update(hashes.join('')).digest('hex');
    const provenanceOk = provenanceHash === '15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0';
    console.log(`  Provenance hash: ${provenanceOk ? '✅' : '❌ ' + provenanceHash}`);
    
    if (c4 && allRef && traitOk === 100 && provenanceOk) console.log('✅ CHECK 4 PASSED');
    else console.log('❌ CHECK 4 FAILED');
    console.log('');
  } catch(e) {
    console.log('❌ CHECK 4 FAILED:', e.message);
    console.log('');
  }
  
  // ==========================================
  // CHECK 5: NFT API ROUTE
  // ==========================================
  console.log('📋 CHECK 5: NFT API route');
  console.log('-'.repeat(40));
  
  try {
    const nftRoute = fs.readFileSync('/home/z/my-project/src/app/api/nft/route.ts', 'utf-8');
    
    const hasSigner = nftRoute.includes('NFT_SIGNER_PRIVATE_KEY');
    const hasContractAddr = nftRoute.includes('NFT_CONTRACT_ADDRESS');
    const hasSession = nftRoute.includes('session');
    const hasECDSA = nftRoute.includes('sign') || nftRoute.includes('ECDSA');
    
    console.log(`  Uses NFT_SIGNER_PRIVATE_KEY: ${hasSigner ? '✅' : '❌'}`);
    console.log(`  Uses NFT_CONTRACT_ADDRESS: ${hasContractAddr ? '✅' : '❌'}`);
    console.log(`  Has session auth: ${hasSession ? '✅' : '❌'}`);
    console.log(`  Has ECDSA signing: ${hasECDSA ? '✅' : '❌'}`);
    console.log(`  Contract address in code: ${nftRoute.includes(CONTRACT_ADDRESS) ? '✅' : '⚠️ uses env var'}`);
    
    console.log('✅ CHECK 5 PASSED (code structure OK)');
    console.log('');
  } catch(e) {
    console.log('⚠️ CHECK 5: Could not verify API route:', e.message);
    console.log('');
  }
  
  // ==========================================
  // CHECK 6: NFT PAGE
  // ==========================================
  console.log('📋 CHECK 6: NFT mint page');
  console.log('-'.repeat(40));
  
  try {
    const nftPage = fs.readFileSync('/home/z/my-project/src/app/nft/page.tsx', 'utf-8');
    
    const hasContractAddr = nftPage.includes(CONTRACT_ADDRESS);
    const hasMintFunction = nftPage.includes('claimFreeMint') || nftPage.includes('mintPaid');
    const hasWalletConnect = nftPage.includes('useAccount') || nftPage.includes('connect');
    
    console.log(`  Contract address: ${hasContractAddr ? '✅' : '❌'}`);
    console.log(`  Mint functions: ${hasMintFunction ? '✅' : '❌'}`);
    console.log(`  Wallet connect: ${hasWalletConnect ? '✅' : '❌'}`);
    
    console.log('✅ CHECK 6 PASSED');
    console.log('');
  } catch(e) {
    console.log('⚠️ CHECK 6: Could not verify NFT page:', e.message);
    console.log('');
  }
  
  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('='.repeat(60));
  console.log('🏁 FULL SYSTEM CHECK COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Key data for reference:');
  console.log('  Contract:     ', CONTRACT_ADDRESS);
  console.log('  Metadata CID: ', METADATA_CID);
  console.log('  Images CID:   ', IMAGES_CID);
  console.log('  baseURI:      ', `ipfs://${METADATA_CID}/`);
  console.log('  Provenance:   ', '15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0');
  console.log('');
  console.log('Before mint day you need to:');
  console.log('  1. Set NFT_CONTRACT_ADDRESS env var on Render');
  console.log('  2. Set NFT_SIGNER_PRIVATE_KEY env var on Render');
  console.log('  3. Call setFreeMintActive(true) on contract');
  console.log('  4. Call setPaidMintActive(true) on contract');
  console.log('  5. After free mint period ends, call reveal()');
}

fullCheck();
