"use client";

import { motion } from "framer-motion";
import { DoomShell } from "@/components/doom/doom-shell";

export default function NFTPage() {
  return (
    <DoomShell>
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background image with overlay — same as hero */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/doomhound-hero.png')" }}
        />
        <div className="absolute inset-0 bg-black/70" />

        {/* Flame animation at bottom */}
        <div className="css-flame bottom-0 z-10">
          <div className="flame-layer" />
          <div className="flame-layer" />
          <div className="flame-layer" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center w-full max-w-5xl mx-auto px-6 sm:px-10 md:px-16 lg:px-20">
          {/* NFT Preview Image */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 1 }}
            className="mb-6 md:mb-10"
          >
            <img
              src="/images/hound-nft-preview.png"
              alt="HOUND #1"
              className="w-48 h-64 sm:w-56 sm:h-72 md:w-64 md:h-80 lg:w-72 lg:h-96 mx-auto rounded-xl border-2 border-red-600/40 shadow-[0_0_40px_rgba(220,38,38,0.4)] drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]"
            />
          </motion.div>

          {/* Title — same style as $DOOMHOUND ticker */}
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="font-creepster text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-red-500 animate-glow-red mb-3 md:mb-5 leading-none"
          >
            HOUNDS OF
          </motion.h1>

          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-creepster text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-red-500 animate-glow-red mb-3 md:mb-5 leading-none"
          >
            THE HELL
          </motion.h1>

          {/* Tagline — same style as hero */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="font-creepster text-xl sm:text-3xl md:text-4xl lg:text-5xl text-red-300/90 mb-3 md:mb-4 leading-tight"
          >
            666 Unique Beasts From The Underworld
          </motion.p>

          {/* Subtitle */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-3 md:mb-4"
          >
            The Pack&apos;s Deadliest Collection
          </motion.p>

          {/* Micro info — same style as hero micro cap line */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="text-sm sm:text-base md:text-lg text-orange-400/80 font-mono mb-6 md:mb-8 tracking-wider"
          >
            666 NFTs · 5 Rarity Tiers · Avalanche · Holder Priority
          </motion.p>

          {/* COMING SOON Badge — same style as MICRO CAP ALERT */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="flex justify-center mb-4 md:mb-5"
          >
            <span className="relative inline-flex items-center gap-2 bg-red-900/40 border border-red-500/60 rounded-full px-4 py-1.5 sm:px-5 sm:py-2 text-red-300 text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(220,38,38,0.3)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              🔥 COMING SOON
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
              </span>
            </span>
          </motion.div>

          {/* Info pills — same style as hero stats pills */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-6 md:mb-8"
          >
            <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-red-900/40 rounded-full px-3 py-1 text-red-300 text-xs sm:text-sm font-mono">
              🐺 666 Supply
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-[#2a2a2a] rounded-full px-3 py-1 text-white text-xs sm:text-sm font-mono">
              💎 5 Rarity Tiers
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-orange-900/40 rounded-full px-3 py-1 text-orange-400 text-xs sm:text-sm font-mono">
              ⚡ Avalanche
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-[#2a2a2a] rounded-full px-3 py-1 text-red-400 text-xs sm:text-sm font-mono">
              🎯 Holder Priority
            </span>
          </motion.div>

          {/* CTA — same button style as hero */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center"
          >
            <a
              href="https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 md:px-12 py-4 md:py-5 text-base sm:text-lg md:text-xl font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300 animate-breathing-glow"
            >
              🔥 BUY $DOOMHOUND
            </a>
          </motion.div>
        </div>
      </section>
    </DoomShell>
  );
}
