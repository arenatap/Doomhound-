"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

// ===== TYPES =====
interface ArenaUser {
  handle: string;
  userName: string;
  profilePicture: string;
  bio?: string;
  keyPrice?: string;
  followerCount?: number;
  threadCount?: number;
  address?: string;
}

interface RegisteredUser {
  handle: string;
  userName: string;
  profilePicture: string;
  registeredAt: string;
  points: number;
  lastCheckIn: string | null;
  activities: ActivityEntry[];
}

interface ActivityEntry {
  id: string;
  type: ActivityType;
  description: string;
  points: number;
  timestamp: string;
}

type ActivityType =
  | "register"
  | "daily_checkin"
  | "arena_post"
  | "meme_generated"
  | "referral"
  | "key_holder";

// ===== POINTS CONFIG =====
const POINTS: Record<ActivityType, { value: number; label: string; icon: string }> = {
  register: { value: 100, label: "Joined The Pack", icon: "🐺" },
  daily_checkin: { value: 15, label: "Daily Summon", icon: "🔥" },
  arena_post: { value: 50, label: "Arena Howl", icon: "📢" },
  meme_generated: { value: 30, label: "Meme Forge", icon: "🎨" },
  referral: { value: 75, label: "Pack Recruit", icon: "⛓️" },
  key_holder: { value: 100, label: "Key Master", icon: "🗝️" },
};

// ===== LOCAL STORAGE =====
const STORAGE_KEY = "doomhound_pack";
const ALL_USERS_KEY = "doomhound_leaderboard";

function getStoredUser(): RegisteredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user: RegisteredUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  updateLeaderboard(user);
}

function getLeaderboard(): RegisteredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(ALL_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function updateLeaderboard(user: RegisteredUser) {
  const board = getLeaderboard();
  const idx = board.findIndex((u) => u.handle === user.handle);
  if (idx >= 0) {
    board[idx] = user;
  } else {
    board.push(user);
  }
  board.sort((a, b) => b.points - a.points);
  localStorage.setItem(ALL_USERS_KEY, JSON.stringify(board.slice(0, 50)));
}

function addActivity(user: RegisteredUser, type: ActivityType, description: string): RegisteredUser {
  const config = POINTS[type];
  const activity: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    description,
    points: config.value,
    timestamp: new Date().toISOString(),
  };
  const updated = {
    ...user,
    points: user.points + config.value,
    activities: [activity, ...user.activities].slice(0, 50),
  };
  return updated;
}

// ===== HELPER =====
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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

function getRankBadge(points: number): { title: string; emoji: string; color: string } {
  if (points >= 1000) return { title: "Alpha Hound", emoji: "👑", color: "text-yellow-400" };
  if (points >= 500) return { title: "Hellfire", emoji: "🔥", color: "text-orange-400" };
  if (points >= 250) return { title: "Shadow Fang", emoji: "🐺", color: "text-red-400" };
  if (points >= 100) return { title: "Pup", emoji: "🐕", color: "text-gray-300" };
  return { title: "Lost Soul", emoji: "👻", color: "text-gray-500" };
}

function getNextRank(points: number): { title: string; needed: number } | null {
  if (points < 100) return { title: "Pup", needed: 100 - points };
  if (points < 250) return { title: "Shadow Fang", needed: 250 - points };
  if (points < 500) return { title: "Hellfire", needed: 500 - points };
  if (points < 1000) return { title: "Alpha Hound", needed: 1000 - points };
  return null;
}

// ===== COMPONENT =====
export function ArenaGameSection() {
  const [registeredUser, setRegisteredUser] = useState<RegisteredUser | null>(null);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<RegisteredUser[]>([]);
  const [activeTab, setActiveTab] = useState<"game" | "leaderboard">("game");
  const [arenaProfile, setArenaProfile] = useState<ArenaUser | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  // Load stored user on mount
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setRegisteredUser(stored);
    }
    setLeaderboard(getLeaderboard());
  }, []);

  // Register user
  const registerUser = useCallback(async () => {
    const cleanHandle = handle.replace("@", "").trim();
    if (!cleanHandle) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/arena?action=profile&handle=${encodeURIComponent(cleanHandle)}`
      );
      const data = await res.json();

      if (data.user) {
        const profile: ArenaUser = {
          handle: data.user.handle,
          userName: data.user.userName,
          profilePicture: data.user.profilePicture,
          bio: data.user.bio,
          keyPrice: data.user.keyPrice,
          followerCount: data.user.followerCount,
          threadCount: data.user.threadCount,
          address: data.user.address,
        };
        setArenaProfile(profile);

        const newUser: RegisteredUser = {
          handle: profile.handle,
          userName: profile.userName,
          profilePicture: profile.profilePicture,
          registeredAt: new Date().toISOString(),
          points: POINTS.register.value,
          lastCheckIn: null,
          activities: [
            {
              id: `reg-${Date.now()}`,
              type: "register",
              description: `Joined the $DOOMHOUND pack`,
              points: POINTS.register.value,
              timestamp: new Date().toISOString(),
            },
          ],
        };

        // Bonus: key holder
        if (profile.keyPrice && parseFloat(profile.keyPrice) > 0) {
          const updated = addActivity(newUser, "key_holder", "Arena key holder detected!");
          newUser.points = updated.points;
          newUser.activities = updated.activities;
        }

        saveStoredUser(newUser);
        setRegisteredUser(newUser);
        setLeaderboard(getLeaderboard());
        setShowRegister(false);
      } else {
        setError("Handle not found on The Arena. Register first at arena.social");
      }
    } catch {
      setError("Failed to connect to Arena API");
    } finally {
      setLoading(false);
    }
  }, [handle]);

  // Daily check-in
  const doCheckIn = useCallback(() => {
    if (!registeredUser || !canCheckIn(registeredUser.lastCheckIn)) return;
    const updated = addActivity(registeredUser, "daily_checkin", "Daily summon completed");
    updated.lastCheckIn = new Date().toISOString();
    saveStoredUser(updated);
    setRegisteredUser(updated);
    setLeaderboard(getLeaderboard());
  }, [registeredUser]);

  // Claim Arena post points (simulated — user confirms they posted)
  const claimArenaPost = useCallback(() => {
    if (!registeredUser) return;
    // Check if already claimed in last hour
    const lastPost = registeredUser.activities.find(
      (a) => a.type === "arena_post" && Date.now() - new Date(a.timestamp).getTime() < 3600000
    );
    if (lastPost) return;
    const updated = addActivity(registeredUser, "arena_post", "Howled about $DOOMHOUND on Arena!");
    saveStoredUser(updated);
    setRegisteredUser(updated);
    setLeaderboard(getLeaderboard());
  }, [registeredUser]);

  // Claim meme points
  const claimMemePoints = useCallback(() => {
    if (!registeredUser) return;
    const lastMeme = registeredUser.activities.find(
      (a) => a.type === "meme_generated" && Date.now() - new Date(a.timestamp).getTime() < 600000
    );
    if (lastMeme) return;
    const updated = addActivity(registeredUser, "meme_generated", "Forged a $DOOMHOUND meme!");
    saveStoredUser(updated);
    setRegisteredUser(updated);
    setLeaderboard(getLeaderboard());
  }, [registeredUser]);

  // Logout
  const logout = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    setRegisteredUser(null);
    setArenaProfile(null);
    setHandle("");
  }, []);

  const rank = registeredUser ? getRankBadge(registeredUser.points) : null;
  const nextRank = registeredUser ? getNextRank(registeredUser.points) : null;
  const canCheck = registeredUser ? canCheckIn(registeredUser.lastCheckIn) : false;
  const lastPostClaim = registeredUser?.activities.find(
    (a) => a.type === "arena_post" && Date.now() - new Date(a.timestamp).getTime() < 3600000
  );
  const lastMemeClaim = registeredUser?.activities.find(
    (a) => a.type === "meme_generated" && Date.now() - new Date(a.timestamp).getTime() < 600000
  );

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
            Register your Arena identity. Earn points. Climb the ranks. Prove you&apos;re a true Hound of Hell.
          </p>
        </ScrollReveal>

        {/* ===== REGISTERED USER VIEW ===== */}
        {registeredUser ? (
          <ScrollReveal delay={0.1}>
            <div className="space-y-5 sm:space-y-6">
              {/* User Card */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="flex items-center gap-4 sm:gap-5 mb-5 sm:mb-6">
                    <div className="relative">
                      <img
                        src={registeredUser.profilePicture}
                        alt=""
                        className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-full border-2 border-red-600/60 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                      />
                      <span className="absolute -bottom-1 -right-1 text-sm sm:text-base">
                        {rank?.emoji}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-creepster text-xl sm:text-2xl md:text-3xl text-white truncate">
                        {registeredUser.userName}
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm">@{registeredUser.handle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs sm:text-sm font-bold ${rank?.color}`}>
                          {rank?.title}
                        </span>
                        <span className="text-gray-600 text-[10px] sm:text-xs">
                          · {registeredUser.points} pts
                        </span>
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

                  {/* Points Progress Bar */}
                  {nextRank && (
                    <div className="mb-5 sm:mb-6">
                      <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-1">
                        <span>{rank?.title}</span>
                        <span>{nextRank.needed} pts to {nextRank.title}</span>
                      </div>
                      <div className="w-full h-2 sm:h-3 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#2a2a2a]">
                        <div
                          className="h-full progress-fire rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, (registeredUser.points / (nextRank.needed + registeredUser.points)) * 100)}%`,
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
                        <p className="text-gray-500 text-xs sm:text-sm">+{POINTS.daily_checkin.value} pts · Once per day</p>
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
                        <p className="text-gray-500 text-xs sm:text-sm">+{POINTS.arena_post.value} pts · Post about $DOOMHOUND on Arena</p>
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
                        <p className="text-gray-500 text-xs sm:text-sm">+{POINTS.meme_generated.value} pts · Generate a $DOOMHOUND meme</p>
                      </div>
                      <BloodSplash>
                        <button
                          onClick={claimMemePoints}
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
                          <p className="text-gray-500 text-xs sm:text-sm">+{POINTS.referral.value} pts · Share your invite link</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          readOnly
                          value={`https://doomhound.meme/?ref=${registeredUser.handle}`}
                          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-400 font-mono truncate"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `https://doomhound.meme/?ref=${registeredUser.handle}`
                            );
                          }}
                          className="px-3 py-2 bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg text-xs sm:text-sm transition-colors"
                        >
                          COPY
                        </button>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    {registeredUser.activities.length > 0 && (
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5">
                        <h4 className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-3">
                          Recent Activity
                        </h4>
                        <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto no-scrollbar">
                          {registeredUser.activities.slice(0, 10).map((act) => (
                            <div
                              key={act.id}
                              className="flex items-center gap-2 text-xs sm:text-sm bg-[#0a0a0a] rounded-lg px-3 py-2 border border-[#2a2a2a]"
                            >
                              <span>{POINTS[act.type]?.icon || "•"}</span>
                              <span className="text-gray-300 flex-1 truncate">{act.description}</span>
                              <span className="text-green-500 font-mono text-[10px] sm:text-xs">+{act.points}</span>
                              <span className="text-gray-600 text-[10px] sm:text-xs whitespace-nowrap">{timeAgo(act.timestamp)}</span>
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
                          <p className="text-gray-600 text-sm">No hounds yet. Be the first to join!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {leaderboard.map((user, i) => {
                            const userRank = getRankBadge(user.points);
                            const isMe = registeredUser?.handle === user.handle;
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
                                  src={user.profilePicture}
                                  alt=""
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#2a2a2a]"
                                />

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm sm:text-base font-bold truncate ${isMe ? "text-red-400" : "text-white"}`}>
                                    {user.userName}
                                    {isMe && <span className="text-[10px] sm:text-xs text-red-600 ml-1.5">(YOU)</span>}
                                  </p>
                                  <p className={`text-[10px] sm:text-xs ${userRank.color}`}>
                                    {userRank.emoji} {userRank.title}
                                  </p>
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
                        {[
                          { title: "Alpha Hound", pts: 1000, emoji: "👑", color: "text-yellow-400" },
                          { title: "Hellfire", pts: 500, emoji: "🔥", color: "text-orange-400" },
                          { title: "Shadow Fang", pts: 250, emoji: "🐺", color: "text-red-400" },
                          { title: "Pup", pts: 100, emoji: "🐕", color: "text-gray-300" },
                          { title: "Lost Soul", pts: 0, emoji: "👻", color: "text-gray-500" },
                        ].map((tier) => (
                          <div
                            key={tier.title}
                            className="flex items-center gap-3 bg-[#0a0a0a] rounded-lg px-4 py-2.5 border border-[#2a2a2a]"
                          >
                            <span className="text-lg sm:text-xl">{tier.emoji}</span>
                            <span className={`text-sm sm:text-base font-bold ${tier.color}`}>
                              {tier.title}
                            </span>
                            <span className="text-gray-600 text-xs sm:text-sm ml-auto font-mono">
                              {tier.pts}+ pts
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
