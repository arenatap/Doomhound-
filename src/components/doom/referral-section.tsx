"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BloodSplash } from "./blood-splash";

// ===== TYPES =====
interface RefereeInfo {
  handle: string;
  userName: string;
  profilePic: string;
  stakingTier: string;
  registeredAt: string;
  stakeBonusAwarded: boolean;
}

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  activeReferralsForPoints: number;
  maxReferrals: number;
  totalReferralPoints: number;
  referees: RefereeInfo[];
}

const TIER_EMOJIS: Record<string, string> = {
  diamond: "💎", gold: "🟡", silver: "🥈", bronze: "🥉", none: "🐺",
};

// ===== COMPONENT =====
export function ReferralSection() {
  const [handle, setHandle] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("doomhound_handle");
    if (stored) setHandle(stored.replace("@", "").trim().toLowerCase());
  }, []);

  const fetchStats = useCallback(async () => {
    if (!handle) return;
    try {
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "referral_stats", handle }),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch referral stats:", err);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!handle) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
        <h3 className="font-creepster text-2xl text-red-500 mb-3">🐺 REFERRAL PACK</h3>
        <p className="text-gray-500 text-sm">Join the pack to get your referral code!</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
      <div className="p-5 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-creepster text-2xl sm:text-3xl text-red-500">🐺 REFERRAL PACK</h3>
          {stats && <span className="text-yellow-400 font-bold text-xs sm:text-sm font-mono">{stats.totalReferralPoints} pts</span>}
        </div>

        {loading ? (
          <div className="text-center py-6"><p className="text-gray-600 text-sm">Loading...</p></div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Code & Link */}
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Your Code</p>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-xl sm:text-2xl font-mono tracking-widest flex-1">{stats.referralCode}</span>
                <button onClick={() => copyToClipboard(stats.referralCode, "code")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white transition-all">
                  {copied === "code" ? "✓" : "COPY"}
                </button>
              </div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-3">Share Link</p>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs font-mono truncate flex-1">{stats.referralLink}</span>
                <button onClick={() => copyToClipboard(stats.referralLink, "link")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white transition-all">
                  {copied === "link" ? "✓" : "COPY"}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                <p className="text-orange-400 font-bold text-sm sm:text-base font-mono">{stats.totalReferrals}</p>
                <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">Total</p>
              </div>
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                <p className="text-green-400 font-bold text-sm sm:text-base font-mono">{stats.activeReferralsForPoints}</p>
                <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">Active</p>
              </div>
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                <p className="text-yellow-400 font-bold text-sm sm:text-base font-mono">{stats.totalReferralPoints}</p>
                <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">Pts</p>
              </div>
            </div>

            {/* Cap progress */}
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Referral Cap</span>
                <span className="text-gray-400 text-xs font-mono">{stats.activeReferralsForPoints}/{stats.maxReferrals}</span>
              </div>
              <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-600 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (stats.activeReferralsForPoints / stats.maxReferrals) * 100)}%` }} />
              </div>
              <p className="text-gray-700 text-[8px] mt-1 text-center">After {stats.maxReferrals} referrals, new recruits still join but no more pts</p>
            </div>

            {/* Reward breakdown */}
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 space-y-2">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Rewards</p>
              <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">You (per referral)</span><span className="text-yellow-400 text-xs font-bold">+5 pts</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">Recruit welcome</span><span className="text-green-400 text-xs font-bold">+3 pts</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">You (recruit stakes)</span><span className="text-orange-400 text-xs font-bold">+10 pts bonus</span></div>
            </div>

            {/* Recent referees */}
            {stats.referees.length > 0 && (
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Recruits</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.referees.slice(0, 10).map((ref) => (
                    <div key={ref.handle} className="flex items-center gap-2">
                      <img src={ref.profilePic || "/images/doomhound-logo.png"} alt="" className="w-6 h-6 rounded-full" />
                      <span className="text-white text-xs font-bold flex-1 truncate">@{ref.handle}</span>
                      <span className="text-[10px]">{TIER_EMOJIS[ref.stakingTier] || "🐺"}</span>
                      {ref.stakeBonusAwarded && <span className="text-orange-400 text-[10px]">⚡+10</span>}
                      {!ref.stakeBonusAwarded && ref.stakingTier !== "none" && <span className="text-yellow-400 text-[10px] animate-pulse">⏳+10</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.referees.length === 0 && (
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-center">
                <p className="text-2xl mb-2">🐺</p>
                <p className="text-gray-500 text-xs">Share your code to grow the pack!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6"><p className="text-gray-600 text-sm">Failed to load</p></div>
        )}

        <p className="text-gray-700 text-[8px] sm:text-[9px] text-center mt-3">
          +5 pts per recruit, +3 welcome for them, +10 when they stake. Streak multiplier applies!
        </p>
      </div>
    </div>
  );
}
