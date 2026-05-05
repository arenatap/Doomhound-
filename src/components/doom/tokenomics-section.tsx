"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ScrollReveal } from "./scroll-reveal";

const data = [{ name: "Community", value: 100 }];
const COLORS = ["#dc2626"];

const stats = [
  { label: "Total Supply", value: "1B $DOOMHOUND" },
  { label: "Tax", value: "0/0" },
  { label: "LP", value: "Burned" },
  { label: "Contract", value: "Renounced" },
];

export function TokenomicsSection() {
  return (
    <section
      id="tokenomics"
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      {/* Flame border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red relative inline-block">
              TOKENOMICS
              <span className="absolute -bottom-2 left-0 right-0 h-4 bg-gradient-to-b from-red-600 to-transparent opacity-60 blur-[2px]" />
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Pie Chart */}
          <ScrollReveal delay={0.1}>
            <div className="flex flex-col items-center">
              <div className="w-52 h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={0}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#8b0000"
                    >
                      {data.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-red-400 font-creepster text-2xl sm:text-3xl mt-4">
                100% Community
              </p>
              <p className="text-gray-500 text-sm sm:text-base">
                No presale. No team alloc. No VC.
              </p>
            </div>
          </ScrollReveal>

          {/* Stats Grid */}
          <ScrollReveal delay={0.2}>
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="bg-[#1a1a1a] border border-red-900/30 rounded-xl p-5 sm:p-6 md:p-7 text-center animate-flame-border hover:border-red-600/50 transition-all duration-300"
                >
                  <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-wider mb-2">
                    {stat.label}
                  </p>
                  <p className="text-white font-bold text-base sm:text-lg md:text-xl">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-500 mt-6 sm:mt-8 text-sm sm:text-base italic">
              Fair launch. No BS. The Doomhound doesn&apos;t play favorites.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Flame border bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />
    </section>
  );
}
