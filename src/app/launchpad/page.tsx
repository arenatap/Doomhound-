"use client";

import { useState, useEffect, useCallback } from "react";
import { DoomShell } from "@/components/doom/doom-shell";
import { Footer } from "@/components/doom/footer";
import { ScrollReveal } from "@/components/doom/scroll-reveal";
import { motion, AnimatePresence } from "framer-motion";

// ===== TYPES =====
interface Application {
  id: string;
  projectName: string;
  contractAddress: string | null;
  description: string;
  supplyPercent: number;
  tokenAmount: string;
  arenaLink: string | null;
  contactInfo: string | null;
  shieldScore: number;
  shieldVerdict: string;
  shieldData: string;
  status: string;
  daoProposalId: string | null;
  airdropWallet: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  adminNotes: string | null;
  daoProposal?: {
    id: string;
    title: string;
    status: string;
    votingEndsAt: string;
  } | null;
}

// ===== HELPERS =====
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-gray-600/20", text: "text-gray-400", label: "Submitted" },
  shield_scanned: { bg: "bg-blue-600/20", text: "text-blue-400", label: "Scanned" },
  approved: { bg: "bg-green-600/20", text: "text-green-400", label: "Approved" },
  rejected: { bg: "bg-red-600/20", text: "text-red-400", label: "Rejected" },
  dao_voting: { bg: "bg-orange-600/20", text: "text-orange-400", label: "DAO Vote" },
  passed: { bg: "bg-yellow-600/20", text: "text-yellow-400", label: "Passed" },
  failed: { bg: "bg-red-600/20", text: "text-red-400", label: "Failed" },
  airdropping: { bg: "bg-purple-600/20", text: "text-purple-400", label: "Airdropping" },
  completed: { bg: "bg-cyan-600/20", text: "text-cyan-400", label: "Completed" },
};

function shieldEmoji(score: number): string {
  if (score < 0) return "⏳";
  if (score <= 30) return "🟢";
  if (score <= 70) return "🟡";
  return "🔴";
}

function shieldLabel(score: number): string {
  if (score < 0) return "Not scanned";
  if (score <= 30) return "Low Risk";
  if (score <= 70) return "Medium Risk";
  return "High Risk";
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.substring(0, len) + "...";
}

const LAUNCHPAD_WALLET = process.env.NEXT_PUBLIC_LAUNCHPAD_WALLET || "";

// ===== COMPONENT =====
export default function LaunchpadPage() {
  const [activeTab, setActiveTab] = useState<"apply" | "projects" | "how">("apply");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    projectName: "",
    contractAddress: "",
    description: "",
    supplyPercent: "",
    tokenAmount: "",
    arenaLink: "",
    contactInfo: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch applications
  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/launchpad?action=list");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Submit form
  const handleSubmit = async () => {
    if (!form.projectName || !form.description || !form.tokenAmount || !form.supplyPercent) {
      setSubmitResult({ success: false, message: "Fill in all required fields!" });
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/launchpad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult({
          success: true,
          message: `Application submitted! Shield Score: ${data.shieldResult?.riskScore ?? "N/A"} (${data.shieldResult?.verdict ?? "pending"})${data.shieldResult?.marketCapUsd ? ` | MC: $${Math.round(data.shieldResult.marketCapUsd).toLocaleString()}` : ""}`,
        });
        setForm({ projectName: "", contractAddress: "", description: "", supplyPercent: "", tokenAmount: "", arenaLink: "", contactInfo: "" });
        fetchApps();
      } else {
        setSubmitResult({ success: false, message: data.error || "Submission failed" });
      }
    } catch {
      setSubmitResult({ success: false, message: "Connection error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DoomShell>
      <div className="pt-16">
        {/* Header */}
        <section className="relative py-12 sm:py-16 bg-[#0a0a0a] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-flame" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 text-center">
            <ScrollReveal>
              <h1 className="font-creepster text-5xl sm:text-7xl md:text-8xl text-red-500 animate-glow-red mb-4">
                🚀 LAUNCHPAD
              </h1>
              <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-xl mx-auto">
                Launch your AVAX token with the Pack. AVAX Shield verified, DAO approved, airdropped to the community.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Tab Switcher */}
        <section className="bg-[#0a0a0a] border-b border-[#2a2a2a]">
          <div className="max-w-4xl mx-auto px-6 sm:px-10">
            <div className="flex gap-1">
              {[
                { key: "apply", label: "🚀 Apply", color: "red" },
                { key: "projects", label: "📋 Projects", color: "orange" },
                { key: "how", label: "ℹ️ How It Works", color: "purple" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as any);
                    if (tab.key === "projects") fetchApps();
                  }}
                  className={`px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab.key
                      ? `text-${tab.color}-400 border-b-2 border-${tab.color}-500 bg-${tab.color}-600/10`
                      : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="bg-[#0a0a0a] py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-6 sm:px-10 space-y-6">
            <AnimatePresence mode="wait">
              {/* ===== APPLY TAB ===== */}
              {activeTab === "apply" && (
                <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-8">
                    <h2 className="font-creepster text-2xl sm:text-3xl text-red-500 mb-6">🚀 APPLY FOR LAUNCHPAD</h2>
                    <p className="text-gray-400 text-sm mb-6">
                      Submit your AVAX token project. Free, no cost. Your contract will be automatically scanned by AVAX Shield.
                      Minimum requirement: <strong className="text-orange-400">$1K Market Cap</strong>.
                    </p>

                    <div className="space-y-4">
                      {/* Project Name */}
                      <div>
                        <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Project Name *</label>
                        <input
                          type="text"
                          value={form.projectName}
                          onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                          placeholder="e.g. MoonDoge"
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none transition-all"
                        />
                      </div>

                      {/* Contract Address */}
                      <div>
                        <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Contract Address (AVAX)</label>
                        <input
                          type="text"
                          value={form.contractAddress}
                          onChange={(e) => setForm({ ...form, contractAddress: e.target.value })}
                          placeholder="0x... (leave empty if pre-launch)"
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm placeholder:text-gray-600 focus:border-red-600 focus:outline-none transition-all"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Description *</label>
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Tell the Pack about your project..."
                          rows={4}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none transition-all resize-none"
                        />
                      </div>

                      {/* Supply % + Token Amount */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Supply % for Airdrop * (min 1%)</label>
                          <input
                            type="number"
                            value={form.supplyPercent}
                            onChange={(e) => setForm({ ...form, supplyPercent: e.target.value })}
                            placeholder="1"
                            min="1"
                            step="0.5"
                            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono placeholder:text-gray-600 focus:border-red-600 focus:outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Total Token Amount *</label>
                          <input
                            type="text"
                            value={form.tokenAmount}
                            onChange={(e) => setForm({ ...form, tokenAmount: e.target.value })}
                            placeholder="e.g. 1000000000"
                            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono placeholder:text-gray-600 focus:border-red-600 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Arena Link + Contact */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Arena Profile Link</label>
                          <input
                            type="text"
                            value={form.arenaLink}
                            onChange={(e) => setForm({ ...form, arenaLink: e.target.value })}
                            placeholder="https://arena.social/..."
                            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Contact (Telegram)</label>
                          <input
                            type="text"
                            value={form.contactInfo}
                            onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                            placeholder="@yourhandle"
                            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-3.5 text-sm sm:text-base font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
                      >
                        {submitting ? "SUBMITTING & SCANNING..." : "🚀 SUBMIT APPLICATION"}
                      </button>

                      {/* Result */}
                      {submitResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl border ${
                            submitResult.success
                              ? "bg-green-900/20 border-green-600/40 text-green-400"
                              : "bg-red-900/20 border-red-600/40 text-red-400"
                          }`}
                        >
                          <p className="text-sm font-bold">{submitResult.success ? "✅" : "❌"} {submitResult.message}</p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== PROJECTS TAB ===== */}
              {activeTab === "projects" && (
                <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-creepster text-2xl sm:text-3xl text-red-500">📋 LAUNCHPAD PROJECTS</h2>
                    <button onClick={fetchApps} className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
                      {loading ? "..." : "↻ Refresh"}
                    </button>
                  </div>

                  {loading && applications.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-3xl mb-3 animate-pulse">🚀</div>
                      <p className="text-gray-600 text-sm">Loading projects...</p>
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="text-gray-400 text-sm">No applications yet. Be the first to launch!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {applications.map((app) => {
                        const statusInfo = STATUS_COLORS[app.status] || STATUS_COLORS.submitted;
                        return (
                          <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#3a3a3a] transition-colors"
                          >
                            <div className="p-4 sm:p-5">
                              {/* Header row */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-creepster text-lg sm:text-xl text-white">{app.projectName}</h3>
                                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${statusInfo.bg} ${statusInfo.text}`}>
                                    {statusInfo.label}
                                  </span>
                                </div>
                                <span className="text-gray-600 text-[10px] sm:text-xs">{timeAgo(app.submittedAt)}</span>
                              </div>

                              {/* Description */}
                              <p className="text-gray-400 text-xs sm:text-sm mb-3">{truncate(app.description, 150)}</p>

                              {/* Stats row */}
                              <div className="flex flex-wrap gap-3 mb-3">
                                {/* Shield Score */}
                                <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5">
                                  <span className="text-sm">{shieldEmoji(app.shieldScore)}</span>
                                  <span className="text-xs text-gray-400">
                                    {app.shieldScore >= 0 ? `${app.shieldScore}/100` : "Not scanned"}
                                  </span>
                                  {app.shieldScore >= 0 && (
                                    <span className={`text-[10px] font-bold ${
                                      app.shieldScore <= 30 ? "text-green-400" : app.shieldScore <= 70 ? "text-yellow-400" : "text-red-400"
                                    }`}>
                                      {shieldLabel(app.shieldScore)}
                                    </span>
                                  )}
                                </div>

                                {/* Supply % */}
                                <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5">
                                  <span className="text-orange-400 text-sm">🎁</span>
                                  <span className="text-xs text-gray-400">{app.supplyPercent}% supply</span>
                                </div>

                                {/* Token Amount */}
                                <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5">
                                  <span className="text-yellow-400 text-sm">🪙</span>
                                  <span className="text-xs text-gray-400 font-mono">{app.tokenAmount}</span>
                                </div>

                                {/* Market Cap from shield data */}
                                {(() => {
                                  try {
                                    const sd = JSON.parse(app.shieldData);
                                    return sd.marketCapUsd ? (
                                      <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5">
                                        <span className="text-cyan-400 text-sm">📊</span>
                                        <span className={`text-xs font-bold ${sd.mcValid ? "text-green-400" : "text-red-400"}`}>
                                          ${Math.round(sd.marketCapUsd).toLocaleString()} MC
                                        </span>
                                      </div>
                                    ) : null;
                                  } catch { return null; }
                                })()}
                              </div>

                              {/* DAO Vote link */}
                              {app.status === "dao_voting" && app.daoProposal && (
                                <a
                                  href="/dao"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/20 border border-orange-600/40 text-orange-400 text-xs font-bold rounded-lg hover:bg-orange-600/30 transition-colors"
                                >
                                  🗳️ VOTE NOW →
                                </a>
                              )}

                              {/* Contract */}
                              {app.contractAddress && (
                                <p className="text-gray-600 text-[10px] font-mono mt-2 truncate">
                                  Contract: {app.contractAddress}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ===== HOW IT WORKS TAB ===== */}
              {activeTab === "how" && (
                <motion.div key="how" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-8">
                    <h2 className="font-creepster text-2xl sm:text-3xl text-red-500 mb-6">ℹ️ HOW IT WORKS</h2>

                    <div className="space-y-4">
                      {[
                        { step: "1", emoji: "📋", title: "Submit Application", desc: "Fill in the form with your project details. It's completely free — no cost to apply. Your contract will be automatically scanned by AVAX Shield for a risk assessment." },
                        { step: "2", emoji: "🛡️", title: "AVAX Shield Scan", desc: "Your token contract is analyzed by AVAX Shield automatically. It checks for honeypots, rug pull risks, liquidity locks, and more. Minimum $1K market cap required. A risk score from 0-100 is assigned." },
                        { step: "3", emoji: "👤", title: "Admin Review", desc: "The DOOMHOUND team reviews your application and the Shield results. If everything looks good, your project gets approved and a DAO proposal is created automatically." },
                        { step: "4", emoji: "🗳️", title: "Pack DAO Vote", desc: "The community votes for 24 hours. Your voting power is based on your mission points. Majority wins — the Pack decides which projects launch." },
                        { step: "5", emoji: "🎁", title: "Airdrop Distribution (50/50)", desc: "If the DAO votes YES, send your tokens to the Launchpad Wallet. The airdrop is split 50/50: half goes equally to the Top 20 on the leaderboard, and half goes proportionally to all holders with 1M+ $DOOMHOUND. This rewards active community members AND loyal holders." },
                      ].map((item) => (
                        <div key={item.step} className="flex gap-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                            <span className="text-lg">{item.emoji}</span>
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-sm sm:text-base mb-1">
                              Step {item.step}: {item.title}
                            </h3>
                            <p className="text-gray-400 text-xs sm:text-sm">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Launchpad Wallet */}
                  <div className="bg-gradient-to-br from-[#1a0a1a] to-[#1a1a1a] border border-purple-600/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">👛</span>
                      <h3 className="font-creepster text-xl text-purple-400">LAUNCHPAD WALLET</h3>
                    </div>
                    <p className="text-gray-400 text-xs mb-3">
                      Send your airdrop tokens to this wallet after the DAO approves your project.
                    </p>
                    {LAUNCHPAD_WALLET ? (
                      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 flex items-center gap-2">
                        <code className="text-green-400 text-xs sm:text-sm font-mono flex-1 truncate">{LAUNCHPAD_WALLET}</code>
                        <button
                          onClick={() => navigator.clipboard.writeText(LAUNCHPAD_WALLET).catch(() => {})}
                          className="px-3 py-1.5 text-[10px] font-bold bg-purple-600/20 border border-purple-600/30 text-purple-400 rounded hover:bg-purple-600/30 transition-colors"
                        >
                          COPY
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                        <p className="text-gray-500 text-xs">Wallet address coming soon...</p>
                      </div>
                    )}
                  </div>

                  {/* Requirements */}
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                    <h3 className="font-creepster text-lg text-orange-400 mb-3">⚡ REQUIREMENTS</h3>
                    <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
                      <li className="flex items-center gap-2">
                        <span className="text-green-400">✓</span> Minimum <strong className="text-orange-400">$1K Market Cap</strong> (verified via DEX Screener)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-400">✓</span> Minimum <strong className="text-orange-400">1% of supply</strong> for airdrop
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-400">✓</span> AVAX Shield scan — must pass risk assessment
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-400">✓</span> DAO majority vote required
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-400">✓</span> Zero cost — completely free to apply
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
      <Footer />
    </DoomShell>
  );
}
