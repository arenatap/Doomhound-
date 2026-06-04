import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';

const CONTRACT_ADDRESS = '0xfd269a2e7067d775d21fb8d2efd7301246c939fd';

const ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view', type: 'function'
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

async function check() {
  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(),
  });

  console.log('🔍 Checking current contract state...');
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('');

  const owner = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'owner',
  });
  console.log('Owner:', owner);

  const revealed = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'revealed',
  });
  console.log('Revealed:', revealed);

  const freeMintActive = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'freeMintActive',
  });
  console.log('Free Mint Active:', freeMintActive);

  const paidMintActive = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'paidMintActive',
  });
  console.log('Paid Mint Active:', paidMintActive);

  const totalSupply = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'totalSupply',
  });
  console.log('Total Supply:', totalSupply.toString());

  // Note: can't read baseURI directly as it's private
  // But we can check tokenURI if any tokens exist
  if (Number(totalSupply) > 0) {
    const tokenURI = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'tokenURI',
      args: [1n],
    });
    console.log('Token #1 URI:', tokenURI);
  } else {
    console.log('No tokens minted yet - cannot check tokenURI');
  }

  console.log('');
  console.log('✅ Contract state verified');
}

check();
