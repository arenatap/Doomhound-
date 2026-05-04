"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface KonamiCodeProps {
  onActivate?: () => void;
}

const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export function KonamiCode({ onActivate }: KonamiCodeProps) {
  const [activated, setActivated] = useState(false);
  const [sequence, setSequence] = useState<string[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activated) {
        // Dismiss on any key
        setActivated(false);
        return;
      }

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const newSequence = [...sequence, key];

      // Check if current sequence matches the konami code prefix
      const matches = KONAMI_CODE.slice(0, newSequence.length).every(
        (code, i) => code.toLowerCase() === newSequence[i].toLowerCase()
      );

      if (!matches) {
        setSequence([]);
        return;
      }

      if (newSequence.length === KONAMI_CODE.length) {
        setActivated(true);
        setSequence([]);
        onActivate?.();
      } else {
        setSequence(newSequence);
      }
    },
    [sequence, activated, onActivate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {activated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
          onClick={() => setActivated(false)}
        >
          {/* Blood rain background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-blood-rain"
                style={{
                  left: `${Math.random() * 100}%`,
                  width: `${2 + Math.random() * 4}px`,
                  height: `${20 + Math.random() * 40}px`,
                  background: `linear-gradient(to bottom, transparent, ${
                    Math.random() > 0.5 ? "#dc2626" : "#8b0000"
                  })`,
                  borderRadius: "0 0 50% 50%",
                  animationDuration: `${1 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="text-center z-10 px-6"
          >
            <h2
              className="font-creepster text-4xl md:text-6xl text-red-500 animate-glow-red mb-6"
            >
              THE DOOMHOUND ACKNOWLEDGES YOU
            </h2>
            <p className="text-xl md:text-2xl text-red-300 mb-4">
              YOUR BAGS ARE BLESSED. 🔥🐕
            </p>
            <p className="text-sm text-gray-500 mt-8">
              Press any key to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
