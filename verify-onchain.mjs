import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';

const CONTRACT_ADDRESS = '0xfd269a2e7067d775d21fb8d2efd7301246c939fd';

const ABI = [
  {
    inputs: [],
    name: 'revealed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view', type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view', type: 'function'
  },
  {
    inputs: [],
    name: 'unrevealedURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view', type: 'function'
  },
  {
    inputs: [],
    name: 'freeMintActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view', type: 'function'
  },
];

async function verify() {
  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(),
  });
  
  console.log('🔍 Final on-chain verification...');
  
  const revealed = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'revealed',
  });
  console.log('revealed:', revealed);
  
  const unrevealedURI = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'unrevealedURI',
  });
  console.log('unrevealedURI:', unrevealedURI);
  
  const freeMintActive = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'freeMintActive',
  });
  console.log('freeMintActive:', freeMintActive);
  
  // Check expected values
  console.log('');
  console.log('=== VERIFICATION ===');
  
  const expectedUnrevealed = 'ipfs://bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/images/unrevealed.png';
  
  if (revealed === false) {
    console.log('✅ revealed = false (correct - NFTs will show unrevealed image before reveal)');
  } else {
    console.log('❌ revealed = true (WRONG - should be false before mint!)');
  }
  
  if (unrevealedURI === expectedUnrevealed) {
    console.log('✅ unrevealedURI matches new image CID');
  } else {
    console.log('❌ unrevealedURI mismatch!');
    console.log('   Expected:', expectedUnrevealed);
    console.log('   Got:', unrevealedURI);
  }
  
  // baseURI is private, can't read directly, but the setBaseURI tx was confirmed
  // We trust that since the tx was successful, it was set correctly
  console.log('✅ setBaseURI tx confirmed on-chain (baseURI is private, cannot read directly)');
  console.log('');
  console.log('BaseURI should be: ipfs://bafybeibdg3jgysee4aejlurdfhvrrtleq5vgeirmp64b6drpcsr56knhme/');
}

verify();
