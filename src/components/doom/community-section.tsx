"use client";

import { Swords } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

export function CommunitySection() {
  return (
    <section
      id="community"
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-12 sm:mb-16 md:mb-20">
            JOIN THE PACK
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <BloodSplash>
            <a
              href="#"
              className="block bg-[#1a1a1a] border border-[#2a2a2a] hover:border-red-500/50 rounded-xl p-8 sm:p-12 md:p-16 text-center transition-all duration-300 animate-red-glow-pulse group hover:shadow-[0_0_25px_rgba(220,38,38,0.3)] max-w-md mx-auto"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Swords
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-5 sm:mb-6 md:mb-8 text-red-400 group-hover:scale-110 transition-transform duration-300"
              />
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4 group-hover:text-red-400 transition-colors">
                The Arena
              </h3>
              <p className="text-gray-500 text-base sm:text-lg md:text-xl">arena.avax</p>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-3 sm:mt-4">
                Find $DOOMHOUND on the battlefield
              </p>
            </a>
          </BloodSplash>
        </ScrollReveal>
      </div>
    </section>
  );
}
