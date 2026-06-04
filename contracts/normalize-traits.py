#!/usr/bin/env python3
"""
Normalize VLM analysis into clean NFT traits and update metadata files.
Reads from /home/z/my-project/nft-analysis/*.json
Updates /home/z/my-project/metadata/*.json
"""
import json
import os
import re
from collections import Counter

ANALYSIS_DIR = "/home/z/my-project/nft-analysis"
METADATA_DIR = "/home/z/my-project/metadata"

# ===== NORMALIZATION RULES =====

def normalize_eyes(raw):
    """Normalize eye descriptions into clean trait values."""
    r = raw.lower()
    if "red" in r:
        return "Red Glow"
    if "orange" in r:
        return "Orange Fire"
    if "yellow" in r and "red" in r:
        return "Amber Blaze"
    if "yellow" in r:
        return "Yellow Blaze"
    if "blue" in r:
        return "Blue Ice"
    if "purple" in r or "violet" in r:
        return "Purple Soul"
    if "green" in r:
        return "Green Toxic"
    if "white" in r or "blind" in r:
        return "White Void"
    if "cyan" in r:
        return "Cyan Storm"
    if "pink" in r:
        return "Pink Hex"
    if "gold" in r:
        return "Golden Gaze"
    if "multi" in r or "rainbow" in r:
        return "Chromatic"
    return "Crimson Glow"

def normalize_color(raw):
    """Normalize color descriptions into clean trait values."""
    r = raw.lower()
    if "black" in r and "gray" in r:
        return "Shadow"
    if "black" in r:
        return "Obsidian"
    if "dark gray" in r or "gray" in r or "grey" in r:
        return "Ash"
    if "white" in r or "silver" in r:
        return "Ghost"
    if "red" in r and "dark" in r:
        return "Blood"
    if "red" in r:
        return "Crimson"
    if "green" in r and "bright" in r:
        return "Toxic"
    if "green" in r:
        return "Venom"
    if "blue" in r:
        return "Frost"
    if "purple" in r or "violet" in r:
        return "Void"
    if "orange" in r:
        return "Magma"
    if "gold" in r or "golden" in r:
        return "Royal"
    if "brown" in r:
        return "Earth"
    if "pink" in r:
        return "Hex"
    if "cyan" in r or "teal" in r:
        return "Crystal"
    return "Dark"

def normalize_armor(raw):
    """Normalize armor descriptions into clean trait values."""
    r = raw.lower()
    if "none" in r or "no armor" in r or "bare" in r:
        return "None"
    if "crown" in r and "crystal" in r:
        return "Crystal Crown"
    if "crown" in r:
        return "Demon Crown"
    if "golden chain" in r or "gold chain" in r:
        return "Gold Chain"
    if "crystal" in r or "gemstone" in r:
        return "Crystal Collar"
    if "bone" in r or "skull" in r:
        return "Bone Collar"
    if "pentagram" in r or "pentagram" in r:
        return "Pentagram Collar"
    if "spiked" in r and "star" in r:
        return "Spiked Star Collar"
    if "spiked" in r:
        return "Spiked Collar"
    if "fiery" in r or "fire" in r:
        return "Fire Collar"
    if "chain" in r:
        return "Chain Collar"
    if "iron" in r:
        return "Iron Collar"
    if "shadow" in r:
        return "Shadow Cloak"
    if "hood" in r or "cloak" in r:
        return "Dark Hood"
    if "helmet" in r or "helm" in r:
        return "War Helm"
    if "plate" in r or "armor" in r:
        return "Battle Plate"
    if "collar" in r and "doomhound" in r:
        return "DOOMHOUND Collar"
    if "collar" in r:
        return "Spiked Collar"
    if "tag" in r or "medallion" in r:
        return "Tag Collar"
    return "Spiked Collar"

def normalize_special(raw):
    """Normalize special feature descriptions into clean trait values."""
    r = raw.lower()
    if "rainbow" in r:
        return "Rainbow Fire"
    if "wing" in r and "horn" in r:
        return "Winged & Horned"
    if "wing" in r:
        return "Winged"
    if "horn" in r and "crystal" in r:
        return "Crystal Horns"
    if "horn" in r and "multi" in r:
        return "Multi Horns"
    if "horn" in r:
        return "Horned"
    if "breathing" in r or "breath" in r:
        if "blue" in r:
            return "Blue Fire Breath"
        if "purple" in r or "violet" in r:
            return "Purple Fire Breath"
        if "green" in r:
            return "Green Fire Breath"
        if "rainbow" in r:
            return "Rainbow Fire"
        if "white" in r:
            return "White Fire Breath"
        return "Fire Breath"
    if "aura" in r and "fire" in r:
        return "Fire Aura"
    if "aura" in r and "shadow" in r:
        return "Shadow Aura"
    if "aura" in r:
        return "Dark Aura"
    if "scar" in r:
        return "Battle Scar"
    if "glow" in r or "mark" in r:
        return "Glowing Marks"
    if "chain" in r:
        return "Chained"
    if "crystal" in r and "bod" in r:
        return "Crystal Body"
    if "crystal" in r:
        return "Crystal Form"
    if "multi" in r and "face" in r or "multi" in r and "head" in r:
        return "Multi-Head"
    if "skull" in r or "bone" in r:
        return "Bone Exposed"
    if "tattoo" in r:
        return "Tribal Marks"
    if "none" in r:
        return "None"
    if "fire" in r:
        return "Fire Aura"
    return "Fire Breath"

def normalize_background(raw):
    """Normalize background descriptions into clean trait values."""
    r = raw.lower()
    if "forest" in r and "mist" in r:
        return "Dark Forest"
    if "forest" in r:
        return "Dark Forest"
    if "cave" in r and "crystal" in r:
        return "Crystal Cave"
    if "cave" in r:
        return "Dark Cave"
    if "volcan" in r or "erupt" in r:
        return "Volcanic"
    if "inferno" in r or "raging flame" in r or "infernal" in r:
        return "Inferno"
    if "flame" in r or "lava" in r or "fire" in r:
        return "Hellfire"
    if "storm" in r and "lightning" in r:
        return "Thunderstorm"
    if "storm" in r:
        return "Storm"
    if "blood moon" in r:
        return "Blood Moon"
    if "moon" in r:
        return "Moonlit"
    if "star" in r:
        return "Starry Void"
    if "void" in r:
        return "Void"
    if "ice" in r or "snow" in r or "frozen" in r:
        return "Ice Realm"
    if "crypt" in r or "grave" in r or "dungeon" in r:
        return "Crypt"
    if "fog" in r or "mist" in r:
        return "Fog"
    if "desert" in r:
        return "Wasteland"
    if "crimson" in r or "red sky" in r:
        return "Crimson Sky"
    if "rocky" in r or "mountain" in r:
        return "Rocky Terrain"
    if "dark" in r:
        return "Darkness"
    return "Hellfire"

def determine_rarity(traits_raw):
    """Determine rarity based on visual complexity and uniqueness of features."""
    special = traits_raw.get("special", "").lower()
    armor = traits_raw.get("armor", "").lower()
    color_p = traits_raw.get("color_primary", "").lower()
    color_s = traits_raw.get("color_secondary", "").lower()
    eyes = traits_raw.get("eyes", "").lower()
    rarity_suggestion = traits_raw.get("rarity_suggestion", "").lower()
    
    score = 0
    
    # Legendary indicators
    if "rainbow" in special:
        score += 5
    if "wing" in special and "horn" in special:
        score += 4
    if "wing" in special:
        score += 3
    if "crystal" in special and "horn" in special:
        score += 3
    if "multi" in special:
        score += 4
    if "crystal bod" in special:
        score += 3
    
    # Crown = Legendary
    if "crown" in armor:
        score += 4
    if "crystal" in armor:
        score += 2
    if "gold" in armor:
        score += 2
    
    # Unique colors
    if "gold" in color_p or "royal" in color_p:
        score += 2
    if "white" in color_p or "ghost" in color_p:
        score += 1
    if "purple" in color_s or "void" in color_s:
        score += 1
    
    # VLM suggestion weight
    if "legendary" in rarity_suggestion:
        score += 2
    
    # Assign rarity based on score
    if score >= 7:
        return "Legendary"
    elif score >= 5:
        return "Epic"
    elif score >= 3:
        return "Rare"
    else:
        return "Common"

def normalize_breed(raw, color_primary):
    """Create breed name based on primary color."""
    color = normalize_color(color_primary)
    breed_map = {
        "Obsidian": "Shadow Fang",
        "Shadow": "Night Stalker",
        "Ash": "Ghost Howler",
        "Ghost": "Phantom Hound",
        "Blood": "Blood Hunter",
        "Crimson": "Hell Hound",
        "Toxic": "Plague Hound",
        "Venom": "Venom Fang",
        "Frost": "Ice Wolf",
        "Void": "Void Walker",
        "Magma": "Magma Hound",
        "Royal": "King Hound",
        "Earth": "Doom Bringer",
        "Hex": "Hex Hound",
        "Crystal": "Crystal Wolf",
        "Dark": "Dark Hound",
    }
    return breed_map.get(color, "Hell Hound")


# ===== MAIN PROCESSING =====

all_traits = {}

for i in range(1, 101):
    analysis_path = os.path.join(ANALYSIS_DIR, f"{i}.json")
    metadata_path = os.path.join(METADATA_DIR, f"{i}.json")
    
    if not os.path.exists(analysis_path):
        print(f"⚠️  Missing analysis for #{i}")
        continue
    
    # Read VLM analysis
    with open(analysis_path) as f:
        data = json.load(f)
    
    content = data["choices"][0]["message"]["content"]
    
    # Parse JSON from content (handle markdown code blocks)
    if "```" in content:
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    
    try:
        traits_raw = json.loads(content.strip())
    except json.JSONDecodeError:
        print(f"❌ Failed to parse #{i}: {content[:100]}")
        continue
    
    # Normalize traits
    color_primary = traits_raw.get("color_primary", "black")
    rarity = determine_rarity(traits_raw)
    
    normalized = {
        "breed": normalize_breed(traits_raw.get("breed", ""), color_primary),
        "eyes": normalize_eyes(traits_raw.get("eyes", "")),
        "armor": normalize_armor(traits_raw.get("armor", "")),
        "special": normalize_special(traits_raw.get("special", "")),
        "background": normalize_background(traits_raw.get("background", "")),
        "color": normalize_color(color_primary),
        "rarity": rarity,
    }
    
    all_traits[i] = normalized
    
    # Update metadata file
    with open(metadata_path) as f:
        metadata = json.load(f)
    
    metadata["attributes"] = [
        {"trait_type": "Rarity", "value": normalized["rarity"]},
        {"trait_type": "Breed", "value": normalized["breed"]},
        {"trait_type": "Eyes", "value": normalized["eyes"]},
        {"trait_type": "Armor", "value": normalized["armor"]},
        {"trait_type": "Special", "value": normalized["special"]},
        {"trait_type": "Background", "value": normalized["background"]},
        {"trait_type": "Color", "value": normalized["color"]},
        {"display_type": "number", "trait_type": "Generation", "value": 1},
    ]
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ #{i}: {normalized['rarity']} | {normalized['breed']} | {normalized['eyes']} | {normalized['special']}")

# ===== STATS =====
print("\n" + "="*60)
print("FINAL RARITY DISTRIBUTION")
print("="*60)
rarity_counter = Counter(t["rarity"] for t in all_traits.values())
for r in ["Legendary", "Epic", "Rare", "Common"]:
    print(f"  {r}: {rarity_counter.get(r, 0)}")

print("\nFINAL BREED DISTRIBUTION")
breed_counter = Counter(t["breed"] for t in all_traits.values())
for k, v in breed_counter.most_common():
    print(f"  {k}: {v}")

print("\nFINAL EYES DISTRIBUTION")
eyes_counter = Counter(t["eyes"] for t in all_traits.values())
for k, v in eyes_counter.most_common():
    print(f"  {k}: {v}")

print("\nFINAL SPECIAL DISTRIBUTION")
special_counter = Counter(t["special"] for t in all_traits.values())
for k, v in special_counter.most_common():
    print(f"  {k}: {v}")

print("\nFINAL BACKGROUND DISTRIBUTION")
bg_counter = Counter(t["background"] for t in all_traits.values())
for k, v in bg_counter.most_common():
    print(f"  {k}: {v}")

print("\nFINAL COLOR DISTRIBUTION")
color_counter = Counter(t["color"] for t in all_traits.values())
for k, v in color_counter.most_common():
    print(f"  {k}: {v}")
