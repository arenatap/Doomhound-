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
  "💀 The devil's good boy is here — 1B supply, 0/0 tax",
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
interface ArenaLiveUpdate {
  type: "holder" | "price" | "follower" | "hype";
  message: string;
  emoji: string;
}

export function LiveTicker() {
  const [liveUpdates, setLiveUpdates] = useState<ArenaLiveUpdate[]>([]);
  const [arenaConnected, setArenaConnected] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [lastHolders, setLastHolders] = useState<number | null>(null);
  const [lastFollowers, setLastFollowers] = useState<number | null>(null);

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
      const updates: ArenaLiveUpdate[] = [];

      // Check for price changes
      if (data.stats?.currentPrice !== undefined) {
        const newPrice = data.stats.currentPrice;
        if (lastPrice !== null && newPrice !== lastPrice) {
          const direction = newPrice > lastPrice ? "📈" : "📉";
          const change = ((newPrice - lastPrice) / lastPrice * 100).toFixed(1);
          updates.push({
            type: "price",
            message: `$DOOMHOUND Key ${direction} ${change}% — Now ${newPrice.toFixed(4)} AVAX`,
            emoji: direction,
          });
        }
        setLastPrice(newPrice);
      }

      // Check for new holders
      if (data.stats?.holderCount !== undefined) {
        const newHolders = data.stats.holderCount;
        if (lastHolders !== null && newHolders > lastHolders) {
          const diff = newHolders - lastHolders;
          updates.push({
            type: "holder",
            message: `🐺 ${diff} new key holder${diff > 1 ? "s" : ""}! Total: ${newHolders} holders`,
            emoji: "🐺",
          });
        }
        setLastHolders(newHolders);
      }

      // Check for new followers
      if (data.profile?.followerCount !== undefined) {
        const newFollowers = data.profile.followerCount;
        if (lastFollowers !== null && newFollowers > lastFollowers) {
          const diff = newFollowers - lastFollowers;
          updates.push({
            type: "follower",
            message: `🔥 ${diff} new follower${diff > 1 ? "s" : ""} on Arena! Total: ${newFollowers}`,
            emoji: "🔥",
          });
        }
        setLastFollowers(newFollowers);
      }

      // Add top holder info
      if (data.topHolders && data.topHolders.length > 0) {
        const topHolder = data.topHolders[0];
        if (topHolder.handle) {
          updates.push({
            type: "holder",
            message: `🐋 @${topHolder.handle} holds ${topHolder.shareCount || "?"} $DOOMHOUND keys`,
            emoji: "🐋",
          });
        }
      }

      if (updates.length > 0) {
        setLiveUpdates(updates);
      }
    } catch (err) {
      console.error("Ticker: Arena fetch failed:", err);
      setArenaConnected(false);
    }
  }, [lastPrice, lastHolders, lastFollowers]);

  useEffect(() => {
    fetchArenaData(); // Initial fetch
    const interval = setInterval(fetchArenaData, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [fetchArenaData]);

  // Build messages: live updates from Arena + fallback hype messages
  const messages = useMemo(() => {
    if (arenaConnected && liveUpdates.length > 0) {
      // Mix live Arena updates with some hype messages
      const liveMsgs = liveUpdates.map((u) => `${u.emoji} ${u.message}`);
      return [...liveMsgs, ...LIVE_MESSAGES.slice(0, 5)];
    }
    return LIVE_MESSAGES;
  }, [arenaConnected, liveUpdates]);

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
                  : msg.includes("🐺")
                  ? "text-red-300"
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
