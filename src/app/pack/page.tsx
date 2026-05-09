"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { ArenaGameSection } from "@/components/doom/arena-game-section";
import { Footer } from "@/components/doom/footer";

export default function PackPage() {
  return (
    <DoomShell>
      <div className="pt-16">
        <ArenaGameSection />
      </div>
      <Footer />
    </DoomShell>
  );
}
