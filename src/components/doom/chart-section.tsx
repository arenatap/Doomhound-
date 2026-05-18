"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

// ===== CONFIG =====
const DOOMHOUND_CONTRACT = "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";
// DEX Screener pair address (DOOMHOUND/ARENA on Uniswap V4 Avalanche)
const DEXSCREENER_PAIR = "0x6eee7befd37571e8da63fa80a7e967eeb98465d7eee9c37d66e9e124fca68a41";

// ===== ANIMATED CHART PLACEHOLDER =====
function AnimatedChartPlaceholder() {
  // Generate a fake "going up" chart path
  const chartPoints = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const width = 600;
    const height = 200;
    let y = height * 0.7; // Start low
    for (let x = 0; x <= width; x += 6) {
      // General uptrend with some dips
      const trend = -0.15; // Upward
      const noise = (Math.sin(x * 0.05) * 15) + (Math.cos(x * 0.02) * 10) + (Math.random() * 8 - 4);
      y = Math.max(20, Math.min(height - 20, y + trend + noise * 0.3));
      points.push({ x, y });
    }
    return points;
  }, []);

  const pathD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    let d = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      d += ` L ${chartPoints[i].x} ${chartPoints[i].y}`;
    }
    return d;
  }, [chartPoints]);

  const areaD = useMemo(() => {
    if (!pathD) return "";
    const lastPoint = chartPoints[chartPoints.length - 1];
    return `${pathD} L ${lastPoint.x} 200 L 0 200 Z`;
  }, [pathD, chartPoints]);

  return (
    <div className="relative w-full aspect-[3/1] max-h-[280px] sm:max-h-[350px]">
      <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Grid lines */}
        {[0, 50, 100, 150, 200].map((y) => (
          <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#2a2a2a" strokeWidth="0.5" />
        ))}

        {/* Area fill */}
        <motion.path
          d={areaD}
          fill="url(#chartGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        />

        {/* Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="#dc2626"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
        />

        {/* Animated dot at end */}
        <motion.circle
          cx={chartPoints[chartPoints.length - 1]?.x || 600}
          cy={chartPoints[chartPoints.length - 1]?.y || 40}
          r="4"
          fill="#f97316"
          animate={{ r: [4, 6, 4], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </svg>

      {/* Overlay text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.p
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="font-creepster text-xl sm:text-2xl md:text-3xl text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]"
        >
          📈 Chart Goes Brrr After Launch
        </motion.p>
        <p className="text-gray-500 text-[10px] sm:text-xs mt-1">
          (This is a simulation. Imagine the real thing is way more fire 🔥)
        </p>
      </div>
    </div>
  );
}

export function ChartSection() {
  const isLaunched = DOOMHOUND_CONTRACT !== "";

  return (
    <section id="chart" className="relative py-16 sm:py-20 md:py-28 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-3 sm:mb-5">
            CHART
          </h2>
          <p className="text-center text-gray-400 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-xl mx-auto">
            {isLaunched
              ? "Live $DOOMHOUND/ARENA price action on Uniswap V4 — Avalanche."
              : "The chart will ignite when the Hound is unleashed."}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
            {isLaunched ? (
              // Post-launch: Embed DEXScreener
              <div className="w-full" style={{ minHeight: "400px" }}>
                <iframe
                  src={`https://dexscreener.com/avalanche/${DEXSCREENER_PAIR}?embed=1&theme=dark&trades=0`}
                  className="w-full border-0"
                  style={{ height: "500px" }}
                  title="$DOOMHOUND Chart"
                  allow="clipboard-write"
                />
              </div>
            ) : (
              // Pre-launch: Animated placeholder
              <div className="p-4 sm:p-6 md:p-8">
                <AnimatedChartPlaceholder />
                <div className="mt-4 sm:mt-6 text-center">
                  <p className="text-gray-500 text-xs sm:text-sm mb-3">
                    🐺 $DOOMHOUND hasn&apos;t launched yet. This could be YOUR chart.
                  </p>
                  <a
                    href="https://arena.social/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.3)] transition-all"
                  >
                    🔥 Get Ready on The Arena
                  </a>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
