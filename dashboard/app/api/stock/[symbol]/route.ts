import { NextResponse } from "next/server";
import type { Candle, Quote } from "@/lib/market/types";
import type { UTCTimestamp } from "lightweight-charts";

const UA = "Mozilla/5.0 (compatible; rt-stock-dashboard/1.0)";

interface StockData {
  symbol: string;
  quote: Quote;
  history: Candle[];
}

const histCache = new Map<string, { at: number; history: Candle[] }>();
const quoteCache = new Map<string, { at: number; quote: Quote }>();
const HIST_TTL = 60 * 60 * 1000;
const QUOTE_TTL = 30 * 1000;

async function fetchYahoo(symbol: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2y`,
    { headers: { "User-Agent": UA }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const result = (await res.json())?.chart?.result?.[0];
  if (!result) throw new Error("empty");
  return result as {
    meta: Record<string, number>;
    timestamp: number[];
    indicators: { quote: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }[] };
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  // 관리자 추가 종목도 허용 (Yahoo에 없으면 502)
  if (!/^[A-Z.]{1,7}$/.test(symbol)) {
    return NextResponse.json({ error: "bad symbol" }, { status: 400 });
  }

  try {
    const now = Date.now();
    const hc = histCache.get(symbol);
    const qc = quoteCache.get(symbol);
    let history = hc && now - hc.at < HIST_TTL ? hc.history : null;
    let quote = qc && now - qc.at < QUOTE_TTL ? qc.quote : null;

    if (!history || !quote) {
      const result = await fetchYahoo(symbol);
      const meta = result.meta ?? {};
      const ts: number[] = result.timestamp ?? [];
      const q = result.indicators?.quote?.[0] ?? {};
      const closes: number[] = [];
      const fresh: Candle[] = [];
      ts.forEach((t, i) => {
        const c = q.close?.[i];
        if (typeof c !== "number") return;
        closes.push(c);
        fresh.push({
          time: t as UTCTimestamp,
          open: typeof q.open?.[i] === "number" ? q.open[i]! : c,
          high: typeof q.high?.[i] === "number" ? q.high[i]! : c,
          low: typeof q.low?.[i] === "number" ? q.low[i]! : c,
          close: c,
          volume: typeof q.volume?.[i] === "number" ? q.volume[i]! : 0,
        });
      });
      if (fresh.length < 2) throw new Error("no history");

      // 전일종가 = 끝에서 2번째 바 (당일 세션 등락 표시, 장마감 후에도 유지)
      const prevClose = closes.length >= 2 ? closes[closes.length - 2] : closes[closes.length - 1];

      const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : fresh[fresh.length - 1].close;
      const r2 = (n: number) => Math.round(n * 100) / 100;
      const change = r2(price - prevClose);
      history = fresh.slice(-500);
      quote = {
        symbol,
        price: r2(price),
        prevClose: r2(prevClose),
        change,
        changePct: r2((change / prevClose) * 100),
        dayHigh: typeof meta.regularMarketDayHigh === "number" ? r2(meta.regularMarketDayHigh) : fresh[fresh.length - 1].high,
        dayLow: typeof meta.regularMarketDayLow === "number" ? r2(meta.regularMarketDayLow) : fresh[fresh.length - 1].low,
        volume: typeof meta.regularMarketVolume === "number" ? meta.regularMarketVolume : (fresh[fresh.length - 1].volume ?? 0),
        time: Date.now(),
        isMock: false,
      };
      histCache.set(symbol, { at: now, history });
      quoteCache.set(symbol, { at: now, quote });
    }

    const data: StockData = { symbol, quote, history };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "stock unavailable" }, { status: 502 });
  }
}
