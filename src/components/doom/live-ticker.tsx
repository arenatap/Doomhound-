"use client";

import { useMemo, useEffect, useState, useCallback } from "react";

// ===== TICKER DATA (fallback when Arena API not connected) =====
const LIVE_MESSAGES = [
  "🐺 $DOOMHOUND IS LIVE ON THE ARENA — Buy NOW!",
  "🔥 The Hound has been UNLEASHED — Can't Kill What's Already From Hell",
  "💀 Rugs fear the Hound — 0 tax, LP burned, contract renounced",
  "🐋 Whale spotted buying $DOOMHOUND — The pack is growing",
  "🐺 The Arena's Most Feared Contender is HERE",
  "🔥 New holders flooding in — Don't fade the Hound",
  "💀 $DOOMHOUND doesn't rug — it DEVOURS rugs",
  "🐺 Join the pack on arena.social — Holders climbing fast",
  "🔥 LIVE on Avalanche C-Chain — Fair launch, community owned",
  "💀 The devil's good boy is here — 3.4B supply, 0/0 tax",
];

// ===== MARQUEE KEYFRAMES =====
const MARQUEE_CSS = `
@keyframes doom-ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.doom-ticker-track {
  animation: doom-ticker-scroll 40s linear infinite;
}
.doom-ticker-track:hover {
  animation-play-state: paused;
}
`;

// ===== TYPES =====
interface ArenaCommunity {
  name: string;
  ticker: string;
  tokenName: string;
  followerCount: number;
  contractAddress: string;
  photoURL: string;
}

interface ArenaStats {
  price: number;
  marketCap: number;
  totalSupply: number;
  buys: number;
  sells: number;
  liquidity: number;
  buyVolume: string;
  sellVolume: string;
}

interface ArenaOwner {
  handle: string;
  userName: string;
  profilePicture: string;
  followerCount: number;
  threadCount: number;
  keyPrice: number;
}

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  if (val < 1000000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${(val / 1000000).toFixed(2)}M`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function LiveTicker() {
  const [arenaConnected, setArenaConnected] = useState(false);
  const [community, setCommunity] = useState<ArenaCommunity | null>(null);
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<ArenaOwner | null>(null);
  const [prevStats, setPrevStats] = useState<ArenaStats | null>(null);
  const [holderCount, setHolderCount] = useState(0);

  // Fetch Arena live data periodically
  const fetchArenaData = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=live");
      const data = await res.json();

      if (!data.connected) {
        setArenaConnected(false);
        return;
      }

      setArenaConnected(true);

      if (data.community) setCommunity(data.community);
      if (data.stats) {
        setPrevStats(stats); // save previous for comparison
        setStats(data.stats);
      }
      if (data.ownerProfile) setOwnerProfile(data.ownerProfile);
    } catch (err) {
      console.error("Ticker: Arena fetch failed:", err);
      setArenaConnected(false);
    }
  }, [stats]);

  // Fetch token holder count from Snowtrace
  const fetchHolderCount = useCallback(async () => {
    try {
      const res = await fetch("/api/snowtrace?action=holdercount");
      const data = await res.json();
      if (data.holderCount && data.holderCount > 0) {
        setHolderCount(data.holderCount);
      }
    } catch (err) {
      console.error("Ticker: Holder count fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchArenaData(); // Initial fetch
    fetchHolderCount();
    const interval = setInterval(fetchArenaData, 20000); // Every 20s
    const holderInterval = setInterval(fetchHolderCount, 120000); // Every 2 min
    return () => {
      clearInterval(interval);
      clearInterval(holderInterval);
    };
  }, [fetchArenaData, fetchHolderCount]);

  // Build messages: mix live Arena data with hype messages
  const messages = useMemo(() => {
    if (!arenaConnected || !stats) return LIVE_MESSAGES;

    const liveMsgs: string[] = [];

    // Token Price
    liveMsgs.push(`📈 $DOOMHOUND Price: ${formatAvax(stats.price)} AVAX`);

    // Market cap
    liveMsgs.push(`💰 Market Cap: ${formatAvax(stats.marketCap)} AVAX`);

    // Buy/Sell activity
    const totalTx = stats.buys + stats.sells;
    if (totalTx > 0) {
      liveMsgs.push(`🔥 ${stats.buys} buys / ${stats.sells} sells — Buy pressure ${stats.buys > stats.sells ? "🔥" : "⚠️"}`);
    }

    // Liquidity
    if (stats.liquidity > 0) {
      liveMsgs.push(`💧 Liquidity: ${formatAvax(stats.liquidity)} AVAX`);
    }

    // Price change
    if (prevStats && prevStats.price !== stats.price) {
      const change = ((stats.price - prevStats.price) / prevStats.price * 100).toFixed(1);
      const direction = stats.price > prevStats.price ? "📈" : "📉";
      liveMsgs.push(`${direction} Price ${change}% — ${formatAvax(stats.price)} AVAX`);
    }

    // Token Holders count
    if (holderCount > 0) {
      liveMsgs.push(`🐋 ${formatNumber(holderCount)} $DOOMHOUND token holders and growing!`);
    }

    // Community followers
    if (community && community.followerCount > 0) {
      liveMsgs.push(`🐺 ${community.followerCount} followers on The Arena`);
    }

    // Owner info
    if (ownerProfile && ownerProfile.followerCount > 0) {
      liveMsgs.push(`👑 @${ownerProfile.handle} — ${ownerProfile.followerCount} Arena followers`);
    }

    // Mix live data with hype
    return [...liveMsgs, ...LIVE_MESSAGES.slice(0, 4)];
  }, [arenaConnected, stats, prevStats, holderCount, community, ownerProfile]);

  // Duplicate for seamless loop
  const doubled = useMemo(() => [...messages, ...messages], [messages]);

  return (
    <>
      <style>{MARQUEE_CSS}</style>
      <div className="relative w-full bg-[#1a1a1a] border-y border-[#2a2a2a] overflow-hidden py-2 sm:py-2.5">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-[#1a1a1a] to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-[#1a1a1a] to-transparent z-10 pointer-events-none" />

        {/* Live indicator */}
        <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-red-600/20 border border-red-600/40 rounded-full px-2 sm:px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse-red" />
          <span className="text-red-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Live</span>
        </div>

        {/* Scrolling track */}
        <div className="doom-ticker-track flex items-center gap-6 sm:gap-10 whitespace-nowrap pl-20 sm:pl-28">
          {doubled.map((msg, i) => (
            <span
              key={i}
              className={`text-xs sm:text-sm font-medium ${
                msg.includes("🐋") || msg.includes("Mega")
                  ? "text-orange-400"
                  : msg.includes("🔥")
                  ? "text-red-400"
                  : msg.includes("📈") || msg.includes("📉")
                  ? "text-yellow-400"
                  : msg.includes("💰") || msg.includes("💧")
                  ? "text-green-400"
                  : msg.includes("🐺")
                  ? "text-red-300"
                  : msg.includes("👑")
                  ? "text-purple-400"
                  : "text-orange-300"
              }`}
            >
              {msg}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
