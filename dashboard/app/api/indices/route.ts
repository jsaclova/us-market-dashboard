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
  /** finviz식 ETF 파생 실시간가 */
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  time: number;
  history: IndexHistoryPoint[];
  intraday: IntradayPoint[];
}

const MAP = [
  { symbol: "SP500", name: "S&P 500", yahoo: "^GSPC", etf: "SPY" },
  { symbol: "NASDAQ", name: "Nasdaq", yahoo: "^IXIC", etf: "QQQ" },
  { symbol: "DJI", name: "Dow Jones", yahoo: "^DJI", etf: "DIA" },
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
    const [daily, etfDaily, etfIntra] = await Promise.all([
      getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(m.yahoo)}?interval=1d&range=3mo`),
      getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${m.etf}?interval=1d&range=5d`),
      getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${m.etf}?interval=1m&range=1d&includePrePost=true`),
    ]);
    const result = daily?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta ?? {};
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

    const indexCloses = history.map((h) => h.close);
    const indexPrev = pickPrev(indexCloses);
    const etfResult = etfDaily?.chart?.result?.[0];
    const etfCloses: number[] = (etfResult?.indicators?.quote?.[0]?.close ?? []).filter(
      (v: unknown) => typeof v === "number",
    );
    const etfPrev = pickPrev(etfCloses);
    if (typeof indexPrev !== "number" || typeof etfPrev !== "number" || etfPrev === 0) return null;
    const ratio = indexPrev / etfPrev;

    // ETF 인트라데이 → 지수 스케일로 환산 (finviz ETF DERIVED 방식)
    const intraday: IntradayPoint[] = [];
    let etfLive: number | null = null;
    let etfTime = 0;
    const ir = etfIntra?.chart?.result?.[0];
    if (ir) {
      const its: number[] = ir.timestamp ?? [];
      const iq = ir.indicators?.quote?.[0] ?? {};
      const at = (a: (number | null)[] | undefined, i: number): number | null =>
        typeof a?.[i] === "number" ? (a as number[])[i] : null;
      its.forEach((t, i) => {
        const c = at(iq.close, i);
        if (c === null) return;
        // 이상 틱 제거 (스케일 후 지수 기준 4% 이상 이탈)
        if (Math.abs(c * ratio - indexPrev) / indexPrev > 0.04) return;
        const sc = (v: number | null) => (v === null ? Math.round(c * ratio * 100) / 100 : Math.round(v * ratio * 100) / 100);
        intraday.push({
          t,
          o: sc(at(iq.open, i)),
          h: sc(at(iq.high, i)),
          l: sc(at(iq.low, i)),
          c: sc(c),
          vol: at(iq.volume, i) ?? 0,
        });
        etfLive = c;
        etfTime = t;
      });
    }

    const r2 = (n: number) => Math.round(n * 100) / 100;
    const price = etfLive !== null ? r2(etfLive * ratio) : r2(history[history.length - 1]?.close ?? NaN);
    if (typeof price !== "number") return null;
    return {
      symbol: m.symbol,
      name: m.name,
      price,
      prevClose: r2(indexPrev),
      change: r2(price - indexPrev),
      changePct: r2(((price - indexPrev) / indexPrev) * 100),
      time: (etfTime || Date.now() / 1000) * 1000,
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
