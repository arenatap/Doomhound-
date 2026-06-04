import { createWalletClient, createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIVATE_KEY = '0xe97882f59948d58d142f8d2dd2c36f91e85a31c0b0fa1d33302f92ca4ee8c3b7';
const CONTRACT_ADDRESS = '0xfd269a2e7067d775d21fb8d2efd7301246c939fd';

// The values to set
const NEW_BASE_URI = 'ipfs://bafybeibdg3jgysee4aejlurdfhvrrtleq5vgeirmp64b6drpcsr56knhme/';
const NEW_UNREVEALED_URI = 'ipfs://bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/images/unrevealed.png';

const ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view', type: 'function'
  },
  {
    inputs: [{ internalType: 'string', name: 'newBaseURI', type: 'string' }],
    name: 'setBaseURI',
    outputs: [],
    stateMutability: 'nonpayable', type: 'function'
  },
  {
    inputs: [{ internalType: 'string', name: 'newUnrevealedURI', type: 'string' }],
    name: 'setUnrevealedURI',
    outputs: [],
    stateMutability: 'nonpayable', type: 'function'
  },
  {
    inputs: [],
    name: 'revealed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view', type: 'function'
  },
  {
    inputs: [],
    name: 'freeMintActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view', type: 'function'
  },
  {
    inputs: [],
    name: 'paidMintActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view', type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view', type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view', type: 'function'
  },
];

async function main() {
  // Step 1: Verify private key matches owner
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log('🔑 Private key derives address:', account.address);
  
  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(),
  });
  
  const owner = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'owner',
  });
  console.log('📋 Contract owner:', owner);
  
  if (account.address.toLowerCase() !== owner.toLowerCase()) {
    console.error('❌ FATAL: Private key does NOT match contract owner!');
    console.error('   Derived:', account.address);
    console.error('   Owner:', owner);
    process.exit(1);
  }
  console.log('✅ Private key matches contract owner');
  console.log('');
  
  // Step 2: Check current state
  console.log('=== Current contract state ===');
  const revealed = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'revealed',
  });
  const freeMint = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'freeMintActive',
  });
  const paidMint = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'paidMintActive',
  });
  const totalSupply = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'totalSupply',
  });
  
  console.log('Revealed:', revealed);
  console.log('Free Mint Active:', freeMint);
  console.log('Paid Mint Active:', paidMint);
  console.log('Total Supply:', totalSupply.toString());
  console.log('');
  
  // Safety check: should NOT be revealed and should have 0 supply
  if (revealed) {
    console.error('❌ FATAL: Contract is already revealed! Aborting.');
    process.exit(1);
  }
  if (Number(totalSupply) > 0) {
    console.error('❌ FATAL: Tokens already minted! Aborting.');
    process.exit(1);
  }
  console.log('✅ Safe to proceed (not revealed, 0 supply)');
  console.log('');
  
  // Step 3: Call setBaseURI
  const walletClient = createWalletClient({
    account,
    chain: avalanche,
    transport: http(),
  });
  
  console.log('📝 Calling setBaseURI...');
  console.log('   New value:', NEW_BASE_URI);
  
  const tx1Hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'setBaseURI',
    args: [NEW_BASE_URI],
  });
  console.log('   Tx hash:', tx1Hash);
  console.log('   Waiting for confirmation...');
  
  const tx1Receipt = await publicClient.waitForTransactionReceipt({ hash: tx1Hash });
  console.log('   Status:', tx1Receipt.status);
  console.log('   Block:', tx1Receipt.blockNumber.toString());
  
  if (tx1Receipt.status !== 'success') {
    console.error('❌ setBaseURI FAILED!');
    process.exit(1);
  }
  console.log('✅ setBaseURI confirmed!');
  console.log('');
  
  // Step 4: Call setUnrevealedURI
  console.log('📝 Calling setUnrevealedURI...');
  console.log('   New value:', NEW_UNREVEALED_URI);
  
  const tx2Hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'setUnrevealedURI',
    args: [NEW_UNREVEALED_URI],
  });
  console.log('   Tx hash:', tx2Hash);
  console.log('   Waiting for confirmation...');
  
  const tx2Receipt = await publicClient.waitForTransactionReceipt({ hash: tx2Hash });
  console.log('   Status:', tx2Receipt.status);
  console.log('   Block:', tx2Receipt.blockNumber.toString());
  
  if (tx2Receipt.status !== 'success') {
    console.error('❌ setUnrevealedURI FAILED!');
    process.exit(1);
  }
  console.log('✅ setUnrevealedURI confirmed!');
  console.log('');
  
  // Step 5: Verify on-chain
  console.log('🔍 Verifying on-chain state...');
  
  // Since baseURI is private, we can only verify indirectly
  // The unrevealedURI is used when revealed=false
  // tokenURI for any non-existent token should return the unrevealedURI
  // But since no tokens are minted, we can't check tokenURI
  // We can only verify the state variables we can read
  
  const revealedAfter = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'revealed',
  });
  const ownerAfter = await publicClient.readContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'owner',
  });
  
  console.log('Owner still:', ownerAfter);
  console.log('Still revealed=false:', revealedAfter);
  console.log('');
  
  console.log('='.repeat(60));
  console.log('✅ CONTRACT UPDATED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('');
  console.log('BaseURI set to:', NEW_BASE_URI);
  console.log('UnrevealedURI set to:', NEW_UNREVEALED_URI);
  console.log('');
  console.log('When mint starts, tokens will return unrevealed metadata.');
  console.log('After reveal, tokens will use:', NEW_BASE_URI + '{tokenId}.json');
  console.log('');
  console.log('Snowtrace: https://snowtrace.io/address/' + CONTRACT_ADDRESS);
  console.log('Tx1 (setBaseURI):', tx1Hash);
  console.log('Tx2 (setUnrevealedURI):', tx2Hash);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
