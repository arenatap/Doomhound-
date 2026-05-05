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

interface Achievement {
  id: string;
  name: string;
  emoji: string;
  awardedAt: string;
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
  referredBy: string | null;
  createdAt: string;
  streakCount: number;
  lastStreakAt: string | null;
  achievements: string; // JSON array string
  activities: ActivityLog[];
}

// ===== ACHIEVEMENT DEFINITIONS =====
const ACHIEVEMENT_DEFS = [
  { id: "first_blood", name: "First Blood", emoji: "🩸", description: "First check-in" },
  { id: "pack_starter", name: "Pack Starter", emoji: "⛓️", description: "Referred 1 member" },
  { id: "7_day_streak", name: "7-Day Streak", emoji: "🔥", description: "7 consecutive daily check-ins" },
  { id: "howler", name: "Howler", emoji: "📢", description: "10+ Arena posts verified" },
  { id: "whale_spotter", name: "Whale Spotter", emoji: "🐋", description: "Holds 1M+ $DOOMHOUND" },
  { id: "trending_demon", name: "Trending Demon", emoji: "📈", description: "Had a trending post" },
  { id: "og_hound", name: "OG Hound", emoji: "👑", description: "Registered in first 24h" },
  { id: "meme_lord", name: "Meme Lord", emoji: "🎨", description: "5+ memes forged" },
];

function parseAchievements(json: string): Achievement[] {
  try { return JSON.parse(json); } catch { return []; }
}

// ===== POINTS CONFIG (must match server) =====
const POINTS: Record<string, { value: number; label: string; icon: string }> = {
  register: { value: 100, label: "Joined The Pack", icon: "🐺" },
  daily_checkin: { value: 15, label: "Daily Summon", icon: "🔥" },
  arena_post: { value: 5, label: "Arena Post", icon: "📝" }, // Legacy, no longer auto-awarded
  arena_follower: { value: 2, label: "New Follower", icon: "👥" },
  trending_mention: { value: 100, label: "Trending Howl", icon: "🔥" },
  meme_generated: { value: 30, label: "Arena Post Verified", icon: "🎨" },
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
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
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
function canVerify(lastVerifiedAt: string | null): boolean {
  if (!lastVerifiedAt) return true;
  return Date.now() - new Date(lastVerifiedAt).getTime() >= 3600000;
}
function verifyCooldownMins(lastVerifiedAt: string | null): number {
  if (!lastVerifiedAt) return 0;
  const remaining = 3600000 - (Date.now() - new Date(lastVerifiedAt).getTime());
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
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
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    newThreads: number;
    newFollowers: number;
    trendingBonus: number;
    totalNewPoints: number;
  } | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [memePostUrl, setMemePostUrl] = useState("");
  const [memeVerifying, setMemeVerifying] = useState(false);

  // Load session on mount
  useEffect(() => {
    const stored = getStoredHandle();
    if (stored) loadProfile(stored);
    loadLeaderboard();
  }, []);

  // Check referral param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setHandle(ref);
  }, []);

  // ===== API CALLS =====
  const loadProfile = useCallback(async (h: string) => {
    try {
      const res = await fetch(`/api/pack?action=profile&handle=${encodeURIComponent(h)}`);
      const data = await res.json();
      if (data.member) { setMember(data.member); saveSession(h); }
      else clearSession();
    } catch { clearSession(); }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/pack?action=leaderboard");
      const data = await res.json();
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    } catch { /* silent */ }
  }, []);

  const refreshMember = useCallback(async () => {
    if (!member) return;
    try {
      const res = await fetch(`/api/pack?action=profile&handle=${encodeURIComponent(member.handle)}`);
      const data = await res.json();
      if (data.member) setMember(data.member);
    } catch { /* silent */ }
  }, [member]);

  // ===== REGISTER =====
  const registerUser = useCallback(async () => {
    const cleanHandle = handle.replace("@", "").trim();
    if (!cleanHandle) return;
    setLoading(true);
    setError(null);
    try {
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
      if (data.error) { setError(data.error); }
      else if (data.member) {
        setMember(data.member);
        saveSession(cleanHandle);
        loadLeaderboard();
        setShowRegister(false);
      }
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [handle, loadLeaderboard]);

  // ===== DAILY CHECK-IN =====
  const doCheckIn = useCallback(async () => {
    if (!member) return;
    try {
      const res = await fetch("/api/pack", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", handle: member.handle }),
      });
      const data = await res.json();
      if (data.member) { setMember(data.member); loadLeaderboard(); }
      else if (data.error) setError(data.error);
    } catch { setError("Check-in failed"); }
  }, [member, loadLeaderboard]);

  // ===== VERIFY ARENA ACTIVITY (THE KEY ACTION!) =====
  const verifyArena = useCallback(async () => {
    if (!member) return;
    setVerifying(true);
    setError(null);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/pack", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_arena", handle: member.handle }),
      });
      const data = await res.json();
      if (data.member) { setMember(data.member); loadLeaderboard(); }
      if (data.verified) {
        setVerifyResult({
          newThreads: data.newThreads,
          newFollowers: data.newFollowers,
          trendingBonus: data.trendingBonus,
          totalNewPoints: data.totalNewPoints,
        });
      }
      if (data.error) setError(data.error);
    } catch { setError("Arena verification failed"); }
    finally { setVerifying(false); }
  }, [member, loadLeaderboard]);

  // ===== CHECK BALANCE =====
  const checkBalance = useCallback(async () => {
    if (!member) return;
    setCheckingBalance(true);
    setError(null);
    try {
      const res = await fetch("/api/pack", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_balance", handle: member.handle }),
      });
      const data = await res.json();
      if (data.member) { setMember(data.member); loadLeaderboard(); }
      if (data.preLaunch) setError("$DOOMHOUND not launched yet — balance check available after launch!");
      if (data.error && !data.preLaunch) setError(data.error);
    } catch { setError("Balance check failed"); }
    finally { setCheckingBalance(false); }
  }, [member, loadLeaderboard]);

  // ===== CLAIM MEME (with Arena post URL verification) =====
  const claimMeme = useCallback(async () => {
    if (!member) return;
    if (!memePostUrl.trim()) {
      setError("Paste your Arena post URL first!");
      return;
    }
    setMemeVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/pack", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_meme", handle: member.handle, postUrl: memePostUrl.trim() }),
      });
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        loadLeaderboard();
        setMemePostUrl("");
      }
      if (data.error) setError(data.error);
    } catch { setError("Verification failed"); }
    finally { setMemeVerifying(false); }
  }, [member, loadLeaderboard, memePostUrl]);

  // ===== LOGOUT =====
  const logout = useCallback(() => {
    clearSession(); setMember(null); setHandle(""); setVerifyResult(null);
  }, []);

  // ===== DERIVED STATE =====
  const rank = member ? getRankInfo(member.points) : null;
  const nextRank = member ? getNextRank(member.points) : null;
  const canCheck = member ? canCheckIn(member.lastCheckIn) : false;
  const canDoVerify = member ? canVerify(member.lastVerifiedAt) : false;
  const verifyCooldown = member ? verifyCooldownMins(member.lastVerifiedAt) : 0;
  const balanceTier = member ? getBalanceTier(member.doomhoundBalance) : null;
  const lastMemeClaim = member?.activities?.find(
    (a) => a.type === "meme_generated" && Date.now() - new Date(a.createdAt).getTime() < 600000
  );

  return (
    <section id="arena-game" className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 md:px-16">
        {/* Header */}
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-3 sm:mb-5">
            THE PACK
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-xl mx-auto">
            Register your Arena identity. Post about $DOOMHOUND, engage, hold.
            All activity verified via The Arena API — submit your post links for points!
          </p>
        </ScrollReveal>

        {member ? (
          <ScrollReveal delay={0.1}>
            <div className="space-y-5 sm:space-y-6">
              {/* User Card */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="flex items-center gap-4 sm:gap-5 mb-5 sm:mb-6">
                    <div className="relative">
                      <img src={member.profilePic} alt="" loading="lazy"
                        className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-full border-2 border-red-600/60 shadow-[0_0_15px_rgba(220,38,38,0.3)]" />
                      <span className="absolute -bottom-1 -right-1 text-sm sm:text-base">{rank?.emoji}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-creepster text-xl sm:text-2xl md:text-3xl text-white truncate">{member.userName}</h3>
                      <p className="text-gray-500 text-xs sm:text-sm">
                        <a href={`https://arena.social/${member.handle}`} target="_blank" rel="noopener noreferrer" className="hover:text-red-400 transition-colors">
                          @{member.handle}
                        </a>
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs sm:text-sm font-bold ${rank?.color}`}>{rank?.title}</span>
                        <span className="text-gray-600 text-[10px] sm:text-xs">· {member.points} pts</span>
                        {balanceTier && (
                          <span className={`text-[10px] sm:text-xs font-bold ${balanceTier.color}`}>
                            · {balanceTier.emoji} {balanceTier.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={logout} className="text-gray-600 hover:text-red-400 transition-colors text-xs sm:text-sm" title="Leave the pack">✕</button>
                  </div>

                  {/* Arena Stats Tracker */}
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider">Arena Activity</span>
                      <span className="text-gray-600 text-[10px] sm:text-xs">
                        {member.lastVerifiedAt ? `Verified ${timeAgo(member.lastVerifiedAt)}` : "Not verified yet"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-[#1a1a1a] rounded-lg p-2.5 sm:p-3 text-center border border-[#2a2a2a]">
                        <p className="text-white font-bold text-base sm:text-lg font-mono">{member.lastThreadCount.toLocaleString()}</p>
                        <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Posts Tracked</p>
                      </div>
                      <div className="bg-[#1a1a1a] rounded-lg p-2.5 sm:p-3 text-center border border-[#2a2a2a]">
                        <p className="text-white font-bold text-base sm:text-lg font-mono">{member.lastFollowerCount.toLocaleString()}</p>
                        <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Followers Tracked</p>
                      </div>
                    </div>
                    <BloodSplash>
                      <button
                        onClick={verifyArena}
                        disabled={!canDoVerify || verifying}
                        className={`w-full px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                          canDoVerify && !verifying
                            ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                            : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                        }`}
                      >
                        {verifying ? "⏳ VERIFYING..." : canDoVerify ? "🔍 VERIFY ARENA ACTIVITY" : `⏳ WAIT ${verifyCooldown}M`}
                      </button>
                    </BloodSplash>
                  </div>

                  {/* Verify Result */}
                  {verifyResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-lg p-3 sm:p-4 mb-5 border ${
                        verifyResult.totalNewPoints > 0
                          ? "bg-green-900/20 border-green-600/40"
                          : "bg-[#1a1a1a] border-[#2a2a2a]"
                      }`}
                    >
                      {verifyResult.totalNewPoints > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-green-400 text-xs sm:text-sm font-bold">
                            🎉 +{verifyResult.totalNewPoints} points from Arena activity!
                          </p>
                          {verifyResult.newThreads > 0 && (
                            <p className="text-gray-400 text-[10px] sm:text-xs">
                              📝 {verifyResult.newThreads} new post{verifyResult.newThreads > 1 ? "s" : ""} detected — submit the link below for +30 pts each!
                            </p>
                          )}
                          {verifyResult.newFollowers > 0 && (
                            <p className="text-gray-400 text-[10px] sm:text-xs">
                              👥 {verifyResult.newFollowers} new follower{verifyResult.newFollowers > 1 ? "s" : ""} (+{verifyResult.newFollowers * POINTS.arena_follower.value} pts)
                            </p>
                          )}
                          {verifyResult.trendingBonus > 0 && (
                            <p className="text-orange-400 text-[10px] sm:text-xs font-bold">
                              🔥 Your $DOOMHOUND post is TRENDING! (+{verifyResult.trendingBonus} pts)
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-xs sm:text-sm">
                          {verifyResult.newThreads > 0
                            ? `${verifyResult.newThreads} new post(s) detected! Submit the post URL below for +30 pts.`
                            : "No new Arena activity detected. Post about $DOOMHOUND and submit the link!"}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* $DOOMHOUND Balance */}
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider">$DOOMHOUND Balance</span>
                      <span className="text-gray-600 text-[10px] sm:text-xs">
                        {member.balanceCheckedAt ? `Checked ${timeAgo(member.balanceCheckedAt)}` : "Not checked"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-bold text-lg sm:text-xl md:text-2xl font-mono flex-1">
                        {member.doomhoundBalance > 0 ? formatBalance(member.doomhoundBalance) : "0"}
                        <span className="text-gray-500 text-xs sm:text-sm ml-1.5">$DOOM</span>
                      </p>
                      <BloodSplash>
                        <button onClick={checkBalance} disabled={checkingBalance}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-900/40 text-white rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.3)] transition-all whitespace-nowrap">
                          {checkingBalance ? "..." : "CHECK"}
                        </button>
                      </BloodSplash>
                    </div>
                    {member.doomhoundBalance > 0 && (
                      <div className="mt-2 space-y-1">
                        {BALANCE_TIERS.map((tier) => {
                          const achieved = member.doomhoundBalance >= tier.minBalance;
                          return (
                            <div key={tier.label} className={`flex items-center gap-2 text-[9px] sm:text-[10px] ${achieved ? "opacity-100" : "opacity-30"}`}>
                              <span>{tier.emoji}</span>
                              <span className={achieved ? tier.color : "text-gray-600"}>{tier.label}</span>
                              <span className="text-gray-600 ml-auto font-mono">{formatNumber(tier.minBalance)}+ · +{tier.bonus}pts</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Streak Counter */}
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg">🔥</span>
                        <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider">Daily Streak</span>
                      </div>
                      <span className="text-orange-400 font-bold text-lg sm:text-xl font-mono">{member.streakCount}</span>
                    </div>
                    {member.streakCount >= 7 && (
                      <p className="text-red-400 text-[9px] sm:text-[10px] mt-1.5 font-bold">🔥 7-Day Streak Achievement unlocked!</p>
                    )}
                    {member.streakCount > 0 && member.streakCount < 7 && (
                      <p className="text-gray-600 text-[9px] sm:text-[10px] mt-1.5">{7 - member.streakCount} more day{7 - member.streakCount !== 1 ? "s" : ""} to 7-Day Streak badge</p>
                    )}
                  </div>

                  {/* Achievement Badges */}
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider">Achievements</span>
                      <span className="text-gray-600 text-[9px] sm:text-[10px] font-mono">
                        {parseAchievements(member.achievements).length}/{ACHIEVEMENT_DEFS.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {ACHIEVEMENT_DEFS.map((def) => {
                        const earned = parseAchievements(member.achievements).some((a) => a.id === def.id);
                        return (
                          <div
                            key={def.id}
                            className={`flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-lg border transition-all ${
                              earned
                                ? "bg-red-900/20 border-red-600/40 shadow-[0_0_8px_rgba(220,38,38,0.15)]"
                                : "bg-[#1a1a1a] border-[#2a2a2a] opacity-40"
                            }`}
                            title={earned ? `${def.name}: ${def.description}` : `${def.name} (locked)`}
                          >
                            <span className={`text-base sm:text-lg ${earned ? "" : "grayscale"}`}>{def.emoji}</span>
                            <span className={`text-[7px] sm:text-[8px] text-center leading-tight ${
                              earned ? "text-red-300" : "text-gray-600"
                            }`}>{def.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Points Progress */}
                  {nextRank && (
                    <div className="mb-5 sm:mb-6">
                      <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-1">
                        <span>{rank?.title}</span>
                        <span>{nextRank.needed} pts to {nextRank.title}</span>
                      </div>
                      <div className="w-full h-2 sm:h-3 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#2a2a2a]">
                        <div className="h-full progress-fire rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, (member.points / (nextRank.needed + member.points)) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-2">
                <button onClick={() => setActiveTab("game")}
                  className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-bold rounded-xl border transition-all ${
                    activeTab === "game" ? "bg-red-600/20 border-red-600/50 text-red-400" : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-gray-300"
                  }`}>
                  🎮 Earn Points
                </button>
                <button onClick={() => setActiveTab("leaderboard")}
                  className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-bold rounded-xl border transition-all ${
                    activeTab === "leaderboard" ? "bg-red-600/20 border-red-600/50 text-red-400" : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-gray-300"
                  }`}>
                  🏆 Leaderboard
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "game" ? (
                  <motion.div key="game" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-3 sm:space-y-4">

                    {/* HOW IT WORKS - info card */}
                    <div className="bg-[#1a1a1a] border border-orange-900/30 rounded-xl p-4 sm:p-5">
                      <h4 className="text-orange-400 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">How Points Work</h4>
                      <p className="text-gray-400 text-[10px] sm:text-xs mb-2">
                        We verify your Arena activity via API — no self-reporting!
                        Use <strong className="text-white">VERIFY</strong> for followers &amp; trending,
                        or submit your post URL below for <strong className="text-white">Arena Post</strong> points.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#0a0a0a] rounded-lg px-2.5 py-2 border border-[#2a2a2a]">
                          <span className="text-[9px] sm:text-[10px]">🎨 Arena post verified</span>
                          <span className="text-green-500 text-[9px] sm:text-[10px] ml-1">+30 pts</span>
                        </div>
                        <div className="bg-[#0a0a0a] rounded-lg px-2.5 py-2 border border-[#2a2a2a]">
                          <span className="text-[9px] sm:text-[10px]">👥 New follower</span>
                          <span className="text-green-500 text-[9px] sm:text-[10px] ml-1">+2 pts</span>
                        </div>
                        <div className="bg-[#0a0a0a] rounded-lg px-2.5 py-2 border border-[#2a2a2a]">
                          <span className="text-[9px] sm:text-[10px]">🔥 $DOOMHOUND trending</span>
                          <span className="text-green-500 text-[9px] sm:text-[10px] ml-1">+100 pts</span>
                        </div>
                        <div className="bg-[#0a0a0a] rounded-lg px-2.5 py-2 border border-[#2a2a2a]">
                          <span className="text-[9px] sm:text-[10px]">💰 HODL bonus</span>
                          <span className="text-green-500 text-[9px] sm:text-[10px] ml-1">+25-500 pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Daily Check-In */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                      <span className="text-2xl sm:text-3xl">🔥</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm sm:text-base font-bold">Daily Summon</p>
                        <p className="text-gray-500 text-xs sm:text-sm">+{POINTS.daily_checkin.value} pts · Once per day</p>
                      </div>
                      <BloodSplash>
                        <button onClick={doCheckIn} disabled={!canCheck}
                          className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            canCheck ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]" : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                          }`}>
                          {canCheck ? "CLAIM" : "✓ DONE"}
                        </button>
                      </BloodSplash>
                    </div>

                    {/* Meme Forge — Submit Arena Post */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5">
                      <div className="flex items-center gap-3 sm:gap-4 mb-3">
                        <span className="text-2xl sm:text-3xl">🎨</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm sm:text-base font-bold">Arena Post</p>
                          <p className="text-gray-500 text-xs sm:text-sm">+{POINTS.meme_generated.value} pts · Post about $DOOMHOUND on Arena, then submit the link</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={memePostUrl}
                          onChange={(e) => setMemePostUrl(e.target.value)}
                          placeholder="https://arena.social/user/status/..."
                          disabled={!!lastMemeClaim || memeVerifying}
                          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-300 placeholder:text-gray-600 font-mono focus:border-red-600/50 focus:outline-none disabled:opacity-50"
                        />
                        <BloodSplash>
                          <button
                            onClick={claimMeme}
                            disabled={!!lastMemeClaim || memeVerifying || !memePostUrl.trim()}
                            className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                              !lastMemeClaim && !memeVerifying && memePostUrl.trim()
                                ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                                : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                            }`}
                          >
                            {memeVerifying ? "⏳ CHECK..." : lastMemeClaim ? "✓ 10M" : "VERIFY"}
                          </button>
                        </BloodSplash>
                      </div>
                      <p className="text-gray-600 text-[9px] sm:text-[10px] mt-1.5">
                        Post about $DOOMHOUND on <a href="https://arena.social/home" target="_blank" rel="noopener noreferrer" className="text-red-400/60 hover:text-red-400">The Arena</a>, copy the post URL, and paste it here. We verify it via API.
                      </p>
                    </div>

                    {/* Referral */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="text-2xl sm:text-3xl">⛓️</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm sm:text-base font-bold">Pack Recruit</p>
                          <p className="text-gray-500 text-xs sm:text-sm">+{POINTS.referral.value} pts · Share your invite link</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input readOnly value={`https://doomhound.meme/?ref=${member.handle}`}
                          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-400 font-mono truncate" />
                        <button onClick={() => navigator.clipboard.writeText(`https://doomhound.meme/?ref=${member.handle}`)}
                          className="px-3 py-2 bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg text-xs sm:text-sm transition-colors">
                          COPY
                        </button>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    {(member.activities?.length ?? 0) > 0 && (
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5">
                        <h4 className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-3">Recent Activity</h4>
                        <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto no-scrollbar">
                          {(member.activities || []).slice(0, 10).map((act) => (
                            <div key={act.id}
                              className="flex items-center gap-2 text-xs sm:text-sm bg-[#0a0a0a] rounded-lg px-3 py-2 border border-[#2a2a2a]">
                              <span>{POINTS[act.type]?.icon || "•"}</span>
                              <span className="text-gray-300 flex-1 truncate">{act.description}</span>
                              <span className="text-green-500 font-mono text-[10px] sm:text-xs">+{act.points}</span>
                              <span className="text-gray-600 text-[10px] sm:text-xs whitespace-nowrap">{timeAgo(act.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* ===== LEADERBOARD ===== */
                  <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {/* Rank Tiers Legend */}
                    <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 flex-wrap">
                      {RANK_TIERS.map((tier) => (
                        <div key={tier.title} className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm">{tier.emoji}</span>
                          <span className={`text-[9px] sm:text-[10px] font-bold ${tier.color}`}>{tier.title}</span>
                          <span className="text-gray-600 text-[8px] sm:text-[9px] font-mono">{tier.minPoints}+</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-6 md:p-8">
                      {leaderboard.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-600 text-sm">No hounds yet. Be the first to join!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {leaderboard.map((user, i) => {
                            const userRank = getRankInfo(user.points);
                            const userBalTier = getBalanceTier(user.doomhoundBalance);
                            const isMe = member?.handle === user.handle;
                            return (
                              <div key={user.handle}
                                className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 rounded-xl border transition-all ${
                                  isMe ? "bg-red-900/20 border-red-600/40 shadow-[0_0_15px_rgba(220,38,38,0.2)]" : "bg-[#0a0a0a] border-[#2a2a2a] hover:border-red-900/20"
                                }`}>
                                <span className={`font-creepster text-lg sm:text-xl md:text-2xl w-8 text-center ${
                                  i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-600"
                                }`}>
                                  {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                </span>
                                <img src={user.profilePic} alt="" loading="lazy" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#2a2a2a]" />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm sm:text-base font-bold truncate ${isMe ? "text-red-400" : "text-white"}`}>
                                    {user.userName}
                                    {isMe && <span className="text-[10px] sm:text-xs text-red-600 ml-1.5">(YOU)</span>}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-[10px] sm:text-xs ${userRank.color}`}>{userRank.emoji} {userRank.title}</p>
                                    {userBalTier && <p className={`text-[9px] sm:text-[10px] ${userBalTier.color}`}>· {userBalTier.emoji}</p>}
                                    {user.lastThreadCount > 0 && (
                                      <p className="text-gray-600 text-[9px] sm:text-[10px] font-mono">· {user.lastThreadCount} posts</p>
                                    )}
                                    {user.doomhoundBalance > 0 && (
                                      <p className="text-gray-600 text-[9px] sm:text-[10px] font-mono">· {formatBalance(user.doomhoundBalance)} $DOOM</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-white font-bold text-sm sm:text-base md:text-lg font-mono">{user.points}</p>
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

              {/* Error Toast */}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-red-900/20 border border-red-600/30 rounded-lg px-4 py-3 text-red-400 text-xs sm:text-sm">
                  {error}
                  <button onClick={() => setError(null)} className="float-right text-red-600 hover:text-red-400 ml-2">✕</button>
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
                  <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                    <div className="bg-[#1a1a1a] border border-red-900/40 rounded-xl p-8 sm:p-10 md:p-12 animate-flame-border">
                      <div className="text-5xl sm:text-6xl mb-4">🐺</div>
                      <h3 className="font-creepster text-3xl sm:text-4xl md:text-5xl text-red-500 mb-3 sm:mb-4">
                        Join The Pack
                      </h3>
                      <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-sm mx-auto">
                        Register your Arena handle. Earn points, climb ranks, get rewards.
                      </p>
                      <BloodSplash className="w-full">
                        <button onClick={() => setShowRegister(true)}
                          className="w-full px-6 py-4 sm:py-5 text-base sm:text-lg md:text-xl font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300">
                          🐺 JOIN THE PACK
                        </button>
                      </BloodSplash>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="register" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8 animate-flame-border">
                      <h3 className="font-creepster text-2xl sm:text-3xl text-red-500 mb-2">Summon Your Soul</h3>
                      <p className="text-gray-400 text-xs sm:text-sm mb-5 sm:mb-6">
                        Enter your Arena handle to join the $DOOMHOUND pack
                      </p>
                      <div className="flex gap-2 sm:gap-3 mb-4">
                        <div className="flex-1 relative">
                          <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm sm:text-base">@</span>
                          <input type="text" value={handle}
                            onChange={(e) => { setHandle(e.target.value); setError(null); }}
                            onKeyDown={(e) => e.key === "Enter" && registerUser()}
                            placeholder="your_arena_handle"
                            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl pl-8 sm:pl-9 pr-4 py-3 sm:py-4 text-sm sm:text-base text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all" />
                        </div>
                        <BloodSplash>
                          <button onClick={registerUser} disabled={loading || !handle.trim()}
                            className="px-5 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all whitespace-nowrap">
                            {loading ? "..." : "SUMMON"}
                          </button>
                        </BloodSplash>
                      </div>
                      {error && <p className="text-red-400 text-xs sm:text-sm mb-3">{error}</p>}
                      <button onClick={() => { setShowRegister(false); setError(null); }}
                        className="text-gray-600 hover:text-gray-400 text-xs sm:text-sm transition-colors">← Back</button>
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
