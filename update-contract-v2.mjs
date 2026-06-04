import { createWalletClient, createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIVATE_KEY = '0xe97882f59948d58d142f8d2dd2c36f91e85a31c0b0fa1d33302f92ca4ee8c3b7';
const CONTRACT_ADDRESS = '0xfd269a2e7067d775d21fb8d2efd7301246c939fd';

const NEW_BASE_URI = 'ipfs://bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/';
const NEW_UNREVEALED_URI = 'ipfs://bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/unrevealed.png';

const ABI = [
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'string', name: 'newBaseURI', type: 'string' }], name: 'setBaseURI', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'string', name: 'newUnrevealedURI', type: 'string' }], name: 'setUnrevealedURI', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'unrevealedURI', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'revealed', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
];

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log('🔑 Wallet:', account.address);
  
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });
  const walletClient = createWalletClient({ account, chain: avalanche, transport: http() });
  
  // Verify owner
  const owner = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'owner' });
  if (account.address.toLowerCase() !== owner.toLowerCase()) {
    console.error('❌ Not owner!'); process.exit(1);
  }
  console.log('✅ Owner matches');
  
  // Check current state
  const revealed = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'revealed' });
  const currentUnrevealed = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'unrevealedURI' });
  console.log('Current unrevealedURI:', currentUnrevealed);
  console.log('Revealed:', revealed);
  
  if (revealed) { console.error('❌ Already revealed!'); process.exit(1); }
  
  // Update setBaseURI
  console.log('');
  console.log('📝 Calling setBaseURI...');
  console.log('   Value:', NEW_BASE_URI);
  
  const tx1 = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'setBaseURI', args: [NEW_BASE_URI],
  });
  console.log('   Tx:', tx1);
  const r1 = await publicClient.waitForTransactionReceipt({ hash: tx1 });
  console.log('   Status:', r1.status);
  
  if (r1.status !== 'success') { console.error('❌ setBaseURI FAILED!'); process.exit(1); }
  console.log('✅ setBaseURI confirmed!');
  
  // Update setUnrevealedURI
  console.log('');
  console.log('📝 Calling setUnrevealedURI...');
  console.log('   Value:', NEW_UNREVEALED_URI);
  
  const tx2 = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: 'setUnrevealedURI', args: [NEW_UNREVEALED_URI],
  });
  console.log('   Tx:', tx2);
  const r2 = await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log('   Status:', r2.status);
  
  if (r2.status !== 'success') { console.error('❌ setUnrevealedURI FAILED!'); process.exit(1); }
  console.log('✅ setUnrevealedURI confirmed!');
  
  // Final verification
  console.log('');
  console.log('🔍 Final on-chain verification...');
  const finalUnrevealed = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'unrevealedURI' });
  const finalRevealed = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'revealed' });
  
  console.log('unrevealedURI:', finalUnrevealed);
  console.log('revealed:', finalRevealed);
  
  if (finalUnrevealed === NEW_UNREVEALED_URI && finalRevealed === false) {
    console.log('');
    console.log('🎉 CONTRACT UPDATED AND VERIFIED!');
    console.log('');
    console.log('baseURI:    ', NEW_BASE_URI);
    console.log('unrevealedURI:', NEW_UNREVEALED_URI);
    console.log('revealed:    false ✅');
  } else {
    console.log('❌ Verification failed!');
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
