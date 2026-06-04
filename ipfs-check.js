/**
 * DOOMHOUND NFT Collection — Comprehensive IPFS Metadata & Image Check
 * 
 * Checks:
 *   PART 1: Deploy CID metadata (bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4)
 *   PART 2: Provenance CID metadata (bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii)
 *   PART 3: Image accessibility & format check
 *   PART 4: Collection consistency & provenance
 */

const GATEWAY = "https://ipfs.io/ipfs";
const DEPLOY_CID = "bafybeihejmqz3zoqsuqonrqnagksctw66m4jouqroo3iug5zqzxilgucs4";
const PROVENANCE_CID = "bafybeibylnt6kixn3c2axd5sygvsoz6hpikcwc26at2taao75harkgt7ii";
const UNREVEALED_CID = "bafybeibs47dcz3or2vnjzsucdagkfamgh7zf4d463z4ld62yci5ewqrkje";
const TOTAL_SUPPLY = 100;
const CONCURRENCY = 8; // parallel fetches
const IMAGE_SAMPLE_SIZE = 25; // how many images to actually download-check
const PROVENANCE_SAMPLE_SIZE = 10; // how many provenance files to compare

// ─── Utilities ────────────────────────────────────────────────────────────────

async function fetchWithRetry(url, retries = 3, timeoutMs = 30000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      // If 429 or 5xx, wait and retry
      if (res.status === 429 || res.status >= 500) {
        const wait = attempt * 2000;
        console.log(`  ↻ Retry ${attempt}/${retries} for ${url} (status ${res.status}, waiting ${wait}ms)`);
        await sleep(wait);
        continue;
      }
      return res; // return even non-ok for caller to inspect
    } catch (err) {
      if (attempt === retries) return { status: 0, ok: false, error: err.message };
      const wait = attempt * 2000;
      await sleep(wait);
    }
  }
  return { status: 0, ok: false, error: "Max retries exceeded" };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJSON(url) {
  const res = await fetchWithRetry(url);
  if (!res.ok) return { __error: true, status: res.status, url };
  try {
    return await res.json();
  } catch (e) {
    return { __error: true, parseError: true, url };
  }
}

// Run tasks with bounded concurrency
async function parallelMap(items, fn, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ─── PART 1: Deploy CID Metadata ─────────────────────────────────────────────

async function part1_deployCID() {
  console.log("\n" + "═".repeat(80));
  console.log("PART 1: Deploy CID Metadata Check");
  console.log(`CID: ${DEPLOY_CID}`);
  console.log("═".repeat(80) + "\n");

  const tokenIds = Array.from({ length: TOTAL_SUPPLY }, (_, i) => i + 1);
  const results = [];

  console.log(`Fetching ${TOTAL_SUPPLY} metadata files...`);
  const metas = await parallelMap(tokenIds, async (id) => {
    const url = `${GATEWAY}/${DEPLOY_CID}/${id}.json`;
    const data = await fetchJSON(url);
    return { id, url, data };
  });

  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  const rarityCounts = {};
  const names = new Set();
  const duplicateNames = [];
  const imageCIDs = [];
  const attributeCounts = {};
  let missingFields = [];

  for (const { id, url, data } of metas) {
    if (data.__error) {
      errorCount++;
      errors.push({ id, issue: `Fetch/parse error (status ${data.status || 'unknown'})`, url });
      continue;
    }

    successCount++;

    // Check name
    if (!data.name || typeof data.name !== "string") {
      missingFields.push({ id, field: "name" });
    } else {
      if (names.has(data.name)) {
        duplicateNames.push({ id, name: data.name });
      }
      names.add(data.name);
    }

    // Check description
    if (!data.description || typeof data.description !== "string") {
      missingFields.push({ id, field: "description" });
    }

    // Check image
    if (!data.image || typeof data.image !== "string") {
      missingFields.push({ id, field: "image" });
    } else {
      imageCIDs.push({ id, image: data.image });
    }

    // Check attributes
    if (!Array.isArray(data.attributes)) {
      missingFields.push({ id, field: "attributes" });
    } else {
      // Find rarity attribute
      const rarityAttr = data.attributes.find(
        a => a.trait_type && a.trait_type.toLowerCase() === "rarity"
      );
      if (rarityAttr) {
        const val = rarityAttr.value;
        rarityCounts[val] = (rarityCounts[val] || 0) + 1;
      } else {
        errors.push({ id, issue: "No rarity attribute found" });
      }

      // Count attributes per token
      const count = data.attributes.length;
      attributeCounts[count] = (attributeCounts[count] || 0) + 1;

      // Validate attribute structure
      for (const attr of data.attributes) {
        if (typeof attr.trait_type !== "string" || attr.value === undefined) {
          errors.push({ id, issue: `Malformed attribute: ${JSON.stringify(attr)}` });
        }
      }
    }
  }

  console.log(`\n✅ Successfully fetched: ${successCount}/${TOTAL_SUPPLY}`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }

  console.log("\n--- Rarity Distribution ---");
  const expectedRarities = { Common: 50, Uncommon: "?", Rare: 30, Epic: "?", Legendary: 5, Demonic: "?" };
  for (const [rarity, count] of Object.entries(rarityCounts).sort((a, b) => b[1] - a[1])) {
    const marker = expectedRarities[rarity] !== undefined && expectedRarities[rarity] !== "?" 
      ? (count === expectedRarities[rarity] ? "✅" : "⚠️") 
      : "";
    console.log(`  ${rarity}: ${count} ${marker}`);
  }

  console.log("\n--- Attribute Counts Per Token ---");
  for (const [count, freq] of Object.entries(attributeCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  ${count} attributes: ${freq} tokens`);
  }

  if (missingFields.length > 0) {
    console.log("\n❌ Missing Fields:");
    for (const mf of missingFields) {
      console.log(`  Token #${mf.id}: missing ${mf.field}`);
    }
  } else {
    console.log("\n✅ All metadata have required fields (name, description, image, attributes)");
  }

  if (duplicateNames.length > 0) {
    console.log("\n❌ Duplicate Names:");
    for (const d of duplicateNames) {
      console.log(`  Token #${d.id}: "${d.name}"`);
    }
  } else {
    console.log("\n✅ No duplicate names found");
  }

  if (errors.length > 0 && errorCount > 0) {
    console.log("\n❌ Fetch/Parse Errors:");
    for (const e of errors.filter(e => e.issue.includes("Fetch") || e.issue.includes("error"))) {
      console.log(`  Token #${e.id}: ${e.issue}`);
    }
  }

  // Sample a few full metadata objects
  console.log("\n--- Sample Metadata (Token #1) ---");
  const sample1 = metas.find(m => m.id === 1 && !m.data.__error);
  if (sample1) {
    console.log(JSON.stringify(sample1.data, null, 2));
  }

  return { metas, rarityCounts, imageCIDs, errors, duplicateNames, missingFields, successCount, errorCount };
}

// ─── PART 2: Provenance CID Metadata ─────────────────────────────────────────

async function part2_provenanceCID(deployMetas) {
  console.log("\n" + "═".repeat(80));
  console.log("PART 2: Provenance CID Metadata Check");
  console.log(`CID: ${PROVENANCE_CID}`);
  console.log("═".repeat(80) + "\n");

  // Sample token IDs
  const sampleIds = [1, 10, 25, 33, 50, 66, 75, 88, 95, 100];
  console.log(`Sampling ${sampleIds.length} tokens: ${sampleIds.join(", ")}`);

  const results = await parallelMap(sampleIds, async (id) => {
    const url = `${GATEWAY}/${PROVENANCE_CID}/metadata/${id}.json`;
    const data = await fetchJSON(url);
    return { id, url, data };
  });

  let matchCount = 0;
  let mismatchCount = 0;
  const mismatches = [];

  for (const { id, data } of results) {
    if (data.__error) {
      console.log(`❌ Token #${id}: Fetch error`);
      continue;
    }

    // Find corresponding deploy CID metadata
    const deployMeta = deployMetas.find(m => m.id === id && !m.data.__error);
    if (!deployMeta) {
      console.log(`⚠️  Token #${id}: No deploy CID metadata to compare`);
      continue;
    }

    // Compare key fields
    const issues = [];
    if (data.name !== deployMeta.data.name) issues.push(`name: provenance="${data.name}" vs deploy="${deployMeta.data.name}"`);
    if (data.description !== deployMeta.data.description) issues.push(`description differs`);
    if (data.image !== deployMeta.data.image) issues.push(`image: provenance="${data.image}" vs deploy="${deployMeta.data.image}"`);

    // Compare attributes
    if (Array.isArray(data.attributes) && Array.isArray(deployMeta.data.attributes)) {
      if (data.attributes.length !== deployMeta.data.attributes.length) {
        issues.push(`attributes count: ${data.attributes.length} vs ${deployMeta.data.attributes.length}`);
      } else {
        for (let i = 0; i < data.attributes.length; i++) {
          const pa = data.attributes[i];
          const da = deployMeta.data.attributes[i];
          if (pa.trait_type !== da.trait_type || pa.value !== da.value) {
            issues.push(`attribute[${i}]: provenance={${pa.trait_type}:${pa.value}} vs deploy={${da.trait_type}:${da.value}}`);
          }
        }
      }
    }

    if (issues.length === 0) {
      matchCount++;
      console.log(`✅ Token #${id}: Match`);
    } else {
      mismatchCount++;
      mismatches.push({ id, issues });
      console.log(`❌ Token #${id}: Mismatch`);
      for (const issue of issues) {
        console.log(`    ${issue}`);
      }
    }
  }

  console.log(`\n--- Provenance Comparison Summary ---`);
  console.log(`  Matches: ${matchCount}/${sampleIds.length}`);
  console.log(`  Mismatches: ${mismatchCount}/${sampleIds.length}`);

  return { matchCount, mismatchCount, mismatches };
}

// ─── PART 3: Image Check ─────────────────────────────────────────────────────

async function part3_imageCheck(imageCIDs) {
  console.log("\n" + "═".repeat(80));
  console.log("PART 3: Image Accessibility & Format Check");
  console.log("═".repeat(80) + "\n");

  // Also check unrevealed image
  console.log("--- Checking Unrevealed Image ---");
  const unrevealedUrl = `${GATEWAY}/${UNREVEALED_CID}/unrevealed.png`;
  const unrevRes = await fetchWithRetry(unrevealedUrl, 2, 15000);
  if (unrevRes.ok) {
    const buf = await unrevRes.arrayBuffer();
    const header = Buffer.from(buf.slice(0, 8));
    const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
    console.log(`✅ Unrevealed image accessible (${buf.byteLength} bytes, ${isPNG ? "valid PNG" : "NOT PNG"})`);
  } else {
    console.log(`❌ Unrevealed image not accessible (status ${unrevRes.status})`);
  }

  // Sample images from metadata
  console.log(`\n--- Checking ${IMAGE_SAMPLE_SIZE} Sample Images from Metadata ---`);
  
  // Pick evenly spaced samples
  const sampleStep = Math.max(1, Math.floor(imageCIDs.length / IMAGE_SAMPLE_SIZE));
  const imageSamples = imageCIDs.filter((_, i) => i % sampleStep === 0).slice(0, IMAGE_SAMPLE_SIZE);
  // Make sure we include first and last
  if (imageSamples.length > 0 && imageSamples[0].id !== imageCIDs[0].id) imageSamples.unshift(imageCIDs[0]);
  if (imageSamples.length > 1 && imageSamples[imageSamples.length - 1].id !== imageCIDs[imageCIDs.length - 1].id) {
    imageSamples.push(imageCIDs[imageCIDs.length - 1]);
  }

  const imageResults = await parallelMap(imageSamples, async ({ id, image }) => {
    // Parse image URL — could be ipfs://CID/filename or https://gateway/...
    let imageUrl;
    if (image.startsWith("ipfs://")) {
      const path = image.slice(7); // remove ipfs://
      imageUrl = `${GATEWAY}/${path}`;
    } else if (image.startsWith("https://")) {
      imageUrl = image;
    } else {
      imageUrl = `${GATEWAY}/${image}`;
    }

    const res = await fetchWithRetry(imageUrl, 2, 20000);
    if (!res.ok) {
      return { id, image, imageUrl, accessible: false, status: res.status };
    }

    try {
      const buf = await res.arrayBuffer();
      const header = Buffer.from(buf.slice(0, 8));
      const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
      const isJPEG = header[0] === 0xFF && header[1] === 0xD8;
      const contentType = res.headers.get("content-type") || "unknown";
      return { id, image, imageUrl, accessible: true, size: buf.byteLength, isPNG, isJPEG, contentType };
    } catch (e) {
      return { id, image, imageUrl, accessible: false, error: e.message };
    }
  }, 4); // lower concurrency for image downloads

  let accessibleCount = 0;
  let pngCount = 0;
  let brokenCount = 0;
  let nonPNGCount = 0;

  for (const r of imageResults) {
    if (r.accessible) {
      accessibleCount++;
      const format = r.isPNG ? "PNG" : r.isJPEG ? "JPEG" : "UNKNOWN";
      if (r.isPNG) pngCount++; else nonPNGCount++;
      console.log(`  ✅ Token #${r.id}: ${format}, ${r.size} bytes, content-type: ${r.contentType}`);
    } else {
      brokenCount++;
      console.log(`  ❌ Token #${r.id}: Not accessible (status ${r.status || r.error}) — ${r.imageUrl}`);
    }
  }

  console.log(`\n--- Image Check Summary ---`);
  console.log(`  Accessible: ${accessibleCount}/${imageSamples.length}`);
  console.log(`  PNG format: ${pngCount}/${accessibleCount}`);
  if (nonPNGCount > 0) console.log(`  ⚠️  Non-PNG: ${nonPNGCount}`);
  console.log(`  Broken: ${brokenCount}`);

  // Analyze image URL format consistency
  console.log("\n--- Image URL Format Analysis ---");
  const urlPatterns = {};
  for (const { image } of imageCIDs) {
    let pattern;
    if (image.startsWith("ipfs://")) {
      pattern = "ipfs://CID/...";
    } else if (image.startsWith("https://")) {
      pattern = "https://...";
    } else {
      pattern = "bare CID/path";
    }
    urlPatterns[pattern] = (urlPatterns[pattern] || 0) + 1;
  }
  for (const [pattern, count] of Object.entries(urlPatterns)) {
    console.log(`  ${pattern}: ${count}`);
  }

  // Show a few example image URLs
  console.log("\n  Example image URLs:");
  for (const { id, image } of imageCIDs.slice(0, 3)) {
    console.log(`    Token #${id}: ${image}`);
  }

  return { accessibleCount, pngCount, brokenCount, nonPNGCount, imageResults };
}

// ─── PART 4: Collection Consistency ──────────────────────────────────────────

async function part4_consistency(metas, rarityCounts, duplicateNames, missingFields, imageCIDs) {
  console.log("\n" + "═".repeat(80));
  console.log("PART 4: Collection Consistency Check");
  console.log("═".repeat(80) + "\n");

  // Total supply
  const totalFetched = metas.filter(m => !m.data.__error).length;
  console.log(`Total Supply Check:`);
  console.log(`  ${totalFetched === TOTAL_SUPPLY ? "✅" : "❌"} Fetched ${totalFetched}/${TOTAL_SUPPLY} metadata files`);

  // Token ID coverage
  const fetchedIds = new Set(metas.filter(m => !m.data.__error).map(m => m.id));
  const missingIds = [];
  for (let i = 1; i <= TOTAL_SUPPLY; i++) {
    if (!fetchedIds.has(i)) missingIds.push(i);
  }
  if (missingIds.length === 0) {
    console.log(`  ✅ All token IDs 1-100 present`);
  } else {
    console.log(`  ❌ Missing token IDs: ${missingIds.join(", ")}`);
  }

  // Duplicate names
  console.log(`\nDuplicate Names:`);
  if (duplicateNames.length === 0) {
    console.log(`  ✅ No duplicate names`);
  } else {
    console.log(`  ❌ ${duplicateNames.length} duplicate names found`);
  }

  // Provenance hash placeholder
  console.log(`\nProvenance Hash:`);
  console.log(`  ⚠️  Expected: 15f50e1f...ddff0 (full hash not provided, verify on-chain)`);
  console.log(`  ℹ️  To fully verify, compute SHA-256 of concatenated metadata hashes and compare with on-chain value`);

  // Image URL format consistency
  console.log(`\nImage URL Consistency:`);
  const ipfsPrefix = imageCIDs.filter(i => i.image.startsWith("ipfs://")).length;
  const httpsPrefix = imageCIDs.filter(i => i.image.startsWith("https://")).length;
  const otherPrefix = imageCIDs.length - ipfsPrefix - httpsPrefix;
  console.log(`  ipfs:// prefix: ${ipfsPrefix}`);
  console.log(`  https:// prefix: ${httpsPrefix}`);
  if (otherPrefix > 0) console.log(`  ⚠️  Other format: ${otherPrefix}`);

  // Check if all images share same base CID
  const imageBaseCIDs = new Set();
  for (const { image } of imageCIDs) {
    if (image.startsWith("ipfs://")) {
      const path = image.slice(7);
      const cid = path.split("/")[0];
      imageBaseCIDs.add(cid);
    }
  }
  if (imageBaseCIDs.size === 1) {
    console.log(`  ✅ All images point to single IPFS CID: ${[...imageBaseCIDs][0]}`);
  } else if (imageBaseCIDs.size > 1) {
    console.log(`  ⚠️  Images point to ${imageBaseCIDs.size} different base CIDs`);
    for (const cid of imageBaseCIDs) {
      console.log(`    - ${cid}`);
    }
  }

  // Rarity sum check
  console.log(`\nRarity Sum Check:`);
  const raritySum = Object.values(rarityCounts).reduce((a, b) => a + b, 0);
  console.log(`  ${raritySum === TOTAL_SUPPLY ? "✅" : "❌"} Sum of rarities: ${raritySum} (expected ${TOTAL_SUPPLY})`);

  // Completeness summary
  console.log(`\n--- Overall Completeness ---`);
  const hasAllIds = missingIds.length === 0;
  const noDupes = duplicateNames.length === 0;
  const noMissingFields = missingFields.length === 0;
  const correctSupply = totalFetched === TOTAL_SUPPLY;
  const correctRaritySum = raritySum === TOTAL_SUPPLY;

  const checks = [
    { name: "All 100 tokens fetched", pass: correctSupply },
    { name: "All token IDs 1-100 present", pass: hasAllIds },
    { name: "No duplicate names", pass: noDupes },
    { name: "No missing required fields", pass: noMissingFields },
    { name: "Rarity counts sum to 100", pass: correctRaritySum },
    { name: "Consistent image URL format", pass: ipfsPrefix === imageCIDs.length || httpsPrefix === imageCIDs.length },
  ];

  for (const c of checks) {
    console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}`);
  }

  return checks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║     DOOMHOUND NFT Collection — IPFS Metadata & Image Check     ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`\nGateway: ${GATEWAY}`);
  console.log(`Deploy CID: ${DEPLOY_CID}`);
  console.log(`Provenance CID: ${PROVENANCE_CID}`);
  console.log(`Unrevealed CID: ${UNREVEALED_CID}`);

  const startTime = Date.now();

  // PART 1
  const p1 = await part1_deployCID();

  // PART 2
  const p2 = await part2_provenanceCID(p1.metas);

  // PART 3
  const p3 = await part3_imageCheck(p1.imageCIDs);

  // PART 4
  const p4 = await part4_consistency(p1.metas, p1.rarityCounts, p1.duplicateNames, p1.missingFields, p1.imageCIDs);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ─── Final Summary ────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(80));
  console.log("FINAL SUMMARY");
  console.log("═".repeat(80) + "\n");

  console.log("PART 1 — Deploy CID Metadata:");
  console.log(`  ${p1.successCount === TOTAL_SUPPLY ? "✅" : "❌"} ${p1.successCount}/${TOTAL_SUPPLY} metadata files fetched`);
  console.log(`  ${p1.missingFields.length === 0 ? "✅" : "❌"} Required fields present`);
  console.log(`  ${p1.duplicateNames.length === 0 ? "✅" : "❌"} No duplicate names`);
  console.log(`  Rarity distribution:`);
  for (const [r, c] of Object.entries(p1.rarityCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${r}: ${c}`);
  }

  console.log("\nPART 2 — Provenance CID Comparison:");
  console.log(`  ${p2.mismatchCount === 0 ? "✅" : "❌"} ${p2.matchCount}/${p2.matchCount + p2.mismatchCount} sampled files match deploy CID`);

  console.log("\nPART 3 — Image Check:");
  console.log(`  ${p3.brokenCount === 0 ? "✅" : "❌"} ${p3.accessibleCount}/${p3.accessibleCount + p3.brokenCount} sampled images accessible`);
  console.log(`  ${p3.nonPNGCount === 0 ? "✅" : "❌"} All sampled images are PNG`);

  console.log("\nPART 4 — Collection Consistency:");
  const allPass = p4.every(c => c.pass);
  for (const c of p4) {
    console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}`);
  }

  console.log(`\n⏱  Total time: ${elapsed}s`);
  console.log(allPass ? "\n🎉 Collection passes all checks!" : "\n⚠️  Some issues found — see details above.");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
