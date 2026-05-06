"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";
import { useToast } from "@/hooks/use-toast";

// Every shill text gets this link appended — NEVER copy without it
const SHILL_LINK = "https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361";
const HASHTAGS = "#DOOMHOUND #Avalanche #TheArena";
const GRADUATION_MCAP_AVAX = 503;

const staticShillTexts = [
  "$DOOMHOUND is the Arena's most feared contender. Can't kill what's already from hell. 0 tax, LP burned, contract renounced. This hound doesn't rug — it DEVOURS rugs. Join the pack 🔥",
  "They said the Arena was dangerous. Then $DOOMHOUND showed up and proved them RIGHT. 3.4B supply, 0/0 tax, community owned. The hellhound of Avalanche is here. Get in or get eaten. 🐺",
  "While you're sleeping on $DOOMHOUND, the pack is growing. Fair launch, no presale, no team tokens. Just pure degen energy from the depths of the blockchain. The Doomhound protects its own. 💀",
  "$DOOMHOUND — The only token in the Arena that WANTS the chart to go down, because that's where hell is. Fair launch. 0 tax. Community owned. The devil's good boy is here. 🔥",
];

interface ArenaStats {
  price: number;
  marketCap: number;
  buys: number;
  sells: number;
}

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  if (val < 1000000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${(val / 1000000).toFixed(2)}M`;
}

export function CopyPastaSection() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const { toast } = useToast();

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=live");
      const data = await res.json();
      if (data.connected && data.stats) {
        setStats(data.stats);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  // Build the 5th dynamic shill text
  const bondingPct = stats ? Math.min(100, (stats.marketCap / GRADUATION_MCAP_AVAX) * 100).toFixed(1) : "XX";
  const mcapStr = stats ? formatAvax(stats.marketCap) : "XX";
  const dynamicShillText = `$DOOMHOUND is STILL at micro cap! Only ${mcapStr} AVAX market cap and ${bondingPct}% to graduation (503 AVAX / 2.1M $ARENA). When this graduates, liquidity gets LOCKED. Early buyers eat best. Don't fade the hound 🐺🔥`;

  const allShillTexts = [...staticShillTexts, dynamicShillText];

  const handleCopy = (text: string, idx: number) => {
    // ALWAYS append the link — no copy without it, that's wasted marketing
    const fullText = `${text}\n\n${SHILL_LINK}`;
    navigator.clipboard.writeText(fullText);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast({
      title: "Copied to clipboard!",
      description: "Go shill! The Doomhound demands it.",
    });
  };

  const handleShareOnX = (text: string) => {
    const fullText = `${text}\n\n${SHILL_LINK}\n\n${HASHTAGS}`;
    const encoded = encodeURIComponent(fullText);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");
  };

  return (
    <section
      id="copy-pasta"
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-12 sm:mb-16 md:mb-20">
            SHILLING AMMO
          </h2>
        </ScrollReveal>

        <div className="space-y-5 sm:space-y-6 md:space-y-8">
          {allShillTexts.map((text, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className={`bg-[#1a1a1a] border rounded-xl p-5 sm:p-6 md:p-8 hover:border-red-900/40 transition-all duration-300 group ${
                i === allShillTexts.length - 1 ? "border-orange-700/40 shadow-[0_0_10px_rgba(234,88,12,0.1)]" : "border-[#2a2a2a]"
              }`}>
                {/* Dynamic badge for the 5th shill text */}
                {i === allShillTexts.length - 1 && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-orange-900/30 border border-orange-700/30 rounded-full px-2.5 py-0.5 text-orange-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                      </span>
                      LIVE STATS
                    </span>
                  </div>
                )}
                <p className="text-gray-300 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 leading-relaxed">
                  {text}
                </p>
                {/* Show the link that will be copied */}
                <p className="text-red-400/70 text-xs sm:text-sm font-mono mb-4 sm:mb-5 break-all">
                  {SHILL_LINK}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <BloodSplash>
                    <button
                      onClick={() => handleCopy(text, i)}
                      className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400 hover:bg-red-900/30 hover:border-red-600/50 hover:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all duration-300 text-xs sm:text-sm md:text-base"
                    >
                      {copiedIdx === i ? (
                        <>
                          <Check className="w-4 h-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> COPY WITH LINK
                        </>
                      )}
                    </button>
                  </BloodSplash>
                  <button
                    onClick={() => handleShareOnX(text)}
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-900/20 border border-blue-800/30 rounded-lg text-blue-400 hover:bg-blue-900/30 hover:border-blue-600/50 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-300 text-xs sm:text-sm md:text-base"
                  >
                    <Share2 className="w-4 h-4" /> SHARE ON X
                  </button>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
