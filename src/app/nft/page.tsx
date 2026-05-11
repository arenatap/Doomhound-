"use client";

import { motion } from "framer-motion";
import { DoomShell } from "@/components/doom/doom-shell";

export default function NFTPage() {
  return (
    <DoomShell>
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
        {/* Subtle ember glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Title */}
        <motion.div
          className="text-center relative z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="font-creepster text-6xl md:text-8xl lg:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-500 to-red-800 tracking-wider leading-tight">
            HOUNDS OF
          </h1>
          <h1 className="font-creepster text-7xl md:text-9xl lg:text-[10rem] text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-red-500 to-red-900 tracking-wider leading-none -mt-2 md:-mt-4">
            THE HELL
          </h1>

          {/* Divider */}
          <motion.div
            className="mt-6 md:mt-8 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto w-48 md:w-72"
            animate={{ scaleX: [0.8, 1, 0.8], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.div>

        {/* Coming Soon */}
        <motion.div
          className="mt-10 md:mt-14 relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex items-center gap-4 px-8 py-4 bg-red-600/10 border border-red-600/20 rounded-full">
            <motion.span
              className="w-2 h-2 bg-red-500 rounded-full"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="font-creepster text-2xl md:text-3xl text-red-400 tracking-[0.3em]">
              COMING SOON
            </span>
            <motion.span
              className="w-2 h-2 bg-red-500 rounded-full"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
            />
          </div>
        </motion.div>

        {/* 666 subtle */}
        <motion.p
          className="mt-8 text-gray-700 text-xs tracking-[0.5em] uppercase relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          666 unique hounds
        </motion.p>
      </div>
    </DoomShell>
  );
}
