"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Crosshair } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

// ===== RAID TEMPLATES =====
const RAID_TEMPLATES = [
  {
    id: "shill",
    label: "🚀 Shill Template",
    text: "$DOOMHOUND is the most feared contender on The Arena 🐺🔥 Can't Kill What's Already From Hell! Join the pack → arena.social",
  },
  {
    id: "hype",
    label: "🔥 Hype Post",
    text: "The Hound awakens. $DOOMHOUND is coming for EVERYTHING. Rugs fear the Hound. The pack grows stronger by the minute 🐕💨",
  },
  {
    id: "raid",
    label: "⚔️ Raid Call",
    text: "🐺 RAID CALL! $DOOMHOUND pack — assemble! Like, repost, and engage. Let's make the Hound trend on The Arena! #DOOMHOUND #TheArena",
  },
  {
    id: "fud_slayer",
    label: "🛡️ FUD Slayer",
    text: "Fudders fear the Hound. $DOOMHOUND has the strongest pack on The Arena. We don't die, we multiply 🐺🔥💎",
  },
  {
    id: "holder",
    label: "💎 Diamond Hands",
    text: "Every dip is a gift from the abyss. $DOOMHOUND holders know: you can't kill what's already from hell 🐺🔥 HODL with the pack!",
  },
];

// ===== RAID TARGETS =====
const RAID_TARGETS = [
  { hashtag: "#DOOMHOUND", url: "https://arena.social/search?q=%23DOOMHOUND" },
  { hashtag: "#TheArena", url: "https://arena.social/search?q=%23TheArena" },
  { hashtag: "$DOOMHOUND", url: "https://arena.social/search?q=%24DOOMHOUND" },
  { hashtag: "#Memecoins", url: "https://arena.social/search?q=%23Memecoins" },
  { hashtag: "#AVAX", url: "https://arena.social/search?q=%23AVAX" },
  { hashtag: "#Crypto", url: "https://arena.social/search?q=%23Crypto" },
];

// ===== BATTLE CRY GENERATOR =====
const CRY_SUBJECTS = [
  "The Hound", "The Pack", "$DOOMHOUND", "The Abyss", "Hell's Guardian",
  "The Alpha", "The Shadow Fang", "The Demon", "The Fire Beast",
];
const CRY_VERBS = [
  "devours", "annihilates", "incinerates", "shatters", "unleashes",
  "conquers", "dominates", "obliterates", "purifies", "consumes",
];
const CRY_OBJECTS = [
  "all rugs", "the weak-handed", "the fudders", "the competition",
  "the doubters", "the paper hands", "the bear market", "the unbelievers",
  "every ceiling", "the boundaries",
];
const CRY_ENDINGS = [
  "🔥", "🐺", "💀", "⚡", "🗡️", "🔥🐺", "💀🔥", "⚡🐺",
  "— THE PACK IS UNSTOPPABLE 🔥",
  "— BOW BEFORE THE HOUND 💀",
  "— HELL TAKES NO PRISONERS 🐺",
  "— CAN'T KILL WHAT'S FROM HELL 🔥",
];

function generateBattleCry(): string {
  const subj = CRY_SUBJECTS[Math.floor(Math.random() * CRY_SUBJECTS.length)];
  const verb = CRY_VERBS[Math.floor(Math.random() * CRY_VERBS.length)];
  const obj = CRY_OBJECTS[Math.floor(Math.random() * CRY_OBJECTS.length)];
  const ending = CRY_ENDINGS[Math.floor(Math.random() * CRY_ENDINGS.length)];
  return `${subj} ${verb} ${obj} ${ending}`;
}

// ===== COPY BUTTON =====
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-1.5 rounded-lg bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function WarRoomSection() {
  const [battleCry, setBattleCry] = useState("");
  const [cryCopied, setCryCopied] = useState(false);

  const generateCry = useCallback(() => {
    setBattleCry(generateBattleCry());
    setCryCopied(false);
  }, []);

  const copyCry = useCallback(() => {
    if (battleCry) {
      navigator.clipboard.writeText(battleCry);
      setCryCopied(true);
      setTimeout(() => setCryCopied(false), 2000);
    }
  }, [battleCry]);

  return (
    <section id="war-room" className="relative py-16 sm:py-20 md:py-28 bg-[#0a0a0a] overflow-hidden">
      {/* Top flame line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />

      {/* Crosshair background decoration */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <Crosshair className="w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] text-red-500" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 md:px-16">
        {/* Header */}
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-3 sm:mb-5">
            WAR ROOM
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-2xl mx-auto">
            Coordinate raids. Spread the word. The Hound&apos;s army doesn&apos;t wait — we attack.
          </p>
        </ScrollReveal>

        <div className="space-y-6 sm:space-y-8">
          {/* Battle Cry Generator */}
          <ScrollReveal delay={0.1}>
            <div className="bg-[#1a1a1a] border border-red-900/30 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-900/20 to-orange-900/20 border-b border-[#2a2a2a] flex items-center gap-2">
                <span className="text-base sm:text-lg">⚔️</span>
                <h3 className="font-creepster text-lg sm:text-xl text-red-400">Battle Cry Generator</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 mb-4 min-h-[3rem] flex items-center">
                  {battleCry ? (
                    <p className="text-red-300 font-creepster text-base sm:text-lg md:text-xl animate-glow-red">
                      {battleCry}
                    </p>
                  ) : (
                    <p className="text-gray-600 text-xs sm:text-sm italic">
                      Click &quot;Generate&quot; to summon a battle cry from the abyss...
                    </p>
                  )}
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={generateCry}
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.3)] hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all"
                  >
                    🎲 GENERATE CRY
                  </button>
                  {battleCry && (
                    <button
                      onClick={copyCry}
                      className="px-4 py-2.5 sm:py-3 bg-[#2a2a2a] hover:bg-red-900/30 text-gray-300 hover:text-red-400 font-bold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {cryCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {cryCopied ? "COPIED!" : "COPY"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Raid Templates */}
          <ScrollReveal delay={0.2}>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#2a2a2a] flex items-center gap-2">
                <span className="text-base sm:text-lg">📋</span>
                <h3 className="font-creepster text-lg sm:text-xl text-orange-400">Raid Templates</h3>
              </div>
              <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                {RAID_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 hover:border-red-900/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-white text-xs sm:text-sm font-bold">{template.label}</span>
                      <CopyButton text={template.text} />
                    </div>
                    <p className="text-gray-400 text-[11px] sm:text-xs leading-relaxed">{template.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Raid Targets + Arena Link */}
          <ScrollReveal delay={0.3}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Raid Targets */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#2a2a2a] flex items-center gap-2">
                  <span className="text-base sm:text-lg">🎯</span>
                  <h3 className="font-creepster text-lg sm:text-xl text-red-400">Raid Targets</h3>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex flex-wrap gap-2">
                    {RAID_TARGETS.map((target) => (
                      <a
                        key={target.hashtag}
                        href={target.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-red-400 hover:text-orange-400 hover:border-red-600/40 text-xs sm:text-sm font-bold transition-all hover:shadow-[0_0_10px_rgba(220,38,38,0.2)] flex items-center gap-1.5"
                      >
                        {target.hashtag}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Post on Arena */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#2a2a2a] flex items-center gap-2">
                  <span className="text-base sm:text-lg">🐺</span>
                  <h3 className="font-creepster text-lg sm:text-xl text-orange-400">Deploy to Arena</h3>
                </div>
                <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-4 min-h-[140px] sm:min-h-[180px]">
                  <p className="text-gray-400 text-xs sm:text-sm text-center">
                    Launch your raid directly on The Arena
                  </p>
                  <a
                    href="https://arena.social/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 sm:px-8 py-3 sm:py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] transition-all animate-breathing-glow flex items-center gap-2"
                  >
                    ⚔️ POST ON ARENA
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
