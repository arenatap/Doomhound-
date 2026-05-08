"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

// ===== TYPES =====
interface RaffleInfo {
  id: string;
  prizeAmount: number;
  ticketPrice: number;
  startDate: string;
  endDate: string;
  status: string;
  rolledOver: boolean;
  totalTickets: number;
  participants: number;
}

interface RaffleTicketInfo {
  id: string;
  memberHandle: string;
  quantity: number;
  pointsSpent: number;
  createdAt: string;
  member: {
    handle: string;
    userName: string;
    profilePic: string;
  };
}

interface PastWinner {
  id: string;
  prizeAmount: number;
  endDate: string;
  winner: { handle: string; userName: string; profilePic: string } | null;
  totalTickets: number;
  participants: number;
}

interface RaffleSectionProps {
  memberHandle: string;
  memberPoints: number;
  onPointsSpent: (updatedPoints: number) => void;
}

// ===== HELPERS =====
function formatBalance(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)}M`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(0)}K`;
  return b.toLocaleString();
}

function getTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "DRAWING SOON!";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ===== COMPONENT =====
export function RaffleSection({ memberHandle, memberPoints, onPointsSpent }: RaffleSectionProps) {
  const [raffle, setRaffle] = useState<RaffleInfo | null>(null);
  const [tickets, setTickets] = useState<RaffleTicketInfo[]>([]);
  const [userTickets, setUserTickets] = useState(0);
  const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
  const [ticketQty, setTicketQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);

  // Load raffle data
  const loadRaffle = useCallback(async () => {
    try {
      const res = await fetch(`/api/raffle?action=current&handle=${encodeURIComponent(memberHandle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.raffle) {
          setRaffle(data.raffle);
          setUserTickets(data.userTickets || 0);
          setTickets(data.tickets || []);
        }
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [memberHandle]);

  // Load past winners
  const loadPastWinners = useCallback(async () => {
    try {
      const res = await fetch("/api/raffle?action=past_winners");
      if (res.ok) {
        const data = await res.json();
        if (data.winners) setPastWinners(data.winners);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadRaffle();
    loadPastWinners();
  }, [loadRaffle, loadPastWinners]);

  // Countdown timer
  useEffect(() => {
    if (!raffle) return;
    const update = () => setTimeLeft(getTimeRemaining(raffle.endDate));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [raffle]);

  // Buy tickets
  const buyTickets = useCallback(async () => {
    if (!raffle || !memberHandle) return;
    setBuying(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/raffle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy_tickets",
          handle: memberHandle,
          quantity: ticketQty,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setUserTickets(data.userTotalTickets);
        setSuccessMsg(
          `🎟️ Bought ${data.ticketsBought} ticket${data.ticketsBought > 1 ? "s" : ""}! (${data.pointsSpent} pts spent — ${data.remainingPoints} remaining)`
        );
        onPointsSpent(data.remainingPoints);
        loadRaffle();
        // Auto-hide success after 4s
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setError("Failed to buy tickets");
    }
    setBuying(false);
  }, [raffle, memberHandle, ticketQty, onPointsSpent, loadRaffle]);

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-8 text-center">
          <p className="text-gray-500 text-sm animate-pulse">Loading raffle...</p>
        </div>
      </div>
    );
  }

  if (!raffle) return null;

  const totalCost = ticketQty * raffle.ticketPrice;
  const canAfford = memberPoints >= totalCost;
  const winChance = raffle.totalTickets > 0
    ? ((userTickets / raffle.totalTickets) * 100).toFixed(1)
    : "100.0";

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-flame-border">
      <div className="p-5 sm:p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-creepster text-2xl sm:text-3xl text-red-500">🎟️ PACK RAFFLE</h3>
          {raffle.rolledOver && (
            <span className="text-[10px] sm:text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-full font-bold">
              🔥 ROLLED OVER
            </span>
          )}
        </div>

        {/* Prize + Countdown Row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
          {/* Prize Pot */}
          <div className="bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d] border border-red-900/30 rounded-xl p-4 sm:p-5 text-center">
            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Prize Pot</p>
            <p className="font-creepster text-2xl sm:text-3xl md:text-4xl text-[#fcd34d]">
              {formatBalance(raffle.prizeAmount)}
            </p>
            <p className="text-gray-500 text-[10px] sm:text-xs">$DOOMHOUND</p>
          </div>

          {/* Countdown */}
          <div className="bg-gradient-to-br from-[#0d0a1a] to-[#0d0d0d] border border-purple-900/30 rounded-xl p-4 sm:p-5 text-center">
            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mb-1">Draws In</p>
            <p className="font-creepster text-2xl sm:text-3xl md:text-4xl text-purple-400">
              {timeLeft}
            </p>
            <p className="text-gray-500 text-[10px] sm:text-xs">Sunday 23:59 CET</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 mb-5">
          <div className="text-center">
            <p className="text-white font-bold text-sm sm:text-base font-mono">{raffle.totalTickets}</p>
            <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Tickets Sold</p>
          </div>
          <div className="w-px h-8 bg-[#2a2a2a]" />
          <div className="text-center">
            <p className="text-white font-bold text-sm sm:text-base font-mono">{raffle.participants}</p>
            <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Participants</p>
          </div>
          <div className="w-px h-8 bg-[#2a2a2a]" />
          <div className="text-center">
            <p className="text-orange-400 font-bold text-sm sm:text-base font-mono">{userTickets}</p>
            <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Your Tickets</p>
          </div>
          <div className="w-px h-8 bg-[#2a2a2a]" />
          <div className="text-center">
            <p className="text-green-400 font-bold text-sm sm:text-base font-mono">{winChance}%</p>
            <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Win Chance</p>
          </div>
        </div>

        {/* Your Win Chance Bar */}
        {raffle.totalTickets > 0 && userTickets > 0 && (
          <div className="mb-5">
            <div className="w-full h-3 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#2a2a2a]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (userTickets / raffle.totalTickets) * 100)}%`,
                  background: "linear-gradient(90deg, #f97316, #dc2626)",
                  boxShadow: "0 0 10px rgba(249,115,22,0.5)",
                }}
              />
            </div>
            <p className="text-gray-600 text-[9px] sm:text-[10px] mt-1 text-center">
              {userTickets} of {raffle.totalTickets} tickets = {winChance}% chance to win
            </p>
          </div>
        )}

        {/* Buy Tickets */}
        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 sm:p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs sm:text-sm font-bold">Buy Tickets</span>
            <span className="text-gray-500 text-[10px] sm:text-xs">
              {raffle.ticketPrice} pts each · You have <span className="text-white font-bold">{memberPoints}</span> pts
            </span>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setTicketQty(Math.max(1, ticketQty - 1))}
              className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white font-bold text-lg hover:border-red-600/50 transition-colors"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-white font-bold text-xl sm:text-2xl font-mono">{ticketQty}</span>
              <span className="text-gray-500 text-xs sm:text-sm ml-1.5">ticket{ticketQty > 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={() => setTicketQty(Math.min(10, Math.floor(memberPoints / raffle.ticketPrice), ticketQty + 1))}
              className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white font-bold text-lg hover:border-red-600/50 transition-colors"
            >
              +
            </button>
          </div>

          {/* Cost Preview */}
          <div className="flex items-center justify-between text-xs sm:text-sm mb-3">
            <span className="text-gray-500">Total cost:</span>
            <span className={`font-bold ${canAfford ? "text-white" : "text-red-400"}`}>
              {totalCost} pts
            </span>
          </div>

          <BloodSplash>
            <button
              onClick={buyTickets}
              disabled={!canAfford || buying || memberPoints < raffle.ticketPrice}
              className={`w-full px-4 py-3 text-sm sm:text-base font-bold rounded-lg transition-all ${
                canAfford && !buying && memberPoints >= raffle.ticketPrice
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                  : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
              }`}
            >
              {buying ? "⏳ BUYING..." : !canAfford ? "NOT ENOUGH POINTS" : `🎟️ BUY ${ticketQty} TICKET${ticketQty > 1 ? "S" : ""} (${totalCost} PTS)`}
            </button>
          </BloodSplash>
        </div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-900/20 border border-green-600/40 rounded-lg p-3 mb-4"
            >
              <p className="text-green-400 text-xs sm:text-sm font-bold">{successMsg}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-900/20 border border-red-600/40 rounded-lg p-3 mb-4"
            >
              <p className="text-red-400 text-xs sm:text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Participants Toggle */}
        {tickets.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="text-gray-500 text-[10px] sm:text-xs hover:text-gray-300 transition-colors"
            >
              {showParticipants ? "▲ Hide" : "▼ Show"} Participants ({raffle.participants})
            </button>
            <AnimatePresence>
              {showParticipants && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-1.5 overflow-hidden"
                >
                  {Array.from(new Map(tickets.map(t => [t.memberHandle, t])).values()).map((t) => (
                    <div key={t.memberHandle} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0a0a0a]">
                      <img src={t.member.profilePic} alt="" className="w-6 h-6 rounded-full border border-[#2a2a2a]" />
                      <span className="text-gray-300 text-xs flex-1">@{t.member.handle}</span>
                      <span className="text-orange-400 text-[10px] sm:text-xs font-mono">
                        {tickets.filter(x => x.memberHandle === t.memberHandle).reduce((s, x) => s + x.quantity, 0)} tkt{tickets.filter(x => x.memberHandle === t.memberHandle).reduce((s, x) => s + x.quantity, 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-orange-500/[0.03] border border-orange-500/10 rounded-lg p-3.5 text-left">
          <h4 className="font-creepster text-[#f97316] text-xs mb-2 tracking-wider">
            📖 How The Raffle Works
          </h4>
          <p className="text-gray-500 text-[11px] leading-relaxed mb-1">
            <strong className="text-gray-400">50 points = 1 ticket.</strong> Buy up to 10 tickets at a time. More tickets = higher chance to win!
          </p>
          <p className="text-gray-500 text-[11px] leading-relaxed mb-1">
            <strong className="text-gray-400">Draw every Sunday 23:59 CET.</strong> One random winner gets the prize pot in $DOOMHOUND!
          </p>
          <p className="text-gray-500 text-[11px] leading-relaxed">
            <strong className="text-gray-400">Points are deducted</strong> when you buy tickets. Earn more by checking in, verifying Arena activity, and posting!
          </p>
        </div>

        {/* Past Winners */}
        {pastWinners.length > 0 && (
          <div className="mt-5">
            <h4 className="font-creepster text-[#fbbf24] text-sm mb-3 tracking-wider text-center">
              🏆 PAST WINNERS
            </h4>
            <div className="space-y-2">
              {pastWinners.map((w) => (
                <div key={w.id} className="flex items-center gap-3 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                  {w.winner && (
                    <img src={w.winner.profilePic} alt="" className="w-8 h-8 rounded-full border border-yellow-600/50" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">
                      {w.winner ? `@${w.winner.handle}` : "Unknown"}
                    </p>
                    <p className="text-gray-500 text-[10px]">
                      {new Date(w.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {w.totalTickets} tickets
                    </p>
                  </div>
                  <span className="text-[#fcd34d] font-creepster text-sm">
                    {formatBalance(w.prizeAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
