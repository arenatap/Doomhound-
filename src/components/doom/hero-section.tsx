"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Copy, Check } from "lucide-react";
import { BloodSplash } from "./blood-splash";

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  const contractAddress = "0x000...DOOM";

  const handleCopy = () => {
    navigator.clipboard.writeText("0x0000000000000000000000000000000000DOOM");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/doomhound-hero.png')" }}
      />
      <div className="absolute inset-0 bg-black/70" />

      {/* Flame animation at bottom */}
      <div className="css-flame absolute bottom-0 left-0 right-0 z-10">
        <div className="flame-layer" />
        <div className="flame-layer" />
        <div className="flame-layer" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center w-full px-6 sm:px-8 max-w-3xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 1 }}
          className="mb-6 md:mb-10"
        >
          <img
            src="/images/doomhound-logo.png"
            alt="$DOOMHOUND Logo"
            className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 mx-auto rounded-full drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]"
          />
        </motion.div>

        {/* Ticker */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="font-creepster text-5xl sm:text-6xl md:text-8xl lg:text-9xl text-red-500 animate-glow-red mb-3 md:mb-4 leading-none"
        >
          $DOOMHOUND
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="font-creepster text-xl sm:text-2xl md:text-4xl text-red-300/90 mb-3 md:mb-4 leading-tight"
        >
          Can&apos;t Kill What&apos;s Already From Hell
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 md:mb-10"
        >
          The Arena&apos;s Most Feared Contender
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 md:mb-10 w-full"
        >
          <BloodSplash className="w-full sm:w-auto">
            <a
              href="#"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300 animate-breathing-glow"
            >
              BUY $DOOMHOUND
            </a>
          </BloodSplash>
          <BloodSplash className="w-full sm:w-auto">
            <a
              href="#"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-bold bg-transparent border-2 border-red-600 hover:border-red-500 text-red-400 hover:text-red-300 rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all duration-300"
            >
              VIEW CHART
            </a>
          </BloodSplash>
        </motion.div>

        {/* Contract Address */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="flex items-center justify-center gap-2 bg-[#1a1a1a]/80 backdrop-blur border border-[#2a2a2a] rounded-lg px-4 py-2.5 mx-auto max-w-xs sm:max-w-md"
        >
          <code className="text-xs sm:text-sm md:text-base text-gray-400 font-mono truncate">
            {contractAddress}
          </code>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:text-red-400 transition-colors flex-shrink-0"
            aria-label="Copy contract address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-500/70" />
      </div>
    </section>
  );
}
