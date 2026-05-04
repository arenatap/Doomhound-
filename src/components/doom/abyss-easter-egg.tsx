"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AbyssEasterEgg() {
  const [showAbyss, setShowAbyss] = useState(false);
  const lastScrollTop = useState(0)[0];
  const scrollSpeedRef = useState(0)[0];

  useEffect(() => {
    let lastY = 0;
    let lastTime = Date.now();
    let timeout: NodeJS.Timeout;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const currentTime = Date.now();
      const timeDiff = currentTime - lastTime;
      const distance = Math.abs(currentY - lastY);
      const speed = distance / (timeDiff || 1);

      // Check if near the bottom of the page
      const isNearBottom =
        currentY + window.innerHeight >= document.body.scrollHeight - 100;

      // Check if scrolling very fast and near bottom
      if (speed > 3 && isNearBottom) {
        setShowAbyss(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => setShowAbyss(false), 3000);
      }

      lastY = currentY;
      lastTime = currentTime;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [lastScrollTop, scrollSpeedRef]);

  return (
    <AnimatePresence>
      {showAbyss && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-red-950/30 to-transparent" />
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="font-creepster text-4xl md:text-6xl text-red-500 animate-glow-red relative z-10"
          >
            You&apos;re entering the abyss...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
