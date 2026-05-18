"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

// ===== CONFIGURATION =====
const DOOMHOUND_CONTRACT = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";
// DEX Screener pair address (DOOMHOUND/ARENA on Uniswap V4 Avalanche)
const DEXSCREENER_PAIR = "0x6eee7befd37571e8da63fa80a7e967eeb98465d7eee9c37d66e9e124fca68a41";
const ARENA_COMMUNITY_URL = `https://arena.social/community/${DOOMHOUND_CONTRACT}?ref=Toff083249361`;

// ===== DEX SCREENER QUICK STATS COMPONENT =====
// Replaces the broken iframe embed with live data from our API
interface DexQuickData {
  connected: boolean;
  pair: {
    priceUsd: number;
    priceNative: number;
    priceChange: { m5?: number; h1?: number; h6?: number; h24?: number };
    volume: { h24?: number; h6?: number; h1?: number; m5?: number };
    liquidity: { usd?: number; base?: number; quote?: number };
    marketCap: number;
    fdv: number;
    txns: {
      m5?: { buys: number; sells: number };
      h1?: { buys: number; sells: number };
      h6?: { buys: number; sells: number };
      h24?: { buys: number; sells: number };
    };
  } | null;
}

function formatDexPrice(price: number): string {
  if (price <= 0) return "$0";
  if (price < 0.000001) return `$${price.toFixed(9)}`;
  if (price < 0.0001) return `$${price.toFixed(7)}`;
  if (price < 0.01) return `$${price.toFixed(5)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 100) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDexUsd(val: number): string {
  if (val <= 0) return "$0";
  if (val < 1) return `$${val.toFixed(2)}`;
  if (val < 10000) return `$${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (val < 1000000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${(val / 1000000).toFixed(2)}M`;
}

function DexScreenerQuickStats() {
  const [data, setData] = useState<DexQuickData | null>(null);

  const fetchDex = useCallback(async () => {
    try {
      const res = await fetch("/api/dexscreener?action=live");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("DexScreener quick stats error:", err);
    }
  }, []);

  useEffect(() => {
    fetchDex();
    const interval = setInterval(fetchDex, 20000);
    return () => clearInterval(interval);
  }, [fetchDex]);

  const pair = data?.pair;
  const change1h = pair?.priceChange?.h1 ?? 0;
  const change24h = pair?.priceChange?.h24 ?? 0;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm uppercase tracking-wider text-gray-500">
            DEX Screener
          </h3>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <a
          href={`https://dexscreener.com/avalanche/${DEXSCREENER_PAIR}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-400 text-[10px] sm:text-xs hover:text-red-300 transition-colors"
        >
          Open on DexScreener →
        </a>
      </div>

      {pair ? (
        <div className="px-4 sm:px-5 pb-4 space-y-3">
          {/* Price Hero */}
          <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-lg px-4 py-3 border border-red-900/40">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block mb-1">Price (DEX)</span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <motion.span
                key={pair.priceUsd}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="text-orange-400 text-2xl sm:text-3xl font-bold font-mono"
              >
                {formatDexPrice(pair.priceUsd)}
              </motion.span>
              <span className="text-orange-300/70 text-xs font-mono">
                {pair.priceNative.toFixed(6)} ARENA
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-mono font-bold ${change1h >= 0 ? "text-green-400" : "text-red-400"}`}>
                1h: {change1h >= 0 ? "+" : ""}{change1h.toFixed(2)}%
              </span>
              <span className={`text-xs font-mono font-bold ${change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                24h: {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0a0a0a] rounded-lg px-3 py-2.5 border border-[#2a2a2a]">
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Market Cap</p>
              <p className="text-white text-sm font-bold font-mono">{formatDexUsd(pair.marketCap || pair.fdv)}</p>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg px-3 py-2.5 border border-[#2a2a2a]">
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Liquidity</p>
              <p className="text-green-400 text-sm font-bold font-mono">{formatDexUsd(pair.liquidity?.usd || 0)}</p>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg px-3 py-2.5 border border-[#2a2a2a]">
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Volume 24h</p>
              <p className="text-orange-400 text-sm font-bold font-mono">{formatDexUsd(pair.volume?.h24 || 0)}</p>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg px-3 py-2.5 border border-[#2a2a2a]">
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Txns 1h</p>
              <p className="text-sm font-bold font-mono">
                <span className="text-green-400">{pair.txns?.h1?.buys || 0}</span>
                <span className="text-gray-600 mx-0.5">/</span>
                <span className="text-red-400">{pair.txns?.h1?.sells || 0}</span>
              </p>
            </div>
          </div>

          {/* Pair info */}
          <div className="flex items-center justify-between text-[10px] text-gray-600">
            <span>Uniswap V4 · Avalanche</span>
            <span>Auto-refresh 20s</span>
          </div>
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <p className="text-gray-600 text-sm animate-pulse">Loading DEX data...</p>
        </div>
      )}
    </div>
  );
}

// ===== TYPES =====
interface ArenaCommunity {
  name: string;
  ticker: string;
  tokenName: string;
  followerCount: number;
  contractAddress: string;
  photoURL: string;
  description: string;
  createdOn: string;
  paymentToken: string;
}

interface ArenaStats {
  price: number;
  marketCap: number;
  totalSupply: number;
  buys: number;
  sells: number;
  liquidityAvax: number;
  liquidityArena: number;
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

interface LiveData {
  connected: boolean;
  community: ArenaCommunity | null;
  stats: ArenaStats | null;
  ownerProfile: ArenaOwner | null;
  avaxUsd: number;
  fetchedAt: string;
}

interface SnowtraceHolder {
  address: string;
  balance: string;
}

interface TransferData {
  hash: string;
  from: string;
  to: string;
  value: string;
  decimals: string;
  timeStamp: string;
}

// ===== HELPERS =====
function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(timestamp: string): string {
  const now = Math.floor(Date.now() / 1000);
  const then = parseInt(timestamp);
  const diff = now - then;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatBalance(raw: string, decimals: string = "18"): string {
  const dec = parseInt(decimals) || 18;
  const val = BigInt(raw);
  const divisor = BigInt(10) ** BigInt(dec);
  const whole = val / divisor;
  const fraction = val % divisor;
  const fractionStr = fraction.toString().padStart(dec, "0").slice(0, 4);
  const formatted = `${whole.toLocaleString()}.${fractionStr}`;
  return formatted.replace(/\.?0+$/, "") || "0";
}

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatTokenAmount(raw: string): string {
  const val = BigInt(raw);
  const divisor = BigInt(10) ** BigInt(18);
  const whole = Number(val / divisor);
  if (whole >= 1_000_000_000) return `${(whole / 1_000_000_000).toFixed(2)}B`;
  if (whole >= 1_000_000) return `${(whole / 1_000_000).toFixed(2)}M`;
  if (whole >= 1_000) return `${(whole / 1_000).toFixed(1)}K`;
  return whole.toLocaleString();
}

function holderPercentage(balance: string, totalSupply: string): string {
  try {
    const b = BigInt(balance);
    const s = BigInt(totalSupply);
    if (s === BigInt(0)) return "0%";
    // Calculate percentage with 2 decimal places
    const pct = (Number(b * BigInt(10000) / s) / 100).toFixed(2);
    return `${pct}%`;
  } catch {
    return "";
  }
}

// ===== COMPONENT =====
export function LiveDataSection({ onNewBuy }: { onNewBuy?: () => void }) {
  // Arena live data
  const [arenaConnected, setArenaConnected] = useState(false);
  const [community, setCommunity] = useState<ArenaCommunity | null>(null);
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<ArenaOwner | null>(null);
  const [avaxUsd, setAvaxUsd] = useState<number>(9.6);

  // Snowtrace on-chain data (always available — THIS IS THE TOKEN HOLDERS DATA)
  const [onChainHolders, setOnChainHolders] = useState<SnowtraceHolder[]>([]);
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [holdersCount, setHoldersCount] = useState(0);
  const [totalSupply, setTotalSupply] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const prevCountRef = useRef(0);

  // ===== FETCH ARENA LIVE DATA =====
  const fetchArenaLive = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=live");
      const data = await res.json();
      if (data.connected) {
        setArenaConnected(true);
        if (data.community) setCommunity(data.community);
        if (data.stats) setArenaStats(data.stats);
        if (data.ownerProfile) setOwnerProfile(data.ownerProfile);
        if (data.avaxUsd) setAvaxUsd(data.avaxUsd);
      } else {
        setArenaConnected(false);
      }
    } catch (err) {
      console.error("Failed to fetch Arena live data:", err);
      setArenaConnected(false);
    }
  }, []);

  // ===== FETCH SNOWTRACE ON-CHAIN DATA =====
  const fetchOnChainHolders = useCallback(async () => {
    try {
      const res = await fetch("/api/snowtrace?action=holders");
      const data = await res.json();
      if (data.holders) {
        setOnChainHolders(data.holders);
        if (data.count && data.count > holdersCount) {
          setHoldersCount(data.count);
        }
      }
    } catch (err) {
      console.error("Failed to fetch on-chain holders:", err);
    }
  }, [holdersCount]);

  const fetchTransfers = useCallback(async () => {
    try {
      const res = await fetch("/api/snowtrace?action=transfers");
      const data = await res.json();
      if (data.transfers) {
        setTransfers(data.transfers);
        if (
          data.transfers.length > 0 &&
          prevCountRef.current > 0 &&
          data.transfers.length !== prevCountRef.current
        ) {
          onNewBuy?.();
        }
        prevCountRef.current = data.transfers.length;
      }
    } catch (err) {
      console.error("Failed to fetch transfers:", err);
    }
  }, [onNewBuy]);

  const fetchTokenInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/snowtrace?action=info");
      const data = await res.json();
      if (data.supply) {
        setTotalSupply(data.supply);
      }
    } catch (err) {
      console.error("Failed to fetch token info:", err);
    }
  }, []);

  const fetchHolderCount = useCallback(async () => {
    try {
      const res = await fetch("/api/snowtrace?action=holdercount");
      const data = await res.json();
      if (data.holderCount && data.holderCount > 0) {
        setHoldersCount(data.holderCount);
      }
    } catch (err) {
      console.error("Failed to fetch holder count:", err);
    }
  }, []);

  // ===== INIT =====
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchArenaLive(),
        fetchOnChainHolders(),
        fetchTransfers(),
        fetchTokenInfo(),
        fetchHolderCount(),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchArenaLive, fetchOnChainHolders, fetchTransfers, fetchTokenInfo, fetchHolderCount]);

  // ===== AUTO-REFRESH =====
  useEffect(() => {
    const interval = setInterval(() => {
      fetchArenaLive();
      fetchOnChainHolders();
      fetchTransfers();
    }, 20000); // 20s for more live feel
    return () => clearInterval(interval);
  }, [fetchArenaLive, fetchOnChainHolders, fetchTransfers]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTokenInfo();
      fetchHolderCount();
    }, 120000);
    return () => clearInterval(interval);
  }, [fetchTokenInfo, fetchHolderCount]);

  // Token holders display (from Snowtrace on-chain data)
  const displayHolders = onChainHolders.slice(0, 10);
  const displayHoldersCount = holdersCount || onChainHolders.length;

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
            <p className="text-gray-500 mt-3 text-sm sm:text-base">
              {arenaConnected
                ? `$DOOMHOUND is LIVE on The Arena — Real-time data from Arena + On-chain`
                : "$DOOMHOUND is LIVE on Avalanche — On-chain data auto-refreshes every 20s"}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-6 md:gap-10">
          {/* Left Column */}
          <div className="space-y-5 sm:space-y-6">
            {/* DEX Screener Quick Stats (no more broken iframe!) */}
            <ScrollReveal delay={0.05}>
              <DexScreenerQuickStats />
            </ScrollReveal>

            {/* Arena Community Stats (LIVE from Arena API) */}
            <ScrollReveal delay={0.1}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                <div className="flex justify-between items-center mb-4 sm:mb-5">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500">
                    {arenaConnected ? "Arena Community Stats" : "On-Chain Stats"}
                  </h3>
                  <span className="text-[10px] sm:text-xs uppercase text-green-400 bg-green-900/20 px-2 py-0.5 rounded animate-pulse">
                    ● LIVE
                  </span>
                </div>
                <div className="space-y-3">
                  {/* Token Price — HERO stat */}
                  {arenaConnected && arenaStats && (
                    <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-lg px-4 py-4 border border-red-900/40">
                      <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Token Price</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-orange-400 text-2xl sm:text-3xl font-bold font-mono">
                          {formatAvax(arenaStats.price)}
                        </span>
                        <span className="text-orange-300 text-sm font-bold">AVAX</span>
                      </div>
                      <span className="text-green-400 text-sm font-mono">
                        ≈ ${(arenaStats.price * avaxUsd).toFixed(6)} USD
                      </span>
                    </div>
                  )}
                  {/* Market Cap */}
                  {arenaConnected && arenaStats && (
                    <div className="flex justify-between items-center bg-[#0a0a0a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                      <span className="text-gray-400 text-sm">Market Cap</span>
                      <div className="text-right">
                        <span className="text-white text-sm font-bold font-mono block">
                          {formatAvax(arenaStats.marketCap)} AVAX
                        </span>
                        <span className="text-green-400 text-xs font-mono">
                          ≈ ${(arenaStats.marketCap * avaxUsd).toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Liquidity */}
                  {arenaConnected && arenaStats && arenaStats.liquidityAvax > 0 && (
                    <div className="flex justify-between items-center bg-[#0a0a0a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                      <span className="text-gray-400 text-sm">Liquidity</span>
                      <div className="text-right">
                        <span className="text-green-400 text-sm font-bold font-mono block">
                          {formatAvax(arenaStats.liquidityAvax)} AVAX
                        </span>
                        <span className="text-green-400/70 text-xs font-mono">
                          ≈ ${(arenaStats.liquidityAvax * avaxUsd).toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Buys / Sells */}
                  {arenaConnected && arenaStats && (
                    <div className="flex justify-between items-center bg-[#0a0a0a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                      <span className="text-gray-400 text-sm">Buys / Sells</span>
                      <span className="text-sm font-bold font-mono">
                        <span className="text-green-400">{arenaStats.buys}</span>
                        <span className="text-gray-600 mx-1">/</span>
                        <span className="text-red-400">{arenaStats.sells}</span>
                      </span>
                    </div>
                  )}
                  {/* Total Supply */}
                  {arenaConnected && arenaStats && arenaStats.totalSupply > 0 && (
                    <div className="flex justify-between items-center bg-[#0a0a0a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                      <span className="text-gray-400 text-sm">Total Supply</span>
                      <span className="text-white text-sm font-bold font-mono">
                        {formatNumber(arenaStats.totalSupply)} DOOMHOUND
                      </span>
                    </div>
                  )}
                  {/* Token Holders — from Snowtrace on-chain data */}
                  <div className="flex justify-between items-center bg-[#0a0a0a] rounded-lg px-4 py-3 border border-red-900/30">
                    <span className="text-gray-400 text-sm">Token Holders</span>
                    <span className="text-red-400 text-lg sm:text-xl font-bold font-mono">
                      {displayHoldersCount}
                    </span>
                  </div>
                  {/* Community Followers */}
                  {arenaConnected && community && (
                    <div className="flex justify-between items-center bg-[#0a0a0a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                      <span className="text-gray-400 text-sm">Arena Followers</span>
                      <span className="text-white text-sm font-bold font-mono">
                        {formatNumber(community.followerCount || 0)}
                      </span>
                    </div>
                  )}
                  {/* Network */}
                  <div className="flex justify-between items-center bg-[#0a0a0a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                    <span className="text-gray-400 text-sm">Network</span>
                    <span className="text-white text-sm font-bold">Avalanche C-Chain</span>
                  </div>
                  {/* Contract */}
                  <div className="flex justify-between items-center bg-[#0a0a0a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                    <span className="text-gray-400 text-sm">Contract</span>
                    <a
                      href={`https://snowtrace.io/token/${DOOMHOUND_CONTRACT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 text-xs font-mono hover:text-red-300 transition-colors"
                    >
                      {shortenAddress(DOOMHOUND_CONTRACT)} ↗
                    </a>
                  </div>
                  <a
                    href={ARENA_COMMUNITY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-creepster text-lg py-3 rounded-lg transition-colors mt-2"
                  >
                    BUY $DOOMHOUND 🔥
                  </a>
                </div>
              </div>
            </ScrollReveal>

            {/* Top $DOOMHOUND Token Holders (from Snowtrace on-chain) */}
            {displayHolders.length > 0 && (
              <ScrollReveal delay={0.2}>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500">
                      Top $DOOMHOUND Holders
                    </h3>
                    <span className="text-[10px] sm:text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded">
                      On-Chain
                    </span>
                  </div>
                  <div className="space-y-2">
                    {displayHolders.map((holder, i) => (
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
                          className="text-gray-300 text-xs sm:text-sm font-mono hover:text-red-300 transition-colors"
                        >
                          {shortenAddress(holder.address)}
                        </a>
                        <span className="text-red-400 ml-auto text-xs sm:text-sm font-mono whitespace-nowrap">
                          {formatTokenAmount(holder.balance)} DOOMHOUND
                        </span>
                        {totalSupply && (
                          <span className="text-gray-600 text-[10px] sm:text-xs font-mono whitespace-nowrap">
                            {holderPercentage(holder.balance, totalSupply)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <a
                    href={`https://snowtrace.io/token/${DOOMHOUND_CONTRACT}#tokenHolders`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center text-red-400 text-xs mt-3 hover:text-red-300 transition-colors"
                  >
                    View all holders on Snowtrace →
                  </a>
                </div>
              </ScrollReveal>
            )}
          </div>

          {/* Right Column — Recent Transfers */}
          <div className="space-y-5 sm:space-y-6">
            <ScrollReveal delay={0.15}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500">
                    Recent Transfers
                  </h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="max-h-[400px] sm:max-h-[480px] md:max-h-[550px] overflow-y-auto space-y-2 no-scrollbar">
                  {loading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">Loading on-chain transfers...</p>
                    </div>
                  ) : transfers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">No recent transfers found</p>
                    </div>
                  ) : (
                    transfers.map((tx) => (
                      <div
                        key={tx.hash}
                        className="bg-[#0a0a0a] rounded-lg px-3 sm:px-4 py-3 border border-[#2a2a2a] hover:border-red-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <a
                            href={`https://snowtrace.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 text-[10px] sm:text-xs font-mono hover:text-red-300 transition-colors truncate"
                          >
                            {shortenAddress(tx.hash)}
                          </a>
                          <span className="text-gray-600 text-[10px] sm:text-xs ml-auto whitespace-nowrap">
                            {timeAgo(tx.timeStamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                          <span className="text-gray-500">From</span>
                          <a
                            href={`https://snowtrace.io/address/${tx.from}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 font-mono hover:text-red-300 transition-colors"
                          >
                            {shortenAddress(tx.from)}
                          </a>
                          <span className="text-red-500 mx-1">→</span>
                          <span className="text-gray-500">To</span>
                          <a
                            href={`https://snowtrace.io/address/${tx.to}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 font-mono hover:text-red-300 transition-colors"
                          >
                            {shortenAddress(tx.to)}
                          </a>
                        </div>
                        <p className="text-orange-400 text-[10px] sm:text-xs font-mono mt-1">
                          {formatBalance(tx.value, tx.decimals)} DOOMHOUND
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ScrollReveal>

            {/* Footer */}
            <ScrollReveal delay={0.25}>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 text-center">
                <p className="text-gray-500 text-xs sm:text-sm">
                  {arenaConnected ? (
                    <>
                      Live data from{" "}
                      <a
                        href="https://arena.social"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        The Arena
                      </a>
                      {" "}&middot; Token holders &amp; transfers by{" "}
                      <a
                        href="https://snowtrace.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Snowtrace
                      </a>
                      {" "}&middot; Chart by{" "}
                      <a
                        href="https://dexscreener.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        DexScreener
                      </a>
                      {" "}&middot; Auto-refresh 20s
                    </>
                  ) : (
                    <>
                      On-chain data from{" "}
                      <a
                        href="https://snowtrace.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Snowtrace
                      </a>
                      {" "}&middot; Chart by{" "}
                      <a
                        href="https://dexscreener.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        DexScreener
                      </a>
                      {" "}&middot; Auto-refresh 20s
                    </>
                  )}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
