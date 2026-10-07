import { NextResponse } from "next/server";

export interface YieldItem {
  tenor: string;
  price: number;
  prevClose: number;
  changeBp: number;
  open: number;
  high: number;
  low: number;
  time: string;
}

export interface MarketItem {
  code: string;
  name: string;
  unit: string;
  decimals: number;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  history: { date: string; value: number }[];
}

export interface MarketResponse {
  yields: YieldItem[];
  commodities: MarketItem[];
  fxMajors: MarketItem[];
  spread: SpreadInfo;
  sources: string[];
  cached?: boolean;
}

export interface SpreadInfo {
  /** 10Y-2Y 스프레드 (bp) */
  bp: number;
  inverted: boolean;
  history: { date: string; bp: number }[];
}

let cache: { at: number; data: MarketResponse } | null = null;
const TTL = 5 * 60 * 1000;
const UA = "Mozilla/5.0 (compatible; rt-stock-dashboard/1.0)";

// ---------- 미국 국채금리 (CNBC Tradeweb 실시간) ----------
async function fetchYields(): Promise<YieldItem[]> {
  const symbols = ["US2Y", "US10Y", "US20Y", "US30Y"];
  const tenors = ["2Y", "10Y", "20Y", "30Y"];
  const res = await fetch(
    `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${symbols.join("%7C")}&requestMethod=quick&noform=1&partnerId=2&fund=1&exthrs=1&output=json`,
    { headers: { "User-Agent": UA }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`cnbc ${res.status}`);
  const data = await res.json();
  const quotes = data?.FormattedQuoteResult?.FormattedQuote ?? [];
  const num = (s: unknown) => parseFloat(String(s).replace("%", "")) || 0;
  return quotes.map((q: Record<string, unknown>, i: number) => {
    const price = num(q.last);
    const prevClose = num(q.previous_day_closing);
    return {
      tenor: tenors[i] ?? String(q.symbol),
      price: Math.round(price * 1000) / 1000,
      prevClose: Math.round(prevClose * 1000) / 1000,
      changeBp: Math.round((price - prevClose) * 1000) / 10, // %p → bp
      open: num(q.open),
      high: num(q.high),
      low: num(q.low),
      time: String(q.last_timedate ?? ""),
    };
  });
}

// ---------- Yahoo 차트 (원자재·주요통화, 1개월 히스토리) ----------
const YAHOO_SYMBOLS: { code: string; name: string; unit: string; decimals: number; group: "commodities" | "fxMajors" }[] = [
  { code: "CL=F", name: "WTI유", unit: "$/bbl", decimals: 2, group: "commodities" },
  { code: "BZ=F", name: "브렌트유", unit: "$/bbl", decimals: 2, group: "commodities" },
  { code: "GC=F", name: "금", unit: "$/oz", decimals: 1, group: "commodities" },
  { code: "SI=F", name: "은", unit: "$/oz", decimals: 2, group: "commodities" },
  { code: "HG=F", name: "구리", unit: "$/lb", decimals: 3, group: "commodities" },
  { code: "NG=F", name: "천연가스", unit: "$/MMBtu", decimals: 3, group: "commodities" },
  { code: "DX-Y.NYB", name: "달러인덱스", unit: "pts", decimals: 2, group: "fxMajors" },
  { code: "EURUSD=X", name: "EUR/USD", unit: "", decimals: 4, group: "fxMajors" },
  { code: "JPY=X", name: "USD/JPY", unit: "¥", decimals: 2, group: "fxMajors" },
  { code: "GBPUSD=X", name: "GBP/USD", unit: "", decimals: 4, group: "fxMajors" },
];

async function fetchYahoo(def: (typeof YAHOO_SYMBOLS)[number]): Promise<MarketItem | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(def.code)}?interval=1d&range=1mo`,
      { headers: { "User-Agent": UA }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta ?? {};
    const ts: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const history: { date: string; value: number }[] = [];
    ts.forEach((t, i) => {
      const v = closes[i];
      if (typeof v === "number") {
        history.push({ date: new Date(t * 1000).toISOString().slice(0, 10), value: v });
      }
    });
    const vals = history.map((h) => h.value);
    const price = meta.regularMarketPrice ?? vals[vals.length - 1];
    // 전일종가 = 끝에서 2번째 바 (당일 세션 등락 표시)
    const prevClose = vals.length >= 2 ? vals[vals.length - 2] : meta.chartPreviousClose;
    if (typeof price !== "number" || typeof prevClose !== "number") return null;
    const r = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
    return {
      code: def.code,
      name: def.name,
      unit: def.unit,
      decimals: def.decimals,
      price: r(price, def.decimals),
      prevClose: r(prevClose, def.decimals),
      change: r(price - prevClose, def.decimals),
      changePct: r(((price - prevClose) / prevClose) * 100, 2),
      history: history.slice(-30),
    };
  } catch {
    return null;
  }
}

// ---------- 10Y-2Y 스프레드 (Yahoo 1개월 히스토리) ----------
async function fetchSpread(fallbackBp: number | null): Promise<SpreadInfo> {
  const empty: SpreadInfo = { bp: fallbackBp ?? 0, inverted: (fallbackBp ?? 0) < 0, history: [] };
  try {
    const [tnx, yy2] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=1mo`, { headers: { "User-Agent": UA }, cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/2YY%3DF?interval=1d&range=1mo`, { headers: { "User-Agent": UA }, cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ]);
    const series = (j: unknown): Map<string, number> => {
      const m = new Map<string, number>();
      const r = (j as { chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] } })?.chart?.result?.[0];
      (r?.timestamp ?? []).forEach((t, i) => {
        const v = r?.indicators?.quote?.[0]?.close?.[i];
        if (typeof v === "number") m.set(new Date(t * 1000).toISOString().slice(0, 10), v);
      });
      return m;
    };
    if (!tnx || !yy2) return empty;
    const a = series(tnx);
    const b = series(yy2);
    const history = [...a.keys()]
      .filter((d) => b.has(d))
      .sort()
      .slice(-30)
      .map((date) => ({ date, bp: Math.round((a.get(date)! - b.get(date)!) * 100 * 10) / 10 }));
    if (history.length === 0) return empty;
    const bp = history[history.length - 1].bp;
    return { bp, inverted: bp < 0, history };
  } catch {
    return empty;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ ...cache.data, cached: true });
  }
  const [yields, yahoo] = await Promise.all([
    fetchYields().catch(() => [] as YieldItem[]),
    Promise.all(YAHOO_SYMBOLS.map(async (def) => ({ def, item: await fetchYahoo(def) }))),
  ]);
  const y2 = yields.find((y) => y.tenor === "2Y");
  const y10 = yields.find((y) => y.tenor === "10Y");
  const spread = await fetchSpread(y2 && y10 ? Math.round((y10.price - y2.price) * 100 * 10) / 10 : null);
  const ok = yahoo.filter((x): x is { def: (typeof YAHOO_SYMBOLS)[number]; item: MarketItem } => x.item !== null);
  if (yields.length === 0 && ok.length === 0) {
    if (cache) return NextResponse.json({ ...cache.data, cached: true, stale: true });
    return NextResponse.json({ error: "market unavailable" }, { status: 502 });
  }
  const data: MarketResponse = {
    yields,
    commodities: ok.filter((x) => x.def.group === "commodities").map((x) => x.item),
    fxMajors: ok.filter((x) => x.def.group === "fxMajors").map((x) => x.item),
    spread,
    sources: ["CNBC/Tradeweb", "Yahoo Finance"],
  };
  cache = { at: Date.now(), data };
  return NextResponse.json({ ...data, cached: false });
}
