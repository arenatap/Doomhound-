"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { HeroSection } from "@/components/doom/hero-section";
import { LiveTicker } from "@/components/doom/live-ticker";
import { BondingCurveSection } from "@/components/doom/bonding-curve-section";
import { MilestoneSection } from "@/components/doom/milestone-section";
import { BurnArenaSection } from "@/components/doom/burn-arena-section";
import { DoomCalculatorSection } from "@/components/doom/doom-calculator-section";
import { CountdownTimer } from "@/components/doom/countdown-timer";
import { LoreSection } from "@/components/doom/lore-section";
import { TokenomicsSection } from "@/components/doom/tokenomics-section";
import { LiveDataSection } from "@/components/doom/live-data-section";
import { ChartSection } from "@/components/doom/chart-section";
import { RoadmapSection } from "@/components/doom/roadmap-section";
import { CommunitySection } from "@/components/doom/community-section";
import { Footer } from "@/components/doom/footer";

export default function HomePage() {
  return (
    <DoomShell>
      <HeroSection />
      <LiveTicker />
      <BondingCurveSection />
      <MilestoneSection />
      <BurnArenaSection />
      <DoomCalculatorSection />
      <CountdownTimer />
      <LoreSection />
      <TokenomicsSection />
      <LiveDataSection onNewBuy={() => {}} />
      <ChartSection />
      <RoadmapSection />
      <CommunitySection />
      {/* Bottom padding for mobile floating buy bar */}
      <div className="h-16 sm:hidden" />
      <Footer />
    </DoomShell>
  );
}
