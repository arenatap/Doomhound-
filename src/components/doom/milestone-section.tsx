"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

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
  tokenPhase: number;
  bondingCurveProgress?: number | null;
}

// ===== MILESTONES =====
// Graduation at 503 AVAX liquidity / 2,149,963.74 $ARENA (from Arena production source)
// 1 AVAX = 4,274.28 $ARENA
// IMPORTANT: Milestones are based on LIQUIDITY (AVAX deposited into bonding curve),
// not market cap. Market cap overstates progress.
const ARENA_PER_AVAX = 4274.28;
const MILESTONES = [
  { mcap: 50, label: "Pup Phase", desc: "The hound awakens", emoji: "🐶" },
  { mcap: 100, label: "Shadow Fang", desc: "Gaining speed", emoji: "🐺" },
  { mcap: 200, label: "Hellfire", desc: "The pack is united", emoji: "🔥" },
  { mcap: 350, label: "Alpha Hound", desc: "Unstoppable force", emoji: "💀" },
  { mcap: 503, label: "GRADUATION", desc: "Liquidity locked forever! 503 AVAX / 2.15M $ARENA reached!", emoji: "🎓", isGraduation: true },
];

const ARENA_TOKEN_URL = "https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361";

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  if (val < 1000000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${(val / 1000000).toFixed(2)}M`;
}

type MilestoneStatus = "achieved" | "current" | "future";

function getMilestoneStatus(mcap: number, milestoneMcap: number, nextMilestone: number | null): MilestoneStatus {
  if (mcap >= milestoneMcap) return "achieved";
  if (nextMilestone !== null && mcap < nextMilestone && mcap >= milestoneMcap) return "current";
  // Find if this is the next unachieved milestone
  if (mcap < milestoneMcap) {
    // This milestone is "current" if it's the first unachieved one
    return "future";
  }
  return "future";
}

export function MilestoneSection() {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const marketCap = stats?.marketCap || 0;
  const liquidity = stats?.liquidity || 0; // Use liquidity for milestone progress
  const isGraduated = (community?.tokenPhase ?? 1) > 1;

  // Determine which milestone index is the "current" one (first not yet achieved)
  // Use LIQUIDITY (not market cap) since milestones are based on bonding curve liquidity
  let currentMilestoneIdx = MILESTONES.length - 1;
  for (let i = 0; i < MILESTONES.length; i++) {
    if (liquidity < MILESTONES[i].mcap) {
      currentMilestoneIdx = i;
      break;
    }
  }

  // Find the next milestone's mcap and previous milestone's mcap for progress calc
  const currentMilestone = MILESTONES[currentMilestoneIdx];
  const prevMilestoneMcap = currentMilestoneIdx > 0 ? MILESTONES[currentMilestoneIdx - 1].mcap : 0;
  const progressToNext = currentMilestone
    ? Math.min(100, ((liquidity - prevMilestoneMcap) / (currentMilestone.mcap - prevMilestoneMcap)) * 100)
    : 100;

  return (
    <section id="milestones" className="relative py-20 sm:py-28 bg-[#0a0a0a] overflow-hidden">
      {/* Flame border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl text-red-500 animate-glow-red text-center mb-4 sm:mb-6">
            MILESTONE ROADMAP
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-xl mx-auto">
            Every buy pushes $DOOMHOUND closer to graduation. Track the hound&apos;s rise through the ranks.
          </p>
        </ScrollReveal>

        {/* Current Market Cap Display */}
        <ScrollReveal delay={0.1}>
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-widest mb-2">Current Liquidity (Bonding Curve)</p>
            <motion.p
              key={Math.round(liquidity)}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-creepster text-4xl sm:text-6xl md:text-7xl text-orange-400"
            >
              {connected ? `${formatAvax(liquidity)} AVAX` : "Loading..."}
            </motion.p>
            <p className="text-gray-600 text-xs mt-1">Liquidity (Bonding Curve)</p>
          </div>
        </ScrollReveal>

        {/* Milestones List */}
        <div className="space-y-4 sm:space-y-5">
          {MILESTONES.map((milestone, i) => {
            const isAchieved = liquidity >= milestone.mcap || isGraduated;
            const isCurrent = i === currentMilestoneIdx && !isAchieved;
            const isFuture = !isAchieved && !isCurrent;
            const status: MilestoneStatus = isAchieved ? "achieved" : isCurrent ? "current" : "future";

            return (
              <ScrollReveal key={milestone.mcap} delay={i * 0.08}>
                <motion.div
                  className={`relative rounded-xl border p-4 sm:p-5 md:p-6 transition-all duration-500 ${
                    status === "achieved"
                      ? "bg-green-950/20 border-green-700/40 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                      : status === "current"
                      ? "bg-orange-950/20 border-orange-600/50 shadow-[0_0_15px_rgba(234,88,12,0.2)]"
                      : "bg-[#1a1a1a]/50 border-[#2a2a2a]/50"
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {status === "achieved" ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-600/20 border border-green-600/40 flex items-center justify-center">
                          <span className="text-green-400 text-lg sm:text-xl">✅</span>
                        </div>
                      ) : status === "current" ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-600/20 border border-orange-500/50 flex items-center justify-center relative">
                          <span className="text-orange-400 text-lg sm:text-xl">{milestone.emoji}</span>
                          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                          </span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                          <span className="text-gray-600 text-lg sm:text-xl">🔒</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span
                          className={`font-creepster text-lg sm:text-xl md:text-2xl ${
                            status === "achieved"
                              ? "text-green-400"
                              : status === "current"
                              ? "text-orange-400"
                              : "text-gray-600"
                          }`}
                        >
                          {milestone.label}
                        </span>
                        <span
                          className={`font-mono text-xs sm:text-sm px-2 py-0.5 rounded-full ${
                            status === "achieved"
                              ? "bg-green-900/30 text-green-400 border border-green-800/30"
                              : status === "current"
                              ? "bg-orange-900/30 text-orange-400 border border-orange-800/30"
                              : "bg-[#1a1a1a] text-gray-600 border border-[#2a2a2a]"
                          }`}
                        >
                          {milestone.mcap} AVAX
                        </span>
                        {milestone.isGraduation && (
                          <span className="text-yellow-400 text-xs sm:text-sm font-bold animate-pulse">
                            🎓 GRADUATION
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs sm:text-sm mt-1 ${
                          status === "achieved"
                            ? "text-green-300/70"
                            : status === "current"
                            ? "text-orange-300/70"
                            : "text-gray-600"
                        }`}
                      >
                        {milestone.desc}
                      </p>

                      {/* Progress bar for current milestone */}
                      {status === "current" && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1.5">
                            <span className="text-orange-400 font-mono">
                              {formatAvax(liquidity)} AVAX
                            </span>
                            <span className="text-orange-400/70 font-mono">
                              {progressToNext.toFixed(1)}% to {milestone.mcap} AVAX
                            </span>
                          </div>
                          <div className="relative w-full h-2 sm:h-2.5 bg-[#0a0a0a] rounded-full overflow-hidden border border-orange-900/30">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(2, progressToNext)}%` }}
                              transition={{ duration: 1.2, ease: "easeOut" }}
                              className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                              style={{ boxShadow: "0 0 8px rgba(234,88,12,0.4)" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* CTA Button */}
        {!isGraduated && (
          <ScrollReveal delay={0.5}>
            <div className="text-center mt-10 sm:mt-14">
              <BloodSplash>
                <a
                  href={ARENA_TOKEN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 sm:px-10 py-4 sm:py-5 bg-red-600 hover:bg-red-700 text-white font-creepster text-lg sm:text-xl md:text-2xl rounded-xl shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_35px_rgba(220,38,38,0.7)] transition-all duration-300 animate-breathing-glow"
                >
                  🔥 PUSH TO NEXT MILESTONE
                </a>
              </BloodSplash>
              <p className="text-gray-600 text-[10px] sm:text-xs mt-4">
                Every buy counts. Push the market cap to the next milestone and get closer to graduation!
              </p>
            </div>
          </ScrollReveal>
        )}

        {isGraduated && (
          <ScrollReveal delay={0.5}>
            <div className="text-center mt-10 sm:mt-14">
              <div className="bg-green-950/20 border border-green-700/40 rounded-xl p-6 sm:p-8">
                <p className="text-green-400 font-creepster text-2xl sm:text-3xl md:text-4xl mb-2">
                  🎓 $DOOMHOUND HAS GRADUATED!
                </p>
                <p className="text-green-300/70 text-sm sm:text-base">
                  Liquidity is locked forever. The hound runs free!
                </p>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
