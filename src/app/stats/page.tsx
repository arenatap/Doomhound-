"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { PriceChartSection } from "@/components/doom/price-chart";
import { BondingCurveSection } from "@/components/doom/bonding-curve-section";
import { MilestoneSection } from "@/components/doom/milestone-section";
import { LiveDataSection } from "@/components/doom/live-data-section";
import { Footer } from "@/components/doom/footer";

export default function StatsPage() {
  return (
    <DoomShell>
      <div className="pt-16">
        <BondingCurveSection />
        <MilestoneSection />
        <PriceChartSection />
        <LiveDataSection onNewBuy={() => {}} />
      </div>
      <Footer />
    </DoomShell>
  );
}
