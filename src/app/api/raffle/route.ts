import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ===== RAFFLE CONSTANTS =====
const DEFAULT_PRIZE = 100_000; // 100K $DOOMHOUND per raffle
const TICKET_PRICE = 50;       // 50 points per ticket
const MAX_TICKETS_PER_PURCHASE = 10;

// ===== GET: Current raffle info, user tickets, past winners =====
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "current": {
        // Get the current open raffle, or create one if none exists
        let raffle = await db.raffle.findFirst({
          where: { status: "open" },
          orderBy: { createdAt: "desc" },
          include: {
            tickets: {
              include: {
                member: {
                  select: { handle: true, userName: true, profilePic: true },
                },
              },
            },
          },
        });

        if (!raffle) {
          // Auto-create a new raffle for this week
          const now = new Date();
          const romeTz = "Europe/Rome";
          const romeDate = new Date(now.toLocaleString("en-US", { timeZone: romeTz }));
          const dayOfWeek = romeDate.getDay();
          const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
          const endDate = new Date(romeDate);
          endDate.setDate(endDate.getDate() + daysUntilSunday);
          endDate.setHours(23, 59, 59, 999);

          // Check for rollover from previous undrawn raffles
          const previousRaffle = await db.raffle.findFirst({
            where: { status: "closed", winnerHandle: null },
            orderBy: { createdAt: "desc" },
          });
          const rolledOver = !!previousRaffle;
          const prizeAmount = previousRaffle
            ? previousRaffle.prizeAmount + DEFAULT_PRIZE
            : DEFAULT_PRIZE;

          raffle = await db.raffle.create({
            data: {
              prizeAmount,
              ticketPrice: TICKET_PRICE,
              startDate: now,
              endDate,
              status: "open",
              rolledOver,
            },
            include: {
              tickets: {
                include: {
                  member: {
                    select: { handle: true, userName: true, profilePic: true },
                  },
                },
              },
            },
          });
        }

        // Calculate total tickets sold
        const totalTickets = raffle.tickets.reduce((sum, t) => sum + t.quantity, 0);

        // Unique participants
        const participants = new Set(raffle.tickets.map((t) => t.memberHandle));

        // Get user-specific info if handle provided
        const handle = searchParams.get("handle");
        let userTickets = 0;
        if (handle) {
          const cleanH = handle.replace("@", "").trim().toLowerCase();
          userTickets = raffle.tickets
            .filter((t) => t.memberHandle === cleanH)
            .reduce((sum, t) => sum + t.quantity, 0);
        }

        return NextResponse.json({
          raffle: {
            id: raffle.id,
            prizeAmount: raffle.prizeAmount,
            ticketPrice: raffle.ticketPrice,
            startDate: raffle.startDate,
            endDate: raffle.endDate,
            status: raffle.status,
            rolledOver: raffle.rolledOver,
            totalTickets,
            participants: participants.size,
          },
          userTickets,
          tickets: raffle.tickets,
        });
      }

      case "past_winners": {
        const pastRaffles = await db.raffle.findMany({
          where: { status: "drawn", winnerHandle: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            tickets: {
              select: { memberHandle: true, quantity: true },
            },
          },
        });

        const winners = await Promise.all(
          pastRaffles.map(async (r) => {
            const winner = r.winnerHandle
              ? await db.packMember.findUnique({
                  where: { handle: r.winnerHandle },
                  select: { handle: true, userName: true, profilePic: true },
                })
              : null;
            const totalTickets = r.tickets.reduce((sum, t) => sum + t.quantity, 0);
            return {
              id: r.id,
              prizeAmount: r.prizeAmount,
              endDate: r.endDate,
              winner,
              totalTickets,
              participants: new Set(r.tickets.map((t) => t.memberHandle)).size,
            };
          })
        );

        return NextResponse.json({ winners });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["current", "past_winners"],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Raffle API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== POST: Buy tickets, Draw winner (admin) =====
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, handle, quantity, adminPassword } = body;

  try {
    switch (action) {
      // ===== BUY TICKETS =====
      case "buy_tickets": {
        if (!handle) {
          return NextResponse.json({ error: "handle is required" }, { status: 400 });
        }
        const cleanHandle = handle.replace("@", "").trim().toLowerCase();
        const ticketQty = Math.min(Math.max(quantity || 1, 1), MAX_TICKETS_PER_PURCHASE);

        // Get the member
        const member = await db.packMember.findUnique({
          where: { handle: cleanHandle },
        });
        if (!member) {
          return NextResponse.json({ error: "Not registered" }, { status: 404 });
        }

        // Get current open raffle
        const raffle = await db.raffle.findFirst({
          where: { status: "open" },
          orderBy: { createdAt: "desc" },
        });
        if (!raffle) {
          return NextResponse.json({ error: "No active raffle right now" }, { status: 400 });
        }

        // Check if raffle is still open
        if (new Date() > new Date(raffle.endDate)) {
          return NextResponse.json({ error: "This raffle has closed! Wait for the next one." }, { status: 400 });
        }

        const totalCost = ticketQty * raffle.ticketPrice;

        // Check if member has enough points
        if (member.points < totalCost) {
          return NextResponse.json({
            error: `Not enough points! You need ${totalCost} pts for ${ticketQty} ticket${ticketQty > 1 ? "s" : ""} (you have ${member.points})`,
            pointsNeeded: totalCost,
            pointsHave: member.points,
          }, { status: 400 });
        }

        // Deduct points and create ticket
        const updatedMember = await db.packMember.update({
          where: { handle: cleanHandle },
          data: { points: { decrement: totalCost } },
        });

        await db.raffleTicket.create({
          data: {
            raffleId: raffle.id,
            memberHandle: cleanHandle,
            quantity: ticketQty,
            pointsSpent: totalCost,
          },
        });

        await db.activityLog.create({
          data: {
            memberHandle: cleanHandle,
            type: "raffle_ticket",
            description: `Bought ${ticketQty} raffle ticket${ticketQty > 1 ? "s" : ""} for ${totalCost} pts`,
            points: -totalCost,
          },
        });

        // Get total user tickets for this raffle
        const allUserTickets = await db.raffleTicket.aggregate({
          where: { raffleId: raffle.id, memberHandle: cleanHandle },
          _sum: { quantity: true },
        });

        // Get raffle total tickets
        const allTickets = await db.raffleTicket.aggregate({
          where: { raffleId: raffle.id },
          _sum: { quantity: true },
        });

        const fullMember = await db.packMember.findUnique({
          where: { handle: cleanHandle },
          include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
        });

        return NextResponse.json({
          success: true,
          ticketsBought: ticketQty,
          pointsSpent: totalCost,
          remainingPoints: updatedMember.points,
          userTotalTickets: allUserTickets._sum.quantity || 0,
          raffleTotalTickets: allTickets._sum.quantity || 0,
          member: fullMember,
        });
      }

      // ===== DRAW WINNER (admin only) =====
      case "draw": {
        // Simple admin auth
        if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== "doomhound2026") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const raffle = await db.raffle.findFirst({
          where: { status: "open" },
          orderBy: { createdAt: "desc" },
          include: { tickets: true },
        });

        if (!raffle) {
          return NextResponse.json({ error: "No open raffle to draw" }, { status: 400 });
        }

        if (raffle.tickets.length === 0) {
          // No tickets sold — close raffle without winner, prize rolls over
          const closedRaffle = await db.raffle.update({
            where: { id: raffle.id },
            data: { status: "closed" },
          });
          return NextResponse.json({
            message: "No tickets sold — raffle closed. Prize will roll over to next week.",
            raffle: closedRaffle,
          });
        }

        // Weighted random draw — each ticket is a chance
        const totalTickets = raffle.tickets.reduce((sum, t) => sum + t.quantity, 0);
        let random = Math.random() * totalTickets;
        let winnerHandle = raffle.tickets[0].memberHandle;

        for (const ticket of raffle.tickets) {
          random -= ticket.quantity;
          if (random <= 0) {
            winnerHandle = ticket.memberHandle;
            break;
          }
        }

        // Update raffle with winner
        await db.raffle.update({
          where: { id: raffle.id },
          data: {
            status: "drawn",
            winnerHandle,
          },
        });

        // Update winner's pending winnings
        await db.packMember.update({
          where: { handle: winnerHandle },
          data: {
            pendingWinnings: { increment: raffle.prizeAmount },
          },
        });

        // Log activity
        await db.activityLog.create({
          data: {
            memberHandle: winnerHandle,
            type: "raffle_win",
            description: `Won the Pack Raffle! ${formatRaffleBalance(raffle.prizeAmount)} $DOOMHOUND`,
            points: 0,
          },
        });

        // Auto-create next raffle
        const now = new Date();
        const romeTz = "Europe/Rome";
        const romeDate = new Date(now.toLocaleString("en-US", { timeZone: romeTz }));
        const dayOfWeek = romeDate.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const nextEndDate = new Date(romeDate);
        nextEndDate.setDate(nextEndDate.getDate() + daysUntilSunday);
        nextEndDate.setHours(23, 59, 59, 999);

        const nextRaffle = await db.raffle.create({
          data: {
            prizeAmount: DEFAULT_PRIZE,
            ticketPrice: TICKET_PRICE,
            startDate: now,
            endDate: nextEndDate,
            status: "open",
          },
        });

        const winner = await db.packMember.findUnique({
          where: { handle: winnerHandle },
          select: { handle: true, userName: true, profilePic: true },
        });

        return NextResponse.json({
          success: true,
          winnerHandle,
          winnerName: winner?.userName,
          winnerPic: winner?.profilePic,
          prizeAmount: raffle.prizeAmount,
          totalTickets,
          participants: new Set(raffle.tickets.map((t) => t.memberHandle)).size,
          nextRaffleId: nextRaffle.id,
        });
      }

      // ===== CREATE NEW RAFFLE (admin) =====
      case "create": {
        if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== "doomhound2026") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const prizeAmount = body.prizeAmount || DEFAULT_PRIZE;
        const ticketPrice = body.ticketPrice || TICKET_PRICE;

        // Close any existing open raffles
        await db.raffle.updateMany({
          where: { status: "open" },
          data: { status: "closed" },
        });

        const now = new Date();
        const romeTz = "Europe/Rome";
        const romeDate = new Date(now.toLocaleString("en-US", { timeZone: romeTz }));
        const dayOfWeek = romeDate.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const endDate = new Date(romeDate);
        endDate.setDate(endDate.getDate() + daysUntilSunday);
        endDate.setHours(23, 59, 59, 999);

        const raffle = await db.raffle.create({
          data: {
            prizeAmount,
            ticketPrice,
            startDate: now,
            endDate,
            status: "open",
          },
        });

        return NextResponse.json({ raffle });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["buy_tickets", "draw", "create"],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Raffle API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatRaffleBalance(balance: number): string {
  if (balance >= 1_000_000) return `${(balance / 1_000_000).toFixed(1)}M`;
  if (balance >= 1_000) return `${(balance / 1_000).toFixed(0)}K`;
  return balance.toFixed(0);
}
