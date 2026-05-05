"use client";

import { useCallback, useRef, useState } from "react";

export function useSoundEffects() {
  const [enabled, setEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playBite = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);

      // Add noise-like component for squish
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.type = "square";
      osc2.frequency.setValueAtTime(400, ctx.currentTime + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);

      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc2.start(ctx.currentTime + 0.02);
      osc2.stop(ctx.currentTime + 0.1);
    } catch {
      // Audio not available
    }
  }, [enabled, getAudioCtx]);

  const playPing = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not available
    }
  }, [enabled, getAudioCtx]);

  const playEvilLaugh = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getAudioCtx();

      // Create a series of oscillating tones for an evil laugh effect
      const laughIntervals = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
      laughIntervals.forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sawtooth";
        const baseFreq = 300 + (i % 2) * 150;
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime + delay);
        osc.frequency.linearRampToValueAtTime(
          baseFreq * (i % 2 === 0 ? 1.3 : 0.8),
          ctx.currentTime + delay + 0.1
        );

        gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + delay + 0.12
        );

        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.12);
      });
    } catch {
      // Audio not available
    }
  }, [enabled, getAudioCtx]);

  const toggleSound = useCallback(() => {
    setEnabled((prev) => {
      if (!prev) {
        // Initialize audio context on first enable
        getAudioCtx();
      }
      return !prev;
    });
  }, [getAudioCtx]);

  return {
    enabled,
    toggleSound,
    playBite,
    playPing,
    playEvilLaugh,
  };
}
