#!/bin/bash
# ============================================
# HOUNDS OF HELL — Full 666 NFT Generation Pipeline
# ============================================
# Usage: bash generate_all.sh [start] [end]
# Example: bash generate_all.sh 1 50   (generate first 50)
# Example: bash generate_all.sh 1 666  (generate all)
# ============================================

START=${1:-1}
END=${2:-666}
BATCH_SIZE=5  # parallel generation
OUTPUT_DIR="/home/z/my-project/nft-system/images"
METADATA_DIR="/home/z/my-project/nft-system/metadata"
PROMPT_FILE="/home/z/my-project/nft-system/all_prompts.json"

mkdir -p "$OUTPUT_DIR" "$METADATA_DIR"

echo "🔥 HOUNDS OF HELL — Batch Generator"
echo "===================================="
echo "Generating NFTs $START to $END"
echo "Batch size: $BATCH_SIZE parallel"
echo ""

# Extract prompts using node
TOTAL=$(node -e "const p=require('$PROMPT_FILE'); console.log(p.length);")

count=0
failed=0

for ((i=START; i<=END; i++)); do
  # Get prompt for this token
  PROMPT=$(node -e "const p=require('$PROMPT_FILE'); const item=p.find(x=>x.tokenId===$i); if(item) console.log(item.prompt); else process.exit(1);")
  
  if [ $? -ne 0 ] || [ -z "$PROMPT" ]; then
    echo "❌ No prompt found for token $i"
    ((failed++))
    continue
  fi
  
  # Check if already generated
  if [ -f "$OUTPUT_DIR/$i.png" ]; then
    echo "⏭️  Hound #$i already exists, skipping"
    continue
  fi
  
  # Generate in background (limited parallelism via batch tracking)
  z-ai-generate -p "$PROMPT" -o "$OUTPUT_DIR/$i.png" -s 1024x1024 2>/dev/null &
  
  ((count++))
  
  # Wait for batch to complete every BATCH_SIZE items
  if (( count % BATCH_SIZE == 0 )); then
    echo "⏳ Waiting for batch of $BATCH_SIZE to complete..."
    wait
    echo "✅ Batch complete ($count/$((END-START+1)))"
  fi
done

# Wait for remaining
wait

echo ""
echo "🎉 Generation complete!"
echo "   Generated: $count images"
echo "   Failed: $failed"
echo "   Output: $OUTPUT_DIR/"

# Generate all metadata files
echo ""
echo "📝 Generating metadata JSON files..."
node -e "
const { generateAllNFTs, generateMetadata } = require('/home/z/my-project/nft-system/generate.js');
const fs = require('fs');
const nfts = generateAllNFTs();
const start = $START;
const end = $END;

nfts.filter(n => n.tokenId >= start && n.tokenId <= end).forEach(nft => {
  const metadata = generateMetadata(nft, 'ipfs://Qm.../' + nft.tokenId + '.png');
  fs.writeFileSync('/home/z/my-project/nft-system/metadata/' + nft.tokenId + '.json', JSON.stringify(metadata, null, 2));
});
console.log('✅ Metadata generated for tokens ' + start + '-' + end);
"

echo ""
echo "🔥 ALL DONE! Next steps:"
echo "   1. Review images in $OUTPUT_DIR/"
echo "   2. Upload to IPFS (pinata or nft.storage)"
echo "   3. Update metadata image URLs with IPFS CIDs"
echo "   4. Deploy contract and mint"
