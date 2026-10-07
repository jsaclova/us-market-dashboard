import { NextResponse } from "next/server";

export interface IndexHistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface IntradayPoint {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  vol: number;
}

export interface IndexFuture {
  symbol: string;
  name: string;
  /** CME/CBOT 선물 실시간가 */
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  time: number;
  history: IndexHistoryPoint[];
  intraday: IntradayPoint[];
}

const MAP = [
  { symbol: "SP500", name: "S&P 500", yahoo: "ES=F" },
  { symbol: "NASDAQ", name: "Nasdaq 100", yahoo: "NQ=F" },
  { symbol: "DJI", name: "Dow Jones", yahoo: "YM=F" },
];

let cache: { at: number; data: IndexFuture[] } | null = null;
const TTL = 30 * 1000;
const UA = "Mozilla/5.0 (compatible; rt-stock-dashboard/1.0)";

async function getJson(url: string) {
  // Next 기본 fetch 캐시(force-cache) 방지 — 모듈 TTL 캐시로만 관리
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

/**
 * 전일종가 = 히스토리 끝에서 2번째 바 (당일 세션 등락 표시용).
 * Yahoo meta.chartPreviousClose는 range에 따라 엉뚱한 값을 줄 때가 있어 사용하지 않음.
 */
function pickPrev(closes: number[]): number | null {
  if (closes.length >= 2) return closes[closes.length - 2];
  if (closes.length === 1) return closes[0];
  return null;
}

async function fetchOne(m: (typeof MAP)[number]): Promise<IndexFuture | null> {
  try {
    const [daily, intra] = await Promise.all([
      getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${m.yahoo}?interval=1d&range=3mo`),
      getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${m.yahoo}?interval=5m&range=1d`),
    ]);
    const result = daily?.chart?.result?.[0];
    if (!result) return null;
    const ts: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const history: IndexHistoryPoint[] = [];
    ts.forEach((t: number, i: number) => {
      const c = q.close?.[i];
      if (typeof c !== "number") return;
      history.push({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        open: typeof q.open?.[i] === "number" ? q.open[i] : c,
        high: typeof q.high?.[i] === "number" ? q.high[i] : c,
        low: typeof q.low?.[i] === "number" ? q.low[i] : c,
        close: c,
      });
    });

    const prevClose = pickPrev(history.map((h) => h.close));
    if (typeof prevClose !== "number") return null;
    const r2 = (n: number) => Math.round(n * 100) / 100;

    // 당일 5분봉 (이상 틱 제거)
    const intraday: IntradayPoint[] = [];
    let live = 0;
    let liveTime = 0;
    const ir = intra?.chart?.result?.[0];
    if (ir) {
      const its: number[] = ir.timestamp ?? [];
      const iq = ir.indicators?.quote?.[0] ?? {};
      const at = (a: (number | null)[] | undefined, i: number): number | null =>
        typeof a?.[i] === "number" ? (a as number[])[i] : null;
      its.forEach((t, i) => {
        const c = at(iq.close, i);
        if (c === null) return;
        if (Math.abs(c - prevClose) / prevClose > 0.04) return;
        intraday.push({
          t,
          o: at(iq.open, i) ?? c,
          h: at(iq.high, i) ?? c,
          l: at(iq.low, i) ?? c,
          c,
          vol: at(iq.volume, i) ?? 0,
        });
        live = c;
        liveTime = t;
      });
    }

    const price = live ? r2(live) : r2(history[history.length - 1]?.close ?? NaN);
    if (typeof price !== "number" || Number.isNaN(price)) return null;
    return {
      symbol: m.symbol,
      name: m.name,
      price,
      prevClose: r2(prevClose),
      change: r2(price - prevClose),
      changePct: r2(((price - prevClose) / prevClose) * 100),
      time: (liveTime || Date.now() / 1000) * 1000,
      history: history.slice(-66),
      intraday: intraday.slice(-300),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ indices: cache.data, cached: true });
  }
  const data = (await Promise.all(MAP.map(fetchOne))).filter((x): x is IndexFuture => x !== null);
  if (data.length === 0) {
    if (cache) return NextResponse.json({ indices: cache.data, cached: true, stale: true });
    return NextResponse.json({ error: "indices unavailable" }, { status: 502 });
  }
  cache = { at: Date.now(), data };
  return NextResponse.json({ indices: data, cached: false });
}
