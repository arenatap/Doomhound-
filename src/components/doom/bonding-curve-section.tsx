"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

// ===== TYPES =====
interface ArenaStats {
  price: number;
  marketCap: number;
  totalSupply: number;
  buys: number;
  sells: number;
  buyVolume: string;
  sellVolume: string;
  liquidity: number;
}

interface ArenaCommunity {
  followerCount: number;
  tokenPhase: number;
  name: string;
  ticker: string;
  tokenName: string;
  bondingCurveProgress?: number | null;
}

// Arena bonding curve graduation thresholds (from Arena production source code)
// TOKEN_PHASE_LIQUIDITY_THRESHOLD = 503 AVAX
// ARENA_TOKEN_PHASE_LIQUIDITY_THRESHOLD = 2,149,963.74 $ARENA
// 1 AVAX = 4,274.28 $ARENA (Arena internal rate)
//
// IMPORTANT: The graduation threshold is a LIQUIDITY threshold, not a market cap threshold.
// Progress should be calculated using `liquidity` (total AVAX deposited into the bonding curve),
// NOT `marketCap` (price × supply). Market cap can be significantly higher than liquidity
// due to the bonding curve premium. Using marketCap overstates progress.
//
// The Arena UI may also provide a direct `bondingCurveProgress` field via the API.
// If available, we use that for maximum accuracy.
const GRADUATION_LIQUIDITY_AVAX = 503;
const GRADUATION_MCAP_ARENA = 2_149_963.74;
const ARENA_PER_AVAX = 4274.28;

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  if (val < 1000000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${(val / 1000000).toFixed(2)}M`;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

const ARENA_TOKEN_URL = "https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361";

export function BondingCurveSection() {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [community, setCommunity] = useState<ArenaCommunity | null>(null);
  const [connected, setConnected] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevMarketCap = useRef<number>(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=live");
      const data = await res.json();
      if (data.connected) {
        setConnected(true);
        setRateLimited(data.rateLimited || false);
        if (data.stats) {
          setStats((prev) => {
            if (prev) prevMarketCap.current = prev.marketCap;
            return data.stats;
          });
        }
        if (data.community) setCommunity(data.community);
        if (!data.rateLimited) setLastUpdated(new Date());
      }
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 15 seconds for live feel
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate progress from LIVE data
  // The API marketCap is in AVAX (price × supply, both in 18-decimal units)
  // The API liquidity is in AVAX (total AVAX deposited into the bonding curve)
  //
  // Graduation threshold = 503 AVAX of LIQUIDITY (not market cap)
  // Using marketCap overstates progress because marketCap > liquidity in a bonding curve
  const marketCap = stats?.marketCap || 0; // in AVAX
  const liquidity = stats?.liquidity || 0; // in AVAX — this is the correct metric for progress
  const marketCapArena = marketCap * ARENA_PER_AVAX; // convert to $ARENA
  const liquidityArena = liquidity * ARENA_PER_AVAX; // convert to $ARENA

  // Use Arena's direct bondingCurveProgress if available, otherwise calculate from liquidity
  const apiProgress = community?.bondingCurveProgress;
  const calculatedProgress = Math.min(100, (liquidity / GRADUATION_LIQUIDITY_AVAX) * 100);
  const progress = apiProgress != null && apiProgress > 0 ? Math.min(100, apiProgress) : calculatedProgress;

  const isGraduated = (community?.tokenPhase ?? 1) > 1 || progress >= 100;
  const remainingAvax = Math.max(0, GRADUATION_LIQUIDITY_AVAX - liquidity);
  const remainingArena = Math.max(0, GRADUATION_MCAP_ARENA - liquidityArena);
  const price = stats?.price || 0; // in AVAX
  const priceArena = price * ARENA_PER_AVAX; // in $ARENA

  // Detect if market cap changed (for animation)
  const mcapDelta = marketCap - prevMarketCap.current;
  const isGrowing = mcapDelta > 0;

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
            {/* Live indicator + Big percentage */}
            <div className="text-center mb-5 sm:mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                {!isGraduated && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                )}
                <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest">
                  {isGraduated ? "Complete!" : "Live — Updates Every 30s"}
                </span>
              </div>
              <motion.span
                key={Math.round(progress)}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`font-creepster text-5xl sm:text-7xl md:text-8xl block ${
                  isGraduated ? "text-green-400" : progress >= 75 ? "text-orange-400" : progress >= 50 ? "text-yellow-400" : "text-red-400"
                }`}
              >
                {progress.toFixed(1)}%
              </motion.span>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 uppercase tracking-wider">
                {isGraduated ? "Graduated from bonding curve!" : "Liquidity to Graduation"}
              </p>
              {!isGraduated && (
                <p className="text-gray-600 text-[10px] sm:text-xs mt-1">
                  Check <a href={ARENA_TOKEN_URL} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Arena</a> for official bonding curve progress
                </p>
              )}
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
                    : progress >= 50
                    ? "bg-gradient-to-r from-red-600 via-orange-500 to-orange-400"
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

            {/* Live Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-5">
              {connected && stats ? (
                <>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-cyan-400 font-bold text-sm sm:text-base font-mono">
                      {formatAvax(liquidity)}
                      <span className="text-gray-500 text-[9px] ml-1">AVAX</span>
                    </p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Liquidity (Curve)</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className={`font-bold text-sm sm:text-base font-mono ${isGrowing ? "text-green-400" : "text-white"}`}>
                      {formatAvax(marketCap)}
                      <span className="text-gray-500 text-[9px] ml-1">AVAX</span>
                    </p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Market Cap</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-orange-400 font-bold text-sm sm:text-base font-mono">
                      {formatAvax(price)}
                      <span className="text-gray-500 text-[9px] ml-1">AVAX</span>
                    </p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Price</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-purple-400 font-bold text-sm sm:text-base font-mono">
                      {formatCount(marketCapArena)}
                      <span className="text-gray-500 text-[9px] ml-1">$ARENA</span>
                    </p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">MC in $ARENA</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-green-400 font-bold text-sm sm:text-base font-mono">{formatCount(stats.buys)}</p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Buys</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a]">
                    <p className="text-red-400 font-bold text-sm sm:text-base font-mono">{formatCount(stats.sells)}</p>
                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Sells</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 text-center border border-[#2a2a2a] col-span-2">
                    {rateLimited ? (
                      <p className="text-orange-400 text-xs">⚠️ Arena API rate limited — data will refresh shortly. Check <a href={ARENA_TOKEN_URL} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Arena</a> for live stats.</p>
                    ) : (
                      <p className="text-gray-600 text-xs">Loading live data...</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Graduation Targets */}
            {!isGraduated && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-orange-900/20 border border-orange-800/30 rounded-full px-3 py-1 text-orange-400 text-xs sm:text-sm font-mono">
                    🎯 {formatAvax(remainingAvax)} AVAX to graduate
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-purple-900/20 border border-purple-800/30 rounded-full px-3 py-1 text-purple-400 text-xs sm:text-sm font-mono">
                    🪙 {formatCount(remainingArena)} $ARENA left
                  </span>
                </div>
                {lastUpdated && (
                  <p className="text-gray-600 text-[9px] sm:text-[10px] mb-3">
                    Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 15s
                  </p>
                )}
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
