"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ARENA_TOKEN_URL = "https://arena.social/community/0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb?ref=Toff083249361";

interface ArenaStats {
  price: number;
  marketCap: number;
  buys: number;
  sells: number;
}

function formatAvax(val: number): string {
  if (val <= 0) return "0";
  if (val < 0.0001) return "<0.0001";
  if (val < 1) return val.toFixed(4);
  if (val < 100) return val.toFixed(2);
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function FloatingBuy() {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<ArenaStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=live");
      const data = await res.json();
      if (data.connected && data.stats) {
        setStats(data.stats);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      setVisible(window.scrollY > heroHeight * 0.8);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 20000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Mobile: Full width sticky bar at bottom */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:hidden"
          >
            <a
              href={ARENA_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-breathing-glow transition-colors"
            >
              🔥 BUY $DOOM {stats ? `· ${formatAvax(stats.price)} AVAX` : ""}
            </a>
          </motion.div>

          {/* Desktop: Floating pill button bottom-right with live price */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="fixed bottom-6 right-6 z-40 hidden sm:block"
          >
            <a
              href={ARENA_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm md:text-base rounded-full shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_35px_rgba(220,38,38,0.7)] animate-breathing-glow transition-all duration-300 hover:scale-105"
            >
              <span className="text-base md:text-lg group-hover:animate-bounce">🔥</span>
              <span>BUY $DOOM</span>
              {stats && (
                <span className="text-red-200 text-xs md:text-sm font-mono">
                  {formatAvax(stats.price)}
                </span>
              )}
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
