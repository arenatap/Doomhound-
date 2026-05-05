"use client";

import { useEffect, useCallback } from "react";
import { HeroSection } from "@/components/doom/hero-section";
import { LiveTicker } from "@/components/doom/live-ticker";
import { CountdownTimer } from "@/components/doom/countdown-timer";
import { LoreSection } from "@/components/doom/lore-section";
import { TokenomicsSection } from "@/components/doom/tokenomics-section";
import { LiveDataSection } from "@/components/doom/live-data-section";
import { ChartSection } from "@/components/doom/chart-section";
import { ArenaGameSection } from "@/components/doom/arena-game-section";
import { MemeWallSection } from "@/components/doom/meme-wall-section";
import { MemeGeneratorSection } from "@/components/doom/meme-generator-section";
import { WarRoomSection } from "@/components/doom/war-room-section";
import { CopyPastaSection } from "@/components/doom/copy-pasta-section";
import { RoadmapSection } from "@/components/doom/roadmap-section";
import { CommunitySection } from "@/components/doom/community-section";
import { Footer } from "@/components/doom/footer";
import { KonamiCode } from "@/components/doom/konami-code";
import { AbyssEasterEgg } from "@/components/doom/abyss-easter-egg";
import { SoundToggle } from "@/components/doom/sound-toggle";
import { FloatingBuy } from "@/components/doom/floating-buy";
import { Navbar } from "@/components/doom/navbar";
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

  // Keep-alive: ping the server every 4 min to prevent Render free tier sleep
  useEffect(() => {
    const ping = () => fetch("/api").catch(() => {});
    const interval = setInterval(ping, 240000); // 4 minutes
    return () => clearInterval(interval);
  }, []);

  const handleNewBuy = useCallback(() => {
    playPing();
  }, [playPing]);

  const handleKonamiActivate = useCallback(() => {
    playEvilLaugh();
  }, [playEvilLaugh]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] relative overflow-x-hidden" ref={containerRef}>
      <Navbar />
      <HeroSection />
      <LiveTicker />
      <CountdownTimer />
      <LoreSection />
      <TokenomicsSection />
      <LiveDataSection onNewBuy={handleNewBuy} />
      <ChartSection />
      <ArenaGameSection />
      <MemeWallSection />
      <MemeGeneratorSection />
      <WarRoomSection />
      <CopyPastaSection />
      <RoadmapSection />
      <CommunitySection />
      {/* Bottom padding for mobile floating buy bar */}
      <div className="h-16 sm:hidden" />
      <Footer />

      {/* Global overlays */}
      <KonamiCode onActivate={handleKonamiActivate} />
      <AbyssEasterEgg />
      <SoundToggle enabled={enabled} onToggle={toggleSound} />
      <FloatingBuy />
    </main>
  );
}
