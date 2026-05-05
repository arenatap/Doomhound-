"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const memes = [
  { src: "/images/doomhound-meme1.png", alt: "Hound on throne", label: "King of the Arena" },
  { src: "/images/doomhound-meme2.png", alt: "Hound destroying a rug", label: "Rug Destroyer" },
  { src: "/images/doomhound-meme3.png", alt: "Hound in sports car", label: "Lambo When" },
  { src: "/images/doomhound-meme4.png", alt: "Hound as scientist", label: "Mad Scientist" },
];

export function MemeWallSection() {
  const [selectedMeme, setSelectedMeme] = useState<number | null>(null);

  return (
    <section
      id="memes"
      className="relative py-16 sm:py-20 md:py-32 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-5xl md:text-7xl text-red-500 animate-glow-red text-center mb-3 sm:mb-4">
            SHRINE OF MEMES
          </h2>
          <p className="text-center text-gray-500 text-sm sm:text-base mb-10 sm:mb-16">
            The Doomhound demands tribute. Create and share.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {memes.map((meme, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div
                className="meme-hover cursor-pointer rounded-xl overflow-hidden border-2 border-[#2a2a2a] group"
                onClick={() => setSelectedMeme(i)}
              >
                <div className="aspect-square overflow-hidden bg-[#1a1a1a]">
                  <img
                    src={meme.src}
                    alt={meme.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-2 sm:p-3 bg-[#1a1a1a]">
                  <p className="text-xs sm:text-sm text-gray-400 text-center">
                    {meme.label}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedMeme !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedMeme(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedMeme(null)}
                className="absolute -top-10 sm:-top-12 right-0 text-white hover:text-red-500 transition-colors z-10"
              >
                <X className="w-7 h-7 sm:w-8 sm:h-8" />
              </button>
              <img
                src={memes[selectedMeme].src}
                alt={memes[selectedMeme].alt}
                className="w-full rounded-xl border-2 border-red-600/30 shadow-[0_0_40px_rgba(220,38,38,0.3)]"
              />
              <p className="text-center text-gray-400 mt-3 text-sm">
                {memes[selectedMeme].label}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
