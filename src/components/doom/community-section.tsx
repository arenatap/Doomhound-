"use client";

import { Swords } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

export function CommunitySection() {
  return (
    <section
      id="community"
      className="relative py-16 sm:py-20 md:py-32 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-8">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-5xl md:text-7xl text-red-500 animate-glow-red text-center mb-10 sm:mb-16">
            JOIN THE PACK
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <BloodSplash>
            <a
              href="#"
              className="block bg-[#1a1a1a] border border-[#2a2a2a] hover:border-red-500/50 rounded-xl p-8 sm:p-10 md:p-14 text-center transition-all duration-300 animate-red-glow-pulse group hover:shadow-[0_0_25px_rgba(220,38,38,0.3)] max-w-sm mx-auto"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Swords
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 text-red-400 group-hover:scale-110 transition-transform duration-300"
              />
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 group-hover:text-red-400 transition-colors">
                The Arena
              </h3>
              <p className="text-gray-500 text-base sm:text-lg">arena.avax</p>
              <p className="text-gray-600 text-xs sm:text-sm mt-2 sm:mt-3">
                Find $DOOMHOUND on the battlefield
              </p>
            </a>
          </BloodSplash>
        </ScrollReveal>
      </div>
    </section>
  );
}
