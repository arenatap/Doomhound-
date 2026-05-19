"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BloodSplash } from "./blood-splash";

// ===== TYPES =====
interface StreakStatus {
  streakDays: number;
  multiplier: number;
  multiplierLabel: string;
  multiplierColor: string;
  freezeAvailable: number;
  freezeUsedTotal: number;
  maxFreezes: number;
  nextMilestone: number | null;
  progressToNext: number;
  last7Days: { date: string; active: boolean; frozen: boolean }[];
  lastStreakAt: string | null;
}

const MULTIPLIER_TIERS = [
  { minDays: 30, multiplier: 2.0, label: "x2.0", color: "text-yellow-400", bg: "from-yellow-600 to-amber-400", emoji: "👑" },
  { minDays: 14, multiplier: 1.8, label: "x1.8", color: "text-red-400", bg: "from-red-600 to-orange-400", emoji: "🔥" },
  { minDays: 7, multiplier: 1.5, label: "x1.5", color: "text-orange-400", bg: "from-orange-600 to-yellow-500", emoji: "⚡" },
  { minDays: 3, multiplier: 1.2, label: "x1.2", color: "text-yellow-300", bg: "from-yellow-500 to-yellow-300", emoji: "✨" },
  { minDays: 0, multiplier: 1.0, label: "x1.0", color: "text-gray-300", bg: "from-gray-600 to-gray-400", emoji: "🐺" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ===== COMPONENT =====
export function StreakRewardSection() {
  const [handle, setHandle] = useState<string | null>(null);
  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ points: number; multiplier: number } | null>(null);
  const [activatingFreeze, setActivatingFreeze] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("doomhound_handle");
    if (stored) setHandle(stored.replace("@", "").trim().toLowerCase());
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!handle) return;
    try {
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "streak_status", handle }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch streak status:", err);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const dailyClaim = async () => {
    if (claiming || !handle) return;
    setClaiming(true);
    setClaimResult(null);
    try {
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "daily_claim", handle }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimResult({ points: data.pointsAwarded, multiplier: data.multiplier });
        fetchStatus();
      } else {
        setClaimResult({ points: 0, multiplier: 0 });
      }
    } catch (err) {
      console.error("Failed to claim:", err);
    } finally {
      setClaiming(false);
    }
  };

  const activateFreeze = async () => {
    if (activatingFreeze || !handle) return;
    setActivatingFreeze(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate_freeze", handle, targetDate: dateStr }),
      });
      const data = await res.json();
      if (data.success) fetchStatus();
    } catch (err) {
      console.error("Failed to activate freeze:", err);
    } finally {
      setActivatingFreeze(false);
    }
  };

  if (!handle) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
        <h3 className="font-creepster text-2xl text-red-500 mb-3">🔥 STREAK REWARD</h3>
        <p className="text-gray-500 text-sm">Join the pack to start your streak!</p>
      </div>
    );
  }

  const currentTier = status
    ? MULTIPLIER_TIERS.find(t => status.streakDays >= t.minDays) || MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1]
    : MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1];

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
      <div className="p-5 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-creepster text-2xl sm:text-3xl text-red-500">🔥 STREAK REWARD</h3>
          {status && <span className={`font-bold text-xs sm:text-sm ${currentTier.color}`}>{currentTier.label}</span>}
        </div>

        {loading ? (
          <div className="text-center py-6"><p className="text-gray-600 text-sm">Loading...</p></div>
        ) : status ? (
          <div className="space-y-4">
            {/* Streak Counter */}
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-5 text-center">
              <motion.div key={status.streakDays} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-5xl sm:text-6xl font-bold font-mono">
                <span className={`bg-gradient-to-r ${currentTier.bg} bg-clip-text text-transparent`}>{status.streakDays}</span>
              </motion.div>
              <p className="text-gray-500 text-xs mt-1 uppercase tracking-wider">Day Streak</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                {Array.from({ length: Math.min(status.streakDays, 10) }).map((_, i) => (
                  <span key={i} className="text-xs">🔥</span>
                ))}
                {status.streakDays > 10 && <span className="text-gray-500 text-xs">+{status.streakDays - 10}</span>}
              </div>
            </div>

            {/* Multiplier */}
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Multiplier</span>
                <span className={`${currentTier.color} font-bold text-lg font-mono`}>{currentTier.emoji} {currentTier.label}</span>
              </div>
              <div className="w-full h-2 bg-[#2a2a2a] rounded-full mt-2 overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${currentTier.bg} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, status.progressToNext)}%` }} />
              </div>
              {status.nextMilestone ? (
                <p className="text-gray-600 text-[9px] mt-1 text-center">
                  {status.nextMilestone - status.streakDays} days to {MULTIPLIER_TIERS.find(t => t.minDays === status.nextMilestone)?.label}
                </p>
              ) : (
                <p className="text-yellow-400 text-[9px] mt-1 text-center font-bold">👑 MAX TIER!</p>
              )}
            </div>

            {/* Tiers */}
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 space-y-1.5">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Tiers</p>
              {MULTIPLIER_TIERS.map((tier) => {
                const isActive = status.streakDays >= tier.minDays;
                const isCurrent = isActive && (tier === MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1] || status.streakDays < (MULTIPLIER_TIERS[MULTIPLIER_TIERS.indexOf(tier) - 1]?.minDays ?? Infinity));
                return (
                  <div key={tier.minDays} className={`flex items-center justify-between rounded px-2 py-1 ${isCurrent ? "bg-green-900/20 border border-green-600/30" : isActive ? "bg-[#2a2a2a]" : ""}`}>
                    <span className="text-xs">{tier.emoji}</span>
                    <span className={`text-xs ${isActive ? tier.color : "text-gray-600"}`}>{tier.minDays}+ days</span>
                    <span className={`text-xs font-bold ${isActive ? tier.color : "text-gray-700"}`}>{tier.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Last 7 Days */}
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Last 7 Days</p>
              <div className="grid grid-cols-7 gap-1">
                {status.last7Days.map((day) => {
                  const date = new Date(day.date + "T00:00:00Z");
                  const dayLabel = DAY_LABELS[date.getUTCDay()] || "";
                  return (
                    <div key={day.date} className="text-center">
                      <p className="text-gray-600 text-[8px] mb-1">{dayLabel}</p>
                      <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-sm ${day.active ? "bg-green-900/40 border border-green-600/50" : day.frozen ? "bg-blue-900/40 border border-blue-600/50" : "bg-[#2a2a2a]"}`}>
                        {day.active ? "✅" : day.frozen ? "🧊" : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Freeze & Claim */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center space-y-2">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Freezes</p>
                <div className="flex items-center justify-center gap-1">
                  {Array.from({ length: status.maxFreezes }).map((_, i) => (
                    <span key={i} className="text-lg">{i < status.freezeAvailable ? "🧊" : "⬜"}</span>
                  ))}
                </div>
                <p className="text-gray-600 text-[8px]">{status.freezeAvailable}/{status.maxFreezes}</p>
                {status.freezeAvailable > 0 && (
                  <button onClick={activateFreeze} disabled={activatingFreeze} className="w-full py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all">
                    {activatingFreeze ? "..." : "FREEZE TMROW"}
                  </button>
                )}
                <p className="text-gray-700 text-[7px]">1 freeze / 30 days streak</p>
              </div>
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center space-y-2">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Daily Claim</p>
                <p className="text-white text-lg font-bold">+{Math.ceil(1 * status.multiplier)} pts</p>
                <p className="text-gray-600 text-[8px]">1 pt × {status.multiplier}x</p>
                <BloodSplash className="w-full">
                  <button onClick={dailyClaim} disabled={claiming} className="w-full py-1.5 text-[10px] font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)] transition-all">
                    {claiming ? "CLAIMING..." : "CLAIM DAILY"}
                  </button>
                </BloodSplash>
              </div>
            </div>

            {/* Result */}
            <AnimatePresence>
              {claimResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`rounded-lg p-3 text-center ${claimResult.points > 0 ? "bg-green-900/30 border border-green-500/50" : "bg-red-900/30 border border-red-500/50"}`}
                >
                  {claimResult.points > 0 ? (
                    <p className="text-green-400 text-sm font-bold">🔥 +{claimResult.points} pts! ({claimResult.multiplier}x)</p>
                  ) : (
                    <p className="text-red-400 text-sm font-bold">Already claimed today!</p>
                  )}
                  <button onClick={() => setClaimResult(null)} className="text-gray-500 text-[10px] mt-1 hover:text-gray-300">Dismiss</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-6"><p className="text-gray-600 text-sm">Failed to load</p></div>
        )}

        <p className="text-gray-700 text-[8px] sm:text-[9px] text-center mt-3">
          Streak multiplier applies to ALL point sources: staking, missions, referrals, claims!
        </p>
      </div>
    </div>
  );
}
