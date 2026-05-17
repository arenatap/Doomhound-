"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BloodSplash } from "./blood-splash";

// ===== TYPES =====
interface StakingTierInfo {
  minBalance: number;
  tier: string;
  emoji: string;
  label: string;
  ptsPerDay: number;
  apy: number;
  color: string;
}

interface StakingStats {
  totalStaked: number;
  totalStakers: number;
  topStakers: {
    handle: string;
    userName: string;
    profilePic: string;
    stakedAmount: number;
    stakingTier: string;
  }[];
  tierCounts: Record<string, number>;
  totalRewardsDistributed: number;
}

interface StakingSectionProps {
  member: {
    handle: string;
    walletAddress: string | null;
    stakedAmount: number;
    stakingTier: string;
    pendingStakingReward: number;
    lastStakingUpdate: string | null;
    doomhoundBalance: number;
  };
  onRewardClaimed: (updatedMember: any) => void;
}

// ===== STAKING TIERS (must match server) =====
const STAKING_TIERS: StakingTierInfo[] = [
  { minBalance: 100_000_000, tier: "diamond", emoji: "💎", label: "Diamond", ptsPerDay: 40, apy: 40, color: "text-cyan-400" },
  { minBalance: 50_000_000,  tier: "gold",    emoji: "🟡", label: "Gold",    ptsPerDay: 20, apy: 20, color: "text-yellow-400" },
  { minBalance: 10_000_000,  tier: "silver",  emoji: "🥈", label: "Silver",  ptsPerDay: 8,  apy: 8,  color: "text-gray-300" },
  { minBalance: 1_000_000,   tier: "bronze",  emoji: "🥉", label: "Bronze",  ptsPerDay: 3,  apy: 3,  color: "text-orange-400" },
];

function getStakingTierInfo(tier: string): StakingTierInfo | null {
  return STAKING_TIERS.find(t => t.tier === tier) || null;
}

function formatBalance(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(2)}M`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(1)}K`;
  return b.toFixed(0);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ===== COMPONENT =====
export function StakingSection({ member, onRewardClaimed }: StakingSectionProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ claimedReward: number; stakingTier: string } | null>(null);
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  const tierInfo = getStakingTierInfo(member.stakingTier);
  const hasStake = member.stakingTier !== "none" && member.stakedAmount > 0;
  const hasPendingReward = member.pendingStakingReward > 0;

  // Fetch pack staking stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/pack?action=staking_stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const claimRewards = async () => {
    if (claiming) return;
    setClaiming(true);
    setClaimResult(null);
    try {
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_staking", handle: member.handle }),
      });
      const data = await res.json();
      if (data.member) {
        setClaimResult({ claimedReward: data.claimedReward, stakingTier: data.stakingTier });
        onRewardClaimed(data.member);
        fetchStats();
      } else {
        setClaimResult(null);
      }
    } catch {
      setClaimResult(null);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
      <div className="p-5 sm:p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-creepster text-2xl sm:text-3xl text-red-500">🔥 STAKING</h3>
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showStats ? "My Stake" : "Pack Stats"}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!showStats ? (
            <motion.div key="my-stake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {hasStake ? (
                <>
                  {/* Active Stake Info */}
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs uppercase tracking-wider">Staked</span>
                      <span className="text-white font-bold text-sm sm:text-base font-mono">
                        {formatBalance(member.stakedAmount)} $DOOMHOUND
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs uppercase tracking-wider">Tier</span>
                      <span className={`${tierInfo?.color || "text-gray-400"} font-bold text-sm sm:text-base`}>
                        {tierInfo?.emoji} {tierInfo?.label || "None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs uppercase tracking-wider">APY</span>
                      <span className="text-green-400 font-bold text-sm sm:text-base">{tierInfo?.apy || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs uppercase tracking-wider">Daily Reward</span>
                      <span className="text-yellow-400 font-bold text-sm sm:text-base">{tierInfo?.ptsPerDay || 0} pts/day</span>
                    </div>
                    {member.lastStakingUpdate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Last Verified</span>
                        <span className="text-gray-400 text-[10px] sm:text-xs">
                          {new Date(member.lastStakingUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✅
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pending Rewards */}
                  <div className="bg-orange-900/20 border border-orange-600/40 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-orange-400 text-xs uppercase tracking-wider font-bold">Pending Rewards</span>
                      <span className="text-orange-300 font-bold text-lg sm:text-xl font-mono">
                        {member.pendingStakingReward} pts
                      </span>
                    </div>
                    <BloodSplash className="w-full">
                      <button
                        onClick={claimRewards}
                        disabled={claiming || !hasPendingReward}
                        className={`w-full py-3 text-sm sm:text-base font-bold rounded-xl transition-all duration-300 ${
                          hasPendingReward
                            ? "bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)] hover:shadow-[0_0_25px_rgba(234,88,12,0.6)]"
                            : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                        }`}
                      >
                        {claiming ? "CLAIMING..." : hasPendingReward ? `CLAIM ${member.pendingStakingReward} PTS` : "NO REWARDS YET"}
                      </button>
                    </BloodSplash>
                  </div>

                  {/* Claim Result */}
                  <AnimatePresence>
                    {claimResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 text-center"
                      >
                        <p className="text-green-400 text-sm font-bold">
                          🔥 Claimed {claimResult.claimedReward} staking rewards!
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tier Progress - next tier info */}
                  {tierInfo && (() => {
                    const currentIdx = STAKING_TIERS.indexOf(tierInfo);
                    const nextTier = currentIdx > 0 ? STAKING_TIERS[currentIdx - 1] : null;
                    if (nextTier) {
                      const progress = Math.min(100, (member.stakedAmount / nextTier.minBalance) * 100);
                      return (
                        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Next Tier</span>
                            <span className={`${nextTier.color} text-xs font-bold`}>
                              {nextTier.emoji} {nextTier.label} ({nextTier.ptsPerDay} pts/day)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-gray-600 text-[9px] mt-1 text-center">
                            {formatBalance(nextTier.minBalance - member.stakedAmount)} more to upgrade
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-cyan-900/20 border border-cyan-600/30 rounded-lg p-3 text-center">
                        <p className="text-cyan-400 text-xs font-bold">💎 MAX TIER — You&apos;re a Diamond Hound!</p>
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* No Stake */
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-6 text-center space-y-4">
                  <div className="text-4xl">🔒</div>
                  <p className="text-gray-400 text-sm sm:text-base">
                    No $DOOMHOUND staked yet
                  </p>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Buy $DOOMHOUND on Arena to start earning daily staking rewards.
                    Your balance is auto-detected — no need to stake manually!
                  </p>
                  <a
                    href="https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
                  >
                    BUY $DOOMHOUND
                  </a>
                </div>
              )}

              {/* Tier Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STAKING_TIERS.map((t) => (
                  <div
                    key={t.tier}
                    className={`rounded-lg p-2.5 text-center border transition-all ${
                      member.stakingTier === t.tier
                        ? `border-orange-600/50 bg-orange-900/20`
                        : "border-[#2a2a2a] bg-[#0a0a0a]"
                    }`}
                  >
                    <div className="text-lg">{t.emoji}</div>
                    <p className={`${t.color} text-[10px] sm:text-xs font-bold`}>{t.label}</p>
                    <p className="text-gray-500 text-[8px] sm:text-[10px]">{formatBalance(t.minBalance)}+</p>
                    <p className="text-green-400 text-[8px] sm:text-[10px] font-bold">{t.apy}% APY</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Pack Staking Stats */
            <motion.div key="pack-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {stats ? (
                <>
                  {/* Global Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                      <p className="text-orange-400 font-bold text-sm sm:text-base font-mono">
                        {formatBalance(stats.totalStaked)}
                      </p>
                      <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Total Staked</p>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                      <p className="text-purple-400 font-bold text-sm sm:text-base font-mono">
                        {stats.totalStakers}
                      </p>
                      <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Active Stakers</p>
                    </div>
                  </div>

                  {/* Tier Distribution */}
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Tier Distribution</p>
                    <div className="grid grid-cols-4 gap-2">
                      {STAKING_TIERS.map(t => (
                        <div key={t.tier} className="text-center">
                          <div className="text-sm">{t.emoji}</div>
                          <p className={`${t.color} text-xs font-bold`}>{stats.tierCounts[t.tier] || 0}</p>
                          <p className="text-gray-600 text-[8px]">{t.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Stakers */}
                  {stats.topStakers.length > 0 && (
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Top Stakers</p>
                      <div className="space-y-2">
                        {stats.topStakers.slice(0, 5).map((s, i) => {
                          const sTierInfo = getStakingTierInfo(s.stakingTier);
                          return (
                            <div key={s.handle} className="flex items-center gap-2">
                              <span className="text-gray-600 text-xs w-4">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                              <img src={s.profilePic || "/images/doomhound-logo.png"} alt="" className="w-5 h-5 rounded-full" />
                              <span className="text-white text-xs font-bold flex-1 truncate">@{s.handle}</span>
                              <span className={`${sTierInfo?.color || "text-gray-400"} text-[10px]`}>{sTierInfo?.emoji}</span>
                              <span className="text-gray-400 text-[10px] font-mono">{formatBalance(s.stakedAmount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Rewards Distributed */}
                  <div className="text-center">
                    <p className="text-gray-600 text-[9px]">
                      Total rewards distributed: <span className="text-green-400 font-bold">{formatNumber(stats.totalRewardsDistributed)} pts</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-600 text-sm">Loading stats...</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-staking notice */}
        <p className="text-gray-700 text-[8px] sm:text-[9px] text-center mt-3">
          Auto-staking: your balance is read on-chain at every check-in. Buy or sell $DOOMHOUND on Arena and your tier updates automatically.
        </p>
      </div>
    </div>
  );
}
