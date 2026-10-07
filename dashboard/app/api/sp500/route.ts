import { NextResponse } from "next/server";
import data from "@/data/sp500.json";

export interface MapStock {
  symbol: string;
  name: string;
  sector: string;
  sub?: string;
  price: number;
  changePct: number;
  /** 시총 스냅샷 (USD). finviz식 박스 크기용 */
  cap?: number;
}

const UA = "Mozilla/5.0 (compatible; rt-stock-dashboard/1.0)";
const CONCURRENCY = 30;

let cache: { at: number; session: string; stocks: MapStock[] } | null = null;
const TTL = 60 * 1000;
const STALE = 30 * 60 * 1000;

function etDate(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

async function fetchOne(symbol: string): Promise<MapStock | null> {
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
    if (closes.length < 2) return null;
    const prev = closes[closes.length - 2];
    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : closes[closes.length - 1];
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return { symbol, name: "", sector: "", price: r2(price), changePct: r2(((price - prev) / prev) * 100) };
  } catch {
    return null;
  }
}

async function refresh(): Promise<MapStock[]> {
  const symbols = (data.stocks as { symbol: string }[]).map((s) => s.symbol);
  const out: MapStock[] = [];
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = await Promise.all(symbols.slice(i, i + CONCURRENCY).map(fetchOne));
    for (const q of batch) if (q) out.push(q);
  }
  const meta = new Map((data.stocks as { symbol: string; name: string; sector: string; sub?: string; cap?: number }[]).map((s) => [s.symbol, s]));
  const merged = out.map((q) => ({ ...q, name: meta.get(q.symbol)?.name ?? q.symbol, sector: meta.get(q.symbol)?.sector ?? "Other", sub: meta.get(q.symbol)?.sub ?? "", cap: meta.get(q.symbol)?.cap }));
  if (merged.length > 400) {
    cache = { at: Date.now(), session: etDate(Date.now()), stocks: merged };
  }
  return cache?.stocks ?? merged;
}

export async function GET() {
  const now = Date.now();
  const session = etDate(now);
  // 장 시작(날짜 변경) 시 무조건 초기화 후 새로 수집
  if (cache && cache.session === session && now - cache.at < TTL) {
    return NextResponse.json({ updated: data.updated, count: cache.stocks.length, stocks: cache.stocks, cached: true });
  }
  if (cache && cache.session === session && now - cache.at < STALE) {
    // 오래된 것이라도 즉시 반환 + 백그라운드 갱신
    void refresh();
    return NextResponse.json({ updated: data.updated, count: cache.stocks.length, stocks: cache.stocks, cached: true, stale: true });
  }
  const stocks = await refresh();
  return NextResponse.json({ updated: data.updated, count: stocks.length, stocks, cached: false });
}
