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
  createdAt: string;
  streakCount: number;
  lastStreakAt: string | null;
  achievements: string;
  activities: ActivityLog[];
}

export default function StakingPage() {
  const [member, setMember] = useState<PackMember | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session restore (same as pack page)
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

        {/* Main Staking Content */}
        <section className="bg-[#0a0a0a] py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-6 sm:px-10 space-y-6">
            <StakingSection
              member={member}
              onRewardClaimed={(updatedMember) => {
                setMember(updatedMember);
              }}
            />

            {/* Quick check-in reminder */}
            {!member.lastCheckIn && (
              <div className="bg-orange-900/20 border border-orange-600/40 rounded-xl p-4 text-center">
                <p className="text-orange-400 text-sm font-bold mb-2">
                  ⚠️ You haven&apos;t checked in yet today!
                </p>
                <p className="text-gray-400 text-xs">
                  Daily check-in updates your staking balance and earns you points.
                  <a href="/pack" className="text-red-400 hover:text-red-300 underline ml-1">Go to Pack →</a>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </DoomShell>
  );
}
