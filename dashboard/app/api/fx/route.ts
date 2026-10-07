import { NextResponse } from "next/server";

export interface FxPoint {
  date: string;
  value: number;
}

export interface FxItem {
  code: string;
  pair: string;
  symbol: string;
  per: number;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  history: FxPoint[];
}

export interface FxResponse {
  date: string;
  source: string;
  items: FxItem[];
  cached?: boolean;
  fallback?: boolean;
  stale?: boolean;
}

let cache: { at: number; fx: FxResponse } | null = null;
const TTL = 10 * 60 * 1000;

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

// KRW 크로스 정의: [통화코드, 표시페어, 기호, 1단위당 엔화 배율(100엔 고시용)]
const QUOTES = [
  { code: "USD", pair: "USD/KRW", symbol: "$", per: 1 },
  { code: "EUR", pair: "EUR/KRW", symbol: "€", per: 1 },
  { code: "JPY", pair: "JPY 100/KRW", symbol: "¥", per: 100 },
  { code: "GBP", pair: "GBP/KRW", symbol: "£", per: 1 },
] as const;

type Rates = Record<string, Record<string, number>>;

function buildItems(rates: Rates, source: string): FxResponse {
  const dates = Object.keys(rates).sort();
  // 4통화 모두 있는 영업일만 사용
  const full = dates.filter((d) => ["KRW", "EUR", "JPY", "GBP"].every((c) => rates[d]?.[c] > 0)).slice(-30);
  if (full.length < 2) throw new Error("not enough data");
  const cross = (get: (code: string) => number, code: string, per: number) =>
    r2((get("KRW") / (code === "USD" ? 1 : get(code))) * per);
  const items: FxItem[] = QUOTES.map((q) => {
    const history = full.map((date) => ({ date, value: cross((c) => rates[date][c], q.code, q.per) }));
    const price = history[history.length - 1].value;
    const prevClose = history[history.length - 2].value;
    const change = r2(price - prevClose);
    return {
      code: q.code,
      pair: q.pair,
      symbol: q.symbol,
      per: q.per,
      price,
      prevClose,
      change,
      changePct: r2((change / prevClose) * 100),
      history,
    };
  });
  return { date: full[full.length - 1], source, items };
}

async function fromFrankfurter(): Promise<FxResponse> {
  const res = await fetch(
    `https://api.frankfurter.dev/v1/${isoDaysAgo(60)}..${isoDaysAgo(0)}?base=USD&symbols=KRW,EUR,JPY,GBP`,
    { next: { revalidate: 600 } },
  );
  if (!res.ok) throw new Error(`frankfurter ${res.status}`);
  const data = await res.json();
  return buildItems(data.rates ?? {}, "Frankfurter/ECB");
}

async function fromErApi(): Promise<FxResponse> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`er-api ${res.status}`);
  const data = await res.json();
  const r = data.rates ?? {};
  if (!r.KRW || !r.EUR || !r.JPY || !r.GBP) throw new Error("er-api empty");
  const today = new Date().toISOString().slice(0, 10);
  // 단일 스냅샷 → 히스토리 없음, 전일대비 0
  const items: FxItem[] = QUOTES.map((q) => {
    const price = r2((r.KRW / (q.code === "USD" ? 1 : r[q.code])) * q.per);
    return { code: q.code, pair: q.pair, symbol: q.symbol, per: q.per, price, prevClose: price, change: 0, changePct: 0, history: [] };
  });
  return { date: today, source: "ExchangeRate-API", items };
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ ...cache.fx, cached: true });
  }
  try {
    const fx = await fromFrankfurter();
    cache = { at: Date.now(), fx };
    return NextResponse.json({ ...fx, cached: false });
  } catch {
    try {
      const fx = await fromErApi();
      cache = { at: Date.now(), fx };
      return NextResponse.json({ ...fx, cached: false, fallback: true });
    } catch {
      if (cache) return NextResponse.json({ ...cache.fx, cached: true, stale: true });
      return NextResponse.json({ error: "fx unavailable" }, { status: 502 });
    }
  }
}
