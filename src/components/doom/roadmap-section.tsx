"use client";

import { Flame } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const phases = [
  {
    phase: 1,
    title: "AWAKENING",
    desc: "Launch on The Arena, website live, meme warfare begins",
  },
  {
    phase: 2,
    title: "THE HUNT",
    desc: "500+ holders, trending on Arena, community raids",
  },
  {
    phase: 3,
    title: "DOMINANCE",
    desc: "1000+ holders, DEX migration, CEX listings",
  },
  {
    phase: 4,
    title: "???",
    desc: "Even we don't know — The Doomhound decides",
  },
];

export function RoadmapSection() {
  return (
    <section
      id="roadmap"
      className="relative py-16 sm:py-20 md:py-32 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-5xl md:text-7xl text-red-500 animate-glow-red text-center mb-10 sm:mb-16">
            PATH OF DESTRUCTION
          </h2>
        </ScrollReveal>

        <div className="relative">
          {/* Desktop: horizontal timeline */}
          <div className="hidden md:grid grid-cols-4 gap-0 relative">
            <div className="absolute top-12 left-[12.5%] right-[12.5%] h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-burning-line rounded-full" />

            {phases.map((phase, i) => (
              <ScrollReveal key={phase.phase} delay={i * 0.15}>
                <div className="flex flex-col items-center text-center px-3">
                  <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1a1a1a] border-2 border-red-600/60 flex items-center justify-center mb-5 md:mb-6 animate-flame-border">
                    <Flame className="w-7 h-7 md:w-8 md:h-8 text-orange-500" />
                    <span className="absolute -bottom-1 text-[10px] md:text-xs font-bold text-red-400 bg-[#0a0a0a] px-2 rounded">
                      P{phase.phase}
                    </span>
                  </div>
                  <h3 className="font-creepster text-lg md:text-2xl text-red-400 mb-1 md:mb-2">
                    {phase.title}
                  </h3>
                  <p className="text-gray-400 text-xs md:text-sm">{phase.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Mobile: vertical timeline */}
          <div className="md:hidden relative">
            <div className="absolute left-5 top-0 bottom-0 w-1 bg-gradient-to-b from-red-600 via-orange-500 to-red-600 animate-burning-line rounded-full" />

            <div className="space-y-6 sm:space-y-8">
              {phases.map((phase, i) => (
                <ScrollReveal key={phase.phase} delay={i * 0.1}>
                  <div className="flex gap-4 sm:gap-6 items-start pl-1">
                    <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-[#1a1a1a] border-2 border-red-600/60 flex items-center justify-center animate-flame-border">
                      <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    </div>
                    <div className="pt-1">
                      <h3 className="font-creepster text-base sm:text-xl text-red-400 mb-0.5 sm:mb-1">
                        Phase {phase.phase}: {phase.title}
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm">{phase.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
