#!/bin/bash
START=$1
END=$2
OUTPUT_DIR="/home/z/my-project/nft-analysis"
mkdir -p "$OUTPUT_DIR"

PROMPT='Analyze this NFT image of a hound/hellhound character. Return ONLY a JSON object with these exact fields: {"breed": "one word type", "eyes": "describe eyes", "armor": "describe armor/accessories", "special": "most unique feature", "background": "describe background", "color_primary": "primary color", "color_secondary": "secondary color", "rarity_suggestion": "Common or Rare or Epic or Legendary"} Return ONLY valid JSON, no other text.'

for i in $(seq $START $END); do
  IMAGE="/home/z/my-project/upload/nft-organized/${i}.png"
  OUTPUT="${OUTPUT_DIR}/${i}.json"
  
  if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
    echo "SKIP $i"
    continue
  fi
  
  z-ai vision -p "$PROMPT" -i "$IMAGE" -o "$OUTPUT" 2>/dev/null
  
  if [ -s "$OUTPUT" ]; then
    echo "OK $i"
  else
    echo "FAIL $i"
  fi
  
  sleep 0.5
done
