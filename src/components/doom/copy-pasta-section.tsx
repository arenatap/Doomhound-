"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";
import { useToast } from "@/hooks/use-toast";

// Every shill text gets this link appended — NEVER copy without it
const SHILL_LINK = "https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361";

const shillTexts = [
  "$DOOMHOUND is the Arena's most feared contender. Can't kill what's already from hell. 0 tax, LP burned, contract renounced. This hound doesn't rug — it DEVOURS rugs. Join the pack 🔥",
  "They said the Arena was dangerous. Then $DOOMHOUND showed up and proved them RIGHT. 1B supply, 0/0 tax, community owned. The hellhound of Avalanche is here. Get in or get eaten. 🐺",
  "While you're sleeping on $DOOMHOUND, the pack is growing. Fair launch, no presale, no team tokens. Just pure degen energy from the depths of the blockchain. The Doomhound protects its own. 💀",
  "$DOOMHOUND — The only token in the Arena that WANTS the chart to go down, because that's where hell is. Fair launch. 0 tax. Community owned. The devil's good boy is here. 🔥",
];

export function CopyPastaSection() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { toast } = useToast();

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
          {shillTexts.map((text, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8 hover:border-red-900/40 transition-all duration-300 group">
                <p className="text-gray-300 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 leading-relaxed">
                  {text}
                </p>
                {/* Show the link that will be copied */}
                <p className="text-red-400/70 text-xs sm:text-sm font-mono mb-4 sm:mb-5 break-all">
                  {SHILL_LINK}
                </p>
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
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
