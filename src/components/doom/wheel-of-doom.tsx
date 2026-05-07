"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ===== TYPES =====
interface ActivityLog {
  id: string;
  type: string;
  description: string;
  points: number;
  createdAt: string;
}

interface PackMember {
  id: string;
  handle: string;
  userName: string;
  profilePic: string;
  walletAddress: string | null;
  points: number;
  rank: string;
  lastCheckIn: string | null;
  lastThreadCount: number;
  lastFollowerCount: number;
  lastVerifiedAt: string | null;
  doomhoundBalance: number;
  balanceCheckedAt: string | null;
  lastWheelSpin: string | null;
  pendingWinnings: number;
  totalWheelSpins: number;
  totalWheelWinnings: number;
  prizeSent: boolean;
  referredBy: string | null;
  createdAt: string;
  streakCount: number;
  lastStreakAt: string | null;
  achievements: string;
  activities: ActivityLog[];
}

export interface SpinResult {
  segmentIndex: number;
  label: string;
  amount: number;
  color: string;
  respin: boolean;
  won: boolean;
}

interface WheelOfDoomProps {
  member: PackMember;
  onSpinComplete: (result: SpinResult) => void;
}

// ===== WHEEL SEGMENTS (dark, premium style) =====
const WHEEL_SEGMENTS = [
  { label: "1M",      amount: 1_000_000, weight: 8,  color: "#0f0f0f", textColor: "#fcd34d", borderColor: "#d97706", emoji: "💀", accentGlow: "rgba(217,119,6,0.4)" },
  { label: "500K",    amount: 500_000,   weight: 12, color: "#12100d", textColor: "#fdba74", borderColor: "#ea580c", emoji: "🔥", accentGlow: "rgba(234,88,12,0.4)" },
  { label: "250K",    amount: 250_000,   weight: 15, color: "#0f0d12", textColor: "#93c5fd", borderColor: "#2563eb", emoji: "🦴", accentGlow: "rgba(37,99,235,0.3)" },
  { label: "NOTHING", amount: 0,         weight: 60, color: "#0d0d0d", textColor: "#444",    borderColor: "#222",    emoji: "💀", accentGlow: "none",        type: "nothing" },
  { label: "RE-SPIN", amount: 0,         weight: 5,  color: "#0f0d14", textColor: "#a78bfa", borderColor: "#7c3aed", emoji: "🔄", accentGlow: "rgba(124,58,237,0.4)", type: "respin" },
];

interface WheelHistoryItem {
  id: string;
  description: string;
  createdAt: string;
  member: {
    handle: string;
    userName: string;
    profilePic: string;
  };
}

// ===== HELPERS =====
function formatBalance(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)}M`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(1)}K`;
  return b.toFixed(0);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function canSpinWheel(member: PackMember): { allowed: boolean; reason: string } {
  if (member.doomhoundBalance < 10_000_000) {
    return { allowed: false, reason: `Hold 10M $DOOMHOUND to spin (you have ${formatBalance(member.doomhoundBalance)})` };
  }

  if (!member.lastWheelSpin) {
    return { allowed: true, reason: "" };
  }

  const now = new Date();
  const romeTz = "Europe/Rome";
  const getMondayMidnight = (d: Date) => {
    const romeDate = new Date(d.toLocaleString("en-US", { timeZone: romeTz }));
    const day = romeDate.getDay();
    const diff = romeDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(romeDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };
  const thisMonday = getMondayMidnight(now);

  if (new Date(member.lastWheelSpin) >= thisMonday) {
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const daysLeft = Math.ceil((nextMonday.getTime() - now.getTime()) / 86400000);
    return { allowed: false, reason: `Next spin in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` };
  }

  return { allowed: true, reason: "" };
}

// ===== EMBER PARTICLE =====
interface EmberParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
  hue: number;
}

// ===== COMPONENT =====
export function WheelOfDoom({ member, onSpinComplete }: WheelOfDoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const spinStateRef = useRef<{
    spinning: boolean;
    currentAngle: number;
    targetAngle: number;
    startTime: number;
    duration: number;
    result: SpinResult | null;
  }>({
    spinning: false,
    currentAngle: 0,
    targetAngle: 0,
    startTime: 0,
    duration: 4500,
    result: null,
  });

  // Pre-load center logo image
  const logoRef = useRef<HTMLImageElement | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/images/doomhound-logo.png";
    img.onload = () => {
      logoRef.current = img;
      setLogoLoaded(true);
    };
  }, []);

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState<WheelHistoryItem[]>([]);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [pointerBounce, setPointerBounce] = useState(false);
  const lastSegmentRef = useRef<number>(-1);

  const spinCheck = canSpinWheel(member);
  const canSpin = spinCheck.allowed;

  // Generate ember particles
  const [embers] = useState<EmberParticle[]>(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 100,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 8,
      size: 2 + Math.random() * 4,
      hue: Math.random() > 0.5 ? 25 : 10,
    }))
  );

  // Load wheel history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/pack?action=wheel_history");
        const data = await res.json();
        if (data.history) setHistory(data.history);
      } catch { /* silent */ }
    };
    loadHistory();
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const size = Math.min(rect.width, rect.height);
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const outerRadius = size / 2 - 8;
    const innerRadius = outerRadius - 6;
    const segmentAngle = (Math.PI * 2) / WHEEL_SEGMENTS.length;

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      const currentAngle = spinStateRef.current.currentAngle;

      // Draw segments
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(currentAngle);

      for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
        const seg = WHEEL_SEGMENTS[i];
        const startAngle = i * segmentAngle - Math.PI / 2;
        const endAngle = (i + 1) * segmentAngle - Math.PI / 2;
        const midAngle = startAngle + segmentAngle / 2;

        // Segment fill — dark with subtle gradient
        const segGrad = ctx.createRadialGradient(0, 0, innerRadius * 0.1, 0, 0, innerRadius - 4);
        segGrad.addColorStop(0, seg.color);
        segGrad.addColorStop(1, adjustBrightness(seg.color, -10));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, innerRadius - 4, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = segGrad;
        ctx.fill();

        // Segment accent border (colored arc on the outer edge)
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius - 4, startAngle, endAngle);
        ctx.strokeStyle = seg.borderColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner glow for winning segments
        if (seg.accentGlow !== "none") {
          const glowGrad = ctx.createRadialGradient(
            Math.cos(midAngle) * innerRadius * 0.6,
            Math.sin(midAngle) * innerRadius * 0.6,
            0,
            Math.cos(midAngle) * innerRadius * 0.6,
            Math.sin(midAngle) * innerRadius * 0.6,
            innerRadius * 0.35
          );
          glowGrad.addColorStop(0, seg.accentGlow);
          glowGrad.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, innerRadius - 4, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // Segment divider lines
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(startAngle) * (innerRadius - 4), Math.sin(startAngle) * (innerRadius - 4));
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label text
        const labelR = innerRadius * 0.58;
        ctx.save();
        ctx.translate(
          Math.cos(midAngle) * labelR,
          Math.sin(midAngle) * labelR
        );
        ctx.rotate(midAngle + Math.PI / 2);

        // Emoji
        ctx.font = `${size < 350 ? 14 : 18}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(seg.emoji, 0, -10);

        // Prize label
        ctx.fillStyle = seg.textColor;
        ctx.font = `bold ${size < 350 ? 12 : 15}px monospace`;
        ctx.fillText(seg.label, 0, 8);

        ctx.restore();
      }

      // Decorative tick marks on outer ring
      for (let i = 0; i < 40; i++) {
        const tickAngle = (i / 40) * Math.PI * 2;
        const isMajor = i % 8 === 0;
        const tickInner = innerRadius - (isMajor ? 18 : 12);
        const tickOuter = innerRadius - 4;

        ctx.beginPath();
        ctx.moveTo(Math.cos(tickAngle) * tickInner, Math.sin(tickAngle) * tickInner);
        ctx.lineTo(Math.cos(tickAngle) * tickOuter, Math.sin(tickAngle) * tickOuter);
        ctx.strokeStyle = isMajor ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.1)";
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.stroke();
      }

      // Center hub — large prominent logo area
      const hubRadius = innerRadius * 0.28;

      // Outer hub ring — bright orange glow
      ctx.beginPath();
      ctx.arc(0, 0, hubRadius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(249,115,22,0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Hub background — dark circle with gradient
      const hubGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hubRadius);
      hubGrad.addColorStop(0, "#1a1a1a");
      hubGrad.addColorStop(0.6, "#0d0d0d");
      hubGrad.addColorStop(1, "#050505");
      ctx.beginPath();
      ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.fill();
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner decorative ring
      ctx.beginPath();
      ctx.arc(0, 0, hubRadius * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(249,115,22,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center logo (rotates WITH the wheel — inside the rotated ctx context)
      const logo = logoRef.current;
      if (logo && logoLoaded) {
        // Make logo fill most of the hub area
        const logoSize = hubRadius * 1.5;
        // Clip to circle so logo doesn't overflow
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, hubRadius - 3, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
        ctx.restore();
      } else {
        // Fallback text if logo hasn't loaded — "$DOOMHOUND" styled text
        ctx.fillStyle = "#f97316";
        ctx.font = `bold ${size < 350 ? 10 : 13}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("DOOM", 0, -5);
        ctx.fillStyle = "#dc2626";
        ctx.font = `bold ${size < 350 ? 8 : 11}px monospace`;
        ctx.fillText("HOUND", 0, 7);
        // Dollar sign accent
        ctx.fillStyle = "#fbbf24";
        ctx.font = `bold ${size < 350 ? 6 : 8}px monospace`;
        ctx.fillText("$", 0, -16);
      }

      ctx.restore();

      // Pointer bounce detection during spin
      if (spinStateRef.current.spinning) {
        const normalizedAngle = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const pointerAngle = ((Math.PI * 2) - normalizedAngle + Math.PI / 2) % (Math.PI * 2);
        const currentSegment = Math.floor(pointerAngle / segmentAngle) % WHEEL_SEGMENTS.length;
        if (currentSegment !== lastSegmentRef.current && lastSegmentRef.current !== -1) {
          setPointerBounce(true);
          setTimeout(() => setPointerBounce(false), 120);
        }
        lastSegmentRef.current = currentSegment;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [spinning, logoLoaded]);

  // ===== SPIN ACTION =====
  const doSpin = useCallback(async () => {
    if (spinning || !canSpin) return;

    setSpinning(true);
    setResult(null);
    setShowResult(false);
    setSpinError(null);
    lastSegmentRef.current = -1;

    try {
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "wheel_spin", handle: member.handle }),
      });
      const data = await res.json();

      if (data.error) {
        setSpinError(data.error);
        setSpinning(false);
        return;
      }

      if (!data.result) {
        setSpinError("Spin failed — no result");
        setSpinning(false);
        return;
      }

      const spinResult: SpinResult = data.result;

      // ===== ROBUST TARGET ANGLE CALCULATION =====
      // Segments are drawn at: startAngle_i = i * segmentAngle - PI/2 (in rotated frame)
      // The pointer is at -PI/2 in canvas frame (top of wheel)
      // In the rotated frame, the pointer appears at angle: -PI/2 - currentAngle
      // For the pointer to land in segment i, we need:
      //   i * segmentAngle <= (-currentAngle mod 2PI) < (i+1) * segmentAngle
      // We aim for the middle of the segment plus a small random offset for variety:
      //   -currentAngle mod 2PI = (i + 0.5) * segmentAngle + smallRandom
      // Therefore: currentAngle mod 2PI = 2PI - (i + 0.5) * segmentAngle - smallRandom
      const numSegments = WHEEL_SEGMENTS.length;
      const segmentAngle = (Math.PI * 2) / numSegments;

      // Small random offset within the segment (avoid exact center for realism)
      // Stay within the middle 60% of the segment to avoid edge cases
      const segmentOffset = (0.2 + Math.random() * 0.6) * segmentAngle;

      // The desired final angle modulo 2PI:
      // We want: -finalAngle mod 2PI = spinResult.segmentIndex * segmentAngle + segmentOffset
      // So: finalAngle mod 2PI = -(spinResult.segmentIndex * segmentAngle + segmentOffset) mod 2PI
      const desiredAngleMod2PI = (2 * Math.PI) - (spinResult.segmentIndex * segmentAngle + segmentOffset);

      // Calculate how much we need to rotate FROM the current position
      const startAngle = spinStateRef.current.currentAngle;
      const startMod2PI = ((startAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      // Base rotation: from start position to the desired position
      let baseRotation = desiredAngleMod2PI - startMod2PI;
      // Ensure we always rotate in the negative direction (clockwise visually)
      if (baseRotation > 0) baseRotation -= 2 * Math.PI;

      // Add full rotations (5-7 full spins for dramatic effect)
      const extraRotations = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
      const totalRotation = baseRotation - extraRotations;

      const finalTargetAngle = startAngle + totalRotation;

      spinStateRef.current = {
        spinning: true,
        currentAngle: startAngle,
        targetAngle: finalTargetAngle,
        startTime: Date.now(),
        duration: 5500 + Math.random() * 1500,
        result: spinResult,
      };

      // Easing animation with realistic deceleration
      const animStartAngle = startAngle;
      const animTotalDelta = totalRotation;

      const animate = () => {
        const state = spinStateRef.current;
        if (!state.spinning) return;

        const elapsed = Date.now() - state.startTime;
        const progress = Math.min(elapsed / state.duration, 1);

        // Custom easing: fast start, long dramatic slowdown
        // Using ease-out quartic for smoother deceleration
        const eased = 1 - Math.pow(1 - progress, 4);

        state.currentAngle = animStartAngle + animTotalDelta * eased;

        if (progress >= 1) {
          state.currentAngle = state.targetAngle;
          state.spinning = false;
          setSpinning(false);
          setResult(spinResult);
          setShowResult(true);
          onSpinComplete(spinResult);
          return;
        }

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    } catch {
      setSpinError("Spin failed");
      setSpinning(false);
    }
  }, [spinning, canSpin, member.handle, onSpinComplete]);

  return (
    <div className="flex flex-col items-center">
      {/* Ember Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {embers.map((e) => (
          <div
            key={e.id}
            className="absolute rounded-full"
            style={{
              left: `${e.x}%`,
              bottom: "-10px",
              width: `${e.size}px`,
              height: `${e.size}px`,
              background: `hsl(${e.hue}, 100%, ${50 + Math.random() * 30}%)`,
              boxShadow: `0 0 ${6 + e.size}px hsl(${e.hue}, 100%, 50%)`,
              animation: `ember-rise ${e.duration}s linear ${e.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Wheel Stage */}
      <div className="relative w-[280px] h-[310px] sm:w-[360px] sm:h-[390px] md:w-[400px] md:h-[430px]">
        {/* Glow Ring 1 — spinning conic gradient */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "-12px",
            background: "conic-gradient(from 0deg, transparent, rgba(249,115,22,0.2), transparent, rgba(220,38,38,0.2), transparent)",
            animation: "wheel-glow-ring1 6s linear infinite",
            filter: "blur(4px)",
          }}
        />

        {/* Glow Ring 2 — reverse spinning */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "-6px",
            background: "conic-gradient(from 120deg, transparent, rgba(251,191,36,0.15), transparent, rgba(249,115,22,0.15), transparent)",
            animation: "wheel-glow-ring2 4s linear infinite reverse",
            filter: "blur(3px)",
          }}
        />

        {/* Glow Ring 3 — pulsing border */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "0px",
            border: "2px solid rgba(249,115,22,0.3)",
            boxShadow: "0 0 30px rgba(249,115,22,0.15), inset 0 0 30px rgba(249,115,22,0.05)",
            animation: "wheel-glow-ring3 2s ease-in-out infinite alternate",
          }}
        />

        {/* Pointer SVG */}
        <div
          className="absolute top-0 left-1/2 z-20"
          style={{
            transform: `translateX(-50%) ${pointerBounce ? "rotate(8deg)" : "rotate(0)"}`,
            transition: "transform 0.12s ease",
            filter: "drop-shadow(0 0 15px rgba(220,38,38,0.9)) drop-shadow(0 4px 10px rgba(0,0,0,0.6))",
            marginTop: "-8px",
          }}
        >
          <svg width="36" height="46" viewBox="0 0 44 54">
            <defs>
              <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
            </defs>
            <polygon points="22,54 2,0 42,0" fill="url(#pGrad)" stroke="#f87171" strokeWidth="1.5" />
            <polygon points="22,44 8,6 36,6" fill="#f87171" opacity="0.3" />
          </svg>
        </div>

        {/* Canvas */}
        <div className="relative w-full h-full rounded-full overflow-hidden bg-[#0a0a0a] z-10">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: "block" }}
          />
        </div>
      </div>

      {/* Spin Button */}
      <div className="mt-5 w-full max-w-xs sm:max-w-sm">
        <button
          onClick={doSpin}
          disabled={!canSpin || spinning}
          className={`w-full py-3.5 font-creepster text-xl sm:text-2xl rounded-xl transition-all uppercase tracking-wider relative overflow-hidden ${
            canSpin && !spinning
              ? "text-white border-2 border-[#ef4444] hover:scale-[1.04] active:scale-95"
              : "bg-[#1a1a1a] text-gray-600 border-2 border-[#2a2a2a] cursor-not-allowed"
          }`}
          style={
            canSpin && !spinning
              ? {
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 40%, #7f1d1d 100%)",
                  boxShadow: "0 0 30px rgba(220,38,38,0.4), 0 4px 15px rgba(0,0,0,0.3)",
                }
              : undefined
          }
        >
          {canSpin && !spinning && (
            <span
              className="absolute inset-0 block"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.12) 55%, transparent 100%)",
                animation: "btn-shimmer 3s infinite",
              }}
            />
          )}
          {spinning ? "🎰 SPINNING..." : canSpin ? "🔥 SPIN THE WHEEL" : "🔒 LOCKED"}
        </button>
      </div>

      {/* Status Message */}
      <div className="mt-2 text-center">
        {!canSpin && !spinning && (
          <p className="text-gray-500 text-[10px] sm:text-xs">
            {member.doomhoundBalance < 10_000_000
              ? `Hold 10M $DOOMHOUND to spin (you have ${formatBalance(member.doomhoundBalance)})`
              : spinCheck.reason}
          </p>
        )}
        {spinError && (
          <p className="text-red-400 text-[10px] sm:text-xs mt-1">{spinError}</p>
        )}
      </div>

      {/* Prize Odds Table */}
      <div className="mt-5 w-full max-w-xs sm:max-w-sm bg-white/[0.015] border border-white/5 rounded-2xl p-4">
        <h4 className="font-creepster text-[#fbbf24] text-sm mb-2.5 tracking-wider text-center">
          🎰 PRIZE ODDS
        </h4>
        <div className="space-y-1.5">
          {WHEEL_SEGMENTS.map((seg) => {
            const totalWeight = WHEEL_SEGMENTS.reduce((s, w) => s + w.weight, 0);
            const pct = Math.round((seg.weight / totalWeight) * 100);
            return (
              <div key={seg.label} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                <span className="text-base w-6 text-center">{seg.emoji}</span>
                <span
                  className="flex-1 text-xs font-semibold"
                  style={{ color: seg.textColor === "#444" ? "#555" : seg.textColor }}
                >
                  {seg.label}
                </span>
                <span
                  className="font-creepster text-sm font-bold"
                  style={{ color: seg.textColor === "#444" ? "#555" : seg.textColor }}
                >
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-3 w-full max-w-xs sm:max-w-sm p-3.5 bg-orange-500/[0.03] border border-orange-500/10 rounded-xl text-left">
        <h4 className="font-creepster text-[#f97316] text-xs mb-2 tracking-wider">
          📖 How It Works
        </h4>
        <p className="text-gray-500 text-[11px] leading-relaxed mb-1">
          <strong className="text-gray-400">Hold 10M $DOOMHOUND</strong> = 1 free spin per week (resets Monday midnight CET)
        </p>
        <p className="text-gray-500 text-[11px] leading-relaxed mb-1">
          <strong className="text-gray-400">Win</strong> = tokens sent to your wallet within 24h!
        </p>
        <p className="text-gray-500 text-[11px] leading-relaxed">
          <strong className="text-gray-400">RE-SPIN</strong> = free extra spin next week!
        </p>
      </div>

      {/* Result Overlay */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/92 backdrop-blur-md flex items-center justify-center z-50"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative rounded-3xl p-8 sm:p-10 text-center max-w-sm w-[90%] overflow-hidden border border-white/5 ${
                result.won
                  ? "bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]"
                  : result.respin
                    ? "bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]"
                    : "bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]"
              }`}
            >
              {/* Top bar accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background: result.won
                    ? "linear-gradient(90deg, #fbbf24, #4ade80, #fbbf24)"
                    : result.respin
                      ? "linear-gradient(90deg, #a78bfa, #6d28d9, #a78bfa)"
                      : "linear-gradient(90deg, #333, #1a1a1a, #333)",
                  boxShadow: result.won
                    ? "0 0 20px rgba(74,222,128,0.5)"
                    : result.respin
                      ? "0 0 20px rgba(167,139,250,0.5)"
                      : "none",
                }}
              />

              {/* Emoji slam */}
              <motion.span
                className="text-5xl sm:text-6xl block mb-2"
                initial={{ scale: 3, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 8 }}
              >
                {result.won ? "🎉" : result.respin ? "🔄" : "💀"}
              </motion.span>

              {/* Title */}
              <h2
                className="font-creepster text-3xl sm:text-4xl tracking-wider mb-1"
                style={{
                  color: result.won ? "#4ade80" : result.respin ? "#a78bfa" : "#555",
                  textShadow: result.won
                    ? "0 0 25px rgba(74,222,128,0.5)"
                    : result.respin
                      ? "0 0 25px rgba(167,139,250,0.5)"
                      : "none",
                }}
              >
                {result.won ? "YOU WON!" : result.respin ? "RE-SPIN!" : "NOTHING!"}
              </h2>

              {/* Amount */}
              {result.won && (
                <motion.div
                  className="font-creepster text-4xl sm:text-5xl mt-2"
                  style={{
                    color: "#4ade80",
                    textShadow: "0 0 40px rgba(74,222,128,0.6)",
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", damping: 10 }}
                >
                  {formatBalance(result.amount)}
                </motion.div>
              )}

              {/* Subtitle */}
              <p className="text-gray-500 text-sm mt-2">
                {result.won
                  ? "$DOOMHOUND tokens"
                  : result.respin
                    ? "You get a free spin next week!"
                    : "Better luck next week!"}
              </p>

              {/* Prize delivery note */}
              {result.won && (
                <div className="mt-4 p-3 bg-white/[0.02] rounded-lg border border-[#1a1a1a]">
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    Prize sent within 24h to your wallet!
                  </p>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={() => setShowResult(false)}
                className="mt-5 font-creepster text-xl text-white border-none px-8 py-3 rounded-xl cursor-pointer transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  boxShadow: "0 0 25px rgba(249,115,22,0.3)",
                  letterSpacing: "3px",
                }}
              >
                🐺 HOWL!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Wins Feed */}
      {history.length > 0 && (
        <div className="mt-5 w-full max-w-xs sm:max-w-sm">
          <h4 className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-2 text-center">
            Recent Wins
          </h4>
          <div className="space-y-1.5 max-h-40 sm:max-h-48 overflow-y-auto no-scrollbar">
            {history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-[10px] sm:text-xs bg-[#0a0a0a] rounded-lg px-3 py-2 border border-[#1a1a1a]"
              >
                <span>🐺</span>
                <span className="text-yellow-400 font-bold">@{item.member.handle}</span>
                <span className="text-gray-300 flex-1 truncate">{item.description.replace("Wheel of Doom: ", "")}</span>
                <span className="text-gray-600 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 flex gap-4 sm:gap-6 text-center">
        <div>
          <p className="text-white font-bold text-sm sm:text-base font-mono">{member.totalWheelSpins}</p>
          <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">Total Spins</p>
        </div>
        <div>
          <p className="text-yellow-400 font-bold text-sm sm:text-base font-mono">{formatBalance(member.totalWheelWinnings)}</p>
          <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">Total Won</p>
        </div>
        {member.pendingWinnings > 0 && (
          <div>
            <p className="text-green-400 font-bold text-sm sm:text-base font-mono">{formatBalance(member.pendingWinnings)}</p>
            <p className="text-gray-600 text-[8px] sm:text-[10px] uppercase">Pending</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== UTILITY =====
function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
