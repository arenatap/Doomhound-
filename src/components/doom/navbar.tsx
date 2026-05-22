"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ===== NAV LINKS =====
const NAV_LINKS = [
  { href: "/", label: "Home", emoji: "🐺" },
  { href: "/stats", label: "Stats", emoji: "📊" },
  { href: "/burns", label: "Burns", emoji: "🔥" },
  { href: "/staking", label: "Staking", emoji: "💎" },
  { href: "/calculator", label: "ROI", emoji: "💰" },
  { href: "/pack", label: "Pack", emoji: "🏆" },
  { href: "/launchpad", label: "Launch", emoji: "🚀" },
  { href: "/dao", label: "DAO", emoji: "🐺" },
  { href: "/nft", label: "NFTs", emoji: "💀" },
  { href: "/memes", label: "Memes", emoji: "🎨" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Track scroll position for sticky style
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          scrolled
            ? "bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#2a2a2a] shadow-[0_0_20px_rgba(220,38,38,0.1)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between h-12 sm:h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
          >
            <img
              src="/images/doomhound-logo.png"
              alt="$DOOMHOUND"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-red-600/40 group-hover:border-red-500 transition-colors shadow-[0_0_8px_rgba(220,38,38,0.3)]"
            />
            <span className="font-creepster text-base sm:text-lg text-red-500 group-hover:text-red-400 transition-colors">
              $DOOMHOUND
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                  pathname === link.href
                    ? "text-red-400 bg-red-600/15"
                    : "text-gray-500 hover:text-red-400 hover:bg-[#1a1a1a]"
                }`}
              >
                <span className="mr-1">{link.emoji}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Buy button (desktop) */}
          <a
            href="https://arena.social/home"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.3)] hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all animate-breathing-glow"
          >
            🔥 BUY
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 -mr-2 text-gray-400 hover:text-red-400 transition-colors"
            aria-label="Toggle menu"
          >
            <div className="w-5 h-4 relative flex flex-col justify-between">
              <span
                className={`block h-0.5 bg-current transition-all duration-300 origin-center ${
                  mobileOpen ? "rotate-45 translate-y-[7px]" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-current transition-all duration-300 ${
                  mobileOpen ? "opacity-0 scale-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-current transition-all duration-300 origin-center ${
                  mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99] md:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Menu panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-[#0a0a0a] border-l border-[#2a2a2a] shadow-[-10px_0_30px_rgba(220,38,38,0.1)]"
            >
              {/* Mobile header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-[#2a2a2a]">
                <span className="font-creepster text-lg text-red-500">
                  🐺 NAVIGATE
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-gray-500 hover:text-red-400 text-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Mobile links */}
              <div className="py-3">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
                        pathname === link.href
                          ? "text-red-400 bg-red-600/10 border-l-2 border-red-500"
                          : "text-gray-400 hover:text-red-400 hover:bg-[#1a1a1a] border-l-2 border-transparent"
                      }`}
                    >
                      <span className="text-base">{link.emoji}</span>
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Mobile buy button */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#2a2a2a]">
                <a
                  href="https://arena.social/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all animate-breathing-glow"
                >
                  🔥 BUY $DOOMHOUND
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
