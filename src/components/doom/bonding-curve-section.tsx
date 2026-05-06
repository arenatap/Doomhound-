"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

// ===== TYPES =====
interface ArenaStats {
  price: number;
  marketCap: number;
  totalSupply: number;
  buys: number;
  sells: number;
  liquidity: number;
}

interface ArenaCommunity {
  followerCount: number;
  tokenPhase: number;
}

// The Arena bonding curve threshold (approximate — phase 1 → phase 2 graduation)
// On The Arena, tokens graduate from bonding curve when they reach sufficient market cap
// Typical threshold is ~100 AVAX market cap for community tokens
const BONDING_CURVE_TARGET_AVAX = 100;

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  if (val < 1000000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${(val / 1000000).toFixed(2)}M`;
}

const ARENA_TOKEN_URL = "https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361";

export function BondingCurveSection() {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [community, setCommunity] = useState<ArenaCommunity | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=live");
      const data = await res.json();
      if (data.connected) {
        setConnected(true);
        if (data.stats) setStats(data.stats);
        if (data.community) setCommunity(data.community);
      }
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate progress
  const marketCap = stats?.marketCap || 0;
  const progress = Math.min(100, (marketCap / BONDING_CURVE_TARGET_AVAX) * 100);
  const isGraduated = (community?.tokenPhase ?? 1) > 1 || progress >= 100;
  const remaining = Math.max(0, BONDING_CURVE_TARGET_AVAX - marketCap);

  return (
    <section id="bonding-curve" className="relative py-20 sm:py-28 bg-[#0a0a0a] overflow-hidden">
      {/* Flame border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl text-red-500 animate-glow-red text-center mb-4 sm:mb-6">
            {isGraduated ? "🎓 GRADUATED" : "BONDING CURVE"}
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-xl mx-auto">
            {isGraduated
              ? "$DOOMHOUND has broken free from the bonding curve! Liquidity is locked — the hound runs free."
              : "Buy $DOOMHOUND to push the market cap up. When the curve is filled, the token graduates and liquidity gets locked permanently."}
          </p>
        </ScrollReveal>

        {/* Progress Bar */}
        <ScrollReveal delay={0.1}>
          <div className="bg-[#1a1a1a] border border-red-900/30 rounded-xl p-5 sm:p-6 md:p-8">
            {/* Big percentage */}
            <div className="text-center mb-5 sm:mb-6">
              <motion.span
                key={Math.round(progress)}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`font-creepster text-5xl sm:text-7xl md:text-8xl ${
                  isGraduated ? "text-green-400" : progress >= 75 ? "text-orange-400" : "text-red-400"
                }`}
              >
                {progress.toFixed(1)}%
              </motion.span>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 uppercase tracking-wider">
                {isGraduated ? "Complete!" : "To Graduation"}
              </p>
            </div>

            {/* Progress bar */}
            <div className="relative w-full h-6 sm:h-8 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#2a2a2a] mb-5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  isGraduated
                    ? "bg-gradient-to-r from-green-600 to-green-400"
                    : progress >= 75
                    ? "bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400"
                    : "bg-gradient-to-r from-red-700 to-red-500"
                }`}
                style={{
                  boxShadow: isGraduated
                    ? "0 0 20px rgba(34,197,94,0.5)"
                    : "0 0 15px rgba(220,38,38,0.4)",
                }}
              />
              {/* Flame particles on the progress edge */}
              {!isGraduated && progress > 5 && (
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white/30 rounded-full animate-pulse"
                  style={{ left: `${progress}%`, transform: "translateX(-50%)" }}
                />
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
              {connected && stats ? (
                <>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-white font-bold text-sm sm:text-base font-mono">{formatAvax(marketCap)}</p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Market Cap</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-orange-400 font-bold text-sm sm:text-base font-mono">{formatAvax(stats.price)}</p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Price</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-green-400 font-bold text-sm sm:text-base font-mono">{stats.buys}</p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Buys</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-red-400 font-bold text-sm sm:text-base font-mono">{stats.sells}</p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Sells</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a] col-span-2">
                    <p className="text-gray-600 text-xs">Loading live data...</p>
                  </div>
                </>
              )}
            </div>

            {/* Remaining + CTA */}
            {!isGraduated && (
              <div className="text-center">
                <p className="text-gray-400 text-xs sm:text-sm mb-3">
                  <span className="text-orange-400 font-bold">{formatAvax(remaining)} AVAX</span> market cap needed to graduate
                </p>
                <a
                  href={ARENA_TOKEN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 sm:px-10 py-3 sm:py-4 bg-red-600 hover:bg-red-700 text-white font-creepster text-lg sm:text-xl rounded-xl shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_35px_rgba(220,38,38,0.7)] transition-all duration-300 animate-breathing-glow"
                >
                  🔥 PUSH THE CURVE — BUY NOW
                </a>
                <p className="text-gray-600 text-[10px] sm:text-xs mt-3">
                  Every buy pushes the curve closer to graduation — Liquidity gets locked when we hit 100%
                </p>
              </div>
            )}

            {isGraduated && (
              <div className="text-center">
                <p className="text-green-400 font-bold text-sm sm:text-base mb-3">
                  🎉 $DOOMHOUND has graduated! Liquidity is locked. The hound is unleashed.
                </p>
                <a
                  href={ARENA_TOKEN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 sm:px-10 py-3 sm:py-4 bg-green-600 hover:bg-green-700 text-white font-creepster text-lg sm:text-xl rounded-xl shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all duration-300"
                >
                  🐺 TRADE $DOOMHOUND
                </a>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
