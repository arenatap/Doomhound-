#!/bin/bash
# HOUNDS OF THE HELL - Sequential NFT Generator
# One at a time to avoid rate limits

OUTPUT="/home/z/my-project/download/nft"
BASE="Digital art of a demonic hound standing in center of frame facing forward symmetrical composition muscular body two curved demon horns on head glowing eyes studded collar around neck battle scars glowing pentagram symbol on chest mouth closed showing fangs all four paws on ground clean illustration style ABSOLUTELY NO TEXT NO WORDS NO LETTERS NO WRITING NO TYPOGRAPHY NO WATERMARK NO SIGNS NO LABELS NO CHARACTERS"

gen() {
  local n=$1 suffix=$2 traits=$3 bg=$4
  echo "[$n/69] $suffix..."
  z-ai-generate -p "$BASE $traits Background $bg" -o "$OUTPUT/$(printf '%03d' $n)_${suffix}.png" -s 1024x1024 2>&1 | tail -1
  sleep 2
}

# COMMON - HELLFIRE (10)
gen 1 "hellfire_volcanic" "Dark gray fur red-orange flame breath curved obsidian horns glowing pentagram iron studded collar claw scars" "Volcanic eruption with lava flows and fire"
gen 2 "hellfire_forest" "Dark gray fur orange flame breath twisted horns burning pentagram bronze studded collar burn scars" "Burning forest with falling embers"
gen 3 "hellfire_eruption" "Dark gray fur yellow-orange flame breath curved horns etched pentagram iron collar blade scars" "Volcanic eruption with ash cloud"
gen 4 "hellfire_dungeon" "Dark gray fur red flame breath broken horns glowing pentagram bronze collar claw scars" "Underground dungeon with fire pits"
gen 5 "hellfire_cathedral" "Dark gray fur crimson flame breath twisted horns floating pentagram iron collar burn scars" "Gothic cathedral interior on fire"
gen 21 "hellfire_bridge" "Dark gray fur orange flame breath curved horns burning pentagram bronze collar blade scars" "Stone bridge over lava river"
gen 22 "hellfire_forge" "Dark gray fur yellow flame breath obsidian horns etched pentagram iron collar claw scars" "Demonic forge with molten metal"
gen 23 "hellfire_desert" "Dark gray fur red-orange flame breath twisted horns glowing pentagram bronze collar burn scars" "Scorched desert with fire tornadoes"
gen 27 "hellfire_colosseum" "Dark gray fur crimson flame breath curved horns burning pentagram iron collar blade scars" "Ancient colosseum with fire ring"
gen 28 "hellfire_pit" "Dark gray fur orange flame breath broken horns floating pentagram bronze collar claw scars" "Deep fire pit with magma"

# COMMON - BLOOD MOON (10)
gen 6 "bloodmoon_moor" "Dark gray fur blood-red aura curved horns crimson pentagram iron collar blade scars" "Misty moor under blood moon"
gen 7 "bloodmoon_graveyard" "Dark gray fur dark red aura twisted horns etched pentagram bronze collar claw scars" "Graveyard under blood moon"
gen 8 "bloodmoon_manor" "Dark gray fur maroon aura broken horns glowing pentagram iron collar burn scars" "Haunted manor under blood moon"
gen 9 "bloodmoon_battlefield" "Dark gray fur crimson aura curved horns burning pentagram bronze collar blade scars" "Battlefield under blood moon"
gen 10 "bloodmoon_altar" "Dark gray fur blood-red aura twisted horns floating pentagram iron collar claw scars" "Dark altar under blood moon"
gen 24 "bloodmoon_ruins" "Dark gray fur dark red aura broken horns crimson pentagram bronze collar burn scars" "Ancient ruins under blood moon"
gen 25 "bloodmoon_riverbed" "Dark gray fur maroon aura curved horns etched pentagram iron collar blade scars" "Dry riverbed under blood moon"
gen 26 "bloodmoon_circus" "Dark gray fur crimson aura twisted horns glowing pentagram bronze collar claw scars" "Abandoned circus under blood moon"
gen 29 "bloodmoon_lake" "Dark gray fur blood-red aura broken horns burning pentagram iron collar burn scars" "Still lake reflecting blood moon"
gen 30 "bloodmoon_dead_trees" "Dark gray fur dark red aura curved horns floating pentagram bronze collar blade scars" "Dead trees under blood moon"

# COMMON - SHADOW (10)
gen 11 "shadow_void" "Dark gray fur dark purple shadow aura curved horns ethereal pentagram iron collar blade scars" "Deep void darkness"
gen 12 "shadow_forest" "Dark gray fur purple shadow aura twisted horns ghostly pentagram bronze collar claw scars" "Dark forest with shadows"
gen 13 "shadow_city" "Dark gray fur violet aura broken horns floating pentagram iron collar burn scars" "Abandoned city in darkness"
gen 14 "shadow_cave" "Dark gray fur dark purple aura curved horns glowing pentagram bronze collar blade scars" "Deep cave with shadows"
gen 15 "shadow_mirrors" "Dark gray fur purple aura twisted horns etched pentagram iron collar claw scars" "Hall of mirrors in darkness"
gen 16 "shadow_crossroads" "Dark gray fur violet aura broken horns burning pentagram bronze collar burn scars" "Crossroads in dark fog"
gen 17 "shadow_cliff" "Dark gray fur dark purple aura curved horns ethereal pentagram iron collar blade scars" "Cliff edge in darkness"
gen 18 "shadow_church" "Dark gray fur purple aura twisted horns ghostly pentagram bronze collar claw scars" "Abandoned church in shadows"
gen 19 "shadow_crypt" "Dark gray fur violet aura broken horns floating pentagram iron collar blade scars" "Underground crypt"
gen 20 "shadow_portal" "Dark gray fur dark purple aura curved horns glowing pentagram bronze collar burn scars" "Dark portal with shadows"

# UNCOMMON - FROST (7)
gen 31 "frost_tundra" "Steel-blue fur ice-blue breath crystal horns frozen pentagram silver collar frostbite scars" "Frozen tundra with ice crystals"
gen 32 "frost_cavern" "Steel-blue fur white-blue breath ice horns etched ice pentagram silver collar frostbite scars" "Ice cavern with stalactites"
gen 33 "frost_lake" "Steel-blue fur pale-blue breath crystal horns floating ice pentagram silver collar frostbite scars" "Frozen lake under aurora"
gen 34 "frost_ship" "Steel-blue fur ice-blue breath icicle horns glowing ice pentagram silver collar frostbite scars" "Ghost ship on frozen sea"
gen 35 "frost_castle" "Steel-blue fur white-blue breath crystal horns burning ice pentagram silver collar frostbite scars" "Ice castle with frost spires"
gen 36 "frost_glacier" "Steel-blue fur pale-blue breath ice horns frozen pentagram silver collar frostbite scars" "Massive glacier landscape"
gen 37 "frost_battlefield" "Steel-blue fur ice-blue breath icicle horns etched ice pentagram silver collar frostbite scars" "Frozen battlefield with ice"

# UNCOMMON - TOXIC (7)
gen 38 "toxic_wasteland" "Sickly green fur green toxic breath bone horns toxic pentagram neon green collar acid scars" "Toxic wasteland with pools"
gen 39 "toxic_nuclear" "Sickly green fur radioactive green breath decayed horns glowing toxic pentagram neon collar acid scars" "Nuclear wasteland with radiation"
gen 40 "toxic_chemical" "Sickly green fur lime-green breath corroded horns etched toxic pentagram neon collar acid scars" "Chemical plant ruins"
gen 41 "toxic_swamp" "Sickly green fur green toxic breath bone horns floating toxic pentagram neon collar acid scars" "Toxic swamp with bubbling pools"
gen 42 "toxic_sewers" "Sickly green fur radioactive breath decayed horns burning toxic pentagram neon collar acid scars" "Sewer system with toxic flow"
gen 43 "toxic_lab" "Sickly green fur lime-green breath corroded horns glowing toxic pentagram neon collar acid scars" "Abandoned lab with chemicals"
gen 44 "toxic_rain" "Sickly green fur green toxic breath bone horns ethereal toxic pentagram neon collar acid scars" "Toxic rain over dead city"

# UNCOMMON - STORM (6)
gen 45 "storm_thunder" "Dark blue fur electric blue breath lightning horns electric pentagram platinum collar electrical scars" "Thunderstorm with lightning"
gen 46 "storm_hurricane" "Dark blue fur blue-white breath crackling horns sparking pentagram platinum collar electrical scars" "Hurricane with dark clouds"
gen 47 "storm_grid" "Dark blue fur electric breath charged horns digital storm pentagram platinum collar electrical scars" "Electric grid in storm"
gen 48 "storm_tesla" "Dark blue fur blue-white breath tesla horns crackling pentagram platinum collar electrical scars" "Tesla coils and lightning"
gen 49 "storm_peak" "Dark blue fur electric blue breath lightning horns sparking pentagram platinum collar electrical scars" "Mountain peak in storm"
gen 50 "storm_tornado" "Dark blue fur blue-white breath crackling horns electric pentagram platinum collar electrical scars" "Tornado with lightning"

# RARE - CYBERPUNK (4)
gen 51 "cyber_neon" "Neon-accented dark fur neon pink breath cybernetic horns digital pentagram neon collar circuit scars" "Neon-lit cyberpunk city street"
gen 52 "cyber_matrix" "Neon-accented dark fur neon green breath chrome horns matrix pentagram neon collar data scars" "Matrix code digital void"
gen 53 "cyber_mech" "Neon-accented dark fur neon blue breath mechanical horns holographic pentagram neon collar tech scars" "Mechanical workshop neon lit"
gen 54 "cyber_rooftop" "Neon-accented dark fur neon pink breath augmented horns glitch pentagram neon collar laser scars" "Rooftop overlooking neon city"

# RARE - COSMIC (3)
gen 55 "cosmic_nebula" "Deep purple fur starlight breath cosmic crystal horns constellation pentagram starlight collar cosmic scars" "Colorful nebula in deep space"
gen 56 "cosmic_planet" "Deep purple fur golden breath cosmic horns orbital pentagram starlight collar cosmic scars" "Planet surface in space"
gen 57 "cosmic_blackhole" "Deep purple fur white starlight breath cosmic horns gravitational pentagram starlight collar cosmic scars" "Black hole with accretion disk"

# RARE - VOID (3)
gen 58 "void_abyss" "Void-black fur dark energy breath void horns collapsing pentagram void collar void scars" "Abyss of pure darkness"
gen 59 "void_rift" "Void-black fur dark purple breath fractured horns rift pentagram void collar void scars" "Dimensional rift in reality"
gen 60 "void_entropy" "Void-black fur dark violet breath disintegrating horns entropy pentagram void collar void scars" "Heat death entropy landscape"

# EPIC - MEDIEVAL (2)
gen 61 "medieval_castle" "Armored dark fur fiery breath medieval war horns ancient pentagram gold-trimmed collar war scars" "Medieval castle siege at dusk"
gen 62 "medieval_siege" "Armored dark fur orange breath battle-worn horns sigil pentagram gold-trimmed collar battle scars" "Medieval battlefield with siege"

# EPIC - UNDERWORLD (2)
gen 63 "underworld_gate" "Charred dark fur soul-fire breath underworld gate horns soul pentagram soul-fire collar divine scars" "Gates of the underworld"
gen 64 "underworld_river" "Charred dark fur green soul-fire breath river-stone horns flowing pentagram soul-fire collar divine scars" "River Styx in underworld"

# EPIC - PLAGUE (2)
gen 65 "plague_town" "Pale rotting fur pestilence breath decaying horns plague pentagram bone collar plague scars" "Plague-ridden medieval town"
gen 66 "plague_grave" "Pale rotting fur toxic breath skull horns death pentagram bone collar plague scars" "Mass grave with plague mist"

# LEGENDARY (3)
gen 67 "legendary_diamond" "Crystalline diamond fur prismatic light breath diamond horns refracting pentagram diamond-studded collar light scars" "Diamond cavern with prismatic light"
gen 68 "legendary_golden" "Pure gold fur golden flame breath golden crown horns sacred golden pentagram golden collar divine scars" "Golden throne room heavenly"
gen 69 "legendary_ghost" "Translucent ethereal fur spectral breath spectral horns ghostly pentagram spectral collar ethereal scars" "Between dimensions ghostly void"

echo ""
echo "========================================="
echo "🐺 HOUNDS OF THE HELL - Complete!"
echo "========================================="
