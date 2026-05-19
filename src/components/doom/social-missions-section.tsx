"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BloodSplash } from "./blood-splash";

// ===== TYPES =====
interface MissionInfo {
  missionId: string;
  name: string;
  description: string;
  points: number;
  cooldownHours: number;
  maxLifetime: number | null;
  completionsCount: number;
  maxReached: boolean;
  cooldownRemaining: number;
  onCooldown: boolean;
  lastCompletedAt: string | null;
}

const MISSION_ICONS: Record<string, string> = {
  M01: "🔄",
  M02: "👥",
  M03: "🎨",
  M04: "💬",
  M05: "🚪",
};

function formatCooldown(ms: number): string {
  if (ms <= 0) return "Ready!";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ===== COMPONENT =====
export function SocialMissionsSection() {
  const [handle, setHandle] = useState<string | null>(null);
  const [missions, setMissions] = useState<MissionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [showProofDialog, setShowProofDialog] = useState<string | null>(null);
  const [result, setResult] = useState<{ mission: string; points: number; multiplier: number } | null>(null);

  // Read handle from localStorage (same pattern as ArenaGameSection)
  useEffect(() => {
    const stored = localStorage.getItem("doomhound_handle");
    if (stored) setHandle(stored.replace("@", "").trim().toLowerCase());
  }, []);

  const fetchMissions = useCallback(async () => {
    if (!handle) return;
    try {
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mission_status", handle }),
      });
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch (err) {
      console.error("Failed to fetch missions:", err);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const completeMission = async (missionId: string) => {
    if (completing || !handle) return;
    setCompleting(missionId);
    setResult(null);
    try {
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_mission",
          handle,
          missionId,
          proofUrl: proofUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ mission: missionId, points: data.pointsAwarded, multiplier: data.multiplier });
        setShowProofDialog(null);
        setProofUrl("");
        fetchMissions();
      } else if (data.cooldown) {
        setResult({ mission: missionId, points: 0, multiplier: 0 });
      } else {
        setResult({ mission: missionId, points: -1, multiplier: 0 });
      }
    } catch (err) {
      console.error("Failed to complete mission:", err);
    } finally {
      setCompleting(null);
    }
  };

  // Not logged in
  if (!handle) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
        <h3 className="font-creepster text-2xl text-red-500 mb-3">🎯 SOCIAL MISSIONS</h3>
        <p className="text-gray-500 text-sm">Join the pack first to unlock social missions!</p>
      </div>
    );
  }

  const totalMissionPoints = missions.reduce((sum, m) => sum + m.points * m.completionsCount, 0);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
      <div className="p-5 sm:p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-creepster text-2xl sm:text-3xl text-red-500">🎯 SOCIAL MISSIONS</h3>
          <span className="text-orange-400 font-bold text-xs sm:text-sm font-mono">{totalMissionPoints} pts earned</span>
        </div>

        {loading ? (
          <div className="text-center py-6">
            <p className="text-gray-600 text-sm">Loading missions...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {missions.map((mission) => (
              <motion.div
                key={mission.missionId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{MISSION_ICONS[mission.missionId] || "📋"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-white font-bold text-sm truncate">{mission.name}</h4>
                      <span className="text-yellow-400 font-bold text-xs flex-shrink-0">+{mission.points} pts</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{mission.description}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {mission.maxLifetime !== null ? (
                        <span className="text-gray-600 text-[10px]">{mission.completionsCount}/{mission.maxLifetime} done</span>
                      ) : (
                        <span className="text-gray-600 text-[10px]">{mission.completionsCount} done</span>
                      )}
                      {mission.cooldownHours > 0 && (
                        <span className="text-gray-600 text-[10px]">CD: {mission.cooldownHours}h</span>
                      )}
                      {mission.onCooldown && (
                        <span className="text-red-400 text-[10px] font-bold">⏳ {formatCooldown(mission.cooldownRemaining)}</span>
                      )}
                    </div>
                    {mission.maxLifetime !== null && (
                      <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (mission.completionsCount / mission.maxLifetime) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  {mission.maxReached ? (
                    <span className="text-gray-600 text-xs">Max reached ✓</span>
                  ) : mission.onCooldown ? (
                    <span className="text-gray-600 text-xs italic">On cooldown...</span>
                  ) : (
                    <BloodSplash className="w-auto">
                      <button
                        onClick={() => setShowProofDialog(mission.missionId)}
                        disabled={completing === mission.missionId}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)] transition-all"
                      >
                        {completing === mission.missionId ? "..." : "COMPLETE"}
                      </button>
                    </BloodSplash>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Proof Dialog */}
            <AnimatePresence>
              {showProofDialog && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                  onClick={() => setShowProofDialog(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4 className="font-creepster text-xl text-red-500">
                      Complete {missions.find(m => m.missionId === showProofDialog)?.name}
                    </h4>
                    <p className="text-gray-400 text-xs">Submit proof URL (optional but recommended)</p>
                    <input
                      type="url"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="https://x.com/..."
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder:text-gray-700 focus:border-red-600 focus:outline-none"
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setShowProofDialog(null)} className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors">Cancel</button>
                      <BloodSplash className="flex-1">
                        <button
                          onClick={() => completeMission(showProofDialog)}
                          disabled={completing === showProofDialog}
                          className="w-full py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all"
                        >
                          {completing === showProofDialog ? "SUBMITTING..." : "SUBMIT"}
                        </button>
                      </BloodSplash>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`rounded-lg p-3 text-center ${
                    result.points > 0 ? "bg-green-900/30 border border-green-500/50" : "bg-red-900/30 border border-red-500/50"
                  }`}
                >
                  {result.points > 0 ? (
                    <p className="text-green-400 text-sm font-bold">🔥 Mission complete! +{result.points} pts ({result.multiplier}x)</p>
                  ) : result.points === 0 ? (
                    <p className="text-red-400 text-sm font-bold">Cooldown still active</p>
                  ) : (
                    <p className="text-red-400 text-sm font-bold">Error completing mission</p>
                  )}
                  <button onClick={() => setResult(null)} className="text-gray-500 text-[10px] mt-1 hover:text-gray-300">Dismiss</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <p className="text-gray-700 text-[8px] sm:text-[9px] text-center mt-3">
          Streak multiplier applies to all mission rewards!
        </p>
      </div>
    </div>
  );
}
