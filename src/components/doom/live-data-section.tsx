"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "./scroll-reveal";

const fakeAddresses = [
  "0x7a3f",
  "0x2b8e",
  "0xf1c4",
  "0x9d2a",
  "0x4c6b",
  "0xe8f3",
  "0x1a5d",
  "0xb7c9",
  "0x3e4f",
  "0xd6a2",
];

const fakeAmounts = [
  "1,000,000",
  "500,000",
  "2,500,000",
  "3,200,000",
  "800,000",
  "1,500,000",
  "4,000,000",
  "750,000",
  "2,000,000",
  "1,200,000",
];

const leaderboardTokens = [
  { rank: 1, name: "$HELLFIRE", change: "+142%" },
  { rank: 2, name: "$DARKSIDE", change: "+98%" },
  { rank: 3, name: "$DOOMHOUND", change: "+87%" },
  { rank: 4, name: "$SHADOW", change: "+65%" },
  { rank: 5, name: "$PHANTOM", change: "+51%" },
];

interface BuyEntry {
  id: number;
  address: string;
  amount: string;
}

export function LiveDataSection({ onNewBuy }: { onNewBuy?: () => void }) {
  const [bondingProgress, setBondingProgress] = useState(47);
  const [holders, setHolders] = useState(347);
  const [priceFlash, setPriceFlash] = useState<"green" | "red" | null>(null);
  const [buyFeed, setBuyFeed] = useState<BuyEntry[]>([
    { id: 1, address: "0x7a3f", amount: "1,000,000" },
    { id: 2, address: "0x2b8e", amount: "500,000" },
    { id: 3, address: "0xf1c4", amount: "2,500,000" },
  ]);
  const feedRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(4);

  // Slowly animate bonding curve upward
  useEffect(() => {
    const interval = setInterval(() => {
      setBondingProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 0.3;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Slowly increase holders
  useEffect(() => {
    const interval = setInterval(() => {
      setHolders((prev) => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Add new buy feed entries
  useEffect(() => {
    const interval = setInterval(() => {
      const newEntry: BuyEntry = {
        id: idCounter.current++,
        address:
          fakeAddresses[
            Math.floor(Math.random() * fakeAddresses.length)
          ],
        amount:
          fakeAmounts[Math.floor(Math.random() * fakeAmounts.length)],
      };

      setBuyFeed((prev) => [newEntry, ...prev.slice(0, 9)]);

      // Flash price
      setPriceFlash(Math.random() > 0.3 ? "green" : "red");
      setTimeout(() => setPriceFlash(null), 1000);

      onNewBuy?.();
    }, 3500);
    return () => clearInterval(interval);
  }, [onNewBuy]);

  return (
    <section
      id="live-data"
      className="relative py-20 md:py-32 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="font-creepster text-5xl md:text-7xl text-red-500 animate-glow-red inline-flex items-center gap-4">
              ARENA STATUS
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse-red" />
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left column: Bonding + Price + Holders */}
          <div className="space-y-6">
            {/* Bonding Curve */}
            <ScrollReveal delay={0.1}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm uppercase tracking-wider text-gray-500">
                    Bonding Curve
                  </h3>
                  <span className="text-red-400 font-bold">
                    {bondingProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-4 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#2a2a2a]">
                  <div
                    className="h-full progress-fire rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${bondingProgress}%` }}
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* Price */}
            <ScrollReveal delay={0.2}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-2">
                  Live Price
                </h3>
                <p
                  className={`text-3xl font-bold font-mono ${
                    priceFlash === "green"
                      ? "animate-flash-green"
                      : priceFlash === "red"
                      ? "animate-flash-red"
                      : "text-white"
                  }`}
                >
                  $0.00000DOOM
                </p>
              </div>
            </ScrollReveal>

            {/* Holders */}
            <ScrollReveal delay={0.3}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-2">
                  Holders
                </h3>
                <p className="text-3xl font-bold text-red-400">
                  {holders} HOLDERS
                </p>
              </div>
            </ScrollReveal>
          </div>

          {/* Right column: Buy Feed + Leaderboard */}
          <div className="space-y-6">
            {/* Buy Feed */}
            <ScrollReveal delay={0.15}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-4">
                  Recent Buys 🔥
                </h3>
                <div
                  ref={feedRef}
                  className="max-h-48 overflow-y-auto space-y-2 no-scrollbar"
                >
                  {buyFeed.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 text-sm bg-[#0a0a0a] rounded-lg px-3 py-2 border border-[#2a2a2a]"
                    >
                      <span className="text-green-500 text-xs">BUY</span>
                      <span className="text-gray-400 font-mono">
                        {entry.address}...
                      </span>
                      <span className="text-gray-300 ml-auto">
                        bought {entry.amount} $DOOMHOUND
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Arena Leaderboard */}
            <ScrollReveal delay={0.25}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-4">
                  Arena Leaderboard
                </h3>
                <div className="space-y-2">
                  {leaderboardTokens.map((token) => (
                    <div
                      key={token.rank}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                        token.name === "$DOOMHOUND"
                          ? "bg-red-900/20 border-red-600/40 shadow-[0_0_10px_rgba(220,38,38,0.2)]"
                          : "bg-[#0a0a0a] border-[#2a2a2a]"
                      }`}
                    >
                      <span
                        className={`font-bold w-6 text-center ${
                          token.name === "$DOOMHOUND"
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        #{token.rank}
                      </span>
                      <span
                        className={`font-bold ${
                          token.name === "$DOOMHOUND"
                            ? "text-red-400"
                            : "text-gray-300"
                        }`}
                      >
                        {token.name}
                      </span>
                      <span className="ml-auto text-green-500 text-sm font-mono">
                        {token.change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
