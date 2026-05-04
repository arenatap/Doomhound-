"use client";

import { Volume2, VolumeX } from "lucide-react";

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all duration-300 group"
      aria-label={enabled ? "Mute sounds" : "Enable sounds"}
    >
      {enabled ? (
        <Volume2 className="w-5 h-5 text-red-500 group-hover:text-red-400" />
      ) : (
        <VolumeX className="w-5 h-5 text-gray-500 group-hover:text-gray-400" />
      )}
    </button>
  );
}
