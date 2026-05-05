"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FloatingBuy() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past the hero (roughly 100vh)
      const heroHeight = window.innerHeight;
      setVisible(window.scrollY > heroHeight * 0.8);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
              href="https://arena.social/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-breathing-glow transition-colors"
            >
              🔥 BUY $DOOM
            </a>
          </motion.div>

          {/* Desktop: Floating pill button bottom-right */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="fixed bottom-6 right-6 z-40 hidden sm:block"
          >
            <a
              href="https://arena.social/home"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm md:text-base rounded-full shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_35px_rgba(220,38,38,0.7)] animate-breathing-glow transition-all duration-300 hover:scale-105"
            >
              <span className="text-base md:text-lg group-hover:animate-bounce">🔥</span>
              <span>BUY $DOOM</span>
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
