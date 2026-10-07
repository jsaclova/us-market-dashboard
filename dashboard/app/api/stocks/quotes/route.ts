import { NextResponse } from "next/server";
import { STOCKS } from "@/lib/market/symbols";
import type { Quote } from "@/lib/market/types";

const UA = "Mozilla/5.0 (compatible; rt-stock-dashboard/1.0)";

let cache: { at: number; quotes: Record<string, Quote> } | null = null;
const TTL = 60 * 1000;

async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: { "User-Agent": UA }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const result = (await res.json())?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta ?? {};
    const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter(
      (v: unknown) => typeof v === "number",
    );
    if (closes.length < 1) return null;
    // 전일종가 = 끝에서 2번째 바 (당일 세션 등락 표시, 장마감 후에도 유지)
    const prevClose = closes.length >= 2 ? closes[closes.length - 2] : closes[closes.length - 1];
    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : closes[closes.length - 1];
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const change = r2(price - prevClose);
    return {
      symbol,
      price: r2(price),
      prevClose: r2(prevClose),
      change,
      changePct: r2((change / prevClose) * 100),
      dayHigh: r2(price),
      dayLow: r2(price),
      volume: 0,
      time: Date.now(),
      isMock: false,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ quotes: cache.quotes, cached: true });
  }
  const symbols = STOCKS.map((s) => s.symbol);
  const out = await Promise.all(symbols.map(fetchQuote));
  const quotes: Record<string, Quote> = { ...(cache?.quotes ?? {}) };
  out.forEach((q) => {
    if (q) quotes[q.symbol] = q;
  });
  if (Object.keys(quotes).length === 0) {
    return NextResponse.json({ error: "quotes unavailable" }, { status: 502 });
  }
  cache = { at: Date.now(), quotes };
  return NextResponse.json({ quotes, cached: false });
}
