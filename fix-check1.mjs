import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';

const CONTRACT_ADDRESS = '0xfd269a2e7067d775d21fb8d2efd7301246c939fd';

const ABI = [
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'revealed', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'freeMintActive', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'paidMintActive', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'paidMintPrice', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'signer', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'unrevealedURI', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
];

async function check() {
  const publicClient = createPublicClient({ chain: avalanche, transport: http() });
  
  const [owner, revealed, freeMint, paidMint, totalSupply, mintPrice, signer, unrevealedURI] = await Promise.all([
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'owner' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'revealed' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'freeMintActive' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'paidMintActive' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'totalSupply' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'paidMintPrice' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'signer' }),
    publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'unrevealedURI' }),
  ]);
  
  console.log('=== CONTRACT STATE ===');
  console.log('Owner:', owner);
  console.log('Revealed:', revealed, revealed === false ? '✅' : '❌');
  console.log('Free Mint Active:', freeMint, freeMint === false ? '✅ (not yet)' : '⚠️');
  console.log('Paid Mint Active:', paidMint, paidMint === false ? '✅ (not yet)' : '⚠️');
  console.log('Total Supply:', totalSupply.toString(), Number(totalSupply) === 0 ? '✅' : '❌');
  console.log('Paid Mint Price:', (Number(mintPrice) / 1e18).toFixed(2), 'AVAX', Number(mintPrice) === 690000000000000000n ? '✅' : '❌');
  console.log('Signer:', signer);
  console.log('Unrevealed URI:', unrevealedURI);
  console.log('');
  
  const expectedUnrevealed = 'ipfs://bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/images/unrevealed.png';
  console.log('Unrevealed URI correct:', unrevealedURI === expectedUnrevealed ? '✅' : '❌');
  console.log('');
  console.log('Constants (from source code):');
  console.log('  MAX_SUPPLY: 100');
  console.log('  MAX_FREE_PER_WALLET: 1');
  console.log('  MAX_PAID_PER_WALLET: 2');
}

check();
