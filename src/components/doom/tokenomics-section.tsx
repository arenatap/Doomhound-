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
      className="relative py-16 sm:py-20 md:py-32 bg-[#0a0a0a] overflow-hidden"
    >
      {/* Flame border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-flame" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-8">
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-creepster text-4xl sm:text-5xl md:text-7xl text-red-500 animate-glow-red relative inline-block">
              TOKENOMICS
              <span className="absolute -bottom-2 left-0 right-0 h-4 bg-gradient-to-b from-red-600 to-transparent opacity-60 blur-[2px]" />
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Pie Chart */}
          <ScrollReveal delay={0.1}>
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
              <p className="text-red-400 font-creepster text-xl sm:text-2xl mt-3">
                100% Community
              </p>
              <p className="text-gray-500 text-sm">
                No presale. No team alloc. No VC.
              </p>
            </div>
          </ScrollReveal>

          {/* Stats Grid */}
          <ScrollReveal delay={0.2}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="bg-[#1a1a1a] border border-red-900/30 rounded-xl p-4 sm:p-5 text-center animate-flame-border hover:border-red-600/50 transition-all duration-300"
                >
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 sm:mb-2">
                    {stat.label}
                  </p>
                  <p className="text-white font-bold text-sm sm:text-base">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-500 mt-5 sm:mt-6 text-sm italic">
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
