"use client";

import { useState, useEffect, useCallback } from "react";
import { DoomShell } from "@/components/doom/doom-shell";
import { StakingSection } from "@/components/doom/staking-section";
import { BloodSplash } from "@/components/doom/blood-splash";
import { Footer } from "@/components/doom/footer";
import { ScrollReveal } from "@/components/doom/scroll-reveal";
import { motion, AnimatePresence } from "framer-motion";

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  points: number;
  createdAt: string;
}

interface PackMember {
  id: string;
  handle: string;
  userName: string;
  profilePic: string;
  walletAddress: string | null;
  points: number;
  rank: string;
  lastCheckIn: string | null;
  lastThreadCount: number;
  lastFollowerCount: number;
  lastVerifiedAt: string | null;
  doomhoundBalance: number;
  balanceCheckedAt: string | null;
  lastWheelSpin: string | null;
  pendingWinnings: number;
  totalWheelSpins: number;
  totalWheelWinnings: number;
  prizeSent: boolean;
  referredBy: string | null;
  stakedAmount: number;
  stakingTier: string;
  pendingStakingReward: number;
  lastStakingUpdate: string | null;
  airdropPointsStart: number;
  createdAt: string;
  streakCount: number;
  lastStreakAt: string | null;
  achievements: string;
  activities: ActivityLog[];
}

interface AirdropEntry {
  handle: string;
  userName: string;
  profilePic: string;
  stakingTier: string;
  airdropPoints: number;
  totalPoints: number;
  isDev: boolean;
}

interface AirdropData {
  leaderboard: AirdropEntry[];
  airdropPrizes: { rank: number; amount: number; emoji: string }[];
  totalPool: number;
  devExcluded: boolean;
  airdropInitialized: boolean;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatBalance(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(2)}M`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(1)}K`;
  return b.toFixed(0);
}

const STAKING_TIERS = [
  { tier: "diamond", emoji: "💎", label: "Diamond", color: "text-cyan-400" },
  { tier: "gold", emoji: "🟡", label: "Gold", color: "text-yellow-400" },
  { tier: "silver", emoji: "🥈", label: "Silver", color: "text-gray-300" },
  { tier: "bronze", emoji: "🥉", label: "Bronze", color: "text-orange-400" },
];

function getTierEmoji(tier: string) {
  return STAKING_TIERS.find(t => t.tier === tier)?.emoji || "";
}

function getTierColor(tier: string) {
  return STAKING_TIERS.find(t => t.tier === tier)?.color || "text-gray-500";
}

export default function StakingPage() {
  const [member, setMember] = useState<PackMember | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"staking" | "airdrop">("staking");
  const [airdropData, setAirdropData] = useState<AirdropData | null>(null);
  const [airdropLoading, setAirdropLoading] = useState(false);

  // Session restore
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await fetch("/api/pack?action=session_login");
        if (res.ok) {
          const data = await res.json();
          if (data.member) {
            setMember(data.member);
            setSessionLoading(false);
            return;
          }
        }
      } catch {}

      if (typeof window !== "undefined") {
        const savedHandle = localStorage.getItem("doomhound_handle");
        if (savedHandle) {
          try {
            const res = await fetch(`/api/pack?action=restore_session&handle=${encodeURIComponent(savedHandle)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.member) {
                setMember(data.member);
                setSessionLoading(false);
                return;
              }
            }
          } catch {}
          localStorage.removeItem("doomhound_handle");
        }
      }
      setSessionLoading(false);
    };
    restoreSession();
  }, []);

  // Fetch airdrop leaderboard
  const fetchAirdrop = useCallback(async () => {
    setAirdropLoading(true);
    try {
      const res = await fetch("/api/pack?action=airdrop_leaderboard");
      if (res.ok) {
        const data = await res.json();
        setAirdropData(data);
      }
    } catch {}
    setAirdropLoading(false);
  }, []);

  useEffect(() => {
    fetchAirdrop();
  }, [fetchAirdrop]);

  const registerUser = useCallback(async () => {
    if (!handle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const cleanHandle = handle.replace("@", "").trim().toLowerCase();
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", handle: cleanHandle }),
      });
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        if (typeof window !== "undefined") {
          localStorage.setItem("doomhound_handle", data.member.handle);
        }
      } else {
        setError(data.error || "Registration failed");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }, [handle]);

  // Calculate user's airdrop rank
  const userAirdropPoints = member ? Math.max(0, member.points - member.airdropPointsStart) : 0;
  const userAirdropRank = airdropData
    ? airdropData.leaderboard.filter(e => !e.isDev && e.airdropPoints > userAirdropPoints).length + 1
    : null;

  if (sessionLoading) {
    return (
      <DoomShell>
        <div className="pt-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🐺</div>
            <p className="text-gray-500 text-sm">Loading your stake...</p>
          </div>
        </div>
      </DoomShell>
    );
  }

  if (!member) {
    return (
      <DoomShell>
        <div className="pt-16 min-h-screen flex items-center justify-center px-6">
          <ScrollReveal>
            <div className="max-w-md mx-auto text-center">
              <h2 className="font-creepster text-5xl sm:text-7xl text-red-500 animate-glow-red mb-6">
                🔥 STAKING
              </h2>
              <p className="text-gray-400 text-sm sm:text-base mb-8">
                Hold $DOOMHOUND, earn daily rewards. Your balance is auto-detected from the blockchain.
              </p>

              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 sm:p-8">
                <label className="text-xs sm:text-sm uppercase tracking-wider text-gray-500 mb-2 block">
                  Enter your Arena handle to join
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => { setHandle(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && registerUser()}
                    placeholder="@yourhandle"
                    className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all"
                  />
                  <BloodSplash>
                    <button
                      onClick={registerUser}
                      disabled={loading || !handle.trim()}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? "..." : "JOIN"}
                    </button>
                  </BloodSplash>
                </div>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              </div>
            </div>
          </ScrollReveal>
        </div>
        <Footer />
      </DoomShell>
    );
  }

  return (
    <DoomShell>
      <div className="pt-16">
        {/* Header */}
        <section className="relative py-12 sm:py-16 bg-[#0a0a0a] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 text-center">
            <ScrollReveal>
              <h1 className="font-creepster text-5xl sm:text-7xl md:text-8xl text-red-500 animate-glow-red mb-4">
                🔥 STAKING
              </h1>
              <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-xl mx-auto">
                Hold $DOOMHOUND, earn daily rewards. No lock-up, no staking button — just buy and hold.
                Your balance is auto-detected from the blockchain at every check-in.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Tab Switcher */}
        <section className="bg-[#0a0a0a] border-b border-[#2a2a2a]">
          <div className="max-w-4xl mx-auto px-6 sm:px-10">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("staking")}
                className={`px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                  activeTab === "staking"
                    ? "text-red-400 border-b-2 border-red-500 bg-red-600/10"
                    : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent"
                }`}
              >
                🔥 Staking
              </button>
              <button
                onClick={() => { setActiveTab("airdrop"); fetchAirdrop(); }}
                className={`px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                  activeTab === "airdrop"
                    ? "text-orange-400 border-b-2 border-orange-500 bg-orange-600/10"
                    : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent"
                }`}
              >
                🏆 Airdrop
              </button>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="bg-[#0a0a0a] py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-6 sm:px-10 space-y-6">

            <AnimatePresence mode="wait">
              {activeTab === "staking" ? (
                <motion.div key="staking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <StakingSection
                    member={member}
                    onRewardClaimed={(updatedMember) => {
                      setMember(updatedMember);
                    }}
                  />

                  {/* Quick check-in reminder */}
                  {!member.lastCheckIn && (
                    <div className="bg-orange-900/20 border border-orange-600/40 rounded-xl p-4 text-center mt-6">
                      <p className="text-orange-400 text-sm font-bold mb-2">
                        ⚠️ You haven&apos;t checked in yet today!
                      </p>
                      <p className="text-gray-400 text-xs">
                        Daily check-in updates your staking balance and earns you points.
                        <a href="/pack" className="text-red-400 hover:text-red-300 underline ml-1">Go to Pack →</a>
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="airdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

                  {/* Airdrop Header Card */}
                  <div className="bg-gradient-to-br from-[#1a0a0a] to-[#1a1a1a] border border-orange-600/30 rounded-xl overflow-hidden animate-flame-border">
                    <div className="p-5 sm:p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl sm:text-4xl">🏆</span>
                        <div>
                          <h2 className="font-creepster text-2xl sm:text-3xl text-orange-400">GRADUATION AIRDROP</h2>
                          <p className="text-gray-500 text-xs">When $DOOMHOUND breaks the bonding curve</p>
                        </div>
                      </div>

                      {/* Prize Pool */}
                      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 mb-4 text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Prize Pool</p>
                        <p className="text-orange-400 font-bold text-3xl sm:text-4xl font-mono">200M</p>
                        <p className="text-gray-600 text-xs">$DOOMHOUND</p>
                      </div>

                      {/* Prizes */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {airdropData?.airdropPrizes?.map((prize) => (
                          <div key={prize.rank} className={`bg-[#0a0a0a] border rounded-lg p-3 text-center ${
                            prize.rank === 1 ? "border-yellow-500/50" :
                            prize.rank === 2 ? "border-gray-400/50" :
                            "border-orange-700/50"
                          }`}>
                            <div className="text-xl mb-1">{prize.emoji}</div>
                            <p className="text-white font-bold text-sm sm:text-base font-mono">{formatBalance(prize.amount)}</p>
                            <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">{prize.rank === 1 ? "1st Place" : prize.rank === 2 ? "2nd Place" : "3rd Place"}</p>
                          </div>
                        ))}
                      </div>

                      {/* Dev exclusion badge */}
                      <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600">
                        <span>🐾</span>
                        <span>Dev is excluded — 100% for the community</span>
                      </div>
                    </div>
                  </div>

                  {/* Your Airdrop Position */}
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                    <h3 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Your Airdrop Position</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                        <p className="text-orange-400 font-bold text-lg sm:text-xl font-mono">
                          #{userAirdropRank || "?"}
                        </p>
                        <p className="text-gray-600 text-[9px] uppercase">Rank</p>
                      </div>
                      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                        <p className="text-green-400 font-bold text-lg sm:text-xl font-mono">
                          {formatNumber(userAirdropPoints)}
                        </p>
                        <p className="text-gray-600 text-[9px] uppercase">Airdrop Pts</p>
                      </div>
                      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                        <p className={`font-bold text-lg sm:text-xl ${getTierColor(member.stakingTier)}`}>
                          {getTierEmoji(member.stakingTier) || "—"}
                        </p>
                        <p className="text-gray-600 text-[9px] uppercase">Staking Tier</p>
                      </div>
                    </div>
                  </div>

                  {/* Airdrop Leaderboard */}
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
                      <h3 className="font-creepster text-xl text-red-500">🏆 AIRDROP LEADERBOARD</h3>
                      <button
                        onClick={fetchAirdrop}
                        disabled={airdropLoading}
                        className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
                      >
                        {airdropLoading ? "..." : "↻ Refresh"}
                      </button>
                    </div>

                    {/* Not initialized notice */}
                    {airdropData && !airdropData.airdropInitialized && (
                      <div className="bg-yellow-900/20 border-b border-yellow-600/30 p-4 text-center">
                        <p className="text-yellow-400 text-xs font-bold mb-1">⏳ AIRDROP NOT STARTED YET</p>
                        <p className="text-gray-500 text-[10px]">The race begins when the admin initializes the airdrop. Everyone will start from 0 points.</p>
                      </div>
                    )}

                    <div className="divide-y divide-[#1a1a1a]">
                      {airdropLoading && !airdropData ? (
                        <div className="p-8 text-center">
                          <div className="text-2xl mb-2 animate-pulse">🐺</div>
                          <p className="text-gray-600 text-sm">Loading leaderboard...</p>
                        </div>
                      ) : airdropData && airdropData.leaderboard.length > 0 ? (
                        airdropData.leaderboard.map((entry, idx) => {
                          const isUser = entry.handle === member.handle;
                          const effectiveRank = entry.isDev ? null : (() => {
                            let rank = 1;
                            for (const e of airdropData.leaderboard) {
                              if (e === entry) break;
                              if (!e.isDev) rank++;
                            }
                            return rank;
                          })();

                          return (
                            <div
                              key={entry.handle}
                              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                                isUser
                                  ? "bg-red-600/10 border-l-2 border-red-500"
                                  : entry.isDev
                                  ? "bg-[#0a0a0a]/50 opacity-50"
                                  : "hover:bg-[#0a0a0a]/50"
                              }`}
                            >
                              {/* Rank */}
                              <div className="w-8 text-center flex-shrink-0">
                                {effectiveRank === 1 ? (
                                  <span className="text-lg">🥇</span>
                                ) : effectiveRank === 2 ? (
                                  <span className="text-lg">🥈</span>
                                ) : effectiveRank === 3 ? (
                                  <span className="text-lg">🥉</span>
                                ) : entry.isDev ? (
                                  <span className="text-xs">🐾</span>
                                ) : (
                                  <span className="text-gray-600 text-xs font-mono">#{effectiveRank}</span>
                                )}
                              </div>

                              {/* Avatar */}
                              <img
                                src={entry.profilePic || "/images/doomhound-logo.png"}
                                alt=""
                                className="w-8 h-8 rounded-full border border-[#2a2a2a] flex-shrink-0"
                              />

                              {/* Name */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold truncate ${isUser ? "text-red-400" : "text-white"}`}>
                                    @{entry.handle}
                                  </span>
                                  {isUser && (
                                    <span className="text-[8px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded font-bold">YOU</span>
                                  )}
                                  {entry.isDev && (
                                    <span className="text-[8px] bg-gray-600/20 text-gray-400 px-1.5 py-0.5 rounded font-bold">PACK ALPHA</span>
                                  )}
                                </div>
                              </div>

                              {/* Tier badge */}
                              <span className={`text-xs ${getTierColor(entry.stakingTier)}`}>
                                {getTierEmoji(entry.stakingTier)}
                              </span>

                              {/* Airdrop points */}
                              <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-bold font-mono ${
                                  effectiveRank === 1 ? "text-yellow-400" :
                                  effectiveRank === 2 ? "text-gray-300" :
                                  effectiveRank === 3 ? "text-orange-400" :
                                  "text-white"
                                }`}>
                                  {formatNumber(entry.airdropPoints)}
                                </p>
                                <p className="text-gray-600 text-[8px]">pts</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-gray-600 text-sm">No airdrop points yet. Start earning!</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* How it works */}
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                    <h3 className="font-creepster text-lg text-gray-400 mb-3">HOW IT WORKS</h3>
                    <div className="space-y-2 text-gray-500 text-xs sm:text-sm">
                      <p>🐺 <strong className="text-gray-300">The race starts NOW</strong> — everyone at 0 airdrop points</p>
                      <p>🔥 <strong className="text-gray-300">Every point counts</strong> — check-ins, staking claims, wheel spins, achievements</p>
                      <p>💎 <strong className="text-gray-300">Staking multiplies</strong> — Diamond tier earns 40 pts/day automatically</p>
                      <p>🐾 <strong className="text-gray-300">Dev is excluded</strong> — 100% for the community</p>
                      <p>🏆 <strong className="text-orange-400">Top 3 at graduation</strong> split 200M $DOOMHOUND (100M / 60M / 40M)</p>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </section>
      </div>
      <Footer />
    </DoomShell>
  );
}
