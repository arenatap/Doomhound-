"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ===== TYPES =====
interface DaoProposal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdBy: string;
  votingEndsAt: string;
  quorum: number;
  approvalPct: number;
  createdAt: string;
  updatedAt: string;
  yesVotes: number;
  noVotes: number;
  yesPower: number;
  noPower: number;
  totalPower: number;
  _count: { votes: number };
  resultData?: string | null;
  userVote?: string | null;
}

interface DaoSettings {
  categories: string;
  voting_duration_hours: string;
  quorum: string;
  approval_threshold: string;
  proposer_min_points: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  burn: "🔥",
  wheel: "🎡",
  raffle: "🎟️",
  pack: "🎮",
  pack_perks: "⛓️",
  treasury: "💰",
  community_fund: "💰",
  nft: "🖼️",
  marketing: "📢",
};

const CATEGORY_COLORS: Record<string, string> = {
  burn: "text-orange-400 border-orange-600/40 bg-orange-600/10",
  wheel: "text-purple-400 border-purple-600/40 bg-purple-600/10",
  raffle: "text-cyan-400 border-cyan-600/40 bg-cyan-600/10",
  pack: "text-blue-400 border-blue-600/40 bg-blue-600/10",
  pack_perks: "text-pink-400 border-pink-600/40 bg-pink-600/10",
  treasury: "text-yellow-400 border-yellow-600/40 bg-yellow-600/10",
  community_fund: "text-yellow-400 border-yellow-600/40 bg-yellow-600/10",
  nft: "text-purple-400 border-purple-600/40 bg-purple-600/10",
  marketing: "text-green-400 border-green-600/40 bg-green-600/10",
};

const STATUS_STYLES: Record<string, string> = {
  active: "text-green-400 border-green-600/40 bg-green-600/10",
  passed: "text-yellow-400 border-yellow-600/40 bg-yellow-600/10",
  failed: "text-red-400 border-red-600/40 bg-red-600/10",
  executed: "text-blue-400 border-blue-600/40 bg-blue-600/10",
  cancelled: "text-gray-400 border-gray-600/40 bg-gray-600/10",
};

function timeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

// ===== COMPONENT =====
export default function DaoPage() {
  const [proposals, setProposals] = useState<DaoProposal[]>([]);
  const [settings, setSettings] = useState<DaoSettings | null>(null);
  const [filter, setFilter] = useState("all"); // all, active, passed, failed
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [memberHandle, setMemberHandle] = useState<string | null>(null);
  const [votingOn, setVotingOn] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<DaoProposal | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [memberPoints, setMemberPoints] = useState<number>(0);
  const [votingPower, setVotingPower] = useState<Record<string, number>>({}); // proposalId -> power

  // Get handle + points from localStorage / API
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = localStorage.getItem("doomhound_handle");
    if (h) {
      const clean = h.replace("@", "").trim().toLowerCase();
      setMemberHandle(clean);
      // Fetch member points
      fetch(`/api/pack?action=profile&handle=${encodeURIComponent(clean)}`)
        .then(r => r.json())
        .then(data => {
          if (data.member?.points) setMemberPoints(data.member.points);
        })
        .catch(() => {});
    }
  }, []);

  // Load proposals
  const loadProposals = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: "proposals" });
      if (filter !== "all") params.set("status", filter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (memberHandle) params.set("handle", memberHandle);
      const res = await fetch(`/api/dao?${params}`);
      const data = await res.json();
      if (data.proposals) setProposals(data.proposals);
    } catch (err) {
      console.error("Load proposals error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, categoryFilter, memberHandle]);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/dao?action=settings");
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      console.error("Load settings error:", err);
    }
  }, []);

  useEffect(() => { loadProposals(); }, [loadProposals]);
  useEffect(() => { loadSettings(); }, []);

  // Vote
  const doVote = useCallback(async (proposalId: string, vote: "yes" | "no") => {
    if (!memberHandle) return;
    const power = votingPower[proposalId] || memberPoints;
    if (power <= 0) {
      setVoteError("You need points to vote");
      return;
    }
    setVotingOn(proposalId);
    setVoteError(null);
    try {
      const res = await fetch("/api/dao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", proposalId, handle: memberHandle, vote, votingPower: power }),
      });
      const data = await res.json();
      if (data.success) {
        loadProposals();
        if (selectedProposal?.id === proposalId) {
          setSelectedProposal(null);
        }
      } else {
        setVoteError(data.error || "Vote failed");
      }
    } catch {
      setVoteError("Vote failed");
    } finally {
      setVotingOn(null);
    }
  }, [memberHandle, memberPoints, votingPower, loadProposals, selectedProposal]);

  const categories = settings ? JSON.parse(settings.categories) : ["burn", "pack", "treasury", "nft", "marketing"];

  return (
    <main className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-flame" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-20 sm:py-28 md:py-36">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h1 className="font-creepster text-5xl sm:text-7xl md:text-8xl text-red-500 animate-glow-red mb-3">
            DOOMHOUND DAO
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
            The pack decides. 1 point = 1 vote. Your voice, your power.
          </p>
          {settings && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <span className="bg-red-900/30 border border-red-600/30 rounded-full px-3 py-1 text-red-400 text-xs">
                {settings.voting_duration_hours}h voting
              </span>
              <span className="bg-red-900/30 border border-red-600/30 rounded-full px-3 py-1 text-red-400 text-xs">
                Quorum: {settings.quorum} voters
              </span>
              <span className="bg-red-900/30 border border-red-600/30 rounded-full px-3 py-1 text-red-400 text-xs">
                {settings.approval_threshold}% to pass
              </span>
            </div>
          )}
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", "active", "passed", "failed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                filter === f
                  ? "bg-red-600/20 border-red-600/40 text-red-400"
                  : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-gray-300"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <div className="w-px bg-[#2a2a2a] mx-1" />
          {["all", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                categoryFilter === c
                  ? "bg-red-600/20 border-red-600/40 text-red-400"
                  : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-gray-300"
              }`}
            >
              {c === "all" ? "ALL" : `${CATEGORY_ICONS[c] || ""} ${c.toUpperCase()}`}
            </button>
          ))}
        </div>

        {/* Proposals */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-creepster tracking-wider animate-pulse">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-10 text-center">
            <p className="text-4xl mb-3">🐺</p>
            <p className="text-gray-400 text-sm">No proposals yet. The alpha will create one soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-red-900/30 transition-colors"
              >
                <div className="p-5 sm:p-6">
                  {/* Top row: category + status + time */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${CATEGORY_COLORS[p.category] || "text-gray-400 border-gray-600/40 bg-gray-600/10"}`}>
                      {CATEGORY_ICONS[p.category]} {p.category.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${STATUS_STYLES[p.status] || ""}`}>
                      {p.status.toUpperCase()}
                    </span>
                    {p.status === "active" && (
                      <span className="text-green-400/70 text-[10px] ml-auto">
                        ⏰ {timeLeft(p.votingEndsAt)}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-bold text-base sm:text-lg mb-2">{p.title}</h3>

                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{p.description}</p>

                  {/* Vote bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-green-400 font-bold">YES {p.yesPower} pts</span>
                      <span className="text-gray-500">{p._count.votes} voter{p._count.votes !== 1 ? "s" : ""}</span>
                      <span className="text-red-400 font-bold">NO {p.noPower} pts</span>
                    </div>
                    <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#2a2a2a]">
                      {p.totalPower > 0 ? (
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                          style={{ width: `${(p.yesPower / p.totalPower) * 100}%` }}
                        />
                      ) : (
                        <div className="h-full w-1/2 bg-gray-700 rounded-full" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-600 mt-1">
                      <span>Quorum: {p._count.votes}/{p.quorum}</span>
                      <span>Approval: {p.totalPower > 0 ? Math.round((p.yesPower / p.totalPower) * 100) : 0}% / {p.approvalPct}%</span>
                    </div>
                  </div>

                  {/* Result data for closed proposals */}
                  {p.resultData && (() => {
                    try {
                      const result = JSON.parse(p.resultData);
                      return (
                        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 mb-4 text-xs">
                          <div className="flex flex-wrap gap-3">
                            <span className="text-green-400">YES: {result.yesVoters} voters ({result.yesPower} pts)</span>
                            <span className="text-red-400">NO: {result.noVoters} voters ({result.noPower} pts)</span>
                            <span className={result.meetsQuorum ? "text-green-400" : "text-red-400"}>
                              Quorum: {result.meetsQuorum ? "MET" : "NOT MET"}
                            </span>
                            <span className="text-gray-400">Approval: {result.approvalRate}%</span>
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}

                  {/* Vote buttons (only if active and user is logged in) */}
                  {p.status === "active" && memberHandle && (
                    p.userVote ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">
                          You voted <span className={p.userVote === "yes" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{p.userVote.toUpperCase()}</span>
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Voting Power Selector */}
                        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Voting Power</span>
                            <span className="text-red-400 font-mono text-sm font-bold">
                              {votingPower[p.id] || memberPoints} / {memberPoints} pts
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={memberPoints || 1}
                            value={votingPower[p.id] || memberPoints}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setVotingPower(prev => ({ ...prev, [p.id]: val }));
                            }}
                            className="w-full h-2 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer accent-red-500"
                          />
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-gray-600 text-[10px]">1 pt</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setVotingPower(prev => ({ ...prev, [p.id]: Math.max(1, Math.floor(memberPoints * 0.25)) }))}
                                className="px-2 py-0.5 text-[10px] font-bold bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded border border-[#2a2a2a] transition-colors"
                              >25%</button>
                              <button
                                onClick={() => setVotingPower(prev => ({ ...prev, [p.id]: Math.max(1, Math.floor(memberPoints * 0.5)) }))}
                                className="px-2 py-0.5 text-[10px] font-bold bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded border border-[#2a2a2a] transition-colors"
                              >50%</button>
                              <button
                                onClick={() => setVotingPower(prev => ({ ...prev, [p.id]: Math.max(1, Math.floor(memberPoints * 0.75)) }))}
                                className="px-2 py-0.5 text-[10px] font-bold bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded border border-[#2a2a2a] transition-colors"
                              >75%</button>
                              <button
                                onClick={() => setVotingPower(prev => ({ ...prev, [p.id]: memberPoints }))}
                                className="px-2 py-0.5 text-[10px] font-bold bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-800/30 transition-colors"
                              >MAX</button>
                            </div>
                            <span className="text-gray-600 text-[10px]">{memberPoints} pts</span>
                          </div>
                        </div>
                        {/* YES / NO buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => doVote(p.id, "yes")}
                            disabled={votingOn === p.id}
                            className="flex-1 py-2.5 text-sm font-bold bg-green-600/20 border border-green-600/40 text-green-400 rounded-lg hover:bg-green-600/30 transition-all disabled:opacity-50"
                          >
                            {votingOn === p.id ? "..." : `✅ YES (${votingPower[p.id] || memberPoints})`}
                          </button>
                          <button
                            onClick={() => doVote(p.id, "no")}
                            disabled={votingOn === p.id}
                            className="flex-1 py-2.5 text-sm font-bold bg-red-600/20 border border-red-600/40 text-red-400 rounded-lg hover:bg-red-600/30 transition-all disabled:opacity-50"
                          >
                            {votingOn === p.id ? "..." : `❌ NO (${votingPower[p.id] || memberPoints})`}
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {!memberHandle && p.status === "active" && (
                    <p className="text-gray-600 text-xs">Register in THE PACK to vote</p>
                  )}

                  {voteError && votingOn === p.id && (
                    <p className="text-red-400 text-xs mt-2">{voteError}</p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2a2a2a]">
                    <span className="text-gray-600 text-[10px]">Created {formatDate(p.createdAt)}</span>
                    <span className="text-gray-600 text-[10px]">Ends {formatDate(p.votingEndsAt)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* How it works */}
        <div className="mt-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 sm:p-8">
          <h2 className="font-creepster text-2xl sm:text-3xl text-red-500 mb-4">HOW IT WORKS</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">🗳️</span>
              <div>
                <p className="text-white font-bold">Choose Your Power</p>
                <p className="text-gray-500 text-xs">Decide how many points to commit per vote — from 1 to all your points</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">⏰</span>
              <div>
                <p className="text-white font-bold">Timed Proposals</p>
                <p className="text-gray-500 text-xs">Each proposal is open for {settings?.voting_duration_hours || 48} hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-white font-bold">Quorum + Approval</p>
                <p className="text-gray-500 text-xs">Need {settings?.quorum || 3} voters and {settings?.approval_threshold || 50}%+ to pass</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">🐺</span>
              <div>
                <p className="text-white font-bold">Alpha Proposes</p>
                <p className="text-gray-500 text-xs">Only the pack leader creates proposals</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
