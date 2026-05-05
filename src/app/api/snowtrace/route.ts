import { NextRequest, NextResponse } from "next/server";

const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY || "";
const SNOWTRACE_BASE = "https://api.snowtrace.io/api";
const DOOMHOUND_CONTRACT =
  process.env.DOOMHOUND_CONTRACT || "0xE99ad8A718F16C4B97D6aB2DfD6c226072CA9dBb";

async function snowtraceGet(params: Record<string, string>) {
  const url = new URL(SNOWTRACE_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (SNOWTRACE_API_KEY) url.searchParams.set("apikey", SNOWTRACE_API_KEY);

  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Snowtrace API error: ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "holders";

  try {
    switch (action) {
      case "holders": {
        const data = await snowtraceGet({
          module: "token",
          action: "tokenholderlist",
          contractaddress: DOOMHOUND_CONTRACT,
          page: "1",
          offset: "50",
        });

        if (data.status === "1" && data.message === "OK") {
          const holders = (data.result || []).map((h: any) => ({
            address: h.TokenHolderAddress,
            balance: h.TokenHolderQuantity,
          }));
          return NextResponse.json({ holders, count: holders.length });
        }

        return NextResponse.json({ holders: [], count: 0, raw: data });
      }

      case "info": {
        const data = await snowtraceGet({
          module: "token",
          action: "getToken",
          contractaddress: DOOMHOUND_CONTRACT,
        });

        if (data.status === "1" && data.message === "OK") {
          return NextResponse.json({
            name: data.result?.tokenName,
            symbol: data.result?.symbol,
            decimals: data.result?.divisor,
            supply: data.result?.totalSupply,
            holderCount: data.result?.holderCount,
          });
        }

        return NextResponse.json({ error: "Token not found" }, { status: 404 });
      }

      case "transfers": {
        const data = await snowtraceGet({
          module: "account",
          action: "tokentx",
          contractaddress: DOOMHOUND_CONTRACT,
          page: "1",
          offset: "20",
          sort: "desc",
        });

        if (data.status === "1" && data.message === "OK") {
          const transfers = (data.result || []).map((t: any) => ({
            hash: t.hash,
            from: t.from,
            to: t.to,
            value: t.value,
            decimals: t.tokenDecimal,
            timeStamp: t.timeStamp,
          }));
          return NextResponse.json({ transfers });
        }

        return NextResponse.json({ transfers: [] });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action", availableActions: ["holders", "info", "transfers"] },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Snowtrace API error:", error);
    return NextResponse.json(
      { error: error.message || "Snowtrace API request failed" },
      { status: 500 }
    );
  }
}
