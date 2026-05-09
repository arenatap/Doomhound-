"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { LiveDataSection } from "@/components/doom/live-data-section";
import { ChartSection } from "@/components/doom/chart-section";
import { BondingCurveSection } from "@/components/doom/bonding-curve-section";
import { MilestoneSection } from "@/components/doom/milestone-section";
import { Footer } from "@/components/doom/footer";

export default function StatsPage() {
  return (
    <DoomShell>
      <div className="pt-16">
        <BondingCurveSection />
        <MilestoneSection />
        <ChartSection />
        <LiveDataSection onNewBuy={() => {}} />
      </div>
      <Footer />
    </DoomShell>
  );
}
