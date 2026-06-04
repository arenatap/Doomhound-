# DOOMHOUND NFT Contract Source Files

## Contract Address
**0x851ba0903c345676369634660e2757026418dced** (AVAX C-Chain)

**Snowtrace**: https://snowtrace.io/address/0x851ba0903c345676369634660e2757026418dced

**Status**: ✅ VERIFIED on Snowtrace (May 30, 2026)

## Key Files

### Smart Contract
- `DoomhoundNFTv2.sol` — The deployed contract (v2 with token burn mint)
- `DoomhoundNFT_v1.sol` — Original v1 (not deployed, only paid+free mint)
- `DoomhoundNFTv2_flattened.sol` — Flattened source used for verification

### Deployment Scripts
- `deploy-v2.mjs` — Script used to deploy the contract (Viem)
- `deploy-v1.mjs` — V1 deploy script
- `deploy-viem.ts` — TypeScript deploy script
- `deploy.mjs` / `deploy.ts` — Alternative deploy scripts

### Test Scripts
- `test-final.mjs` — Final integration test
- `test-free-mint.mjs` / `test-free-mint2.mjs` — Free mint testing
- `test-paid-mint.mjs` — Paid mint testing
- `test-mint.mjs` — General mint testing
- `test-reveal.mjs` — Reveal testing
- `test-tokenuri.mjs` — TokenURI testing
- `verify-v2.mjs` — On-chain verification script
- `check-reveal.mjs` — Reveal status checker
- `verify-visibility.mjs` — Contract visibility checker

### Configuration
- `hardhat.config.ts` — Hardhat 3 config (Viem, AVAX network)
- `package.json` — Dependencies

## Contract Details

| Parameter | Value |
|---|---|
| Name | Hounds of the Hell |
| Symbol | HOTH |
| Max Supply | 100 |
| Compiler | solc 0.8.28+commit.7893614a |
| Optimizer | Enabled, 200 runs |
| EVM Version | Cancun |
| License | MIT |

## Constructor Arguments

1. `initialSigner`: `0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa`
2. `initialTokenAddress`: `0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb` ($DOOMHOUND token)
3. `initialBaseURI`: `ipfs://bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4/`
4. `initialUnrevealedURI`: `ipfs://bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/unrevealed.png`

## Mint Types

1. **Free Mint** (`claimFreeMint`) — 1 per wallet, requires ECDSA signature from signer
2. **Paid Mint** (`mintPaid`) — Max 2 per wallet, 0.69 AVAX
3. **Token Burn Mint** (`mintWithToken`) — Max 1 per wallet, 11M $DOOMHOUND burned to 0xdead

## Admin Functions
- `adminMint(address, uint256)` — Airdrop NFTs
- `setFreeMintActive(bool)` — Enable/disable free mint
- `setPaidMintActive(bool)` — Enable/disable paid mint
- `setTokenMintActive(bool)` — Enable/disable token burn mint
- `reveal(string)` — Reveal collection with base URI
- `setBaseURI(string)` — Update base URI
- `setSigner(address)` — Update signer address
- `setPaidMintPrice(uint256)` — Update paid mint price
- `setTokenMintPrice(uint256)` — Update token mint price
- `withdraw()` — Withdraw contract balance to owner

## Related Addresses
- **$DOOMHOUND Token**: `0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb`
- **Contract Owner/Signer**: `0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa`
- **Toff's Arena Wallet**: `0x51b2902cd06270a90a2fef33447eb4c1006ea790`
- **Burn Address**: `0x000000000000000000000000000000000000dEaD`
