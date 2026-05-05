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
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-12 sm:mb-16 md:mb-20">
            PATH OF DESTRUCTION
          </h2>
        </ScrollReveal>

        <div className="relative">
          {/* Desktop: horizontal timeline */}
          <div className="hidden md:grid grid-cols-4 gap-0 relative">
            <div className="absolute top-14 left-[12.5%] right-[12.5%] h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-burning-line rounded-full" />

            {phases.map((phase, i) => (
              <ScrollReveal key={phase.phase} delay={i * 0.15}>
                <div className="flex flex-col items-center text-center px-4 lg:px-6">
                  <div className="relative z-10 w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-[#1a1a1a] border-2 border-red-600/60 flex items-center justify-center mb-6 lg:mb-8 animate-flame-border">
                    <Flame className="w-9 h-9 lg:w-10 lg:h-10 text-orange-500" />
                    <span className="absolute -bottom-1 text-xs lg:text-sm font-bold text-red-400 bg-[#0a0a0a] px-2 rounded">
                      P{phase.phase}
                    </span>
                  </div>
                  <h3 className="font-creepster text-2xl lg:text-3xl text-red-400 mb-2 lg:mb-3">
                    {phase.title}
                  </h3>
                  <p className="text-gray-400 text-sm lg:text-base">{phase.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Mobile + Tablet: vertical timeline */}
          <div className="md:hidden relative">
            <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-red-600 via-orange-500 to-red-600 animate-burning-line rounded-full" />

            <div className="space-y-8 sm:space-y-10">
              {phases.map((phase, i) => (
                <ScrollReveal key={phase.phase} delay={i * 0.1}>
                  <div className="flex gap-4 sm:gap-6 items-start pl-1">
                    <div className="relative z-10 w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-[#1a1a1a] border-2 border-red-600/60 flex items-center justify-center animate-flame-border">
                      <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                    </div>
                    <div className="pt-1">
                      <h3 className="font-creepster text-lg sm:text-xl md:text-2xl text-red-400 mb-1">
                        Phase {phase.phase}: {phase.title}
                      </h3>
                      <p className="text-gray-400 text-sm sm:text-base">{phase.desc}</p>
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
