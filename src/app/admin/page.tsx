"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ===== TYPES =====
interface PendingPrize {
  handle: string;
  userName: string;
  profilePic: string;
  walletAddress: string | null;
  pendingWinnings: number;
  totalWheelSpins: number;
  totalWheelWinnings: number;
  lastWheelSpin: string | null;
}

interface WheelStats {
  totalSpins: number;
  totalWon: number;
  totalPending: number;
  totalSent: number;
  uniqueSpinners: number;
  pendingCount: number;
}

interface ActivityItem {
  id: string;
  description: string;
  createdAt: string;
  member: {
    handle: string;
    userName: string;
    profilePic: string;
    walletAddress: string | null;
    pendingWinnings: number;
    prizeSent: boolean;
  };
}

// ===== HELPERS =====
function formatBalance(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(2)}M`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(1)}K`;
  return b.toFixed(0);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortWallet(addr: string | null): string {
  if (!addr) return "No wallet";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ===== SESSION =====const SESSION_KEY = "doomhound_admin";

function getPassword(): string | null {
  if (typeof window === "undefined") return null;
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
function savePassword(p: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, p);
}
function clearPassword() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

// ===== API HELPERS =====
async function adminGet(action: string, password: string, params?: string) {
  const url = params ? `/api/admin?action=${action}&${params}` : `/api/admin?action=${action}`;
  const res = await fetch(url, {
    headers: { "X-Admin-Password": password },
  });
  return res.json();
}

async function adminPost(action: string, password: string, body?: Record<string, any>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, password, ...body }),
  });
  return res.json();
}

// ===== COMPONENT =====
export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [storedPw, setStoredPw] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingPrize[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [stats, setStats] = useState<WheelStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [confirmMark, setConfirmMark] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Restore session
  useEffect(() => {
    const p = getPassword();
    if (p) {
      setStoredPw(p);
      adminPost("verify", p).then((data) => {
        if (data.valid) {
          setAuthed(true);
          setPassword(p);
        } else {
          clearPassword();
        }
      });
    }
  }, []);

  // Load data when authed
  useEffect(() => {
    if (!authed || !storedPw) return;
    loadData(storedPw);
    const interval = setInterval(() => loadData(storedPw), 30000);
    return () => clearInterval(interval);
  }, [authed, storedPw]);

  const loadData = useCallback(async (pw: string) => {
    setLoading(true);
    try {
      const [pendingData, statsData, recentData] = await Promise.all([
        adminGet("pending_prizes", pw),
        adminGet("stats", pw),
        adminGet("recent", pw, `filter=${activityFilter}`),
      ]);
      if (pendingData.pending) {
        setPending(pendingData.pending);
        setTotalPending(pendingData.totalPending);
      }
      if (statsData.totalSpins !== undefined) setStats(statsData);
      if (recentData.activities) setActivities(recentData.activities);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [activityFilter]);

  // Login
  const doLogin = useCallback(async () => {
    if (!password.trim()) return;
    const data = await adminPost("verify", password.trim());
    if (data.valid) {
      setAuthed(true);
      setStoredPw(password.trim());
      savePassword(password.trim());
      setAuthError(null);
    } else {
      setAuthError("Wrong password!");
    }
  }, [password]);

  // Mark as sent
  const markSent = useCallback(async (handle: string) => {
    if (!storedPw) return;
    const data = await adminPost("mark_sent", storedPw, { handle });
    if (data.success) {
      showToast(`Prize sent to @${handle}!`);
      loadData(storedPw);
    } else {
      showToast(data.error || "Failed");
    }
    setConfirmMark(null);
  }, [storedPw, loadData]);

  // Mark all as sent
  const markAllSent = useCallback(async () => {
    if (!storedPw) return;
    const data = await adminPost("mark_all_sent", storedPw);
    if (data.success) {
      showToast(`${data.count} prizes marked as sent!`);
      loadData(storedPw);
    } else {
      showToast(data.error || "Failed");
    }
    setConfirmAll(false);
  }, [storedPw, loadData]);

  // Copy wallet
  const copyWallet = useCallback(async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      showToast("Wallet copied!");
    } catch {
      showToast("Copy failed");
    }
  }, []);

  // Toast
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Logout
  const doLogout = useCallback(() => {
    clearPassword();
    setAuthed(false);
    setStoredPw(null);
    setPassword("");
  }, []);

  // ===== LOGIN SCREEN =====
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center animate-flame-border">
            <div className="text-5xl mb-4">🐺</div>
            <h1 className="font-creepster text-3xl sm:text-4xl text-red-500 mb-2">DOOMHOUND</h1>
            <p className="text-gray-500 text-sm mb-6">Admin Panel</p>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
              placeholder="Enter admin password"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-center text-sm placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all mb-4"
            />
            {authError && <p className="text-red-400 text-xs mb-3">{authError}</p>}
            <button
              onClick={doLogin}
              disabled={!password.trim()}
              className="w-full py-3 text-sm font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
            >
              ENTER
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== DASHBOARD =====
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="font-creepster text-3xl sm:text-4xl md:text-5xl text-red-500">
              DOOMHOUND ADMIN
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Wheel of Doom — Prize Management</p>
          </div>
          <button
            onClick={doLogout}
            className="px-3 py-1.5 text-xs bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
          >
            LOGOUT
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 text-center">
              <p className="text-white font-bold text-base sm:text-lg font-mono">{stats.totalSpins}</p>
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Total Spins</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 text-center">
              <p className="text-yellow-400 font-bold text-base sm:text-lg font-mono">{formatBalance(stats.totalWon)}</p>
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Total Won</p>
            </div>
            <div className="bg-[#1a1a1a] border border-red-600/30 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-red-400 font-bold text-base sm:text-lg font-mono">{formatBalance(stats.totalPending)}</p>
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Pending</p>
            </div>
            <div className="bg-[#1a1a1a] border border-green-600/30 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-green-400 font-bold text-base sm:text-lg font-mono">{formatBalance(stats.totalSent)}</p>
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Sent</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 text-center">
              <p className="text-white font-bold text-base sm:text-lg font-mono">{stats.uniqueSpinners}</p>
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Spinners</p>
            </div>
            <div className="bg-[#1a1a1a] border border-orange-600/30 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-orange-400 font-bold text-base sm:text-lg font-mono">{stats.pendingCount}</p>
              <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Unpaid</p>
            </div>
          </div>
        )}

        {/* Pending Prizes */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-creepster text-xl sm:text-2xl text-red-500">PENDING PRIZES</h2>
              {totalPending > 0 && (
                <span className="text-red-400 font-bold text-sm sm:text-base font-mono animate-pulse">
                  {formatBalance(totalPending)} $DOOMHOUND
                </span>
              )}
            </div>
            {pending.length > 1 && (
              <button
                onClick={() => setConfirmAll(true)}
                className="px-3 py-1.5 text-[10px] sm:text-xs font-bold bg-green-600/20 border border-green-600/40 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
              >
                MARK ALL SENT
              </button>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
              <p className="text-4xl mb-2">✅</p>
              <p className="text-gray-400 text-sm">No pending prizes! All caught up.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((prize) => (
                <motion.div
                  key={prize.handle}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#1a1a1a] border border-red-900/30 rounded-xl p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Profile */}
                    <img
                      src={prize.profilePic}
                      alt=""
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[#2a2a2a] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {/* Name & Handle */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-sm sm:text-base truncate">{prize.userName}</span>
                        <a
                          href={`https://arena.social/${prize.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-red-400 text-xs sm:text-sm transition-colors"
                        >
                          @{prize.handle}
                        </a>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-400 font-bold text-lg sm:text-xl font-mono">
                          {formatBalance(prize.pendingWinnings)}
                        </span>
                        <span className="text-yellow-400/60 text-xs sm:text-sm">$DOOMHOUND</span>
                      </div>

                      {/* Spin Date */}
                      <p className="text-gray-600 text-[10px] sm:text-xs mb-2">
                        Spun: {formatDate(prize.lastWheelSpin)}
                      </p>

                      {/* Wallet Address */}
                      {prize.walletAddress ? (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-gray-600 text-[10px] sm:text-xs flex-shrink-0">Wallet:</span>
                          <div className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 flex items-center gap-2 min-w-0">
                            <span className="text-gray-300 font-mono text-[10px] sm:text-xs truncate flex-1">
                              {prize.walletAddress}
                            </span>
                            <button
                              onClick={() => copyWallet(prize.walletAddress!)}
                              className="flex-shrink-0 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold bg-[#2a2a2a] hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded transition-colors"
                            >
                              COPY
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <span className="text-red-400/60 text-[10px] sm:text-xs">⚠️ No wallet linked</span>
                        </div>
                      )}

                      {/* Mark as Sent */}
                      {confirmMark === prize.handle ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">Sent {formatBalance(prize.pendingWinnings)} to @{prize.handle}?</span>
                          <button
                            onClick={() => markSent(prize.handle)}
                            className="px-3 py-1.5 text-[10px] sm:text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          >
                            ✅ YES
                          </button>
                          <button
                            onClick={() => setConfirmMark(null)}
                            className="px-3 py-1.5 text-[10px] sm:text-xs font-bold bg-[#2a2a2a] text-gray-400 rounded-lg hover:text-white transition-colors"
                          >
                            NO
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmMark(prize.handle)}
                          disabled={!prize.walletAddress}
                          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                            prize.walletAddress
                              ? "bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600/30"
                              : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                          }`}
                        >
                          ✅ MARK AS SENT
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Mark All Confirmation */}
        <AnimatePresence>
          {confirmAll && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
              onClick={() => setConfirmAll(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-[#1a1a1a] border border-red-600/40 rounded-xl p-6 max-w-sm w-full text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-white text-sm sm:text-base mb-1 font-bold">Mark ALL as sent?</p>
                <p className="text-gray-400 text-xs sm:text-sm mb-4">
                  This will mark {pending.length} pending prizes ({formatBalance(totalPending)} $DOOMHOUND) as sent.
                  <br />Make sure you actually sent the tokens!
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={markAllSent}
                    className="px-5 py-2 text-sm font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    ✅ YES, ALL SENT
                  </button>
                  <button
                    onClick={() => setConfirmAll(false)}
                    className="px-5 py-2 text-sm font-bold bg-[#2a2a2a] text-gray-400 rounded-lg hover:text-white transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Activity */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="font-creepster text-xl sm:text-2xl text-red-500">RECENT SPINS</h2>
            <div className="flex gap-1.5">
              {["all", "wins", "nothing", "respin"].map((f) => (
                <button
                  key={f}
                  onClick={() => setActivityFilter(f)}
                  className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all ${
                    activityFilter === f
                      ? "bg-red-600/20 border border-red-600/40 text-red-400"
                      : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center">
              <p className="text-gray-600 text-sm">No spins yet</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 sm:max-h-96 overflow-y-auto no-scrollbar">
              {activities.map((act) => {
                const isWin = act.description.includes("Won");
                const isRespin = act.description.includes("RE-SPIN");
                return (
                  <div
                    key={act.id}
                    className={`flex items-center gap-2 sm:gap-3 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border ${
                      isWin
                        ? "bg-yellow-900/10 border-yellow-600/20"
                        : isRespin
                          ? "bg-purple-900/10 border-purple-600/20"
                          : "bg-[#0a0a0a] border-[#2a2a2a]"
                    }`}
                  >
                    <img
                      src={act.member.profilePic}
                      alt=""
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-[#2a2a2a] flex-shrink-0"
                    />
                    <span className="text-gray-300 font-bold text-[10px] sm:text-xs">
                      @{act.member.handle}
                    </span>
                    <span className={`flex-1 truncate text-[10px] sm:text-xs ${
                      isWin ? "text-yellow-400" : isRespin ? "text-purple-400" : "text-gray-500"
                    }`}>
                      {act.description.replace("Wheel of Doom: ", "")}
                    </span>
                    {act.member.pendingWinnings > 0 && !act.member.prizeSent && (
                      <span className="text-red-400 text-[8px] sm:text-[10px] font-bold flex-shrink-0">UNPAID</span>
                    )}
                    {act.member.prizeSent && isWin && (
                      <span className="text-green-400 text-[8px] sm:text-[10px] font-bold flex-shrink-0">SENT</span>
                    )}
                    <span className="text-gray-600 text-[9px] sm:text-[10px] whitespace-nowrap flex-shrink-0">
                      {timeAgo(act.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-green-600/40 text-green-400 text-sm font-bold px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(0,255,0,0.15)] z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
