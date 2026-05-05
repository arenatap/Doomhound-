"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollReveal } from "./scroll-reveal";

// ===== CONFIGURATION =====
const DOOMHOUND_CONTRACT = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";
const SNOWTRACE_API = "https://api.snowtrace.io/api";

// ===== TYPES =====
interface TokenHolder {
  address: string;
  balance: string; // raw wei string
  percentage?: string;
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

interface TokenStats {
  holderCount: number;
  holders: TokenHolder[];
  totalSupply: string;
}

interface TrendingData {
  threads: TrendingThread[];
}

// ===== HELPER FUNCTIONS =====
function formatTokens(wei: string): string {
  const val = parseFloat(wei) / 1e18;
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(2);
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
  if (diff < 86400) return `${Math.floor(diff / 86400)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ===== COMPONENT =====
export function LiveDataSection() {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [trending, setTrending] = useState<TrendingThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch on-chain token holders from Snowtrace
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(
        `${SNOWTRACE_API}?module=token&action=tokenholderlist&contractaddress=${DOOMHOUND_CONTRACT}&page=1&offset=25`
      );
      const data = await res.json();
      if (data.status === "1" && Array.isArray(data.result)) {
        const holders: TokenHolder[] = data.result.map((h: any) => ({
          address: h.TokenHolderAddress,
          balance: h.TokenHolderQuantity,
        }));
        setStats({
          holderCount: holders.length,
          holders,
          totalSupply: "1185417787", // verified on-chain
        });
        setError(null);
      } else {
        setError("Failed to load holder data");
      }
    } catch (err) {
      console.error("Failed to fetch token stats:", err);
      setError("Failed to load data");
    }
  }, []);

  // Fetch trending posts from Arena
  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=trending");
      const data: TrendingData = await res.json();
      // Filter for $DOOMHOUND related posts, or show general trending
      const allThreads = data.threads || [];
      const doomhoundThreads = allThreads.filter((t) => {
        const content = (t.content || "").toLowerCase();
        const ticker = (t.community?.ticker || "").toLowerCase();
        return content.includes("doomhound") || ticker.includes("doomhound");
      });
      // Show DOOMHOUND posts first, then general trending
      setTrending(
        doomhoundThreads.length > 0
          ? doomhoundThreads.slice(0, 8)
          : allThreads.slice(0, 8)
      );
    } catch (err) {
      console.error("Failed to fetch Arena trending:", err);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchTrending()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchTrending]);

  // Polling — refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Refresh trending every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTrending();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

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
              <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 animate-pulse" />
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-6 md:gap-10">
          {/* Left Column — Token Data */}
          <div className="space-y-5 sm:space-y-6">
            {/* Holders Count */}
            <ScrollReveal delay={0.1}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500">
                    Holders
                  </h3>
                  <span className="text-[10px] sm:text-xs uppercase text-green-400 bg-green-900/20 px-2 py-0.5 rounded">
                    Live
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-400">
                  {stats ? `${stats.holderCount} HOLDERS` : loading ? "Loading..." : "—"}
                </p>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">
                  On-chain Avalanche C-Chain
                </p>
              </div>
            </ScrollReveal>

            {/* Top Holders */}
            {stats?.holders && stats.holders.length > 0 && (
              <ScrollReveal delay={0.2}>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500 mb-3 sm:mb-4">
                    Top Holders
                  </h3>
                  <div className="space-y-2">
                    {stats.holders.slice(0, 8).map((holder, i) => (
                      <div
                        key={holder.address}
                        className="flex items-center gap-2 sm:gap-3 bg-[#0a0a0a] rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 border border-[#2a2a2a]"
                      >
                        <span className="text-red-500 font-bold text-xs sm:text-sm w-5 text-center">
                          #{i + 1}
                        </span>
                        <a
                          href={`https://snowtrace.io/address/${holder.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-300 text-xs sm:text-sm font-mono hover:text-red-400 transition-colors truncate"
                        >
                          {shortAddress(holder.address)}
                        </a>
                        <span className="text-red-400 ml-auto text-xs sm:text-sm font-mono whitespace-nowrap">
                          {formatTokens(holder.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Token Info Card */}
            <ScrollReveal delay={0.3}>
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
                    <span className="text-gray-500 text-sm">Name</span>
                    <span className="text-white text-sm">Mr. Hound</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Ticker</span>
                    <span className="text-white text-sm font-mono">$DOOMHOUND</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Supply</span>
                    <span className="text-white text-sm font-mono">1,185,417,787</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Curve</span>
                    <span className="text-orange-400 text-sm font-bold">Bonding → LFJ DEX</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Contract</span>
                    <a
                      href={`https://snowtrace.io/token/${DOOMHOUND_CONTRACT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 text-xs font-mono hover:text-red-300 truncate max-w-[180px]"
                    >
                      0xE99a...9dBb ↗
                    </a>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column — Arena Trending */}
          <div className="space-y-5 sm:space-y-6">
            <ScrollReveal delay={0.15}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500">
                    Arena Live Feed
                  </h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="max-h-[400px] sm:max-h-[480px] md:max-h-[550px] overflow-y-auto space-y-2 no-scrollbar">
                  {loading && !trending.length ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">Loading Arena feed...</p>
                    </div>
                  ) : trending.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">No $DOOMHOUND posts yet. Be the first to post!</p>
                      <a
                        href="https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        🐺 POST ON ARENA
                      </a>
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

            {/* CTA — Buy on Arena */}
            <ScrollReveal delay={0.2}>
              <div className="bg-[#1a1a1a] border border-red-900/40 rounded-xl p-5 sm:p-6 text-center animate-flame-border">
                <p className="text-white font-creepster text-lg sm:text-xl mb-2">
                  🐺 Join the Pack
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mb-4">
                  Buy $DOOMHOUND on The Arena and earn points!
                </p>
                <a
                  href="https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all"
                >
                  🔥 BUY $DOOMHOUND
                </a>
              </div>
            </ScrollReveal>

            {/* Data Source Footer */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-5 text-center">
              <p className="text-gray-500 text-xs sm:text-sm">
                Holders via{" "}
                <a
                  href={`https://snowtrace.io/token/${DOOMHOUND_CONTRACT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Snowtrace
                </a>
                {" "}· Feed via{" "}
                <a
                  href="https://arena.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Arena API
                </a>
                {" "}· Auto-refresh 30s
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
