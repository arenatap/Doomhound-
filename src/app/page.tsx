"use client";

import { useEffect, useCallback } from "react";
import { HeroSection } from "@/components/doom/hero-section";
import { LoreSection } from "@/components/doom/lore-section";
import { TokenomicsSection } from "@/components/doom/tokenomics-section";
import { LiveDataSection } from "@/components/doom/live-data-section";
import { HowToBuySection } from "@/components/doom/how-to-buy-section";
import { MemeWallSection } from "@/components/doom/meme-wall-section";
import { MemeGeneratorSection } from "@/components/doom/meme-generator-section";
import { CopyPastaSection } from "@/components/doom/copy-pasta-section";
import { RoadmapSection } from "@/components/doom/roadmap-section";
import { CommunitySection } from "@/components/doom/community-section";
import { ArenaProfileSection } from "@/components/doom/arena-profile-section";
import { Footer } from "@/components/doom/footer";
import { KonamiCode } from "@/components/doom/konami-code";
import { AbyssEasterEgg } from "@/components/doom/abyss-easter-egg";
import { SoundToggle } from "@/components/doom/sound-toggle";
import { useSoundEffects } from "@/components/doom/use-sound-effects";
import { useGlobalBloodSplash } from "@/components/doom/use-global-blood-splash";

export default function HomePage() {
  const { enabled, toggleSound, playBite, playPing, playEvilLaugh } =
    useSoundEffects();
  const { containerRef, handleClick } = useGlobalBloodSplash();

  useEffect(() => {
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [handleClick]);

  // Play bite sound on any button click
  useEffect(() => {
    const handleBtnClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a");
      if (isInteractive) {
        playBite();
      }
    };
    document.addEventListener("click", handleBtnClick);
    return () => document.removeEventListener("click", handleBtnClick);
  }, [playBite]);

  const handleNewBuy = useCallback(() => {
    playPing();
  }, [playPing]);

  const handleKonamiActivate = useCallback(() => {
    playEvilLaugh();
  }, [playEvilLaugh]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] relative overflow-x-hidden" ref={containerRef}>
      <HeroSection />
      <LoreSection />
      <TokenomicsSection />
      <LiveDataSection onNewBuy={handleNewBuy} />
      <HowToBuySection />
      <MemeWallSection />
      <MemeGeneratorSection />
      <CopyPastaSection />
      <RoadmapSection />
      <ArenaProfileSection />
      <CommunitySection />
      <Footer />

      {/* Global overlays */}
      <KonamiCode onActivate={handleKonamiActivate} />
      <AbyssEasterEgg />
      <SoundToggle enabled={enabled} onToggle={toggleSound} />
    </main>
  );
}
