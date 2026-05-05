"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

// ===== TYPES =====
interface ArenaProfile {
  id: string;
  handle: string;
  userName: string;
  profilePicture: string;
  bannerUrl?: string;
  bio?: string;
  address?: string;
  keyPrice?: string;
  lastKeyPrice?: string;
  threadCount?: number;
  followerCount?: number;
  followingsCount?: number;
  twitterFollowers?: number;
  twitterHandle?: string;
  twitterDescription?: string;
  isFollowingYou?: boolean;
  holdsYourShare?: boolean;
}

// ===== HELPER =====
function formatAvax(wei: string): string {
  const val = parseFloat(wei) / 1e18;
  if (val < 0.0001) return `<0.0001`;
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ===== COMPONENT =====
export function ArenaProfileSection() {
  const [handle, setHandle] = useState("");
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const lookupProfile = useCallback(async () => {
    const cleanHandle = handle.replace("@", "").trim();
    if (!cleanHandle) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/arena?action=profile&handle=${encodeURIComponent(cleanHandle)}`
      );
      const data = await res.json();

      if (data.user) {
        setProfile(data.user);
      } else if (data.error) {
        setError(data.error);
        setProfile(null);
      } else {
        setError("User not found on The Arena");
        setProfile(null);
      }
    } catch (err) {
      setError("Failed to connect to Arena API");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") lookupProfile();
  };

  return (
    <section
      id="arena-profile"
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        {/* Header */}
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-4 sm:mb-6">
            ARENA IDENTITY
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-lg mx-auto">
            Enter your Arena handle to summon your profile from the depths.
          </p>
        </ScrollReveal>

        {/* Search Bar */}
        <ScrollReveal delay={0.1}>
          <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 max-w-lg mx-auto">
            <div className="flex-1 relative">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm sm:text-base">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="your_arena_handle"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-8 sm:pl-9 pr-4 py-3 sm:py-4 text-sm sm:text-base md:text-lg text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all"
              />
            </div>
            <BloodSplash>
              <button
                onClick={lookupProfile}
                disabled={loading || !handle.trim()}
                className="px-5 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300 whitespace-nowrap"
              >
                {loading ? "..." : "SUMMON"}
              </button>
            </BloodSplash>
          </div>
        </ScrollReveal>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 text-center mb-6 max-w-lg mx-auto"
            >
              <p className="text-red-400 text-sm sm:text-base">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card */}
        <AnimatePresence>
          {profile && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border"
            >
              {/* Banner */}
              {profile.bannerUrl && (
                <div className="h-24 sm:h-32 md:h-40 bg-cover bg-center relative">
                  <img
                    src={profile.bannerUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1a1a]" />
                </div>
              )}

              {/* Profile Info */}
              <div className="px-5 sm:px-8 md:px-10 pb-6 sm:pb-8 md:pb-10">
                {/* Avatar + Name Row */}
                <div className="flex items-end gap-4 sm:gap-5 -mt-10 sm:-mt-14 mb-4 sm:mb-6">
                  <div className="relative flex-shrink-0">
                    <img
                      src={profile.profilePicture}
                      alt={profile.userName}
                      className="w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-[#1a1a1a] shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                    />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-600 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center text-[8px] sm:text-[10px]">
                      🔥
                    </span>
                  </div>
                  <div className="min-w-0 pb-1 sm:pb-2">
                    <h3 className="font-creepster text-xl sm:text-2xl md:text-3xl text-white truncate">
                      {profile.userName}
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm md:text-base">
                      @{profile.handle}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-gray-300 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 leading-relaxed">
                    {profile.bio}
                  </p>
                )}

                {/* Key Price - The Arena's Social Trading Feature */}
                {profile.keyPrice && (
                  <div className="bg-[#0a0a0a] border border-red-900/30 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">
                          Key Price
                        </p>
                        <p className="text-red-400 font-bold text-lg sm:text-xl md:text-2xl font-mono">
                          {formatAvax(profile.keyPrice)} AVAX
                        </p>
                      </div>
                      {profile.lastKeyPrice && (
                        <div className="text-right">
                          <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">
                            24h High
                          </p>
                          <p className="text-gray-400 text-sm sm:text-base font-mono">
                            {formatAvax(profile.lastKeyPrice)} AVAX
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 text-center">
                    <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">
                      Followers
                    </p>
                    <p className="text-white font-bold text-sm sm:text-lg md:text-xl">
                      {profile.followerCount
                        ? formatNumber(profile.followerCount)
                        : "0"}
                    </p>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 text-center">
                    <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">
                      Following
                    </p>
                    <p className="text-white font-bold text-sm sm:text-lg md:text-xl">
                      {profile.followingsCount
                        ? formatNumber(profile.followingsCount)
                        : "0"}
                    </p>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 text-center">
                    <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">
                      Posts
                    </p>
                    <p className="text-white font-bold text-sm sm:text-lg md:text-xl">
                      {profile.threadCount
                        ? formatNumber(profile.threadCount)
                        : "0"}
                    </p>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 text-center">
                    <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">
                      X Followers
                    </p>
                    <p className="text-white font-bold text-sm sm:text-lg md:text-xl">
                      {profile.twitterFollowers
                        ? formatNumber(profile.twitterFollowers)
                        : "0"}
                    </p>
                  </div>
                </div>

                {/* Wallet Address */}
                {profile.address && (
                  <div className="mt-4 sm:mt-6 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider flex-shrink-0">
                      Wallet
                    </span>
                    <code className="text-gray-400 text-[10px] sm:text-xs md:text-sm font-mono truncate">
                      {profile.address}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(profile.address || "");
                      }}
                      className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 ml-auto"
                      title="Copy address"
                    >
                      📋
                    </button>
                  </div>
                )}

                {/* Link to Arena Profile */}
                <div className="mt-4 sm:mt-6 text-center">
                  <a
                    href={`https://arena.social/${profile.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm sm:text-base transition-colors"
                  >
                    View on The Arena →
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!profile && !error && searched && !loading && (
          <div className="text-center py-6">
            <p className="text-gray-600 text-sm sm:text-base">
              Enter a handle and hit SUMMON to summon a soul from The Arena
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
