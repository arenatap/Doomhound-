"use client";

import { DoomShell } from "@/components/doom/doom-shell";
import { ArenaGameSection } from "@/components/doom/arena-game-section";
import { SocialMissionsSection } from "@/components/doom/social-missions-section";
import { ReferralSection } from "@/components/doom/referral-section";
import { StreakRewardSection } from "@/components/doom/streak-reward-section";
import { Footer } from "@/components/doom/footer";

export default function PackPage() {
  return (
    <DoomShell>
      <div className="pt-16">
        <ArenaGameSection />
        <div className="max-w-2xl mx-auto px-4 space-y-6 pb-8 mt-6">
          <SocialMissionsSection />
          <ReferralSection />
          <StreakRewardSection />
        </div>
      </div>
      <Footer />
    </DoomShell>
  );
}
