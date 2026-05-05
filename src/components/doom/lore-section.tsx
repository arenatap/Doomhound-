"use client";

import { ScrollReveal } from "./scroll-reveal";
import { EmberParticles } from "./ember-particles";

const loreParagraphs = [
  "From the deepest trenches of the Avalanche blockchain, a creature emerged — neither fully dog nor fully demon. The Doomhound was born when a degen's bag hit zero and their despair summoned something ancient. It feeds on rug pulls and grows stronger with each liquidation.",
  "The Arena was once a place of orderly combat. Traders came, tokens fought, the strongest survived. But when the Doomhound entered the pit, everything changed. No token could stand against a creature that had already been to hell and back — literally.",
  "Now the Doomhound prowls the Arena, collecting the souls of rugged bags and failed launches. Those who follow it are protected. Those who doubt it... become its next meal. Will you join the pack, or become the prey?",
];

export function LoreSection() {
  return (
    <section
      id="lore"
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <EmberParticles />

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-12 sm:mb-16 md:mb-20">
            THE LORE
          </h2>
        </ScrollReveal>

        <div className="space-y-6 sm:space-y-8">
          {loreParagraphs.map((text, i) => (
            <ScrollReveal key={i} delay={i * 0.15}>
              <div className="bg-[#1a1a1a]/80 backdrop-blur border border-red-900/30 rounded-xl p-6 sm:p-8 md:p-10 animate-breathing-glow hover:border-red-700/50 transition-all duration-500">
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 leading-relaxed">
                  {text}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
