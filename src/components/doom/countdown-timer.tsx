"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

// ===== CONFIG =====
// Launch: Midnight Rome (CEST) between May 5-6 = 22:00 UTC May 5
const LAUNCH_DATE = "2026-05-05T22:00:00Z";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeLeft(targetDate: string): TimeLeft | null {
  if (!targetDate) return null;
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const diff = target - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function DigitBox({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div className="relative">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-red-600/10 rounded-xl blur-md" />
        <div className="relative bg-[#1a1a1a] border-2 border-red-600/40 rounded-xl px-3 py-2 sm:px-5 sm:py-3 md:px-7 md:py-4 animate-breathing-glow min-w-[3rem] sm:min-w-[4.5rem] md:min-w-[5.5rem]">
          <span className="font-creepster text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-red-500 animate-glow-red block text-center leading-none">
            {display}
          </span>
        </div>
      </div>
      <span className="text-gray-500 text-[9px] sm:text-xs md:text-sm uppercase tracking-widest font-bold">
        {label}
      </span>
    </div>
  );
}

export function CountdownTimer() {
  const initialTimeLeft = LAUNCH_DATE ? getTimeLeft(LAUNCH_DATE) : null;
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(initialTimeLeft);
  const launched = timeLeft !== null && timeLeft.total <= 0;

  const tick = useCallback(() => {
    if (!LAUNCH_DATE) return;
    setTimeLeft(getTimeLeft(LAUNCH_DATE));
  }, []);

  useEffect(() => {
    if (!LAUNCH_DATE || launched) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick, launched]);

  // No launch date set — "Awaiting the Summoning"
  if (!timeLeft && !launched) {
    return (
      <section className="relative py-12 sm:py-16 md:py-20 bg-[#0a0a0a] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto px-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="mb-4 sm:mb-6"
            >
              <h2 className="font-creepster text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-red-500 animate-glow-red">
                AWAITING THE SUMMONING 🔥
              </h2>
            </motion.div>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-4">
              The Hound stirs in the abyss. The countdown begins when the portal opens.
            </p>
            <p className="text-orange-400 font-creepster text-lg sm:text-xl md:text-2xl animate-pulse">
              Launching on The Arena — arena.social
            </p>
          </div>
        </ScrollReveal>
      </section>
    );
  }

  // Launch complete!
  if (launched) {
    return (
      <section className="relative py-12 sm:py-16 md:py-20 bg-[#0a0a0a] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto px-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 1.2, bounce: 0.5 }}
            >
              <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red mb-3 sm:mb-5">
                THE HOUND IS UNLEASHED 🔥
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-orange-400 font-creepster text-xl sm:text-2xl md:text-3xl mb-4"
            >
              $DOOMHOUND is LIVE on The Arena!
            </motion.p>
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              href="https://arena.social/home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base md:text-lg rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all animate-breathing-glow"
            >
              🐺 BUY $DOOMHOUND NOW
            </motion.a>
          </div>
        </ScrollReveal>
      </section>
    );
  }

  // Active countdown
  return (
    <section className="relative py-12 sm:py-16 md:py-20 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />
      <ScrollReveal>
        <div className="text-center max-w-4xl mx-auto px-6">
          <h2 className="font-creepster text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-red-500 animate-glow-red mb-4 sm:mb-6">
            THE HOUND AWAKENS
          </h2>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-6 sm:mb-10">
            The gates of hell are opening. Prepare yourself.
          </p>

          <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <DigitBox value={timeLeft!.days} label="Days" />
            <span className="font-creepster text-3xl sm:text-5xl md:text-6xl text-red-600/60 mt-[-1.5rem] sm:mt-[-2rem]">:</span>
            <DigitBox value={timeLeft!.hours} label="Hours" />
            <span className="font-creepster text-3xl sm:text-5xl md:text-6xl text-red-600/60 mt-[-1.5rem] sm:mt-[-2rem]">:</span>
            <DigitBox value={timeLeft!.minutes} label="Min" />
            <span className="font-creepster text-3xl sm:text-5xl md:text-6xl text-red-600/60 mt-[-1.5rem] sm:mt-[-2rem]">:</span>
            <DigitBox value={timeLeft!.seconds} label="Sec" />
          </div>

          <p className="text-orange-400 font-creepster text-lg sm:text-xl md:text-2xl animate-pulse">
            Launching on The Arena — arena.social
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
