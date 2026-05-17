"use client";

import { motion } from "framer-motion";
import { DoomShell } from "@/components/doom/doom-shell";
import { Footer } from "@/components/doom/footer";

export default function NFTPage() {
  return (
    <DoomShell>
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background image with overlay — same as hero */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/doomhound-hero.png')" }}
        />
        <div className="absolute inset-0 bg-black/65" />

        {/* Flame animation at bottom — same as hero */}
        <div className="css-flame bottom-0 z-10">
          <div className="flame-layer" />
          <div className="flame-layer" />
          <div className="flame-layer" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center w-full max-w-5xl mx-auto px-6 sm:px-10 md:px-16 lg:px-20">
          {/* Title — EXACT same style as $DOOMHOUND on home: font-creepster, red-500, glow animation */}
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
            className="font-creepster text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-red-500 animate-glow-red mb-6 md:mb-8 leading-none"
          >
            THE HELL
          </motion.h1>

          {/* COMING SOON Badge — EXACT same style as 🔥 MICRO CAP ALERT on home */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="flex justify-center"
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
        </div>
      </section>
      <Footer />
    </DoomShell>
  );
}
