# DOOMHOUND NFT — Smart Contract & Deployment Guide

## Contract: DoomhoundNFT.sol

### Features
- **ERC-721 Enumerable** — 100 supply, standard NFT on Avalanche
- **Free Mint** — Backend signs message → user claims without paying (only gas)
- **Paid Mint** — 0.69 AVAX, max 2 per wallet
- **Random Reveal** — All NFTs show unrevealed image until admin triggers reveal
- **Admin Mint** — Reserve NFTs for team/giveaways

### Architecture

```
ARENA HANDLE (whitelist)     BACKEND (signs)           SMART CONTRACT (verifies)
─────────────────────        ────────────────           ─────────────────────────
@0xmohitt is whitelisted  →  Sign(wallet+nonce)     →   Verify signature = signer
                               ↓                         ↓
                          Return signature           claimFreeMint(nonce, sig)
                               ↓                         ↓
                          Frontend calls            NFT minted to wallet ✅
                          contract with sig         (user pays ~$0.05 gas)
```

### Deployment Steps

#### 1. Install Foundry (if not already)
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

#### 2. Create a Foundry project
```bash
mkdir doomhound-nft && cd doomhound-nft
forge init
```

#### 3. Copy the contract
Copy `DoomhoundNFT.sol` to `src/DoomhoundNFT.sol`

#### 4. Install OpenZeppelin
```bash
forge install OpenZeppelin/openzeppelin-contracts
```

#### 5. Deploy to Avalanche C-Chain
```bash
forge create src/DoomhoundNFT.sol:DoomhoundNFT \
  --rpc-url https://api.avax.network/ext/bc/C/rpc \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args \
    SIGNER_ADDRESS \
    "ipfs://Qm.../" \
    "ipfs://Qm.../unrevealed.json"
```

#### 6. Verify on Snowtrace
```bash
forge verify-contract \
  --chain-id 43114 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor(address,string,string)" SIGNER "ipfs://.../" "ipfs://.../unrevealed.json") \
  --verifier-url https://api.snowtrace.io/api \
  DEPLOYED_ADDRESS \
  src/DoomhoundNFT.sol:DoomhoundNFT \
  SNOWTRACE_API_KEY
```

### Contract Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `initialSigner` | Backend wallet that signs free mint claims | Your backend's wallet address |
| `initialBaseURI` | IPFS base URI for revealed metadata | `ipfs://QmYourMetadataHash/` |
| `initialUnrevealedURI` | IPFS URI for unrevealed image | `ipfs://QmUnrevealedHash/unrevealed.json` |

### Post-Deployment

1. **Set free mint active**: `setFreeMintActive(true)`
2. **Set paid mint active**: `setPaidMintActive(true)`
3. **Reveal when ready**: `reveal("ipfs://QmRevealedHash/")`

### Backend Signing (Node.js)

```javascript
import { ethers } from 'ethers';

const signer = new ethers.Wallet(PRIVATE_KEY);

async function signFreeMint(userWallet, nonce) {
  const hash = ethers.solidityPackedKeccak256(
    ['address', 'uint256'],
    [userWallet, nonce]
  );
  const ethSignedHash = ethers.hashMessage(ethers.getBytes(hash));
  const signature = await signer.signMessage(ethers.getBytes(hash));
  return { nonce, signature };
}
```

### Frontend Integration

Will use `wagmi` + `viem` + `@rainbow-me/rainbowkit` for wallet connection.

Avalanche C-Chain config:
```javascript
import { avalanche } from 'wagmi/chains';
// Chain ID: 43114
// RPC: https://api.avax.network/ext/bc/C/rpc
// Block Explorer: https://snowtrace.io
```

### Costs Estimate

| Action | Cost |
|--------|------|
| Contract deployment | ~$5-15 AVAX gas |
| Free mint per user | ~$0.05 gas |
| Paid mint per user | 0.69 AVAX + ~$0.05 gas |
| Metadata upload to IPFS | Free (using Pinata/nft.storage) |

### Security Notes

- Signer key should be stored securely (env var, never in frontend)
- Nonce prevents signature replay attacks
- Each signature can only be used once (`usedSignatures` mapping)
- Max 1 free mint per wallet, max 2 paid mints per wallet
- Owner can withdraw contract balance anytime
