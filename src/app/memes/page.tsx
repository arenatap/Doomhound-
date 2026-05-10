"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { MemeWallSection } from "@/components/doom/meme-wall-section";
import { MemeGeneratorSection } from "@/components/doom/meme-generator-section";
import { Footer } from "@/components/doom/footer";

export default function MemesPage() {
  return (
    <DoomShell>
      <div className="pt-16">
        <MemeWallSection />
        <MemeGeneratorSection />
      </div>
      <Footer />
    </DoomShell>
  );
}
