"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ArenaStats {
  price: number;
  marketCap: number;
  buys: number;
  sells: number;
}

interface ToastItem {
  id: number;
  message: string;
  type: "buy" | "hype";
  timestamp: number;
}

const HYPE_MESSAGES = [
  "🔥 Someone just bought the dip!",
  "🐺 Pack is growing!",
  "💀 Micro cap gem — get in early!",
  "🔥 The hound is HUNGRY!",
  "🐺 New pack member spotted!",
  "💀 This is still micro cap — don't fade!",
  "🔥 Buy pressure increasing!",
  "🐺 The pack doesn't wait!",
  "💀 Early buyers eat best!",
  "🔥 FOMO is REAL — join the hounds!",
];

export function BuyToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const prevBuysRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);
  const lastHypeRef = useRef(0);

  const addToast = useCallback((message: string, type: "buy" | "hype") => {
    const id = ++toastIdRef.current;
    const toast: ToastItem = { id, message, type, timestamp: Date.now() };
    setToasts((prev) => [toast, ...prev].slice(0, 3));
    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/arena?action=live");
      const data = await res.json();

      if (data.connected && data.stats) {
        const currentBuys = data.stats.buys;

        if (prevBuysRef.current !== null && currentBuys > prevBuysRef.current) {
          const diff = currentBuys - prevBuysRef.current;
          addToast(
            `🐺 New buy! ${currentBuys} total buys on $DOOMHOUND${diff > 1 ? ` (+${diff} new)` : ""}`,
            "buy"
          );
        }

        prevBuysRef.current = currentBuys;

        // Random hype toast (roughly every 45-90 seconds)
        const now = Date.now();
        if (now - lastHypeRef.current > 45000 + Math.random() * 45000) {
          const msg = HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)];
          addToast(msg, "hype");
          lastHypeRef.current = now;
        }
      } else if (prevBuysRef.current === null) {
        // API not connected yet, still show occasional hype
        const now = Date.now();
        if (now - lastHypeRef.current > 60000 + Math.random() * 60000) {
          const msg = HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)];
          addToast(msg, "hype");
          lastHypeRef.current = now;
        }
      }
    } catch {
      // silent
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-xs sm:max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 300, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 300, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-xl backdrop-blur-sm ${
              toast.type === "buy"
                ? "bg-[#1a1a1a]/95 border-red-600/60 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                : "bg-[#1a1a1a]/95 border-orange-600/50 shadow-[0_0_12px_rgba(234,88,12,0.2)]"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {/* Pulsing live indicator */}
              <span className="relative flex h-2.5 w-2.5 mt-1 flex-shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    toast.type === "buy" ? "bg-green-400" : "bg-orange-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    toast.type === "buy" ? "bg-green-500" : "bg-orange-500"
                  }`}
                />
              </span>
              <p
                className={`text-xs sm:text-sm font-medium leading-snug ${
                  toast.type === "buy" ? "text-red-300" : "text-orange-300"
                }`}
              >
                {toast.message}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
