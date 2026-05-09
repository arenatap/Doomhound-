"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { BurnArenaSection } from "@/components/doom/burn-arena-section";
import { CountdownTimer } from "@/components/doom/countdown-timer";
import { Footer } from "@/components/doom/footer";

export default function BurnsPage() {
  return (
    <DoomShell>
      <div className="pt-16">
        <CountdownTimer />
        <BurnArenaSection />
      </div>
      <Footer />
    </DoomShell>
  );
}
