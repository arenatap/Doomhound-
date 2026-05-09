"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { HeroSection } from "@/components/doom/hero-section";
import { LiveTicker } from "@/components/doom/live-ticker";
import { LoreSection } from "@/components/doom/lore-section";
import { TokenomicsSection } from "@/components/doom/tokenomics-section";
import { RoadmapSection } from "@/components/doom/roadmap-section";
import { CommunitySection } from "@/components/doom/community-section";
import { Footer } from "@/components/doom/footer";

export default function HomePage() {
  return (
    <DoomShell>
      <HeroSection />
      <LiveTicker />
      <LoreSection />
      <TokenomicsSection />
      <RoadmapSection />
      <CommunitySection />
      {/* Bottom padding for mobile floating buy bar */}
      <div className="h-16 sm:hidden" />
      <Footer />
    </DoomShell>
  );
}
