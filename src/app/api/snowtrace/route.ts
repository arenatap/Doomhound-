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
        // Snowtrace uses "tokeninfo" not "getToken"
        const data = await snowtraceGet({
          module: "token",
          action: "tokeninfo",
          contractaddress: DOOMHOUND_CONTRACT,
        });

        if (data.status === "1" && data.message === "OK" && Array.isArray(data.result) && data.result.length > 0) {
          const token = data.result[0];
          return NextResponse.json({
            name: token.tokenName,
            symbol: token.symbol,
            decimals: token.divisor,
            supply: token.totalSupply,
            // holderCount not provided by tokeninfo, get from holders list count
          });
        }

        return NextResponse.json({ error: "Token not found" }, { status: 404 });
      }

      // Get total holder count (from tokenholderlist with large offset)
      case "holdercount": {
        const data = await snowtraceGet({
          module: "token",
          action: "tokenholderlist",
          contractaddress: DOOMHOUND_CONTRACT,
          page: "1",
          offset: "1", // minimal data, we just want the count
        });

        // Snowtrace doesn't return total count directly, so we fetch a larger set
        const fullData = await snowtraceGet({
          module: "token",
          action: "tokenholderlist",
          contractaddress: DOOMHOUND_CONTRACT,
          page: "1",
          offset: "100",
        });

        const holderCount = (fullData.status === "1" && Array.isArray(fullData.result))
          ? fullData.result.length
          : (data.status === "1" && Array.isArray(data.result) ? data.result.length : 0);

        return NextResponse.json({ holderCount });
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

      // Get burn transactions (transfers to 0xdead address)
      case "burns": {
        const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
        const data = await snowtraceGet({
          module: "account",
          action: "tokentx",
          contractaddress: DOOMHOUND_CONTRACT,
          address: DEAD_ADDRESS,
          page: "1",
          offset: "50",
          sort: "desc",
        });

        if (data.status === "1" && Array.isArray(data.result)) {
          const burns = (data.result || []).map((t: any) => ({
            hash: t.hash,
            from: t.from,
            value: t.value,
            decimals: t.tokenDecimal || 18,
            timeStamp: t.timeStamp,
            blockNumber: t.blockNumber,
          }));

          // Calculate total burned (sum of all values)
          let totalBurned = BigInt(0);
          for (const b of burns) {
            try { totalBurned += BigInt(b.value); } catch {}
          }

          // Convert from wei to tokens
          const divisor = BigInt(10) ** BigInt(18);
          const totalBurnedTokens = Number(totalBurned / divisor) + Number(totalBurned % divisor) / Number(divisor);

          return NextResponse.json({
            burns,
            totalBurnedTokens,
            burnCount: burns.length,
          });
        }

        return NextResponse.json({ burns: [], totalBurnedTokens: 0, burnCount: 0 });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action", availableActions: ["holders", "info", "holdercount", "transfers", "burns"] },
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
