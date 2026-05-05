"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

// ===== TYPES =====
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
  doomhoundBalance: number;
  balanceCheckedAt: string | null;
  referredBy: string | null;
  createdAt: string;
  activities: ActivityLog[];
}

// ===== POINTS CONFIG =====
const POINTS: Record<string, { value: number; label: string; icon: string }> = {
  register: { value: 100, label: "Joined The Pack", icon: "🐺" },
  daily_checkin: { value: 15, label: "Daily Summon", icon: "🔥" },
  arena_post: { value: 50, label: "Arena Howl", icon: "📢" },
  meme_generated: { value: 30, label: "Meme Forge", icon: "🎨" },
  referral: { value: 75, label: "Pack Recruit", icon: "⛓️" },
  doomhound_holder: { value: 0, label: "HODL Bonus", icon: "💰" },
};

// ===== $DOOMHOUND BALANCE TIERS =====
const BALANCE_TIERS = [
  { minBalance: 50_000_000, bonus: 500, label: "Whale of Hell", emoji: "🐋", color: "text-yellow-400" },
  { minBalance: 10_000_000, bonus: 250, label: "Demon Hoarder", emoji: "👹", color: "text-purple-400" },
  { minBalance: 5_000_000, bonus: 150, label: "Pack Veteran", emoji: "⚔️", color: "text-orange-400" },
  { minBalance: 1_000_000, bonus: 75, label: "Loyal Hound", emoji: "🐕", color: "text-red-400" },
  { minBalance: 100_000, bonus: 25, label: "Pup Holder", emoji: "🦴", color: "text-gray-300" },
];

// ===== RANK TIERS =====
const RANK_TIERS = [
  { title: "Alpha Hound", minPoints: 1000, emoji: "👑", color: "text-yellow-400" },
  { title: "Hellfire", minPoints: 500, emoji: "🔥", color: "text-orange-400" },
  { title: "Shadow Fang", minPoints: 250, emoji: "🐺", color: "text-red-400" },
  { title: "Pup", minPoints: 100, emoji: "🐕", color: "text-gray-300" },
  { title: "Lost Soul", minPoints: 0, emoji: "👻", color: "text-gray-500" },
];

// ===== LOCAL STORAGE (just for "remember me") =====
const SESSION_KEY = "doomhound_session";

function getStoredHandle(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function saveSession(handle: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, handle);
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

// ===== HELPERS =====
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

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getRankInfo(points: number) {
  return RANK_TIERS.find((r) => points >= r.minPoints) || RANK_TIERS[RANK_TIERS.length - 1];
}

function getNextRank(points: number) {
  const currentIdx = RANK_TIERS.findIndex((r) => points >= r.minPoints);
  if (currentIdx <= 0) return null;
  const next = RANK_TIERS[currentIdx - 1];
  return { title: next.title, needed: next.minPoints - points };
}

function getBalanceTier(balance: number) {
  return BALANCE_TIERS.find((t) => balance >= t.minBalance) || null;
}

function canCheckIn(lastCheckIn: string | null): boolean {
  if (!lastCheckIn) return true;
  const last = new Date(lastCheckIn);
  const now = new Date();
  return (
    last.getFullYear() !== now.getFullYear() ||
    last.getMonth() !== now.getMonth() ||
    last.getDate() !== now.getDate()
  );
}

// ===== COMPONENT =====
export function ArenaGameSection() {
  const [member, setMember] = useState<PackMember | null>(null);
  const [leaderboard, setLeaderboard] = useState<PackMember[]>([]);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"game" | "leaderboard">("game");
  const [showRegister, setShowRegister] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balanceResult, setBalanceResult] = useState<{
    balance: number;
    tier: string | null;
    bonusChange: number;
  } | null>(null);

  // Load stored session on mount
  useEffect(() => {
    const stored = getStoredHandle();
    if (stored) {
      loadProfile(stored);
    }
    loadLeaderboard();
  }, []);

  // Check referral param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setHandle(ref);
    }
  }, []);

  // ===== API CALLS =====
  const loadProfile = useCallback(async (h: string) => {
    try {
      const res = await fetch(`/api/pack?action=profile&handle=${encodeURIComponent(h)}`);
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        saveSession(h);
      }
    } catch {
      // Profile not found - clear session
      clearSession();
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/pack?action=leaderboard");
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch {
      // silent
    }
  }, []);

  // ===== REGISTER =====
  const registerUser = useCallback(async () => {
    const cleanHandle = handle.replace("@", "").trim();
    if (!cleanHandle) return;

    setLoading(true);
    setError(null);

    try {
      // Get referral from URL
      let referral: string | undefined;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        referral = params.get("ref") || undefined;
      }

      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", handle: cleanHandle, referral }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.member) {
        setMember(data.member);
        saveSession(cleanHandle);
        loadLeaderboard();
        setShowRegister(false);
        if (data.balanceBonus > 0) {
          setBalanceResult({
            balance: data.member.doomhoundBalance,
            tier: data.balanceTierLabel,
            bonusChange: data.balanceBonus,
          });
        }
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [handle, loadLeaderboard]);

  // ===== DAILY CHECK-IN =====
  const doCheckIn = useCallback(async () => {
    if (!member) return;
    try {
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", handle: member.handle }),
      });
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        loadLeaderboard();
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Check-in failed");
    }
  }, [member, loadLeaderboard]);

  // ===== CLAIM ARENA POST =====
  const claimArenaPost = useCallback(async () => {
    if (!member) return;
    try {
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_post", handle: member.handle }),
      });
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        loadLeaderboard();
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Claim failed");
    }
  }, [member, loadLeaderboard]);

  // ===== CLAIM MEME =====
  const claimMeme = useCallback(async () => {
    if (!member) return;
    try {
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_meme", handle: member.handle }),
      });
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        loadLeaderboard();
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Claim failed");
    }
  }, [member, loadLeaderboard]);

  // ===== CHECK $DOOMHOUND BALANCE =====
  const checkBalance = useCallback(async () => {
    if (!member) return;
    setCheckingBalance(true);
    setError(null);
    setBalanceResult(null);
    try {
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_balance", handle: member.handle }),
      });
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        loadLeaderboard();
      }
      if (data.preLaunch) {
        setError("$DOOMHOUND token not launched yet — balance check will be available after launch!");
      } else if (data.balance !== undefined) {
        setBalanceResult({
          balance: data.balance,
          tier: data.tier,
          bonusChange: data.bonusChange || 0,
        });
      }
      if (data.error && !data.preLaunch) {
        setError(data.error);
      }
    } catch {
      setError("Balance check failed");
    } finally {
      setCheckingBalance(false);
    }
  }, [member, loadLeaderboard]);

  // ===== LOGOUT =====
  const logout = useCallback(() => {
    clearSession();
    setMember(null);
    setHandle("");
    setBalanceResult(null);
  }, []);

  // ===== DERIVED STATE =====
  const rank = member ? getRankInfo(member.points) : null;
  const nextRank = member ? getNextRank(member.points) : null;
  const canCheck = member ? canCheckIn(member.lastCheckIn) : false;
  const lastPostClaim = member?.activities.find(
    (a) => a.type === "arena_post" && Date.now() - new Date(a.createdAt).getTime() < 3600000
  );
  const lastMemeClaim = member?.activities.find(
    (a) => a.type === "meme_generated" && Date.now() - new Date(a.createdAt).getTime() < 600000
  );
  const balanceTier = member ? getBalanceTier(member.doomhoundBalance) : null;
  const isPreLaunch = !process.env.NEXT_PUBLIC_DOOMHOUND_CONTRACT;

  return (
    <section
      id="arena-game"
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 md:px-16">
        {/* Header */}
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-3 sm:mb-5">
            THE PACK
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-xl mx-auto">
            Register your Arena identity. Earn points. Hold $DOOMHOUND. Climb the ranks.
            Prove you&apos;re a true Hound of Hell.
          </p>
        </ScrollReveal>

        {/* ===== REGISTERED USER VIEW ===== */}
        {member ? (
          <ScrollReveal delay={0.1}>
            <div className="space-y-5 sm:space-y-6">
              {/* User Card */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="flex items-center gap-4 sm:gap-5 mb-5 sm:mb-6">
                    <div className="relative">
                      <img
                        src={member.profilePic}
                        alt=""
                        className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-full border-2 border-red-600/60 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                      />
                      <span className="absolute -bottom-1 -right-1 text-sm sm:text-base">
                        {rank?.emoji}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-creepster text-xl sm:text-2xl md:text-3xl text-white truncate">
                        {member.userName}
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm">@{member.handle}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs sm:text-sm font-bold ${rank?.color}`}>
                          {rank?.title}
                        </span>
                        <span className="text-gray-600 text-[10px] sm:text-xs">
                          · {member.points} pts
                        </span>
                        {balanceTier && (
                          <span className={`text-[10px] sm:text-xs font-bold ${balanceTier.color}`}>
                            · {balanceTier.emoji} {balanceTier.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      className="text-gray-600 hover:text-red-400 transition-colors text-xs sm:text-sm"
                      title="Leave the pack"
                    >
                      ✕
                    </button>
                  </div>

                  {/* $DOOMHOUND Balance Display */}
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider">
                        $DOOMHOUND Balance
                      </span>
                      <span className="text-gray-600 text-[10px] sm:text-xs">
                        {member.balanceCheckedAt
                          ? `Checked ${timeAgo(member.balanceCheckedAt)}`
                          : "Not checked yet"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-bold text-lg sm:text-xl md:text-2xl font-mono flex-1">
                        {member.doomhoundBalance > 0
                          ? formatBalance(member.doomhoundBalance)
                          : "0"}
                        <span className="text-gray-500 text-xs sm:text-sm ml-1.5">$DOOM</span>
                      </p>
                      <BloodSplash>
                        <button
                          onClick={checkBalance}
                          disabled={checkingBalance}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-900/40 text-white rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.3)] transition-all whitespace-nowrap"
                        >
                          {checkingBalance ? "..." : "CHECK"}
                        </button>
                      </BloodSplash>
                    </div>
                    {/* Balance Tier Progress */}
                    {member.doomhoundBalance > 0 && (
                      <div className="mt-2 space-y-1">
                        {BALANCE_TIERS.map((tier) => {
                          const achieved = member.doomhoundBalance >= tier.minBalance;
                          return (
                            <div
                              key={tier.label}
                              className={`flex items-center gap-2 text-[9px] sm:text-[10px] ${
                                achieved ? "opacity-100" : "opacity-30"
                              }`}
                            >
                              <span>{tier.emoji}</span>
                              <span className={achieved ? tier.color : "text-gray-600"}>
                                {tier.label}
                              </span>
                              <span className="text-gray-600 ml-auto font-mono">
                                {formatNumber(tier.minBalance)}+ · +{tier.bonus}pts
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Balance Check Result Toast */}
                  {balanceResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-lg p-3 sm:p-4 mb-5 border ${
                        balanceResult.tier
                          ? "bg-green-900/20 border-green-600/40"
                          : "bg-[#1a1a1a] border-[#2a2a2a]"
                      }`}
                    >
                      {balanceResult.tier ? (
                        <p className="text-green-400 text-xs sm:text-sm font-bold">
                          🎉 {balanceResult.tier}! You hold {formatBalance(balanceResult.balance)}{" "}
                          $DOOMHOUND — +{balanceResult.bonusChange} bonus points!
                        </p>
                      ) : (
                        <p className="text-gray-400 text-xs sm:text-sm">
                          You hold {formatBalance(balanceResult.balance)} $DOOMHOUND. Hold more to
                          unlock bonus tiers!
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Points Progress Bar */}
                  {nextRank && (
                    <div>
                      <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-1">
                        <span>{rank?.title}</span>
                        <span>
                          {nextRank.needed} pts to {nextRank.title}
                        </span>
                      </div>
                      <div className="w-full h-2 sm:h-3 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#2a2a2a]">
                        <div
                          className="h-full progress-fire rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(
                              100,
                              (member.points / (nextRank.needed + member.points)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("game")}
                  className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-bold rounded-xl border transition-all ${
                    activeTab === "game"
                      ? "bg-red-600/20 border-red-600/50 text-red-400"
                      : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  🎮 Earn Points
                </button>
                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-bold rounded-xl border transition-all ${
                    activeTab === "leaderboard"
                      ? "bg-red-600/20 border-red-600/50 text-red-400"
                      : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  🏆 Leaderboard
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "game" ? (
                  <motion.div
                    key="game"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    {/* Daily Check-In */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                      <span className="text-2xl sm:text-3xl">🔥</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm sm:text-base font-bold">Daily Summon</p>
                        <p className="text-gray-500 text-xs sm:text-sm">
                          +{POINTS.daily_checkin.value} pts · Once per day
                        </p>
                      </div>
                      <BloodSplash>
                        <button
                          onClick={doCheckIn}
                          disabled={!canCheck}
                          className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            canCheck
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                              : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                          }`}
                        >
                          {canCheck ? "CLAIM" : "✓ DONE"}
                        </button>
                      </BloodSplash>
                    </div>

                    {/* Arena Post */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                      <span className="text-2xl sm:text-3xl">📢</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm sm:text-base font-bold">Arena Howl</p>
                        <p className="text-gray-500 text-xs sm:text-sm">
                          +{POINTS.arena_post.value} pts · Post about $DOOMHOUND on Arena
                        </p>
                      </div>
                      <BloodSplash>
                        <button
                          onClick={claimArenaPost}
                          disabled={!!lastPostClaim}
                          className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            !lastPostClaim
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                              : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                          }`}
                        >
                          {!lastPostClaim ? "CLAIM" : "✓ 1H"}
                        </button>
                      </BloodSplash>
                    </div>

                    {/* Meme Forge */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                      <span className="text-2xl sm:text-3xl">🎨</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm sm:text-base font-bold">Meme Forge</p>
                        <p className="text-gray-500 text-xs sm:text-sm">
                          +{POINTS.meme_generated.value} pts · Generate a $DOOMHOUND meme
                        </p>
                      </div>
                      <BloodSplash>
                        <button
                          onClick={claimMeme}
                          disabled={!!lastMemeClaim}
                          className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            !lastMemeClaim
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                              : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                          }`}
                        >
                          {!lastMemeClaim ? "CLAIM" : "✓ 10M"}
                        </button>
                      </BloodSplash>
                    </div>

                    {/* Referral */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="text-2xl sm:text-3xl">⛓️</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm sm:text-base font-bold">Pack Recruit</p>
                          <p className="text-gray-500 text-xs sm:text-sm">
                            +{POINTS.referral.value} pts · Share your invite link
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          readOnly
                          value={`https://doomhound.meme/?ref=${member.handle}`}
                          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-400 font-mono truncate"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `https://doomhound.meme/?ref=${member.handle}`
                            );
                          }}
                          className="px-3 py-2 bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg text-xs sm:text-sm transition-colors"
                        >
                          COPY
                        </button>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    {member.activities.length > 0 && (
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5">
                        <h4 className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-3">
                          Recent Activity
                        </h4>
                        <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto no-scrollbar">
                          {member.activities.slice(0, 10).map((act) => (
                            <div
                              key={act.id}
                              className="flex items-center gap-2 text-xs sm:text-sm bg-[#0a0a0a] rounded-lg px-3 py-2 border border-[#2a2a2a]"
                            >
                              <span>{POINTS[act.type]?.icon || "•"}</span>
                              <span className="text-gray-300 flex-1 truncate">
                                {act.description}
                              </span>
                              <span className="text-green-500 font-mono text-[10px] sm:text-xs">
                                +{act.points}
                              </span>
                              <span className="text-gray-600 text-[10px] sm:text-xs whitespace-nowrap">
                                {timeAgo(act.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* ===== LEADERBOARD TAB ===== */
                  <motion.div
                    key="leaderboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-6 md:p-8">
                      {leaderboard.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-600 text-sm">
                            No hounds yet. Be the first to join!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {leaderboard.map((user, i) => {
                            const userRank = getRankInfo(user.points);
                            const userBalTier = getBalanceTier(user.doomhoundBalance);
                            const isMe = member?.handle === user.handle;
                            return (
                              <div
                                key={user.handle}
                                className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 rounded-xl border transition-all ${
                                  isMe
                                    ? "bg-red-900/20 border-red-600/40 shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                                    : "bg-[#0a0a0a] border-[#2a2a2a] hover:border-red-900/20"
                                }`}
                              >
                                {/* Rank */}
                                <span
                                  className={`font-creepster text-lg sm:text-xl md:text-2xl w-8 text-center ${
                                    i === 0
                                      ? "text-yellow-400"
                                      : i === 1
                                      ? "text-gray-300"
                                      : i === 2
                                      ? "text-orange-400"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                </span>

                                {/* Avatar */}
                                <img
                                  src={user.profilePic}
                                  alt=""
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#2a2a2a]"
                                />

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-sm sm:text-base font-bold truncate ${
                                      isMe ? "text-red-400" : "text-white"
                                    }`}
                                  >
                                    {user.userName}
                                    {isMe && (
                                      <span className="text-[10px] sm:text-xs text-red-600 ml-1.5">
                                        (YOU)
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-[10px] sm:text-xs ${userRank.color}`}>
                                      {userRank.emoji} {userRank.title}
                                    </p>
                                    {userBalTier && (
                                      <p className={`text-[9px] sm:text-[10px] ${userBalTier.color}`}>
                                        · {userBalTier.emoji}
                                      </p>
                                    )}
                                    {user.doomhoundBalance > 0 && (
                                      <p className="text-gray-600 text-[9px] sm:text-[10px] font-mono">
                                        · {formatBalance(user.doomhoundBalance)} $DOOM
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Points */}
                                <div className="text-right">
                                  <p className="text-white font-bold text-sm sm:text-base md:text-lg font-mono">
                                    {user.points}
                                  </p>
                                  <p className="text-gray-600 text-[10px] sm:text-xs">pts</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-900/20 border border-red-600/30 rounded-lg px-4 py-3 text-red-400 text-xs sm:text-sm"
                >
                  {error}
                  <button
                    onClick={() => setError(null)}
                    className="float-right text-red-600 hover:text-red-400 ml-2"
                  >
                    ✕
                  </button>
                </motion.div>
              )}
            </div>
          </ScrollReveal>
        ) : (
          /* ===== REGISTRATION VIEW ===== */
          <ScrollReveal delay={0.1}>
            <div className="max-w-lg mx-auto">
              <AnimatePresence mode="wait">
                {!showRegister ? (
                  <motion.div
                    key="cta"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    {/* Rank Preview */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 mb-5 sm:mb-6">
                      <h3 className="font-creepster text-xl sm:text-2xl text-red-500 mb-4 sm:mb-5">
                        Rank Tiers
                      </h3>
                      <div className="space-y-3">
                        {RANK_TIERS.map((tier) => (
                          <div
                            key={tier.title}
                            className="flex items-center gap-3 bg-[#0a0a0a] rounded-lg px-4 py-2.5 border border-[#2a2a2a]"
                          >
                            <span className="text-lg sm:text-xl">{tier.emoji}</span>
                            <span className={`text-sm sm:text-base font-bold ${tier.color}`}>
                              {tier.title}
                            </span>
                            <span className="text-gray-600 text-xs sm:text-sm ml-auto font-mono">
                              {tier.minPoints}+ pts
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* $DOOMHOUND Balance Tiers */}
                      <h3 className="font-creepster text-xl sm:text-2xl text-red-500 mb-4 mt-6 sm:mb-5">
                        HODL Tiers
                      </h3>
                      <p className="text-gray-500 text-xs mb-3">
                        Hold $DOOMHOUND in your wallet to earn bonus points
                      </p>
                      <div className="space-y-2">
                        {BALANCE_TIERS.map((tier) => (
                          <div
                            key={tier.label}
                            className="flex items-center gap-3 bg-[#0a0a0a] rounded-lg px-4 py-2 border border-[#2a2a2a]"
                          >
                            <span className="text-base sm:text-lg">{tier.emoji}</span>
                            <span className={`text-xs sm:text-sm font-bold ${tier.color}`}>
                              {tier.label}
                            </span>
                            <span className="text-gray-600 text-[10px] sm:text-xs ml-auto font-mono">
                              {formatNumber(tier.minBalance)} $DOOM · +{tier.bonus}pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <BloodSplash className="w-full">
                      <button
                        onClick={() => setShowRegister(true)}
                        className="w-full px-6 py-4 sm:py-5 text-base sm:text-lg md:text-xl font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300"
                      >
                        🐺 JOIN THE PACK
                      </button>
                    </BloodSplash>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8 animate-flame-border">
                      <h3 className="font-creepster text-2xl sm:text-3xl text-red-500 mb-2">
                        Summon Your Soul
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm mb-5 sm:mb-6">
                        Enter your Arena handle to join the $DOOMHOUND pack
                      </p>

                      {/* Input */}
                      <div className="flex gap-2 sm:gap-3 mb-4">
                        <div className="flex-1 relative">
                          <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm sm:text-base">
                            @
                          </span>
                          <input
                            type="text"
                            value={handle}
                            onChange={(e) => {
                              setHandle(e.target.value);
                              setError(null);
                            }}
                            onKeyDown={(e) => e.key === "Enter" && registerUser()}
                            placeholder="your_arena_handle"
                            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl pl-8 sm:pl-9 pr-4 py-3 sm:py-4 text-sm sm:text-base text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all"
                          />
                        </div>
                        <BloodSplash>
                          <button
                            onClick={registerUser}
                            disabled={loading || !handle.trim()}
                            className="px-5 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all whitespace-nowrap"
                          >
                            {loading ? "..." : "SUMMON"}
                          </button>
                        </BloodSplash>
                      </div>

                      {/* Error */}
                      {error && (
                        <p className="text-red-400 text-xs sm:text-sm mb-3">{error}</p>
                      )}

                      <button
                        onClick={() => {
                          setShowRegister(false);
                          setError(null);
                        }}
                        className="text-gray-600 hover:text-gray-400 text-xs sm:text-sm transition-colors"
                      >
                        ← Back
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
