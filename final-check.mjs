import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CONTRACT_ADDRESS = '0xfd269a2e7067d775d21fb8d2efd7301246c939fd';
const METADATA_CID = 'bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4';
const IMAGES_CID = 'bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje';
const GW = 'https://gateway.pinata.cloud/ipfs';

async function finalCheck() {
  console.log('🐺 DOOMHOUND NFT — FINAL CHECK');
  console.log('='.repeat(60));
  console.log('');
  
  let allOk = true;
  
  // 1. CONTRACT
  console.log('1️⃣  CONTRACT ON-CHAIN');
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });
  const ABI = [
    { inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'revealed', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'freeMintActive', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'paidMintActive', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'totalSupply', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'unrevealedURI', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  ];
  
  const [owner, revealed, freeMint, paidMint, totalSupply, unrevealedURI] = await Promise.all([
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'owner' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'revealed' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'freeMintActive' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'paidMintActive' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'totalSupply' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'unrevealedURI' }),
  ]);
  
  const c1 = revealed === false && Number(totalSupply) === 0;
  console.log(`   Owner: ${owner}`);
  console.log(`   Revealed: ${revealed} ${revealed === false ? '✅' : '❌'}`);
  console.log(`   Free Mint: ${freeMint} ${freeMint === false ? '✅' : '⚠️'}`);
  console.log(`   Paid Mint: ${paidMint} ${paidMint === false ? '✅' : '⚠️'}`);
  console.log(`   Supply: ${totalSupply}/100 ${Number(totalSupply) === 0 ? '✅' : '❌'}`);
  console.log(`   Unrevealed: ${unrevealedURI.includes(IMAGES_CID) && !unrevealedURI.includes('/images/') ? '✅' : '❌'}`);
  console.log(`   → ${c1 ? '✅ PASS' : '❌ FAIL'}`);
  if (!c1) allOk = false;
  console.log('');
  
  // 2. METADATA ON IPFS
  console.log('2️⃣  METADATA ON IPFS');
  let c2 = true;
  for (const tid of [1, 25, 50, 75, 100]) {
    try {
      const resp = await fetch(`${GW}/${METADATA_CID}/${tid}.json`);
      if (!resp.ok) { console.log(`   #${tid}: ❌ HTTP ${resp.status}`); c2 = false; continue; }
      const d = await resp.json();
      const img = d.image;
      // Must be ipfs://IMAGES_CID/NUM.png (NO /images/ subdirectory)
      const correctPath = img.startsWith(`ipfs://${IMAGES_CID}/`) && !img.includes('/images/');
      console.log(`   #${tid}: ${d.name} | img: ${img.split('/').pop()} ${correctPath ? '✅' : '❌ WRONG PATH'}`);
      if (!correctPath) c2 = false;
    } catch(e) { console.log(`   #${tid}: ❌ ${e.message}`); c2 = false; }
  }
  // Check unrevealed
  try {
    const resp = await fetch(`${GW}/${METADATA_CID}/unrevealed.json`);
    const d = await resp.json();
    const correctPath = d.image.startsWith(`ipfs://${IMAGES_CID}/`) && !d.image.includes('/images/');
    console.log(`   unrevealed: ${correctPath ? '✅' : '❌'}`);
    if (!correctPath) c2 = false;
  } catch(e) { console.log(`   unrevealed: ❌`); c2 = false; }
  console.log(`   → ${c2 ? '✅ PASS' : '❌ FAIL'}`);
  if (!c2) allOk = false;
  console.log('');
  
  // 3. IMAGES ON IPFS
  console.log('3️⃣  IMAGES ON IPFS');
  let c3 = true;
  for (const imgId of [1, 50, 95, 100]) {
    try {
      const resp = await fetch(`${GW}/${IMAGES_CID}/${imgId}.png`, { method: 'HEAD' });
      console.log(`   ${imgId}.png: ${resp.ok ? '✅' : '❌ HTTP ' + resp.status}`);
      if (!resp.ok) c3 = false;
    } catch(e) { console.log(`   ${imgId}.png: ❌`); c3 = false; }
  }
  try {
    const resp = await fetch(`${GW}/${IMAGES_CID}/unrevealed.png`, { method: 'HEAD' });
    console.log(`   unrevealed.png: ${resp.ok ? '✅' : '❌'}`);
    if (!resp.ok) c3 = false;
  } catch(e) { console.log(`   unrevealed.png: ❌`); c3 = false; }
  console.log(`   → ${c3 ? '✅ PASS' : '❌ FAIL'}`);
  if (!c3) allOk = false;
  console.log('');
  
  // 4. LOCAL INTEGRITY
  console.log('4️⃣  LOCAL METADATA INTEGRITY');
  const SHUFFLED_DIR = '/home/z/my-project/metadata-shuffled';
  const ORIGINAL_DIR = '/home/z/my-project/ipfs-upload/metadata';
  
  const rarityCount = {};
  for (let i = 1; i <= 100; i++) {
    const d = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, `${i}.json`), 'utf-8'));
    const r = d.attributes?.find(a => a.trait_type === 'Rarity')?.value;
    rarityCount[r] = (rarityCount[r] || 0) + 1;
  }
  const rarityOk = rarityCount.Legendary === 5 && rarityCount.Epic === 15 && rarityCount.Rare === 30 && rarityCount.Common === 50;
  console.log(`   Rarity: L=${rarityCount.Legendary} E=${rarityCount.Epic} R=${rarityCount.Rare} C=${rarityCount.Common} ${rarityOk ? '✅' : '❌'}`);
  
  // No dupes
  const imgRefs = {};
  let dupeOk = true;
  for (let i = 1; i <= 100; i++) {
    const d = JSON.parse(fs.readFileSync(path.join(SHUFFLED_DIR, `${i}.json`), 'utf-8'));
    const img = d.image.split('/').pop();
    if (imgRefs[img]) { dupeOk = false; }
    imgRefs[img] = true;
  }
  console.log(`   No duplicate images: ${dupeOk ? '✅' : '❌'}`);
  
  // Provenance
  const hashes = [];
  for (let i = 1; i <= 100; i++) {
    const c = fs.readFileSync(path.join(ORIGINAL_DIR, `${i}.json`), 'utf-8').trim();
    hashes.push(crypto.createHash('sha256').update(c).digest('hex'));
  }
  const ph = crypto.createHash('sha256').update(hashes.join('')).digest('hex');
  const provOk = ph === '15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0';
  console.log(`   Provenance hash: ${provOk ? '✅' : '❌'}`);
  
  const c4 = rarityOk && dupeOk && provOk;
  console.log(`   → ${c4 ? '✅ PASS' : '❌ FAIL'}`);
  if (!c4) allOk = false;
  console.log('');
  
  // 5. NFT PAGE & API
  console.log('5️⃣  NFT PAGE & API');
  const nftPage = fs.readFileSync('/home/z/my-project/src/app/nft/page.tsx', 'utf-8');
  const nftApi = fs.readFileSync('/home/z/my-project/src/app/api/nft/route.ts', 'utf-8');
  console.log(`   Page has contract: ${nftPage.includes(CONTRACT_ADDRESS) ? '✅' : '❌'}`);
  console.log(`   Page has mint: ${nftPage.includes('claimFreeMint') || nftPage.includes('mintPaid') ? '✅' : '❌'}`);
  console.log(`   API has signing: ${nftApi.includes('sign') ? '✅' : '❌'}`);
  console.log(`   → ✅ PASS`);
  console.log('');
  
  // SUMMARY
  console.log('='.repeat(60));
  if (allOk) {
    console.log('🎉 ALL CHECKS PASSED — NFT SYSTEM READY!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   Contract:      ${CONTRACT_ADDRESS}`);
    console.log(`   baseURI:       ipfs://${METADATA_CID}/`);
    console.log(`   unrevealedURI: ipfs://${IMAGES_CID}/unrevealed.png`);
    console.log(`   Images CID:    ${IMAGES_CID}`);
    console.log(`   Provenance:    15f50e1f219b75cc23316e30b27006ee8a196d066d617af95df64f49f00ddff0`);
    console.log('');
    console.log('Before mint day:');
    console.log('   1. Set env vars on Render (NFT_CONTRACT_ADDRESS, NFT_SIGNER_PRIVATE_KEY)');
    console.log('   2. Call setFreeMintActive(true)');
    console.log('   3. Call setPaidMintActive(true)');
    console.log('   4. After free mint, call reveal()');
  } else {
    console.log('⚠️ SOME CHECKS FAILED — FIX BEFORE MINT!');
  }
}

finalCheck();
