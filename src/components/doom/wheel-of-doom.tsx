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

// ===== WHEEL SEGMENTS =====
const WHEEL_SEGMENTS = [
  { label: "1M", amount: 1_000_000, weight: 20, color: "#FFD700", textColor: "#000" },
  { label: "500K", amount: 500_000, weight: 15, color: "#FF6B00", textColor: "#000" },
  { label: "250K", amount: 250_000, weight: 15, color: "#DC2626", textColor: "#fff" },
  { label: "NOTHING", amount: 0, weight: 45, color: "#1a1a1a", textColor: "#666" },
  { label: "RE-SPIN", amount: 0, weight: 5, color: "#7C3AED", textColor: "#fff" },
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

  // Check weekly cooldown — same logic as server
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

// ===== FIRE PARTICLE =====
interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

// ===== CONFETTI PARTICLE =====
interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
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

  const fireParticlesRef = useRef<FireParticle[]>([]);
  const confettiParticlesRef = useRef<ConfettiParticle[]>([]);

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState<WheelHistoryItem[]>([]);
  const [spinError, setSpinError] = useState<string | null>(null);

  const spinCheck = canSpinWheel(member);
  const canSpin = spinCheck.allowed;

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
    const interval = setInterval(loadHistory, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Canvas setup and drawing
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
    const outerRadius = size / 2 - 12;
    const innerRadius = outerRadius - 8;

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      const currentAngle = spinStateRef.current.currentAngle;

      // Outer glow ring
      const glowIntensity = spinning ? 0.6 + 0.4 * Math.sin(Date.now() / 200) : 0.3;
      const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius + 15);
      gradient.addColorStop(0, `rgba(220, 38, 38, ${glowIntensity * 0.3})`);
      gradient.addColorStop(0.5, `rgba(255, 107, 0, ${glowIntensity * 0.5})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius + 15, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = spinning ? "#DC2626" : "#2a2a2a";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw segments
      const segmentAngle = (Math.PI * 2) / WHEEL_SEGMENTS.length;
      const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(currentAngle);

      for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
        const seg = WHEEL_SEGMENTS[i];
        const startAngle = i * segmentAngle - Math.PI / 2;
        const endAngle = (i + 1) * segmentAngle - Math.PI / 2;

        // Fill segment
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, innerRadius - 4, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();

        // Segment border
        ctx.strokeStyle = "#0a0a0a";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Segment weight label
        const midAngle = startAngle + segmentAngle / 2;
        const weightPct = Math.round((seg.weight / totalWeight) * 100);
        const labelR = innerRadius * 0.62;

        ctx.save();
        ctx.translate(
          Math.cos(midAngle) * labelR,
          Math.sin(midAngle) * labelR
        );
        ctx.rotate(midAngle + Math.PI / 2);

        // Label text
        ctx.fillStyle = seg.textColor;
        ctx.font = `bold ${size < 350 ? 11 : 14}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(seg.label, 0, -6);

        // Weight percentage
        ctx.font = `${size < 350 ? 8 : 10}px monospace`;
        ctx.globalAlpha = 0.7;
        ctx.fillText(`${weightPct}%`, 0, 8);
        ctx.globalAlpha = 1;

        ctx.restore();
      }

      // Center circle
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0a0a";
      ctx.fill();
      ctx.strokeStyle = "#DC2626";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center text
      ctx.fillStyle = "#DC2626";
      ctx.font = `bold ${size < 350 ? 8 : 10}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.rotate(-currentAngle); // Counter-rotate so text stays upright
      ctx.fillText("DOOM", 0, -3);
      ctx.font = `${size < 350 ? 6 : 8}px monospace`;
      ctx.fillStyle = "#FF6B00";
      ctx.fillText("SPIN", 0, 7);

      ctx.restore();

      // Pointer (top triangle) — stays still
      ctx.beginPath();
      ctx.moveTo(cx, cy - innerRadius - 2);
      ctx.lineTo(cx - 10, cy - innerRadius - 22);
      ctx.lineTo(cx + 10, cy - innerRadius - 22);
      ctx.closePath();
      ctx.fillStyle = "#DC2626";
      ctx.fill();
      ctx.strokeStyle = "#FF6B00";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Fire particles (when spinning)
      if (spinning && fireParticlesRef.current.length > 0) {
        for (const p of fireParticlesRef.current) {
          const alpha = p.life / p.maxLife;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha})`;
          ctx.fill();
        }
      }

      // Confetti particles (when won)
      if (confettiParticlesRef.current.length > 0) {
        for (const p of confettiParticlesRef.current) {
          const alpha = p.life / p.maxLife;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color.replace("1)", `${alpha})`);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [spinning]);

  // Fire particles animation loop
  useEffect(() => {
    if (!spinning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const size = Math.min(rect.width, rect.height);
    const radius = size / 2 - 16;

    const interval = setInterval(() => {
      // Spawn new fire particles around the wheel
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        fireParticlesRef.current.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 3 - 1,
          life: 30 + Math.random() * 20,
          maxLife: 50,
          size: 3 + Math.random() * 4,
          hue: Math.random() * 40 + 10, // Orange to yellow
        });
      }

      // Update particles
      fireParticlesRef.current = fireParticlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 1,
        }))
        .filter((p) => p.life > 0);
    }, 50);

    return () => clearInterval(interval);
  }, [spinning]);

  // Confetti animation
  useEffect(() => {
    if (!result || !result.won) {
      confettiParticlesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    // Spawn confetti burst
    const colors = [
      "rgba(255, 215, 0, 1)",
      "rgba(255, 107, 0, 1)",
      "rgba(220, 38, 38, 1)",
      "rgba(124, 58, 237, 1)",
      "rgba(0, 255, 136, 1)",
    ];

    for (let i = 0; i < 60; i++) {
      confettiParticlesRef.current.push({
        x: cx,
        y: rect.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 2,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    const interval = setInterval(() => {
      confettiParticlesRef.current = confettiParticlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.15, // gravity
          vx: p.vx * 0.99,
          life: p.life - 1,
          rotation: p.rotation + p.rotationSpeed,
        }))
        .filter((p) => p.life > 0);
    }, 30);

    return () => clearInterval(interval);
  }, [result]);

  // ===== SPIN ACTION =====
  const doSpin = useCallback(async () => {
    if (spinning || !canSpin) return;

    setSpinning(true);
    setResult(null);
    setShowResult(false);
    setSpinError(null);
    fireParticlesRef.current = [];
    confettiParticlesRef.current = [];

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

      // Calculate target angle for the animation
      const segmentAngle = (Math.PI * 2) / WHEEL_SEGMENTS.length;
      const targetSegmentAngle = spinResult.segmentIndex * segmentAngle + segmentAngle / 2;

      // We want the pointer (at the top, -PI/2) to land on this segment
      // The wheel rotates, so we need the target segment to be at the top
      // When the wheel is at angle A, the segment at the top is the one at angle (-A - PI/2)
      // So to land on targetSegmentAngle: finalAngle = -(targetSegmentAngle + PI/2)
      // But we also want the pointer at the top, which corresponds to -PI/2 on the wheel

      // The pointer is at the top. When we draw segment i, it starts at i*segmentAngle - PI/2.
      // The pointer points at angle -PI/2 in the canvas frame.
      // When the wheel is rotated by angle R, the pointer points at angle -PI/2 - R in the wheel frame.
      // We need -PI/2 - R = targetSegmentAngle (the middle of the target segment)
      // So R = -PI/2 - targetSegmentAngle

      const baseTargetAngle = -Math.PI / 2 - targetSegmentAngle;

      // Add 3-5 full rotations for dramatic effect
      const fullRotations = (3 + Math.floor(Math.random() * 3)) * Math.PI * 2;
      const finalTargetAngle = baseTargetAngle - fullRotations;

      // Start from current angle
      const startAngle = spinStateRef.current.currentAngle;

      // Make sure we're going in the right direction (decreasing = clockwise visually)
      spinStateRef.current = {
        spinning: true,
        currentAngle: startAngle,
        targetAngle: startAngle + (finalTargetAngle - startAngle),
        startTime: Date.now(),
        duration: 4500 + Math.random() * 500,
        result: spinResult,
      };

      // Easing animation
      const animate = () => {
        const state = spinStateRef.current;
        if (!state.spinning) return;

        const elapsed = Date.now() - state.startTime;
        const progress = Math.min(elapsed / state.duration, 1);

        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);

        state.currentAngle = startAngle + (state.targetAngle - startAngle) * eased;

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
      {/* Canvas Wheel */}
      <div className="relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[400px] md:h-[400px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />
      </div>

      {/* Spin Button */}
      <div className="mt-4 sm:mt-5 w-full max-w-xs sm:max-w-sm">
        <button
          onClick={doSpin}
          disabled={!canSpin || spinning}
          className={`w-full py-3 sm:py-4 text-sm sm:text-lg font-bold rounded-xl transition-all uppercase tracking-wider ${
            canSpin && !spinning
              ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.7)] active:scale-95"
              : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
          }`}
        >
          {spinning ? "🎡 SPINNING..." : canSpin ? "🎡 SPIN THE WHEEL" : "🔒 LOCKED"}
        </button>
      </div>

      {/* Status Message */}
      <div className="mt-3 text-center">
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

      {/* Result Overlay */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 15 }}
            className={`mt-4 p-4 sm:p-5 rounded-xl border text-center max-w-xs sm:max-w-sm ${
              result.won
                ? "bg-gradient-to-b from-yellow-900/20 to-[#1a1a1a] border-yellow-600/40"
                : result.respin
                  ? "bg-gradient-to-b from-purple-900/20 to-[#1a1a1a] border-purple-600/40"
                  : "bg-[#1a1a1a] border-[#2a2a2a]"
            }`}
          >
            {result.won ? (
              <>
                <p className="text-2xl sm:text-3xl mb-1">🎉</p>
                <p className="text-yellow-400 font-bold text-lg sm:text-xl font-creepster">
                  YOU WON!
                </p>
                <p className="text-white font-bold text-xl sm:text-2xl font-mono mt-1">
                  {formatBalance(result.amount)} $DOOMHOUND
                </p>
                <p className="text-gray-400 text-[10px] sm:text-xs mt-2">
                  Prize sent within 24h to your wallet!
                </p>
              </>
            ) : result.respin ? (
              <>
                <p className="text-2xl sm:text-3xl mb-1">🔄</p>
                <p className="text-purple-400 font-bold text-lg sm:text-xl font-creepster">
                  RE-SPIN!
                </p>
                <p className="text-gray-300 text-xs sm:text-sm mt-1">
                  You get a free spin next week!
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl mb-1">💀</p>
                <p className="text-gray-400 font-bold text-lg sm:text-xl font-creepster">
                  NOTHING!
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Better luck next week!
                </p>
              </>
            )}
            <button
              onClick={() => setShowResult(false)}
              className="mt-3 px-4 py-1.5 text-xs bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
            >
              CLOSE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Wins Feed */}
      {history.length > 0 && (
        <div className="mt-5 sm:mt-6 w-full max-w-xs sm:max-w-sm">
          <h4 className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-2 text-center">
            Recent Wins
          </h4>
          <div className="space-y-1.5 max-h-40 sm:max-h-48 overflow-y-auto no-scrollbar">
            {history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-[10px] sm:text-xs bg-[#0a0a0a] rounded-lg px-3 py-2 border border-[#2a2a2a]"
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
