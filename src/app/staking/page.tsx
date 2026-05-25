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
}

interface AirdropData {
  leaderboard: AirdropEntry[];
  airdropPrizes: { rank: number; amount: number; emoji: string }[];
  totalPool: number;
  airdropInitialized: boolean;
}

// Airdrop deadline: May 25, 2026 23:59 Rome time
const AIRDROP_DEADLINE = new Date('2026-05-25T23:59:00+02:00');

function getTimeLeft(deadline: Date): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
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
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareText, setShareText] = useState("");
  const [countdown, setCountdown] = useState(getTimeLeft(AIRDROP_DEADLINE));

  // Live countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeLeft(AIRDROP_DEADLINE));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
            // BUG FIX: Clear stale referral code for logged-in users
            // Referral is ONLY valid at FIRST registration — existing members
            // must NOT have their referrer reassigned
            if (typeof window !== "undefined") {
              localStorage.removeItem("doomhound_ref");
            }
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
                // BUG FIX: Clear stale referral code for logged-in users
                if (typeof window !== "undefined") {
                  localStorage.removeItem("doomhound_ref");
                }
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
      // Include referral code from localStorage if available (captured from ?ref= URL param)
      const savedRef = typeof window !== "undefined" ? localStorage.getItem("doomhound_ref") : null;
      const referral = savedRef ? savedRef.replace("@", "").trim().toLowerCase() : undefined;
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", handle: cleanHandle, referral }),
      });
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
        if (typeof window !== "undefined") {
          localStorage.setItem("doomhound_handle", data.member.handle);
          localStorage.removeItem("doomhound_ref"); // Clean up referral code after use
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

  // Calculate user's airdrop rank (devs already excluded from leaderboard by API)
  const userAirdropPoints = member ? Math.max(0, member.points - member.airdropPointsStart) : 0;
  const userAirdropRank = airdropData
    ? airdropData.leaderboard.filter(e => e.airdropPoints > userAirdropPoints).length + 1
    : null;

  // Build share text
  const buildShareText = useCallback(() => {
    if (!member) return "";
    const rankEmoji = userAirdropRank === 1 ? "🥇" : userAirdropRank === 2 ? "🥈" : userAirdropRank === 3 ? "🥉" : "🐺";
    return `${rankEmoji} I'm #${userAirdropRank || "?"} on the $DOOMHOUND Airdrop Leaderboard with ${userAirdropPoints} pts!\n\n🏆 200M $DOOMHOUND prize pool — Top 3 win at graduation!\n🔥 Join the race:\nhttps://doomhound.onrender.com/staking\n\n#DOOMHOUND #Avalanche #Airdrop #Memecoin`;
  }, [member, userAirdropRank, userAirdropPoints]);

  // Share rank function
  const shareRank = useCallback(() => {
    if (!member) return;
    const text = buildShareText();
    
    setShareError(false);

    // Try Web Share API first (works on mobile, allows sharing to Arena/social)
    if (navigator.share) {
      navigator.share({ title: "DOOMHOUND Airdrop", text }).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }).catch(() => {
        // User cancelled or share failed — try clipboard as fallback
        copyToClipboard(text);
      });
    } else {
      copyToClipboard(text);
    }
  }, [member, buildShareText]);

  const copyToClipboard = useCallback((text: string) => {
    // Try clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }).catch(() => {
        // Clipboard API failed (e.g. not in secure context, or iframe restriction)
        // Fallback: use a textarea trick
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }, []);

  const fallbackCopy = useCallback((text: string) => {
    // Fallback: create a temporary textarea and copy from it
    // This works in older browsers and some restricted contexts
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } else {
        // All clipboard methods failed — show visual modal for manual copy
        setShareText(text);
        setShowShareModal(true);
      }
    } catch {
      // All clipboard methods failed — show visual modal for manual copy
      setShareText(text);
      setShowShareModal(true);
    }
  }, []);

  // Copy from modal textarea
  const copyFromModal = useCallback(() => {
    const textarea = document.getElementById("share-textarea") as HTMLTextAreaElement;
    if (textarea) {
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      // Try execCommand first
      try {
        const success = document.execCommand("copy");
        if (success) {
          setShareCopied(true);
          setTimeout(() => { setShareCopied(false); setShowShareModal(false); }, 2000);
          return;
        }
      } catch {}
      // Try clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textarea.value).then(() => {
          setShareCopied(true);
          setTimeout(() => { setShareCopied(false); setShowShareModal(false); }, 2000);
        }).catch(() => {
          // Text is selected — user can Ctrl+C manually
        });
      }
    }
  }, []);

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

                  {/* Pending Staking Rewards Banner */}
                  {member && member.pendingStakingReward > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-orange-900/30 to-yellow-900/20 border border-orange-500/40 rounded-xl p-4 mb-6 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl animate-pulse">🔥</span>
                        <div>
                          <p className="text-orange-300 text-sm sm:text-base font-bold">
                            {member.pendingStakingReward} staking pts ready!
                          </p>
                          <p className="text-gray-500 text-[10px] sm:text-xs">
                            Claim below to add them to your airdrop score
                          </p>
                        </div>
                      </div>
                      <a
                        href="#claim-rewards"
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-[0_0_10px_rgba(234,88,12,0.3)] transition-all whitespace-nowrap"
                      >
                        CLAIM →
                      </a>
                    </motion.div>
                  )}

                  <StakingSection
                    member={member}
                    onRewardClaimed={(updatedMember) => {
                      setMember(updatedMember);
                    }}
                  />

                  {/* Quick check-in reminder */}
                  {(() => {
                    const canCheckIn = () => {
                      if (!member?.lastCheckIn) return true; // Never checked in
                      const PACK_TZ = "Europe/Rome";
                      const now = new Date();
                      const todayStr = new Intl.DateTimeFormat("en-US", {
                        timeZone: PACK_TZ,
                        year: "numeric", month: "2-digit", day: "2-digit",
                      }).format(now);
                      const lastStr = new Intl.DateTimeFormat("en-US", {
                        timeZone: PACK_TZ,
                        year: "numeric", month: "2-digit", day: "2-digit",
                      }).format(new Date(member.lastCheckIn));
                      return todayStr !== lastStr;
                    };
                    return canCheckIn() ? (
                      <div className="bg-orange-900/20 border border-orange-600/40 rounded-xl p-4 text-center mt-6">
                        <p className="text-orange-400 text-sm font-bold mb-2">
                          ⚠️ You haven&apos;t checked in yet today!
                        </p>
                        <p className="text-gray-400 text-xs">
                          Daily check-in updates your staking balance and earns you points.
                          <a href="/pack" className="text-red-400 hover:text-red-300 underline ml-1">Go to Pack →</a>
                        </p>
                      </div>
                    ) : null;
                  })()}
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
                          <p className="text-green-400 text-xs font-bold animate-pulse">$DOOMHOUND HAS GRADUATED! 🎉</p>
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

                      {/* Countdown Timer */}
                      <div className={`border rounded-lg p-4 text-center ${
                        countdown.expired ? "bg-red-900/30 border-red-500/50" : "bg-[#0a0a0a] border-orange-500/30"
                      }`}>
                        <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-2">
                          {countdown.expired ? "🔥 AIRDROP ENDED" : "⏰ Race ends in"}
                        </p>
                        {countdown.expired ? (
                          <p className="text-red-400 font-bold text-lg">Winners announced soon!</p>
                        ) : (
                          <div className="flex items-center justify-center gap-2 sm:gap-3">
                            <div className="text-center">
                              <p className="text-orange-400 font-bold text-xl sm:text-2xl font-mono">{countdown.days}</p>
                              <p className="text-gray-600 text-[8px] uppercase">Days</p>
                            </div>
                            <span className="text-orange-600 text-xl font-bold">:</span>
                            <div className="text-center">
                              <p className="text-orange-400 font-bold text-xl sm:text-2xl font-mono">{String(countdown.hours).padStart(2, '0')}</p>
                              <p className="text-gray-600 text-[8px] uppercase">Hours</p>
                            </div>
                            <span className="text-orange-600 text-xl font-bold">:</span>
                            <div className="text-center">
                              <p className="text-orange-400 font-bold text-xl sm:text-2xl font-mono">{String(countdown.minutes).padStart(2, '0')}</p>
                              <p className="text-gray-600 text-[8px] uppercase">Mins</p>
                            </div>
                            <span className="text-orange-600 text-xl font-bold">:</span>
                            <div className="text-center">
                              <p className="text-orange-300 font-bold text-xl sm:text-2xl font-mono">{String(countdown.seconds).padStart(2, '0')}</p>
                              <p className="text-gray-600 text-[8px] uppercase">Secs</p>
                            </div>
                          </div>
                        )}
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

                    {/* Share Rank Button */}
                    {member && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={shareRank}
                          className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all"
                        >
                          {shareCopied ? (
                            <>✅ Copied!</>
                          ) : (
                            <>📢 Share Your Rank</>
                          )}
                        </button>
                        <button
                          onClick={() => { setShareText(buildShareText()); setShowShareModal(true); }}
                          className="py-2.5 px-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 text-xs sm:text-sm font-bold rounded-lg transition-all"
                          title="Copy manually"
                        >
                          📋
                        </button>
                      </div>
                    )}
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
                          const isUser = entry.handle === member?.handle;
                          const rank = idx + 1; // Simple rank since devs are already filtered out by API

                          return (
                            <div
                              key={entry.handle}
                              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                                isUser
                                  ? "bg-red-600/10 border-l-2 border-red-500"
                                  : "hover:bg-[#0a0a0a]/50"
                              }`}
                            >
                              {/* Rank */}
                              <div className="w-8 text-center flex-shrink-0">
                                {rank === 1 ? (
                                  <span className="text-lg">🥇</span>
                                ) : rank === 2 ? (
                                  <span className="text-lg">🥈</span>
                                ) : rank === 3 ? (
                                  <span className="text-lg">🥉</span>
                                ) : (
                                  <span className="text-gray-600 text-xs font-mono">#{rank}</span>
                                )}
                              </div>

                              {/* Avatar */}
                              <img
                                src={entry.profilePic || "/images/doomhound-logo.png"}
                                alt=""
                                className="w-8 h-8 rounded-full border border-[#2a2a2a] flex-shrink-0"
                              />

                              {/* Name — same style as pack leaderboard */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${isUser ? "text-red-400" : "text-white"}`}>
                                  {entry.userName || `@${entry.handle}`}
                                  {isUser && <span className="text-[10px] sm:text-xs text-red-600 ml-1.5">(YOU)</span>}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-gray-500 text-[10px] sm:text-xs">@{entry.handle}</p>
                                </div>
                              </div>

                              {/* Tier badge */}
                              <span className={`text-xs ${getTierColor(entry.stakingTier)}`}>
                                {getTierEmoji(entry.stakingTier)}
                              </span>

                              {/* Airdrop points */}
                              <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-bold font-mono ${
                                  rank === 1 ? "text-yellow-400" :
                                  rank === 2 ? "text-gray-300" :
                                  rank === 3 ? "text-orange-400" :
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
                      <p>🎉 <strong className="text-green-400">$DOOMHOUND has graduated!</strong> — the race is ON</p>
                      <p>🔥 <strong className="text-gray-300">Every point counts</strong> — check-ins, staking claims, wheel spins, achievements</p>
                      <p>💎 <strong className="text-gray-300">Staking multiplies</strong> — Diamond tier earns 40 pts/day automatically</p>
                      <p>⏰ <strong className="text-orange-400">7 days to grind</strong> — deadline May 25, 23:59 CET</p>
                      <p>🏆 <strong className="text-orange-400">Top 3 at deadline</strong> split 200M $DOOMHOUND (100M / 60M / 40M)</p>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </section>
      </div>

      {/* Share Rank Modal — shown when clipboard APIs fail (e.g. in Arena iframe) */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] border border-red-600/50 rounded-xl p-5 max-w-md w-full shadow-[0_0_30px_rgba(220,38,38,0.3)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-creepster text-xl text-red-500">📢 SHARE YOUR RANK</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-500 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-400 text-xs mb-3">Select the text below and copy it to share on Arena:</p>
              <textarea
                id="share-textarea"
                readOnly
                value={shareText}
                className="w-full h-32 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-white text-xs sm:text-sm resize-none focus:border-red-600 focus:outline-none select-all"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={copyFromModal}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-xs sm:text-sm font-bold rounded-lg transition-all"
                >
                  {shareCopied ? "✅ Copied!" : "📋 Copy Text"}
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 text-xs sm:text-sm font-bold rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </DoomShell>
  );
}
