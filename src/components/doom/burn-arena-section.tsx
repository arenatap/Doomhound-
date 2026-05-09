"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

// ===== BURN ARENA — Live Burn Tracker =====
// Shows countdown to next daily burn, burn history, and total burned counter.
// Burns are fetched on-chain from Snowtrace (transfers to 0xdead).

const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const TOTAL_SUPPLY_DEFAULT = 4_692_471_068; // 4.69B fallback — live value fetched from API
const BURN_AMOUNT_DAILY = 10_000_000; // 10M per day
const SNOWTRACE_TX = "https://snowtrace.io/tx/";

interface BurnRecord {
  hash: string;
  value: string;
  timeStamp: string;
}

function formatBurnAmount(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

function timeAgo(timestamp: string): string {
  const now = Date.now() / 1000;
  const then = parseFloat(timestamp);
  const diff = now - then;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function BurnArenaSection() {
  const [totalBurned, setTotalBurned] = useState<number>(0);
  const [burnHistory, setBurnHistory] = useState<BurnRecord[]>([]);
  const [burnCount, setBurnCount] = useState(0);
  const [totalSupply, setTotalSupply] = useState<number>(TOTAL_SUPPLY_DEFAULT);
  const [loaded, setLoaded] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });

  const fetchBurnData = useCallback(async () => {
    try {
      const res = await fetch("/api/snowtrace?action=burns");
      const data = await res.json();
      if (data.totalBurnedTokens !== undefined) {
        setTotalBurned(data.totalBurnedTokens);
        setBurnHistory(data.burns || []);
        setBurnCount(data.burnCount || 0);
      }
    } catch {
      // Silent — will show fallback
    }

    // Fetch live total supply from Snowtrace
    try {
      const infoRes = await fetch("/api/snowtrace?action=info");
      const infoData = await infoRes.json();
      if (infoData.supply) {
        // Supply is in wei-like format (18 decimals), convert to tokens
        const supplyNum = parseFloat(infoData.supply) / 1e18;
        if (supplyNum > 0) {
          setTotalSupply(supplyNum);
        }
      }
    } catch {
      // Silent — will use default
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchBurnData();
    const interval = setInterval(fetchBurnData, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [fetchBurnData]);

  // Countdown to next daily burn (assume burn happens at 8:00 AM Rome time / Europe/Rome)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Convert to Rome time
      const romeTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
      const hours = romeTime.getHours();
      const minutes = romeTime.getMinutes();
      const seconds = romeTime.getSeconds();

      // Next burn at 12:00 (noon) Rome time
      let targetH = 12;
      let daysToAdd = 0;
      if (hours > targetH || (hours === targetH && minutes > 0)) {
        daysToAdd = 1;
      }

      const target = new Date(romeTime);
      target.setHours(targetH, 0, 0, 0);
      target.setDate(target.getDate() + daysToAdd);

      const diff = target.getTime() - romeTime.getTime();
      if (diff <= 0) {
        setCountdown({ h: 0, m: 0, s: 0 });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      setCountdown({
        h: Math.floor(totalSeconds / 3600),
        m: Math.floor((totalSeconds % 3600) / 60),
        s: totalSeconds % 60,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const burnPercentage = ((totalBurned / totalSupply) * 100);
  const remainingSupply = Math.max(0, totalSupply - totalBurned);
  const daysOfBurnsLeft = remainingSupply > 0 ? Math.ceil(remainingSupply / BURN_AMOUNT_DAILY) : 0;

  return (
    <section id="burn-arena" className="relative py-20 sm:py-28 bg-[#0a0a0a] overflow-hidden">
      {/* Flame border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />

      {/* Background fire glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 md:px-16">
        {/* Header with mascot breathing fire */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-8 sm:mb-12">
            {/* Text side */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl text-orange-500 animate-glow-red mb-3 sm:mb-4">
                🔥 BURN ARENA
              </h2>
              <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-md md:mx-0 mx-auto">
                10M $DOOM burned daily at noon. Supply shrinking. No mercy. The hound eats its own.
              </p>
            </div>
            {/* Mascot — the hound breathes fire on the burns */}
            <div className="relative flex-shrink-0">
              <div className="relative w-40 h-40 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-full overflow-hidden border-2 border-orange-600/50 shadow-[0_0_40px_rgba(234,88,12,0.3),0_0_80px_rgba(220,38,38,0.15)]">
                <img
                  src="/images/doomhound-fire.png"
                  alt="Doomhound breathing fire"
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(1.1) contrast(1.1)" }}
                />
              </div>
              {/* Fire glow ring animation */}
              <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-pulse" />
              <div className="absolute -inset-2 rounded-full border border-red-600/10 animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>
          </div>
        </ScrollReveal>

        {/* Main Stats Row */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
            {/* Total Burned */}
            <div className="bg-[#1a1a1a] border border-orange-900/30 rounded-xl p-5 sm:p-6 text-center">
              <motion.p
                key={Math.round(totalBurned / 1_000_000)}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-creepster text-3xl sm:text-4xl md:text-5xl text-orange-400"
              >
                {loaded ? formatBurnAmount(totalBurned) : "..."}
              </motion.p>
              <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-wider mt-2">$DOOM Burned Forever</p>
              <p className="text-orange-600 text-[10px] sm:text-xs mt-1">
                {loaded ? `${burnPercentage.toFixed(2)}% of total supply` : ""}
              </p>
            </div>

            {/* Countdown */}
            <div className="bg-[#1a1a1a] border border-red-900/30 rounded-xl p-5 sm:p-6 text-center">
              <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mb-2">Next Burn In</p>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="bg-[#0a0a0a] rounded-lg px-3 py-2 sm:px-4 sm:py-3 border border-[#2a2a2a]">
                  <span className="font-mono text-2xl sm:text-3xl md:text-4xl text-red-400 font-bold">
                    {String(countdown.h).padStart(2, "0")}
                  </span>
                  <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">hrs</p>
                </div>
                <span className="text-red-600 text-xl sm:text-2xl font-bold animate-pulse">:</span>
                <div className="bg-[#0a0a0a] rounded-lg px-3 py-2 sm:px-4 sm:py-3 border border-[#2a2a2a]">
                  <span className="font-mono text-2xl sm:text-3xl md:text-4xl text-red-400 font-bold">
                    {String(countdown.m).padStart(2, "0")}
                  </span>
                  <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">min</p>
                </div>
                <span className="text-red-600 text-xl sm:text-2xl font-bold animate-pulse">:</span>
                <div className="bg-[#0a0a0a] rounded-lg px-3 py-2 sm:px-4 sm:py-3 border border-[#2a2a2a]">
                  <span className="font-mono text-2xl sm:text-3xl md:text-4xl text-red-400 font-bold">
                    {String(countdown.s).padStart(2, "0")}
                  </span>
                  <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">sec</p>
                </div>
              </div>
              <p className="text-gray-600 text-[10px] sm:text-xs mt-2">Every day at 12:00 PM CET</p>
            </div>

            {/* Burn Schedule */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 text-center">
              <p className="font-creepster text-2xl sm:text-3xl text-gray-300">
                {loaded ? `${formatBurnAmount(remainingSupply)}` : "..."}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-wider mt-2">Remaining Supply</p>
              <p className="text-gray-600 text-[10px] sm:text-xs mt-1">
                {loaded ? `~${daysOfBurnsLeft.toLocaleString()} days of burns left` : ""}
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Burn Progress Bar */}
        <ScrollReveal delay={0.15}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 mb-8 sm:mb-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs sm:text-sm uppercase tracking-wider">Supply Destroyed</span>
              <span className="text-orange-400 text-xs sm:text-sm font-mono">{burnPercentage.toFixed(2)}%</span>
            </div>
            <div className="relative w-full h-4 sm:h-5 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#2a2a2a]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, burnPercentage)}%` }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-orange-700 via-red-600 to-yellow-500"
                style={{ boxShadow: "0 0 12px rgba(234,88,12,0.5)" }}
              />
              {/* Fire particles on the edge */}
              {burnPercentage > 0.5 && (
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white/30 rounded-full animate-pulse"
                  style={{ left: `${Math.min(99, burnPercentage)}%`, transform: "translateX(-50%)" }}
                />
              )}
            </div>
            <div className="flex justify-between mt-2 text-[9px] sm:text-[10px] text-gray-600">
              <span>0</span>
              <span>{formatBurnAmount(totalSupply)} total supply</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Burn History */}
        <ScrollReveal delay={0.2}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-creepster text-xl sm:text-2xl text-orange-400">Burn History</h3>
              <span className="text-gray-500 text-[10px] sm:text-xs font-mono">{burnCount} burns on-chain</span>
            </div>

            {burnHistory.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {burnHistory.slice(0, 10).map((burn, i) => {
                  const amount = parseFloat(burn.value) / 1e18;
                  return (
                    <div
                      key={burn.hash}
                      className="flex items-center justify-between bg-[#0a0a0a] rounded-lg px-4 py-3 border border-[#2a2a2a] hover:border-orange-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-orange-400 text-lg">🔥</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-mono truncate">
                            {formatBurnAmount(amount)} $DOOM
                          </p>
                          <p className="text-gray-600 text-[10px]">{timeAgo(burn.timeStamp)}</p>
                        </div>
                      </div>
                      <a
                        href={`${SNOWTRACE_TX}${burn.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] sm:text-xs text-gray-500 hover:text-orange-400 transition-colors flex-shrink-0 ml-2"
                      >
                        View tx ↗
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                {loaded ? (
                  <p className="text-gray-600 text-sm">No burns recorded yet. The first burn is coming...</p>
                ) : (
                  <p className="text-gray-600 text-sm">Loading burn data...</p>
                )}
              </div>
            )}

            {/* Burn commitment message */}
            <div className="mt-4 pt-4 border-t border-[#2a2a2a] text-center">
              <p className="text-gray-500 text-xs sm:text-sm">
                💀 10M $DOOM sent to{" "}
                <code className="text-orange-400 text-[10px] sm:text-xs">{DEAD_ADDRESS.slice(0, 6)}...{DEAD_ADDRESS.slice(-4)}</code>
                {" "}every morning. Forever.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
