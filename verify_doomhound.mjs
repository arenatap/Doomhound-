import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { avalanche } from 'viem/chains';

// ── Config ──────────────────────────────────────────────────────────
const CONTRACT = '0x851ba0903c345676369634660e2757026418dced';
const RPC = 'https://api.avax.network/ext/bc/C/rpc';

// Expected values
const EXPECTED = {
  name: 'Hounds of the Hell',
  symbol: 'HOTH',
  MAX_SUPPLY: 100n,
  MAX_PAID_PER_WALLET: 2n,
  MAX_FREE_PER_WALLET: 1n,
  MAX_TOKEN_PER_WALLET: 1n,
  BURN_ADDRESS: '0x000000000000000000000000000000000000dEaD',
  paidMintPrice: 690000000000000000n, // 0.69 AVAX
  tokenMintPrice: 11000000n * 10n ** 18n, // 11M $DOOMHOUND
  doomhoundToken: '0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb',
  signer: '0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa',
  owner: '0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa',
  revealed: false,
  freeMintActive: false,
  paidMintActive: false,
  tokenMintActive: false,
  unrevealedURI: 'ipfs://bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje/unrevealed.png',
  totalSupply: 0n,
};

// ERC721 / ERC165 interface IDs
const INTERFACE_IDS = {
  ERC165: '0x01ffc9a7',
  ERC721: '0x80ac58cd',
  ERC721Metadata: '0x5b5e139f',
  ERC721Enumerable: '0x780e9d63',
};

// ── Minimal ABI (view functions only) ───────────────────────────────
const ABI = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'MAX_SUPPLY', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'MAX_PAID_PER_WALLET', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'MAX_FREE_PER_WALLET', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'MAX_TOKEN_PER_WALLET', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'BURN_ADDRESS', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'paidMintPrice', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'tokenMintPrice', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'doomhoundToken', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'signer', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'revealed', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'freeMintActive', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'paidMintActive', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'tokenMintActive', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'unrevealedURI', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'supportsInterface', stateMutability: 'view', inputs: [{ type: 'bytes4' }], outputs: [{ type: 'bool' }] },
];

// ── Client ──────────────────────────────────────────────────────────
const client = createPublicClient({
  chain: avalanche,
  transport: http(RPC, { timeout: 30_000 }),
});

// ── Helpers ─────────────────────────────────────────────────────────
function pass(label, actual, expected) {
  console.log(`  ✅ ${label}: ${actual}`);
}
function fail(label, actual, expected) {
  console.log(`  ❌ ${label}: actual=${actual} | expected=${expected}`);
}

function compare(label, actual, expected) {
  // Normalize addresses to lowercase for comparison
  let a = actual;
  let e = expected;
  if (typeof a === 'string' && a.startsWith('0x')) a = a.toLowerCase();
  if (typeof e === 'string' && e.startsWith('0x')) e = e.toLowerCase();
  if (typeof a === 'bigint') a = a.toString();
  if (typeof e === 'bigint') e = e.toString();

  if (a === e) {
    pass(label, actual, expected);
    return true;
  } else {
    fail(label, actual, expected);
    return false;
  }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  let results = {};
  let passCount = 0;
  let failCount = 0;

  function check(label, actual, expected) {
    results[label] = { actual, expected, passed: false };
    let a = actual, e = expected;
    if (typeof a === 'string' && a.startsWith('0x')) a = a.toLowerCase();
    if (typeof e === 'string' && e.startsWith('0x')) e = e.toLowerCase();
    if (typeof a === 'bigint') a = a.toString();
    if (typeof e === 'bigint') e = e.toString();
    if (a === e) {
      results[label].passed = true;
      passCount++;
      pass(label, actual, expected);
    } else {
      failCount++;
      fail(label, actual, expected);
    }
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  DOOMHOUND NFT v2 — On-Chain State Verification');
  console.log(`  Contract: ${CONTRACT}`);
  console.log(`  Chain:    Avalanche C-Chain (43114)`);
  console.log(`  RPC:      ${RPC}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // ── Section 1: ERC-721 Metadata ─────────────────────────────────
  console.log('── Section 1: ERC-721 Metadata ───────────────────────────────────');
  try {
    const name = await client.readContract({
      address: CONTRACT,
      abi: ABI,
      functionName: 'name',
    });
    check('name', name, EXPECTED.name);
  } catch (e) { fail('name', `ERROR: ${e.message}`, EXPECTED.name); failCount++; }

  try {
    const symbol = await client.readContract({
      address: CONTRACT,
      abi: ABI,
      functionName: 'symbol',
    });
    check('symbol', symbol, EXPECTED.symbol);
  } catch (e) { fail('symbol', `ERROR: ${e.message}`, EXPECTED.symbol); failCount++; }

  // ── Section 2: Supply & Wallet Limits ──────────────────────────
  console.log('\n── Section 2: Supply & Wallet Limits ───────────────────────────');
  try {
    const maxSupply = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'MAX_SUPPLY' });
    check('MAX_SUPPLY', maxSupply, EXPECTED.MAX_SUPPLY);
  } catch (e) { fail('MAX_SUPPLY', `ERROR: ${e.message}`, EXPECTED.MAX_SUPPLY); failCount++; }

  try {
    const maxPaid = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'MAX_PAID_PER_WALLET' });
    check('MAX_PAID_PER_WALLET', maxPaid, EXPECTED.MAX_PAID_PER_WALLET);
  } catch (e) { fail('MAX_PAID_PER_WALLET', `ERROR: ${e.message}`, EXPECTED.MAX_PAID_PER_WALLET); failCount++; }

  try {
    const maxFree = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'MAX_FREE_PER_WALLET' });
    check('MAX_FREE_PER_WALLET', maxFree, EXPECTED.MAX_FREE_PER_WALLET);
  } catch (e) { fail('MAX_FREE_PER_WALLET', `ERROR: ${e.message}`, EXPECTED.MAX_FREE_PER_WALLET); failCount++; }

  try {
    const maxToken = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'MAX_TOKEN_PER_WALLET' });
    check('MAX_TOKEN_PER_WALLET', maxToken, EXPECTED.MAX_TOKEN_PER_WALLET);
  } catch (e) { fail('MAX_TOKEN_PER_WALLET', `ERROR: ${e.message}`, EXPECTED.MAX_TOKEN_PER_WALLET); failCount++; }

  // ── Section 3: Addresses ───────────────────────────────────────
  console.log('\n── Section 3: Key Addresses ────────────────────────────────────');
  try {
    const burnAddr = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'BURN_ADDRESS' });
    check('BURN_ADDRESS', burnAddr, EXPECTED.BURN_ADDRESS);
  } catch (e) { fail('BURN_ADDRESS', `ERROR: ${e.message}`, EXPECTED.BURN_ADDRESS); failCount++; }

  try {
    const token = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'doomhoundToken' });
    check('doomhoundToken', token, EXPECTED.doomhoundToken);
  } catch (e) { fail('doomhoundToken', `ERROR: ${e.message}`, EXPECTED.doomhoundToken); failCount++; }

  try {
    const signer = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'signer' });
    check('signer', signer, EXPECTED.signer);
  } catch (e) { fail('signer', `ERROR: ${e.message}`, EXPECTED.signer); failCount++; }

  try {
    const owner = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'owner' });
    check('owner', owner, EXPECTED.owner);
  } catch (e) { fail('owner', `ERROR: ${e.message}`, EXPECTED.owner); failCount++; }

  // ── Section 4: Pricing ─────────────────────────────────────────
  console.log('\n── Section 4: Mint Pricing ─────────────────────────────────────');
  try {
    const paidPrice = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'paidMintPrice' });
    check('paidMintPrice', `${formatEther(paidPrice)} AVAX (${paidPrice} wei)`, `${formatEther(EXPECTED.paidMintPrice)} AVAX (${EXPECTED.paidMintPrice} wei)`);
    // Also raw check
    if (paidPrice === EXPECTED.paidMintPrice) { passCount++; } else { failCount++; fail('paidMintPrice (raw)', paidPrice, EXPECTED.paidMintPrice); }
  } catch (e) { fail('paidMintPrice', `ERROR: ${e.message}`, `${EXPECTED.paidMintPrice} wei`); failCount++; }

  try {
    const tokenPrice = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'tokenMintPrice' });
    const tokenPriceFormatted = Number(tokenPrice) / 1e18;
    const expectedFormatted = Number(EXPECTED.tokenMintPrice) / 1e18;
    check('tokenMintPrice', `${tokenPriceFormatted.toLocaleString()} $DOOMHOUND (${tokenPrice} wei)`, `${expectedFormatted.toLocaleString()} $DOOMHOUND (${EXPECTED.tokenMintPrice} wei)`);
    if (tokenPrice === EXPECTED.tokenMintPrice) { passCount++; } else { failCount++; fail('tokenMintPrice (raw)', tokenPrice.toString(), EXPECTED.tokenMintPrice.toString()); }
  } catch (e) { fail('tokenMintPrice', `ERROR: ${e.message}`, `${EXPECTED.tokenMintPrice} wei`); failCount++; }

  // ── Section 5: Mint Status Flags ───────────────────────────────
  console.log('\n── Section 5: Mint Status Flags ────────────────────────────────');
  try {
    const revealed = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'revealed' });
    check('revealed', revealed, EXPECTED.revealed);
  } catch (e) { fail('revealed', `ERROR: ${e.message}`, EXPECTED.revealed); failCount++; }

  try {
    const freeMint = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'freeMintActive' });
    check('freeMintActive', freeMint, EXPECTED.freeMintActive);
  } catch (e) { fail('freeMintActive', `ERROR: ${e.message}`, EXPECTED.freeMintActive); failCount++; }

  try {
    const paidMint = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'paidMintActive' });
    check('paidMintActive', paidMint, EXPECTED.paidMintActive);
  } catch (e) { fail('paidMintActive', `ERROR: ${e.message}`, EXPECTED.paidMintActive); failCount++; }

  try {
    const tokenMint = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'tokenMintActive' });
    check('tokenMintActive', tokenMint, EXPECTED.tokenMintActive);
  } catch (e) { fail('tokenMintActive', `ERROR: ${e.message}`, EXPECTED.tokenMintActive); failCount++; }

  // ── Section 6: URI ─────────────────────────────────────────────
  console.log('\n── Section 6: Metadata URI ─────────────────────────────────────');
  try {
    const uri = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'unrevealedURI' });
    check('unrevealedURI', uri, EXPECTED.unrevealedURI);
  } catch (e) { fail('unrevealedURI', `ERROR: ${e.message}`, EXPECTED.unrevealedURI); failCount++; }

  // ── Section 7: Supply Check ────────────────────────────────────
  console.log('\n── Section 7: Total Supply ─────────────────────────────────────');
  try {
    const supply = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'totalSupply' });
    check('totalSupply', supply, EXPECTED.totalSupply);
  } catch (e) { fail('totalSupply', `ERROR: ${e.message}`, EXPECTED.totalSupply); failCount++; }

  // ── Section 8: ERC-165 Interface Support ───────────────────────
  console.log('\n── Section 8: ERC-165 Interface Support ────────────────────────');
  for (const [iface, id] of Object.entries(INTERFACE_IDS)) {
    try {
      const supported = await client.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: 'supportsInterface',
        args: [id],
      });
      if (supported) {
        pass(`${iface} (${id})`, 'SUPPORTED', 'SUPPORTED');
        passCount++;
      } else {
        fail(`${iface} (${id})`, 'NOT SUPPORTED', 'SUPPORTED');
        failCount++;
      }
    } catch (e) {
      fail(`${iface} (${id})`, `ERROR: ${e.message}`, 'SUPPORTED');
      failCount++;
    }
  }

  // ── Section 9: Contract AVAX Balance ───────────────────────────
  console.log('\n── Section 9: Contract AVAX Balance ────────────────────────────');
  try {
    const balance = await client.getBalance({ address: CONTRACT });
    if (balance === 0n) {
      pass('AVAX balance', `${formatEther(balance)} AVAX (no funds held)`, '0 AVAX');
      passCount++;
    } else {
      console.log(`  ⚠️  AVAX balance: ${formatEther(balance)} AVAX — contract holds funds!`);
      failCount++;
    }
  } catch (e) { fail('AVAX balance', `ERROR: ${e.message}`, '0 AVAX'); failCount++; }

  // ── Section 10: Bytecode Verification ──────────────────────────
  console.log('\n── Section 10: Bytecode & Deployment Verification ──────────────');
  try {
    const bytecode = await client.getCode({ address: CONTRACT });
    if (bytecode && bytecode.length > 2) {
      pass('Contract deployed', `Bytecode length: ${bytecode.length} chars`, 'Non-empty bytecode');
      passCount++;
    } else {
      fail('Contract deployed', 'No bytecode found', 'Non-empty bytecode');
      failCount++;
    }
  } catch (e) { fail('Contract deployed', `ERROR: ${e.message}`, 'Non-empty bytecode'); failCount++; }

  // ── Section 11: Ownership Check ────────────────────────────────
  console.log('\n── Section 11: Ownership Verification ──────────────────────────');
  try {
    const owner = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'owner' });
    const signer = await client.readContract({ address: CONTRACT, abi: ABI, functionName: 'signer' });
    if (owner.toLowerCase() === signer.toLowerCase()) {
      pass('owner === signer', `${owner}`, `${signer}`);
      passCount++;
    } else {
      fail('owner === signer', `owner=${owner} signer=${signer}`, 'Same address');
      failCount++;
    }
    // Check owner is not zero address
    if (owner.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
      pass('owner != zero address', owner, 'Non-zero');
      passCount++;
    } else {
      fail('owner != zero address', owner, 'Non-zero');
      failCount++;
    }
  } catch (e) { fail('ownership checks', `ERROR: ${e.message}`, ''); failCount++; }

  // ── Section 12: Provenance Hash ────────────────────────────────
  console.log('\n── Section 12: Provenance Hash ─────────────────────────────────');
  console.log('  ⚠️  No provenanceHash state variable found in contract ABI or source code.');
  console.log('  ❌ provenanceHash: NOT PRESENT in contract — expected `15f50e1f...ddff0`');

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📊 Total:  ${passCount + failCount}`);
  if (failCount === 0) {
    console.log('\n  🎉 ALL CHECKS PASSED — Contract state matches expected values!');
  } else {
    console.log(`\n  ⚠️  ${failCount} check(s) failed — review details above.`);
  }
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // ── Additional Details ─────────────────────────────────────────
  console.log('── Additional Notes ──────────────────────────────────────────────');
  console.log('  • No pendingOwnership pattern (Ownable, not Ownable2Step) found');
  console.log('  • No provenanceHash variable exists in this contract');
  console.log('  • Contract uses ECDSA signature verification for free mint');
  console.log('  • Mint functions: claimFreeMint, mintPaid, mintWithToken, adminMint');
  console.log('  • Withdraw function exists for owner to extract AVAX');
  console.log('─────────────────────────────────────────────────────────────────');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
