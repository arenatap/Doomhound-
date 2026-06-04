#!/bin/bash
# Analyze all 100 NFT images with VLM and extract visual traits
# Output: JSON with traits for each image

OUTPUT_DIR="/home/z/my-project/nft-analysis"
mkdir -p "$OUTPUT_DIR"

PROMPT='Analyze this NFT image of a hound/hellhound character. Return ONLY a JSON object with these exact fields:
{
  "breed": "one word describing the type of hound (e.g. Shadow, Infernal, Frost, Void, Blood, Ghost, Doom, Crystal, Toxic, Bone, Magma, Storm, Plague, Dark, Iron)",
  "eyes": "describe the eyes (e.g. Red Glow, Blue Ice, Golden, Void Black, Green Toxic, Purple Soul, White Blind, Orange Fire, Cyan, No Eyes)",
  "armor": "describe armor/accessories (e.g. None, Bone Collar, Iron Chain, Gold Crown, Shadow Cloak, Fire Helm, Crystal Plate, Spiked Collar, Demon Wings, Blood Band)",
  "special": "most unique feature (e.g. None, Scar, Glowing Mark, Horns, Wings, Crown, Chains, Multiple Heads, Fire Aura, Shadow Aura, Crystal Body, Bone Exposed)",
  "background": "describe the background (e.g. Dark Cave, Blood Moon, Hellfire, Void, Ice Realm, Storm, Forest, Lava, Crypt, Shadow Realm, Crimson Sky, Fog)",
  "color_primary": "primary color of the hound (e.g. Black, Red, Blue, Purple, Green, White, Gold, Grey, Brown, Orange)",
  "color_secondary": "secondary/accent color",
  "rarity_suggestion": "based on visual complexity/uniqueness: Common, Rare, Epic, or Legendary"
}

Return ONLY the JSON, no other text.'

for i in $(seq 1 100); do
  IMAGE="/home/z/my-project/upload/nft-organized/${i}.png"
  OUTPUT="${OUTPUT_DIR}/${i}.json"
  
  if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
    echo "⏭️  Skipping $i (already analyzed)"
    continue
  fi
  
  echo "🔍 Analyzing image $i/100..."
  
  z-ai vision -p "$PROMPT" -i "$IMAGE" -o "$OUTPUT" 2>/dev/null
  
  if [ $? -eq 0 ] && [ -s "$OUTPUT" ]; then
    echo "✅ $i done"
  else
    echo "❌ $i failed"
  fi
  
  # Small delay to avoid rate limiting
  sleep 1
done

echo ""
echo "🎉 Analysis complete! Results in $OUTPUT_DIR"
