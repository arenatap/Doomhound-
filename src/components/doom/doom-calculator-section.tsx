"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

// ===== DOOM CALCULATOR — Potential ROI at Graduation =====
// Shows estimated returns if the token graduates from bonding curve.
// Based on: investment / current_price * estimated_price_at_graduation
// 
// The bonding curve on Arena graduates at 503 AVAX liquidity / 2,149,963.74 $ARENA
// Price appreciation is estimated using: graduation_liquidity / current_liquidity ratio
// This is a simplified estimate — actual returns depend on market conditions.

const GRADUATION_LIQUIDITY_AVAX = 503;
const ARENA_PER_AVAX = 4274.28;
const ARENA_TOKEN_URL = "https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361";

interface ArenaStats {
  price: number;
  marketCap: number;
  liquidityAvax: number;
  liquidityArena: number;
}

interface ArenaCommunity {
  tokenPhase: number;
  bondingCurveProgress?: number | null;
}

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  if (val < 1000000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${(val / 1000000).toFixed(2)}M`;
}

function formatUsd(val: number): string {
  if (val <= 0) return "$0";
  if (val < 1) return `$${val.toFixed(2)}`;
  if (val < 1000) return `$${val.toFixed(2)}`;
  if (val < 1000000) return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${(val / 1000000).toFixed(2)}M`;
}

// AVAX/USD price — fetched live from CoinGecko, fallback to 9.6
const AVAX_USD_FALLBACK = 9.6;

const PRESET_AMOUNTS = [0.5, 1, 2, 5, 10];

export function DoomCalculatorSection() {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [community, setCommunity] = useState<ArenaCommunity | null>(null);
  const [connected, setConnected] = useState(false);
  const [avaxUsd, setAvaxUsd] = useState(AVAX_USD_FALLBACK);
  const [investmentInput, setInvestmentInput] = useState("2");
  const investment = parseFloat(investmentInput) || 0;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=live");
      const data = await res.json();
      if (data.connected) {
        setConnected(true);
        if (data.stats) setStats(data.stats);
        if (data.community) setCommunity(data.community);
        // Extract live AVAX/USD from API if available
        if (data.avaxUsd) setAvaxUsd(data.avaxUsd);
      }
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const currentPrice = stats?.price || 0;
  const liquidityAvax = stats?.liquidityAvax || 0;
  const progress = community?.bondingCurveProgress || 0;
  const isGraduated = (community?.tokenPhase ?? 1) > 1;

  // Calculate estimated returns
  // At graduation, the price increases proportionally to the liquidity growth
  // multiplier = graduation_liquidity / current_liquidity (simplified bonding curve estimate)
  const multiplier = liquidityAvax > 0 && !isGraduated
    ? GRADUATION_LIQUIDITY_AVAX / liquidityAvax
    : 0;

  const tokensYouGet = currentPrice > 0 ? investment / currentPrice : 0;
  const estimatedValueAvax = investment * multiplier;
  const estimatedValueUsd = estimatedValueAvax * avaxUsd;
  const estimatedProfitAvax = Math.max(0, estimatedValueAvax - investment);
  const estimatedProfitUsd = estimatedProfitAvax * avaxUsd;
  const roi = investment > 0 && multiplier > 1 ? ((multiplier - 1) * 100) : 0;

  return (
    <section id="doom-calculator" className="relative py-20 sm:py-28 bg-[#0a0a0a] overflow-hidden">
      {/* Flame border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl text-green-500 animate-glow-green text-center mb-4 sm:mb-6">
            💰 DOOM CALCULATOR
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-xl mx-auto">
            What if $DOOMHOUND graduates? See the potential. Do the math. Make your move.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="bg-[#1a1a1a] border border-green-900/30 rounded-xl p-5 sm:p-8 md:p-10">
            {isGraduated ? (
              <div className="text-center py-8">
                <p className="text-green-400 font-creepster text-3xl sm:text-4xl mb-3">🎓 ALREADY GRADUATED!</p>
                <p className="text-gray-400">$DOOMHOUND has graduated from the bonding curve. Liquidity is locked!</p>
              </div>
            ) : !connected ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-sm">Loading live data...</p>
              </div>
            ) : (
              <>
                {/* Current Stats Bar */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mb-6 sm:mb-8 pb-6 border-b border-[#2a2a2a]">
                  <div className="text-center">
                    <p className="text-gray-500 text-[10px] sm:text-xs uppercase">Current Price</p>
                    <p className="text-orange-400 font-mono text-sm sm:text-base font-bold">{formatAvax(currentPrice)} AVAX</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-[10px] sm:text-xs uppercase">Curve Progress</p>
                    <p className="text-yellow-400 font-mono text-sm sm:text-base font-bold">{progress.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-[10px] sm:text-xs uppercase">Liquidity</p>
                    <p className="text-cyan-400 font-mono text-sm sm:text-base font-bold">{formatAvax(liquidityAvax)} AVAX</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-[10px] sm:text-xs uppercase">To Graduate</p>
                    <p className="text-green-400 font-mono text-sm sm:text-base font-bold">{formatAvax(GRADUATION_LIQUIDITY_AVAX - liquidityAvax)} AVAX</p>
                  </div>
                </div>

                {/* Input Section */}
                <div className="mb-6 sm:mb-8">
                  <label className="block text-gray-400 text-sm sm:text-base mb-3 text-center">
                    If you invest
                  </label>
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={investmentInput}
                        onChange={(e) => setInvestmentInput(e.target.value)}
                        className="w-32 sm:w-40 md:w-48 bg-[#0a0a0a] border-2 border-green-800/50 focus:border-green-500 rounded-lg px-4 py-3 text-center text-green-400 font-mono text-xl sm:text-2xl font-bold outline-none transition-colors"
                        placeholder="2"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono">AVAX</span>
                    </div>
                  </div>
                  {/* Preset buttons */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setInvestmentInput(String(amt))}
                        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-mono font-bold transition-all ${
                          investmentInput === String(amt)
                            ? "bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                            : "bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 hover:border-green-800/50 hover:text-green-400"
                        }`}
                      >
                        {amt} AVAX
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results */}
                {investment > 0 && multiplier > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="bg-[#0a0a0a] border border-green-900/30 rounded-xl p-5 sm:p-6 mb-6">
                      {/* ROI Badge */}
                      <div className="text-center mb-5">
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700/40 rounded-full px-5 py-2 sm:px-6 sm:py-3"
                        >
                          <span className="text-green-300 text-xs sm:text-sm uppercase tracking-wider">Potential ROI</span>
                          <span className="text-green-400 font-creepster text-2xl sm:text-3xl md:text-4xl">
                            +{roi.toFixed(0)}%
                          </span>
                          <span className="text-green-500 text-lg">🚀</span>
                        </motion.div>
                      </div>

                      {/* Results Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                          <p className="text-gray-500 text-[10px] sm:text-xs uppercase mb-1">You Invest Now</p>
                          <p className="text-white font-mono text-lg sm:text-xl font-bold">
                            {formatAvax(investment)} AVAX
                          </p>
                          <p className="text-gray-600 text-[10px] sm:text-xs">≈ {formatUsd(investment * avaxUsd)}</p>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-green-900/30">
                          <p className="text-gray-500 text-[10px] sm:text-xs uppercase mb-1">Value at Graduation</p>
                          <p className="text-green-400 font-mono text-lg sm:text-xl font-bold">
                            {formatAvax(estimatedValueAvax)} AVAX
                          </p>
                          <p className="text-green-600 text-[10px] sm:text-xs">≈ {formatUsd(estimatedValueUsd)}</p>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                          <p className="text-gray-500 text-[10px] sm:text-xs uppercase mb-1">Tokens You Get</p>
                          <p className="text-orange-400 font-mono text-lg sm:text-xl font-bold">
                            {tokensYouGet >= 1_000_000_000
                              ? `${(tokensYouGet / 1_000_000_000).toFixed(1)}B`
                              : tokensYouGet >= 1_000_000
                              ? `${(tokensYouGet / 1_000_000).toFixed(1)}M`
                              : formatAvax(tokensYouGet)
                            }
                          </p>
                          <p className="text-gray-600 text-[10px] sm:text-xs">$DOOM tokens</p>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-green-900/30">
                          <p className="text-gray-500 text-[10px] sm:text-xs uppercase mb-1">Potential Profit</p>
                          <p className="text-green-400 font-mono text-lg sm:text-xl font-bold">
                            +{formatAvax(estimatedProfitAvax)} AVAX
                          </p>
                          <p className="text-green-600 text-[10px] sm:text-xs">≈ +{formatUsd(estimatedProfitUsd)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="text-center mb-6">
                      <p className="text-gray-600 text-[10px] sm:text-xs leading-relaxed">
                        ⚠️ This is a simplified estimate based on bonding curve mechanics ({formatAvax(GRADUATION_LIQUIDITY_AVAX)} AVAX graduation threshold / {formatAvax(liquidityAvax)} AVAX current liquidity). 
                        Actual returns depend on market conditions, sell pressure, and demand. This is NOT financial advice. DYOR.
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                      <a
                        href={ARENA_TOKEN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 sm:px-10 py-3 sm:py-4 bg-green-600 hover:bg-green-700 text-white font-creepster text-lg sm:text-xl rounded-xl shadow-[0_0_25px_rgba(34,197,94,0.4)] hover:shadow-[0_0_35px_rgba(34,197,94,0.6)] transition-all duration-300"
                      >
                        🐺 GET IN BEFORE GRADUATION
                      </a>
                      <p className="text-gray-600 text-[10px] sm:text-xs mt-3">
                        Every buy pushes the curve closer. Don't fade the hound.
                      </p>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
