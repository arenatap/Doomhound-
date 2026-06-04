// ===== NFT BACKEND SIGNING UTILITY =====
// This will be integrated into /api/nft/route.ts
// Signs free mint claims for whitelisted Arena handles

import { ethers } from 'ethers';

// The signer wallet — must match the contract's "signer" address
// This is a SEPARATE wallet from the owner, used ONLY for signing
const NFT_SIGNER_PRIVATE_KEY = process.env.NFT_SIGNER_PRIVATE_KEY;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;

let signer: ethers.Wallet | null = null;

function getSigner(): ethers.Wallet {
  if (!signer) {
    if (!NFT_SIGNER_PRIVATE_KEY) {
      throw new Error('NFT_SIGNER_PRIVATE_KEY not configured');
    }
    signer = new ethers.Wallet(NFT_SIGNER_PRIVATE_KEY);
  }
  return signer;
}

/**
 * Generate a signature for free mint claim
 * 
 * Flow:
 * 1. User requests free mint from frontend
 * 2. Backend checks if user's handle is whitelisted
 * 3. Backend generates nonce + signature
 * 4. Frontend calls contract.claimFreeMint(nonce, signature)
 * 5. Contract verifies signature matches signer address
 * 
 * @param userWallet - The user's wallet address (from MetaMask/Core)
 * @param nonce - Unique nonce (e.g., timestamp + random)
 * @returns { nonce, signature } for the contract call
 */
export async function signFreeMint(
  userWallet: string,
  nonce: number
): Promise<{ nonce: number; signature: string }> {
  const wallet = getSigner();
  
  // Hash must match the contract's: keccak256(abi.encodePacked(wallet, nonce))
  const messageHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256'],
    [userWallet, nonce]
  );
  
  // Sign the hash (the contract uses toEthSignedMessageHash)
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  
  return { nonce, signature };
}

/**
 * Verify a wallet address has a valid signature (for testing)
 */
export function getSignerAddress(): string {
  return getSigner().address;
}

/**
 * Generate a unique nonce
 */
export function generateNonce(): number {
  return Date.now();
}
