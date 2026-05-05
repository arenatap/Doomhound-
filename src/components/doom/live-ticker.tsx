"use client";

import { useMemo } from "react";

// ===== TICKER DATA =====
const PRE_LAUNCH_MESSAGES = [
  "🔥 $DOOMHOUND launching soon on The Arena",
  "🐺 Join the pack — register now!",
  "💀 Rugs fear the Hound",
  "🔥 $DOOMHOUND — Can't Kill What's Already From Hell",
  "🐺 The Arena's Most Feared Contender is coming",
  "💀 Don't fade the Hound. The pack is growing",
  "🔥 Pre-launch hype is REAL — get in early",
  "🐺 Every hound starts as a pup. Rise through the ranks",
];

const SIMULATED_BUYS = [
  "🐋 Whale bought 5M $DOOM — 2.3 AVAX",
  "🐕 0x7f2...3a bought 1.2M $DOOM — 0.8 AVAX",
  "🔥 New holder! 42 holders total",
  "🐋 0xa1e...9f bought 10M $DOOM — 4.1 AVAX",
  "🐕 New pack member! 69 holders and counting",
  "🐋 0xb3c...7d bought 3.5M $DOOM — 1.5 AVAX",
  "🔥 Volume spiking! 150K AVAX in 1h",
  "🐕 0x9d4...2e bought 800K $DOOM — 0.3 AVAX",
  "🐋 Mega buy! 20M $DOOM — 8.2 AVAX",
  "🔥 Holder count: 100+ and growing fast",
];

// ===== MARQUEE KEYFRAMES =====
// We inject a CSS keyframe for the scroll animation
const MARQUEE_CSS = `
@keyframes doom-ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.doom-ticker-track {
  animation: doom-ticker-scroll 40s linear infinite;
}
.doom-ticker-track:hover {
  animation-play-state: paused;
}
`;

export function LiveTicker() {
  const isLaunched = !!(process.env.NEXT_PUBLIC_DOOMHOUND_SUBJECT_ID);

  const messages = useMemo(() => {
    if (isLaunched) {
      // Mix simulated buys with some hype messages
      return [...SIMULATED_BUYS, ...PRE_LAUNCH_MESSAGES.slice(0, 3)];
    }
    return PRE_LAUNCH_MESSAGES;
  }, [isLaunched]);

  // Duplicate messages for seamless loop
  const doubled = useMemo(() => [...messages, ...messages], [messages]);

  return (
    <>
      <style>{MARQUEE_CSS}</style>
      <div className="relative w-full bg-[#1a1a1a] border-y border-[#2a2a2a] overflow-hidden py-2 sm:py-2.5">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-[#1a1a1a] to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-[#1a1a1a] to-transparent z-10 pointer-events-none" />

        {/* Live indicator */}
        <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-red-600/20 border border-red-600/40 rounded-full px-2 sm:px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse-red" />
          <span className="text-red-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Live</span>
        </div>

        {/* Scrolling track */}
        <div className="doom-ticker-track flex items-center gap-6 sm:gap-10 whitespace-nowrap pl-20 sm:pl-28">
          {doubled.map((msg, i) => (
            <span
              key={i}
              className={`text-xs sm:text-sm font-medium ${
                msg.includes("🐋") || msg.includes("Mega")
                  ? "text-orange-400"
                  : msg.includes("🔥")
                  ? "text-red-400"
                  : msg.includes("🐕")
                  ? "text-red-300"
                  : "text-orange-300"
              }`}
            >
              {msg}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
