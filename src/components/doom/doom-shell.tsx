"use client";

import { useEffect, useCallback, ReactNode } from "react";
import { Navbar } from "./navbar";
import { KonamiCode } from "./konami-code";
import { AbyssEasterEgg } from "./abyss-easter-egg";
import { SoundToggle } from "./sound-toggle";
import { FloatingBuy } from "./floating-buy";
import { BuyToast } from "./buy-toast";
import { useSoundEffects } from "./use-sound-effects";
import { useGlobalBloodSplash } from "./use-global-blood-splash";

export function DoomShell({ children }: { children: ReactNode }) {
  const { enabled, toggleSound, playBite, playPing, playEvilLaugh } =
    useSoundEffects();
  const { containerRef, handleClick } = useGlobalBloodSplash();

  // Blood splash on click
  useEffect(() => {
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [handleClick]);

  // Capture referral code from URL on any page (survives navigation to /pack)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("doomhound_ref", ref);
    }
  }, []);

  // Play bite sound on any button/anchor click
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

  const handleKonamiActivate = useCallback(() => {
    playEvilLaugh();
  }, [playEvilLaugh]);

  return (
    <main
      className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] relative overflow-x-hidden"
      ref={containerRef}
    >
      {/* Fixed background on ALL pages */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/images/doomhound-bg.png')" }}
      />
      <div className="fixed inset-0 bg-black/70 z-0" />

      {/* Content above background */}
      <div className="relative z-10">
        <Navbar />
        {children}
      </div>

      {/* Global overlays */}
      <KonamiCode onActivate={handleKonamiActivate} />
      <AbyssEasterEgg />
      <SoundToggle enabled={enabled} onToggle={toggleSound} />
      <FloatingBuy />
      <BuyToast />
    </main>
  );
}
