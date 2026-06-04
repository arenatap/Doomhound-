import ZAI from 'z-ai-web-dev-sdk';

async function main() {
  const zai = await ZAI.create();

  // Step 1: Search for the contract
  console.log('=== STEP 1: Web Search for Contract Info ===\n');
  try {
    const searchResult = await zai.functions.invoke('web_search', {
      query: '0x851ba0903c345676369634660E2757026418DCEd avalanche contract source code',
      num: 10
    });

    if (Array.isArray(searchResult)) {
      searchResult.forEach((item: any, index: number) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   URL: ${item.url}`);
        console.log(`   Snippet: ${item.snippet}`);
        console.log('');
      });
    } else {
      console.log('Unexpected search response:', JSON.stringify(searchResult).substring(0, 500));
    }
  } catch (err: any) {
    console.error('Search failed:', err?.message || err);
  }

  // Step 2: Try to read the SnowTrace page
  console.log('\n=== STEP 2: Reading SnowTrace Contract Page ===\n');
  try {
    const pageResult = await zai.functions.invoke('page_reader', {
      url: 'https://snowtrace.io/address/0x851ba0903c345676369634660E2757026418DCEd#code'
    });

    console.log('Title:', pageResult.data?.title);
    console.log('URL:', pageResult.data?.url);
    if (pageResult.data?.html) {
      // Extract text content
      const text = pageResult.data.html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      console.log('Text content (first 5000 chars):');
      console.log(text.substring(0, 5000));
    }
  } catch (err: any) {
    console.error('Page reader failed:', err?.message || err);
  }

  // Step 3: Search for private key leak info
  console.log('\n=== STEP 3: Search for Private Key Leak ===\n');
  try {
    const leakSearch = await zai.functions.invoke('web_search', {
      query: '0x851ba0903c345676369634660E2757026418DCEd private key leak hack',
      num: 10
    });

    if (Array.isArray(leakSearch)) {
      leakSearch.forEach((item: any, index: number) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   URL: ${item.url}`);
        console.log(`   Snippet: ${item.snippet}`);
        console.log('');
      });
    }
  } catch (err: any) {
    console.error('Leak search failed:', err?.message || err);
  }
}

main().catch(console.error);
