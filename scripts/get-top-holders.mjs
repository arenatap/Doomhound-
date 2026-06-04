/**
 * Get top $DOOMHOUND holders via Snowtrace API
 * Properly handles large numbers (wei → tokens)
 */
import fs from 'fs';

const DOOMHOUND_TOKEN = '0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb';
const DECIMALS = 18;

const EXCLUDE = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
].map(a => a.toLowerCase()));

// Convert wei string to token amount (handles large numbers properly)
function weiToTokens(weiStr) {
  if (!weiStr || weiStr === '0') return 0;
  const s = weiStr.toString().replace(/[^0-9]/g, '');
  if (s.length <= DECIMALS) return 0;
  const intPart = s.slice(0, s.length - DECIMALS) || '0';
  const decPart = s.slice(s.length - DECIMALS, s.length - DECIMALS + 4);
  return parseFloat(intPart + '.' + decPart);
}

function formatBalance(tokens) {
  if (tokens >= 1e9) return (tokens / 1e9).toFixed(2) + 'B';
  if (tokens >= 1e6) return (tokens / 1e6).toFixed(2) + 'M';
  if (tokens >= 1e3) return (tokens / 1e3).toFixed(2) + 'K';
  return tokens.toFixed(2);
}

async function main() {
  console.log('🌐 Fetching $DOOMHOUND holders from Snowtrace API...');
  
  // Fetch up to 100 holders
  const resp = await fetch(
    `https://api.snowtrace.io/api?module=token&action=tokenholderlist&contractaddress=${DOOMHOUND_TOKEN}&page=1&offset=100`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  const data = await resp.json();
  
  if (data.status !== '1' || !Array.isArray(data.result) || data.result.length === 0) {
    console.error('❌ Snowtrace API error:', data.message || 'No data');
    process.exit(1);
  }
  
  console.log(`   ✅ Got ${data.result.length} holders\n`);
  
  // Parse holders with proper number handling
  const holders = data.result
    .map(h => {
      const address = (h.TokenHolderAddress || '').toLowerCase();
      const balance = weiToTokens(h.TokenHolderQuantity);
      return { address, balance };
    })
    .filter(h => h.address && !EXCLUDE.has(h.address) && h.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  
  // Top 20
  const top20 = holders.slice(0, 20);
  
  console.log('🏆 TOP 20 $DOOMHOUND HOLDERS:\n');
  console.log('Rank | Address                                      | Balance');
  console.log('-'.repeat(85));
  
  top20.forEach((h, i) => {
    console.log(`#${String(i + 1).padStart(2)}  | ${h.address} | ${formatBalance(h.balance)}`);
  });
  
  // Find Toff's position
  const toffWallet = '0xF1a5ac3Fae5e17Fb1B75f7c51C6667471c1dEeBa'.toLowerCase();
  const toffEntry = holders.find(h => h.address === toffWallet);
  const toffRank = holders.findIndex(h => h.address === toffWallet) + 1;
  
  if (toffEntry) {
    console.log(`\n👑 Toff's wallet: #${toffRank} with ${formatBalance(toffEntry.balance)} $DOOMHOUND`);
  } else {
    console.log(`\n👑 Toff's wallet not found in top ${holders.length} holders`);
    // Check if it exists at all
    const toffInAll = data.result.find(h => h.TokenHolderAddress?.toLowerCase() === toffWallet);
    if (toffInAll) {
      console.log(`   Found in raw data: ${toffInAll.TokenHolderQuantity}`);
    }
  }
  
  // Also check known dev/airdrop wallets
  const devWallets = {
    'ladyredpepe': null, // We don't know this wallet yet
  };
  
  // Save output
  const output = {
    source: 'snowtrace',
    top20: top20.map((h, i) => ({
      rank: i + 1,
      address: h.address,
      balance: h.balance,
      balanceFormatted: formatBalance(h.balance),
    })),
    toffPosition: toffRank || null,
    toffBalance: toffEntry?.balance || null,
    totalHoldersInList: holders.length,
    timestamp: new Date().toISOString(),
    rawHoldersCount: data.result.length,
  };
  
  fs.writeFileSync('/home/z/my-project/top-holders.json', JSON.stringify(output, null, 2));
  console.log('\n📄 Saved to /home/z/my-project/top-holders.json');
  
  // Also output just the top 20 addresses as a simple list for whitelist
  const simpleList = top20.map((h, i) => `${i + 1}. ${h.address} (${formatBalance(h.balance)})`);
  fs.writeFileSync('/home/z/my-project/top-holders-list.txt', simpleList.join('\n'));
  console.log('📄 Saved list to /home/z/my-project/top-holders-list.txt');
}

main().catch(console.error);
