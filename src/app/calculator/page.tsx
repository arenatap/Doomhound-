"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { DoomCalculatorSection } from "@/components/doom/doom-calculator-section";
import { Footer } from "@/components/doom/footer";

export default function CalculatorPage() {
  return (
    <DoomShell>
      <div className="pt-16">
        <DoomCalculatorSection />
      </div>
      <Footer />
    </DoomShell>
  );
}
