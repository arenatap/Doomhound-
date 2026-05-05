"use client";

import { useState } from "react";
import { ScrollReveal } from "./scroll-reveal";

const steps = [
  {
    num: 1,
    title: "Create a Wallet",
    desc: "Download MetaMask or Core Wallet and set up your Avalanche wallet",
  },
  {
    num: 2,
    title: "Get AVAX",
    desc: "Buy AVAX on any exchange and send it to your wallet",
  },
  {
    num: 3,
    title: "Go to The Arena",
    desc: "Visit arena.social and connect your wallet",
  },
  {
    num: 4,
    title: "Buy $DOOMHOUND",
    desc: "Search for $DOOMHOUND and summon your tokens. HODL.",
  },
];

export function HowToBuySection() {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <section
      id="how-to-buy"
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-12 sm:mb-16 md:mb-20">
            HOW TO SUMMON $DOOMHOUND
          </h2>
        </ScrollReveal>

        <div className="space-y-5 sm:space-y-6 md:space-y-8">
          {steps.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.1}>
              <div
                className="flex items-start gap-4 sm:gap-6 md:gap-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8 hover:border-red-600/50 hover:shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all duration-300 group cursor-default"
                onMouseEnter={() => setHoveredStep(step.num)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {/* Step number */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-lg sm:text-xl md:text-2xl font-bold border-2 transition-all duration-300 ${
                      hoveredStep === step.num
                        ? "bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                        : "bg-[#0a0a0a] border-red-900/40 text-red-500"
                    }`}
                  >
                    {step.num}
                  </div>
                  {hoveredStep === step.num && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2 h-5 sm:h-6 bg-gradient-to-b from-red-600 to-red-900 rounded-b-full animate-blood-drip" />
                  )}
                </div>

                <div className="pt-1 sm:pt-2">
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2 group-hover:text-red-400 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 text-sm sm:text-base md:text-lg">
                    {step.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
