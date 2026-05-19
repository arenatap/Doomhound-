"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

// ===== CONFIG =====
const DEXSCREENER_PAIR = "0x6eee7befd37571e8da63fa80a7e967eeb98465d7eee9c37d66e9e124fca68a41";
const DEXSCREENER_URL = `https://dexscreener.com/avalanche/${DEXSCREENER_PAIR}`;

// ===== TYPES =====
interface DexPairData {
  connected: boolean;
  pair: {
    priceUsd: number;
    priceNative: number;
    priceChange: {
      m5?: number;
      h1?: number;
      h6?: number;
      h24?: number;
    };
    volume: {
      h24?: number;
      h6?: number;
      h1?: number;
      m5?: number;
    };
    liquidity: {
      usd?: number;
      base?: number;
      quote?: number;
    };
    marketCap: number;
    fdv: number;
    txns: {
      m5?: { buys: number; sells: number };
      h1?: { buys: number; sells: number };
      h6?: { buys: number; sells: number };
      h24?: { buys: number; sells: number };
    };
    baseToken: { name: string; symbol: string };
    quoteToken: { name: string; symbol: string };
    pairCreatedAt: number | null;
  } | null;
  fetchedAt: string;
}

interface ChartSnapshot {
  t: string;
  priceUsd: number;
  priceNative: number;
  volumeH24: number;
  liquidityUsd: number;
  marketCap: number;
  priceChangeH1: number;
  priceChangeH24: number;
}

interface ChartData {
  snapshots: ChartSnapshot[];
  current: {
    priceUsd: number;
    priceNative: number;
    priceChange: Record<string, number>;
    volume: Record<string, number>;
    liquidity: { usd?: number; base?: number; quote?: number };
    marketCap: number;
    txns: Record<string, { buys: number; sells: number }>;
  } | null;
  hours: number;
  totalSnapshots: number;
}

// ===== HELPERS =====
function formatPrice(price: number): string {
  if (price <= 0) return "$0";
  if (price < 0.000001) return `$${price.toFixed(9)}`;
  if (price < 0.0001) return `$${price.toFixed(7)}`;
  if (price < 0.01) return `$${price.toFixed(5)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 100) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatUsd(val: number): string {
  if (val <= 0) return "$0";
  if (val < 1) return `$${val.toFixed(2)}`;
  if (val < 10000) return `$${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (val < 1000000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${(val / 1000000).toFixed(2)}M`;
}

function formatPercent(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ===== SVG LINE CHART =====
function PriceLineChart({ snapshots, currentPrice, height = 280 }: {
  snapshots: ChartSnapshot[];
  currentPrice: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (snapshots.length < 2) return null;

    const prices = snapshots.map(s => s.priceUsd);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const priceRange = maxPrice - minPrice || maxPrice * 0.1 || 0.000001;

    const width = 800;
    const padding = { top: 20, right: 20, bottom: 30, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const points = snapshots.map((s, i) => {
      const x = padding.left + (i / (snapshots.length - 1)) * chartW;
      const y = padding.top + chartH - ((s.priceUsd - minPrice) / priceRange) * chartH;
      return { x, y, price: s.priceUsd, time: s.t };
    });

    // Build path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth curve using quadratic bezier
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Area fill path
    const lastPoint = points[points.length - 1];
    const areaD = `${pathD} L ${lastPoint.x} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

    // Determine color based on price trend
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isUp = lastPrice >= firstPrice;
    const lineColor = isUp ? "#22c55e" : "#ef4444";
    const gradientFrom = isUp ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
    const gradientTo = "rgba(0,0,0,0)";

    // Grid lines
    const gridLines = 5;
    const gridYs = Array.from({ length: gridLines }, (_, i) => {
      const y = padding.top + (i / (gridLines - 1)) * chartH;
      const price = maxPrice - (i / (gridLines - 1)) * priceRange;
      return { y, price };
    });

    return { pathD, areaD, points, lineColor, gradientFrom, gradientTo, gridYs, minPrice, maxPrice, isUp };
  }, [snapshots, height]);

  // No data yet — show loading state with animated placeholder
  if (!chartData) {
    return (
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <svg viewBox={`0 0 800 ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradPlaceholder" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="0" y1={i * (height / 4)} x2="800" y2={i * (height / 4)} stroke="#1a1a1a" strokeWidth="1" />
          ))}
          {/* Animated pulse line */}
          <motion.path
            d={`M 0 ${height * 0.6} Q 200 ${height * 0.3} 400 ${height * 0.5} T 800 ${height * 0.4}`}
            fill="none"
            stroke="#dc2626"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ pathLength: 1, opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-xs sm:text-sm animate-pulse">
              {snapshots.length === 0 ? "Collecting price data..." : "Building chart..."}
            </p>
            <p className="text-gray-600 text-[10px] mt-1">
              Chart updates as price data accumulates
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hovered = hoveredIndex !== null ? chartData.points[hoveredIndex] : null;

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 800 ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={chartData.gradientFrom} />
            <stop offset="100%" stopColor={chartData.gradientTo} />
          </linearGradient>
          <filter id="chartGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {chartData.gridYs.map((g, i) => (
          <g key={i}>
            <line x1="0" y1={g.y} x2="800" y2={g.y} stroke="#1a1a1a" strokeWidth="0.5" />
          </g>
        ))}

        {/* Area fill */}
        <motion.path
          d={chartData.areaD}
          fill="url(#chartAreaGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Price line */}
        <motion.path
          d={chartData.pathD}
          fill="none"
          stroke={chartData.lineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#chartGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Hover crosshair */}
        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1="0"
              x2={hovered.x}
              y2={height}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r="5"
              fill={chartData.lineColor}
              stroke="white"
              strokeWidth="2"
            />
          </>
        )}

        {/* End dot (current price) */}
        <motion.circle
          cx={chartData.points[chartData.points.length - 1].x}
          cy={chartData.points[chartData.points.length - 1].y}
          r="4"
          fill={chartData.lineColor}
          animate={{ r: [4, 6, 4], opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute top-2 left-2 bg-black/90 border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs pointer-events-none z-10"
          style={{
            left: `${(hovered.x / 800) * 100}%`,
            transform: hovered.x > 400 ? "translateX(-110%)" : "translateX(10%)",
          }}
        >
          <p className="text-white font-mono font-bold">{formatPrice(hovered.price)}</p>
          <p className="text-gray-500 text-[10px]">{timeAgo(hovered.time)}</p>
        </div>
      )}

      {/* Invisible hover areas for mouse tracking */}
      <div className="absolute inset-0" style={{ cursor: "crosshair" }}>
        {chartData.points.map((p, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{
              left: `${(p.x / 800) * 100}%`,
              width: `${100 / chartData.points.length}%`,
            }}
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ===== TIME RANGE SELECTOR =====
function TimeRangeSelector({ selected, onChange }: {
  selected: string;
  onChange: (range: string) => void;
}) {
  const ranges = [
    { key: "1", label: "1H" },
    { key: "6", label: "6H" },
    { key: "24", label: "24H" },
    { key: "168", label: "7D" },
  ];

  return (
    <div className="flex gap-1">
      {ranges.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`px-2 py-1 text-[10px] sm:text-xs font-mono rounded transition-all ${
            selected === r.key
              ? "bg-red-600/30 text-red-400 border border-red-600/50"
              : "text-gray-600 hover:text-gray-400 border border-transparent"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ===== MAIN CHART SECTION COMPONENT =====
export function PriceChartSection() {
  const [liveData, setLiveData] = useState<DexPairData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [timeRange, setTimeRange] = useState("24");
  const [loading, setLoading] = useState(true);

  // Fetch live DEX Screener data
  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch("/api/dexscreener?action=live");
      const data = await res.json();
      setLiveData(data);
    } catch (err) {
      console.error("Failed to fetch DEX data:", err);
    }
  }, []);

  // Fetch chart history
  const fetchChart = useCallback(async () => {
    try {
      const res = await fetch(`/api/dexscreener?action=chart&hours=${timeRange}`);
      const data = await res.json();
      setChartData(data);
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
    }
  }, [timeRange]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLive(), fetchChart()]);
      setLoading(false);
    };
    init();
  }, [fetchLive, fetchChart]);

  // Auto-refresh live data every 20s
  useEffect(() => {
    const interval = setInterval(fetchLive, 20_000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // Refresh chart when time range changes
  useEffect(() => {
    fetchChart();
    const interval = setInterval(fetchChart, 60_000); // Refresh chart every 60s
    return () => clearInterval(interval);
  }, [fetchChart]);

  const pair = liveData?.pair;
  const isUp1h = (pair?.priceChange?.h1 ?? 0) >= 0;
  const isUp24h = (pair?.priceChange?.h24 ?? 0) >= 0;

  return (
    <section id="chart" className="relative py-16 sm:py-20 md:py-28 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-3 sm:mb-5">
            PRICE CHART
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-xl mx-auto">
            Live $DOOMHOUND/ARENA price action on Uniswap V4 — Avalanche.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
            {/* Chart Header with live price */}
            <div className="px-4 sm:px-5 pt-4 pb-2 border-b border-[#2a2a2a]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-white text-xl sm:text-2xl font-bold font-mono">
                        {pair ? formatPrice(pair.priceUsd) : "Loading..."}
                      </span>
                      {pair && (
                        <>
                          <span className="text-orange-400 text-xs sm:text-sm font-mono">
                            {pair.priceNative.toFixed(6)} ARENA
                          </span>
                        </>
                      )}
                    </div>
                    {pair && (
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-xs font-mono font-bold ${isUp1h ? "text-green-400" : "text-red-400"}`}>
                          1h: {formatPercent(pair.priceChange.h1 ?? 0)}
                        </span>
                        <span className={`text-xs font-mono font-bold ${isUp24h ? "text-green-400" : "text-red-400"}`}>
                          24h: {formatPercent(pair.priceChange.h24 ?? 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
                  <a
                    href={DEXSCREENER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 text-[10px] sm:text-xs hover:text-red-300 transition-colors whitespace-nowrap"
                  >
                    DexScreener →
                  </a>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="px-1 sm:px-2 py-2">
              <PriceLineChart
                snapshots={chartData?.snapshots || []}
                currentPrice={pair?.priceUsd || 0}
                height={280}
              />
            </div>

            {/* Stats Bar */}
            {pair && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#2a2a2a] border-t border-[#2a2a2a]">
                <div className="bg-[#1a1a1a] px-3 sm:px-4 py-3">
                  <p className="text-gray-500 text-[10px] sm:text-xs uppercase">Market Cap</p>
                  <p className="text-white text-sm sm:text-base font-bold font-mono">{formatUsd(pair.marketCap || pair.fdv)}</p>
                </div>
                <div className="bg-[#1a1a1a] px-3 sm:px-4 py-3">
                  <p className="text-gray-500 text-[10px] sm:text-xs uppercase">Liquidity</p>
                  <p className="text-green-400 text-sm sm:text-base font-bold font-mono">{formatUsd(pair.liquidity?.usd || 0)}</p>
                </div>
                <div className="bg-[#1a1a1a] px-3 sm:px-4 py-3">
                  <p className="text-gray-500 text-[10px] sm:text-xs uppercase">Volume 24h</p>
                  <p className="text-orange-400 text-sm sm:text-base font-bold font-mono">{formatUsd(pair.volume?.h24 || 0)}</p>
                </div>
                <div className="bg-[#1a1a1a] px-3 sm:px-4 py-3">
                  <p className="text-gray-500 text-[10px] sm:text-xs uppercase">Txns 1h</p>
                  <p className="text-sm font-bold font-mono">
                    <span className="text-green-400">{pair.txns?.h1?.buys || 0}</span>
                    <span className="text-gray-600 mx-0.5">/</span>
                    <span className="text-red-400">{pair.txns?.h1?.sells || 0}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Data collection notice */}
            {(!chartData || chartData.totalSnapshots < 5) && (
              <div className="px-4 py-3 bg-[#0a0a0a] border-t border-[#2a2a2a] text-center">
                <p className="text-gray-500 text-[10px] sm:text-xs">
                  📊 Chart populates as price data is collected. {chartData ? `${chartData.totalSnapshots} data points recorded.` : "Starting data collection..."}
                  {" "}<a href={DEXSCREENER_URL} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">
                    View full chart on DexScreener
                  </a>
                </p>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
