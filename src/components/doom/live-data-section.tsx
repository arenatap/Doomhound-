"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ScrollReveal } from "./scroll-reveal";

// ===== CONFIGURATION =====
// After launching $DOOMHOUND on The Arena, set this to the token's Arena subjectId
// You can find it by searching for your token on Arena or from the URL
// e.g. https://arena.social/DOOMHOUND -> the subjectId from the API
const DOOMHOUND_SUBJECT_ID = ""; // <-- SET THIS AFTER LAUNCH

// ===== TYPES =====
interface HolderData {
  amount: number;
  traderId: string;
  subjectId: string;
  traderUser: {
    handle: string;
    profilePicture: string;
    userName: string;
  };
  subjectUser: {
    keyPrice: string;
  };
}

interface TrendingThread {
  id: string;
  content: string;
  userName: string;
  userHandle: string;
  userPicture: string;
  likeCount: number;
  repostCount: number;
  answerCount: number;
  createdDate: string;
  community?: {
    tokenName?: string;
    ticker?: string;
    contractAddress?: string;
    tokenPhase?: number;
    isLP?: boolean;
    followerCount?: number;
  };
}

interface ArenaStats {
  totalHolders: number;
  totalShares: number;
  keyPrice: string | null;
  holders: HolderData[];
}

interface TrendingData {
  threads: TrendingThread[];
}

type LaunchStatus = "pre-launch" | "live" | "graduated";

// ===== HELPER FUNCTIONS =====
function formatAvax(wei: string): string {
  const val = parseFloat(wei) / 1e18;
  if (val < 0.0001) return `<0.0001`;
  if (val < 1) return val.toFixed(4);
  return val.toFixed(2);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ===== COMPONENT =====
export function LiveDataSection({ onNewBuy }: { onNewBuy?: () => void }) {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [trending, setTrending] = useState<TrendingThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceFlash, setPriceFlash] = useState<"green" | "red" | null>(null);
  const prevPriceRef = useRef<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const isLaunched = DOOMHOUND_SUBJECT_ID !== "";

  const [dataLoaded, setDataLoaded] = useState(false);
  const [userRequestedData, setUserRequestedData] = useState(false);

  // Fetch token stats from Arena API
  const fetchStats = useCallback(async () => {
    if (!isLaunched) return;
    try {
      const res = await fetch(
        `/api/arena?action=holders&subjectId=${DOOMHOUND_SUBJECT_ID}&pageSize=25`
      );
      const data = await res.json();
      if (data.holders) {
        const newStats: ArenaStats = {
          totalHolders: data.count || data.holders.length,
          totalShares: data.totalShares || 0,
          keyPrice: data.holders[0]?.subjectUser?.keyPrice || null,
          holders: data.holders,
        };

        // Flash price on change
        if (prevPriceRef.current && newStats.keyPrice) {
          if (newStats.keyPrice > prevPriceRef.current) {
            setPriceFlash("green");
          } else if (newStats.keyPrice < prevPriceRef.current) {
            setPriceFlash("red");
          }
          setTimeout(() => setPriceFlash(null), 1000);
        }
        prevPriceRef.current = newStats.keyPrice;

        setStats(newStats);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch Arena stats:", err);
    }
  }, [isLaunched]);

  // Fetch trending posts from Arena
  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=trending");
      const data: TrendingData = await res.json();
      if (data.threads) {
        setTrending(data.threads.slice(0, 8));
      }
    } catch (err) {
      console.error("Failed to fetch Arena trending:", err);
    }
  }, []);

  // Only fetch when user explicitly requests it
  useEffect(() => {
    if (!userRequestedData) return;
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchTrending()]);
      setLoading(false);
      setDataLoaded(true);
    };
    init();
  }, [userRequestedData, fetchStats, fetchTrending]);

  // Polling — refresh every 15 seconds (only after initial load)
  useEffect(() => {
    if (!dataLoaded) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [dataLoaded, fetchStats]);

  // Refresh trending every 60 seconds (only after initial load)
  useEffect(() => {
    if (!dataLoaded) return;
    const interval = setInterval(() => {
      fetchTrending();
    }, 60000);
    return () => clearInterval(interval);
  }, [dataLoaded, fetchTrending]);

  // Determine launch status
  const getLaunchStatus = (): LaunchStatus => {
    if (!isLaunched) return "pre-launch";
    if (!stats) return "pre-launch";
    return "live";
  };

  const launchStatus = getLaunchStatus();

  return (
    <section
      id="live-data"
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 md:px-16">
        {/* Section Header */}
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red inline-flex items-center gap-3 sm:gap-4">
              ARENA STATUS
              <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 animate-pulse-red" />
            </h2>
          </div>
        </ScrollReveal>

        {/* Pre-Launch State */}
        {!isLaunched && (
          <ScrollReveal delay={0.1}>
            <div className="bg-[#1a1a1a] border border-red-900/40 rounded-xl p-8 sm:p-12 md:p-16 text-center max-w-2xl mx-auto animate-flame-border">
              <div className="text-6xl sm:text-7xl md:text-8xl mb-4 sm:mb-6">🔥</div>
              <h3 className="font-creepster text-3xl sm:text-4xl md:text-5xl text-red-500 mb-3 sm:mb-4">
                COMING SOON
              </h3>
              <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-4 sm:mb-6">
                $DOOMHOUND is about to be unleashed on The Arena.
                The hound from hell is preparing to enter the battlefield.
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm sm:text-base">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Awaiting deployment on Avalanche...
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Load Data Button — only show when data hasn't been requested yet and token is launched */}
        {isLaunched && !userRequestedData && (
          <ScrollReveal delay={0.1}>
            <div className="text-center mt-8">
              <button
                onClick={() => setUserRequestedData(true)}
                className="px-8 py-4 text-base sm:text-lg font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300"
              >
                📡 Load Arena Data
              </button>
              <p className="text-gray-600 text-xs sm:text-sm mt-3">Click to fetch live price, holders &amp; trending posts</p>
            </div>
          </ScrollReveal>
        )}

        <div className={`grid md:grid-cols-2 gap-5 sm:gap-6 md:gap-10 ${!isLaunched ? "mt-10 sm:mt-14" : ""}`}>
          {/* Left Column — Token Data */}
          <div className="space-y-5 sm:space-y-6">
            {/* Live Price */}
            {isLaunched && userRequestedData && (
              <ScrollReveal delay={0.1}>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500">
                      Live Price
                    </h3>
                    <span className="text-[10px] sm:text-xs uppercase text-orange-400 bg-orange-900/20 px-2 py-0.5 rounded">
                      {launchStatus === "live" ? "Bonding Curve" : "Live"}
                    </span>
                  </div>
                  <p
                    className={`text-2xl sm:text-3xl md:text-4xl font-bold font-mono ${
                      priceFlash === "green"
                        ? "animate-flash-green"
                        : priceFlash === "red"
                        ? "animate-flash-red"
                        : "text-white"
                    }`}
                  >
                    {stats?.keyPrice
                      ? `${formatAvax(stats.keyPrice)} AVAX`
                      : "Loading..."}
                  </p>
                </div>
              </ScrollReveal>
            )}

            {/* Holders Count */}
            {isLaunched && userRequestedData && (
              <ScrollReveal delay={0.2}>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500 mb-2 sm:mb-3">
                    Holders
                  </h3>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-400">
                    {stats ? `${stats.totalHolders} HOLDERS` : "Loading..."}
                  </p>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1">
                    Total shares: {stats?.totalShares?.toLocaleString() || "..."}
                  </p>
                </div>
              </ScrollReveal>
            )}

            {/* Top Holders */}
            {isLaunched && userRequestedData && stats?.holders && stats.holders.length > 0 && (
              <ScrollReveal delay={0.3}>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500 mb-3 sm:mb-4">
                    Top Holders
                  </h3>
                  <div className="space-y-2">
                    {stats.holders.slice(0, 5).map((holder, i) => (
                      <div
                        key={holder.traderId}
                        className="flex items-center gap-2 sm:gap-3 bg-[#0a0a0a] rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 border border-[#2a2a2a]"
                      >
                        <span className="text-red-500 font-bold text-xs sm:text-sm w-5 text-center">
                          #{i + 1}
                        </span>
                        <img
                          src={holder.traderUser.profilePicture}
                          alt=""
                          loading="lazy"
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full"
                        />
                        <span className="text-gray-300 text-xs sm:text-sm truncate">
                          @{holder.traderUser.handle}
                        </span>
                        <span className="text-red-400 ml-auto text-xs sm:text-sm font-mono whitespace-nowrap">
                          {holder.amount} keys
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Token Info Card (when not launched yet) */}
            {!isLaunched && (
              <ScrollReveal delay={0.2}>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500 mb-3 sm:mb-4">
                    Token Info
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Network</span>
                      <span className="text-white text-sm font-bold">Avalanche C-Chain</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Platform</span>
                      <span className="text-red-400 text-sm font-bold">The Arena</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Ticker</span>
                      <span className="text-white text-sm font-mono">$DOOMHOUND</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Supply</span>
                      <span className="text-white text-sm font-mono">1,000,000,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Curve</span>
                      <span className="text-orange-400 text-sm font-bold">Bonding → LFJ DEX</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}
          </div>

          {/* Right Column — Arena Trending */}
          <div className="space-y-5 sm:space-y-6">
            {isLaunched && userRequestedData && (
            <ScrollReveal delay={0.15}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500">
                    Arena Live Feed
                  </h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div
                  ref={feedRef}
                  className="max-h-[400px] sm:max-h-[480px] md:max-h-[550px] overflow-y-auto space-y-2 no-scrollbar"
                >
                  {loading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">Loading Arena feed...</p>
                    </div>
                  ) : trending.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">No trending posts</p>
                    </div>
                  ) : (
                    trending.map((thread) => (
                      <div
                        key={thread.id}
                        className="bg-[#0a0a0a] rounded-lg px-3 sm:px-4 py-3 sm:py-3.5 border border-[#2a2a2a] hover:border-red-900/30 transition-colors"
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <img
                            src={thread.userPicture}
                            alt=""
                            loading="lazy"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-gray-300 text-xs sm:text-sm font-bold truncate">
                                {thread.userName}
                              </span>
                              <span className="text-gray-600 text-[10px] sm:text-xs whitespace-nowrap">
                                {timeAgo(thread.createdDate)}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs sm:text-sm line-clamp-2">
                              {stripHtml(thread.content)}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-gray-600 text-[10px] sm:text-xs">
                                ❤️ {thread.likeCount}
                              </span>
                              <span className="text-gray-600 text-[10px] sm:text-xs">
                                🔁 {thread.repostCount}
                              </span>
                              <span className="text-gray-600 text-[10px] sm:text-xs">
                                💬 {thread.answerCount}
                              </span>
                              {thread.community?.ticker && (
                                <span className="text-red-400 text-[10px] sm:text-xs font-bold ml-auto">
                                  ${thread.community.ticker}
                                  {thread.community.isLP ? " 🦅" : " 🔥"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ScrollReveal>
            )}

            {/* Arena Stats Footer */}
            {isLaunched && userRequestedData && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 text-center">
                <p className="text-gray-500 text-xs sm:text-sm">
                  Data powered by{" "}
                  <a
                    href="https://arena.social"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    The Arena API
                  </a>
                  {" "}&middot; Auto-refresh every 15s
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
