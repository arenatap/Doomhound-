"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { DoomShell } from "@/components/doom/doom-shell";

// ===== EMBER PARTICLES =====
function EmberParticles() {
  const [embers, setEmbers] = useState<
    { id: number; x: number; delay: number; duration: number; size: number }[]
  >([]);

  useEffect(() => {
    const generated = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 2 + Math.random() * 4,
    }));
    setEmbers(generated);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {embers.map((e) => (
        <motion.div
          key={e.id}
          className="absolute rounded-full"
          style={{
            left: `${e.x}%`,
            bottom: "-10px",
            width: e.size,
            height: e.size,
            background: `radial-gradient(circle, #ff4400, #ff6600)`,
            boxShadow: `0 0 ${e.size * 2}px #ff4400`,
          }}
          animate={{
            y: [0, -800],
            opacity: [0, 1, 0.8, 0],
            scale: [0.5, 1, 0.8],
          }}
          transition={{
            duration: e.duration,
            delay: e.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ===== GLOW RING =====
function GlowRing() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    >
      <div className="w-[400px] h-[400px] md:w-[500px] md:h-[500px] rounded-full border border-red-600/10" />
    </motion.div>
  );
}

// ===== NFT CARD PREVIEW =====
function NFTCardPreview() {
  return (
    <motion.div
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      whileHover={{ scale: 1.05, y: -8 }}
    >
      {/* Outer glow */}
      <div className="absolute -inset-4 bg-gradient-to-b from-red-600/20 via-orange-500/10 to-transparent rounded-2xl blur-xl group-hover:from-red-600/30 transition-all duration-500" />

      {/* Card */}
      <div className="relative w-64 md:w-72 aspect-[3/4] rounded-xl overflow-hidden border-2 border-red-600/30 group-hover:border-red-500/60 transition-all duration-500 shadow-[0_0_40px_rgba(220,38,38,0.2)] group-hover:shadow-[0_0_60px_rgba(220,38,38,0.4)]">
        <img
          src="/images/hound-nft-preview.png"
          alt="HOUND #1"
          className="w-full h-full object-cover"
        />

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
          <div className="text-center">
            <p className="font-creepster text-2xl text-red-400 tracking-wider">
              HOUND
            </p>
            <p className="text-xs text-gray-400 mt-1 tracking-[0.3em]">
              001 / 666
            </p>
          </div>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </motion.div>
  );
}

// ===== COUNTDOWN (placeholder until reveal) =====
function MysteryCountdown() {
  return (
    <motion.div
      className="text-center space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <div className="flex items-center justify-center gap-3">
        {["?", "?", "?", "?"].map((char, i) => (
          <motion.div
            key={i}
            className="w-14 h-16 md:w-16 md:h-20 bg-[#1a1a1a] border border-red-600/30 rounded-lg flex items-center justify-center"
            animate={{
              borderColor: [
                "rgba(220,38,38,0.3)",
                "rgba(220,38,38,0.6)",
                "rgba(220,38,38,0.3)",
              ],
            }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <span className="font-creepster text-3xl md:text-4xl text-red-500">
              {char}
            </span>
          </motion.div>
        ))}
      </div>
      <p className="text-gray-600 text-xs uppercase tracking-[0.4em]">
        Days until reveal
      </p>
    </motion.div>
  );
}

// ===== RARITY TIERS =====
const RARITY_TIERS = [
  { name: "Common", count: 400, color: "from-gray-600 to-gray-500", border: "border-gray-600/40", emoji: "\u26AA" },
  { name: "Uncommon", count: 150, color: "from-green-700 to-green-500", border: "border-green-600/40", emoji: "\uD83D\uDFE2" },
  { name: "Rare", count: 75, color: "from-blue-700 to-blue-500", border: "border-blue-600/40", emoji: "\uD83D\uDD35" },
  { name: "Legendary", count: 30, color: "from-yellow-600 to-yellow-400", border: "border-yellow-500/40", emoji: "\uD83D\uDFE1" },
  { name: "Demonic", count: 11, color: "from-red-700 to-red-500", border: "border-red-600/40", emoji: "\uD83D\uDD34" },
];

// ===== MAIN NFT PAGE =====
export default function NFTPage() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <DoomShell>
      <div className="relative min-h-screen">
        {/* Ember particles */}
        <EmberParticles />

        {/* ===== HERO SECTION ===== */}
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 flex flex-col items-center justify-center px-4">
          <GlowRing />

          {/* Title */}
          <motion.div
            className="text-center mb-10 md:mb-14 relative z-10"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.p
              className="text-red-600 text-xs md:text-sm uppercase tracking-[0.5em] mb-3"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              From the underworld
            </motion.p>
            <h1 className="font-creepster text-5xl md:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-500 to-red-800 tracking-wider">
              HOUNDS OF
            </h1>
            <h1 className="font-creepster text-6xl md:text-8xl lg:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-red-500 to-red-900 tracking-wider -mt-2 md:-mt-3">
              THE HELL
            </h1>
            <motion.div
              className="mt-4 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto w-48 md:w-72"
              animate={{ scaleX: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>

          {/* NFT Card Preview */}
          <div className="relative z-10 mb-10 md:mb-14">
            <NFTCardPreview />
          </div>

          {/* Coming Soon Badge */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-600/10 border border-red-600/30 rounded-full">
              <motion.span
                className="w-2 h-2 bg-red-500 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-red-400 font-bold uppercase tracking-[0.3em] text-sm md:text-base">
                Coming Soon
              </span>
              <motion.span
                className="w-2 h-2 bg-red-500 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
              />
            </div>
          </motion.div>

          {/* Mystery Countdown */}
          <div className="relative z-10 mt-10">
            <MysteryCountdown />
          </div>
        </section>

        {/* ===== COLLECTION INFO ===== */}
        <AnimatePresence>
          {showContent && (
            <motion.section
              className="relative z-10 max-w-4xl mx-auto px-4 pb-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 md:gap-6 mb-16">
                {[
                  { value: "666", label: "Total Supply", icon: "\uD83D\uDC15" },
                  { value: "5", label: "Rarity Tiers", icon: "\uD83D\uDC8E" },
                  { value: "1", label: "Blockchain", icon: "\u26A1" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="text-center p-4 md:p-6 bg-[#111] border border-[#2a2a2a] rounded-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + i * 0.15 }}
                  >
                    <p className="text-2xl mb-1">{stat.icon}</p>
                    <p className="font-creepster text-2xl md:text-3xl text-red-400">
                      {stat.value}
                    </p>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mt-1">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Rarity Tiers */}
              <div className="mb-16">
                <h2 className="font-creepster text-2xl md:text-3xl text-center text-red-400 mb-8 tracking-wider">
                  Rarity Tiers
                </h2>
                <div className="space-y-3">
                  {RARITY_TIERS.map((tier, i) => (
                    <motion.div
                      key={tier.name}
                      className={`flex items-center justify-between p-3 md:p-4 bg-gradient-to-r ${tier.color} bg-opacity-10 border ${tier.border} rounded-lg`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.5 + i * 0.1 }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{tier.emoji}</span>
                        <span className="font-bold text-sm md:text-base uppercase tracking-wider">
                          {tier.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm text-white/60">
                          {tier.count} minted
                        </span>
                        <div className="w-20 md:w-32 h-1.5 bg-black/40 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${tier.color} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(tier.count / 666) * 100}%` }}
                            transition={{ delay: 2 + i * 0.15, duration: 0.8 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Holder Benefits */}
              <div className="mb-16">
                <h2 className="font-creepster text-2xl md:text-3xl text-center text-red-400 mb-8 tracking-wider">
                  Holder Perks
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: "\uD83C\uDFAF",
                      title: "Priority Mint",
                      desc: "$DOOMHOUND holders get first access to mint",
                    },
                    {
                      icon: "\uD83D\uDD25",
                      title: "Discounted Price",
                      desc: "Hold 1M+ tokens for reduced mint cost",
                    },
                    {
                      icon: "\uD83C\uDFC6",
                      title: "Exclusive Airdrops",
                      desc: "NFT holders receive future rewards",
                    },
                    {
                      icon: "\uD83D\uDC51",
                      title: "Alpha Access",
                      desc: "VIP channel for NFT holders only",
                    },
                  ].map((perk, i) => (
                    <motion.div
                      key={perk.title}
                      className="p-4 md:p-5 bg-[#111] border border-[#2a2a2a] rounded-xl hover:border-red-600/30 transition-all group"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2.2 + i * 0.1 }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{perk.icon}</span>
                        <div>
                          <p className="font-bold text-sm uppercase tracking-wider group-hover:text-red-400 transition-colors">
                            {perk.title}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            {perk.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Blockchain badge */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.8 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#2a2a2a] rounded-full">
                  <img
                    src="https://img.uxwing.com/wp-content/themes/uxwing/download/finance-ecommerce/cryptocurrency-icon.png"
                    alt="AVAX"
                    className="w-4 h-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-gray-500 text-xs uppercase tracking-wider">
                    Powered by Avalanche
                  </span>
                </div>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ===== BOTTOM GRADIENT ===== */}
        <div className="h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      </div>
    </DoomShell>
  );
}
