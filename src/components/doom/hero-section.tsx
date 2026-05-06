"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Copy, Check } from "lucide-react";
import { BloodSplash } from "./blood-splash";

const fullAddress = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";
const ARENA_TOKEN_URL = "https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361";
const GRADUATION_MCAP_AVAX = 162;

interface ArenaStats {
  price: number;
  marketCap: number;
  buys: number;
  sells: number;
}

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  if (val < 1000000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${(val / 1000000).toFixed(2)}M`;
}

export function HeroSection() {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [holdersCount, setHoldersCount] = useState(0);

  const fetchLiveData = useCallback(async () => {
    try {
      const [arenaRes, holderRes] = await Promise.all([
        fetch("/api/arena?action=live"),
        fetch("/api/snowtrace?action=holdercount"),
      ]);
      const arenaData = await arenaRes.json();
      const holderData = await holderRes.json();

      if (arenaData.connected && arenaData.stats) {
        setStats(arenaData.stats);
      }
      if (holderData.holderCount) {
        setHoldersCount(holderData.holderCount);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 20000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullAddress);
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
      <div className="absolute inset-0 bg-black/65" />

      {/* Flame animation at bottom */}
      <div className="css-flame bottom-0 z-10">
        <div className="flame-layer" />
        <div className="flame-layer" />
        <div className="flame-layer" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center w-full max-w-5xl mx-auto px-6 sm:px-10 md:px-16 lg:px-20">
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
            className="w-28 h-28 sm:w-40 sm:h-40 md:w-52 md:h-52 lg:w-60 lg:h-60 mx-auto rounded-full drop-shadow-[0_0_40px_rgba(220,38,38,0.6)]"
          />
        </motion.div>

        {/* Ticker */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="font-creepster text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-red-500 animate-glow-red mb-3 md:mb-5 leading-none"
        >
          $DOOMHOUND
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="font-creepster text-xl sm:text-3xl md:text-4xl lg:text-5xl text-red-300/90 mb-3 md:mb-4 leading-tight"
        >
          Can&apos;t Kill What&apos;s Already From Hell
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-3 md:mb-4"
        >
          The Arena&apos;s Most Feared Contender
        </motion.p>

        {/* Micro Cap Urgency Line */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-sm sm:text-base md:text-lg text-orange-400/80 font-mono mb-6 md:mb-8 tracking-wider"
        >
          Micro Cap · Bonding Curve Active · Be Early
        </motion.p>

        {/* MICRO CAP ALERT Badge */}
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
            🔥 MICRO CAP ALERT
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
            </span>
          </span>
        </motion.div>

        {/* Live Stats Pills */}
        {(stats || holdersCount > 0) && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-6 md:mb-8"
          >
            {stats && (
              <>
                <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-orange-900/40 rounded-full px-3 py-1 text-orange-400 text-xs sm:text-sm font-mono">
                  📈 {formatAvax(stats.price)} AVAX
                </span>
                <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-[#2a2a2a] rounded-full px-3 py-1 text-white text-xs sm:text-sm font-mono">
                  💰 MC {formatAvax(stats.marketCap)}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-red-900/40 rounded-full px-3 py-1 text-red-300 text-xs sm:text-sm font-mono">
                  📊 {Math.min(100, (stats.marketCap / GRADUATION_MCAP_AVAX) * 100).toFixed(1)}% to graduation
                </span>
              </>
            )}
            {holdersCount > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-[#2a2a2a] rounded-full px-3 py-1 text-red-400 text-xs sm:text-sm font-mono">
                🐺 {holdersCount} holders
              </span>
            )}
            {stats && (
              <span className="inline-flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur border border-[#2a2a2a] rounded-full px-3 py-1 text-green-400 text-xs sm:text-sm font-mono">
                ✅ {stats.buys} buys
              </span>
            )}
          </motion.div>
        )}

        {/* Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center mb-8 md:mb-12"
        >
          <BloodSplash className="w-full sm:w-auto">
            <a
              href={ARENA_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 md:px-12 py-4 md:py-5 text-base sm:text-lg md:text-xl font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300 animate-breathing-glow"
            >
              🔥 BUY $DOOMHOUND
            </a>
          </BloodSplash>
          <BloodSplash className="w-full sm:w-auto">
            <a
              href="#arena-game"
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 md:px-12 py-4 md:py-5 text-base sm:text-lg md:text-xl font-bold bg-transparent border-2 border-red-600/80 hover:border-red-500 text-red-400 hover:text-red-300 rounded-xl hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all duration-300"
            >
              JOIN THE PACK
            </a>
          </BloodSplash>
        </motion.div>

        {/* Contract Address */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="flex items-center justify-center gap-3 bg-[#1a1a1a]/80 backdrop-blur border border-[#2a2a2a] rounded-xl px-5 py-3 mx-auto max-w-xs sm:max-w-sm md:max-w-md"
        >
          <code className="text-xs sm:text-sm md:text-base text-gray-400 font-mono truncate">
            {fullAddress}
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
      <div className="absolute bottom-16 sm:bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-red-500/70" />
      </div>
    </section>
  );
}
