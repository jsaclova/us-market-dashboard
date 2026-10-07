import { NextResponse } from "next/server";

export interface NewsItem {
  id: string;
  title: string;
  titleKo?: string;
  mood?: "bull" | "bear" | "neutral";
  source: string;
  url: string;
  publishedAt: string;
}

const FEEDS = [
  { source: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { source: "CNBC", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html" },
  { source: "CNBC", url: "https://www.cnbc.com/id/10001147/device/rss/rss.html" },
  { source: "CNBC", url: "https://www.cnbc.com/id/10000953/device/rss/rss.html" },
  { source: "Investing.com", url: "https://www.investing.com/rss/news_25.rss" },
  { source: "Fed", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
];

let cache: { at: number; items: NewsItem[] } | null = null;
const TTL = 2 * 60 * 1000;

import { classifyMood } from "@/lib/market/sentiment";
import { isStockRelated } from "@/lib/market/stockFilter";

function stripCdata(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function decodeEntities(s: string) {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");
}

function parseRss(xml: string, source: string, limit = 15): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? [];
  for (const b of blocks.slice(0, limit)) {
    const title = /<title>([\s\S]*?)<\/title>/.exec(b)?.[1];
    const link = /<link>([\s\S]*?)<\/link>/.exec(b)?.[1];
    const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(b)?.[1];
    if (!title || !link) continue;
    const url = stripCdata(link);
    items.push({
      id: `${source}-${url}`,
      title: decodeEntities(stripCdata(title)),
      source,
      url,
      publishedAt: pub ? new Date(stripCdata(pub)).toISOString() : new Date().toISOString(),
    });
  }
  return items;
}

async function fetchFeed(source: string, url: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; rt-stock-dashboard/1.0)" },
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`${source} ${res.status}`);
  return parseRss(await res.text(), source);
}

// 연준은 금리/정책 관련만 (은행 인허가 잡무 제외)
const FED_KEEP = /rate|fomc|inflation|deflation|cut|hike|powell|meet|minutes|polic|testim|quantitative|balance sheet|dot plot|금리|인하|인상|파월|회의|의사록|인플레|물가|정책/i;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ items: cache.items, cached: true });
  }
  try {
    const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f.source, f.url)));
    const seen = new Set<string>();
    const items = results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
      .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
      .filter((n) => (n.source === "Fed" ? FED_KEEP.test(n.title) : isStockRelated(n.title)))
      .slice(0, 30);
    if (items.length === 0) throw new Error("empty");
    const translated = await attachKorean(items);
    cache = { at: Date.now(), items: translated };
    return NextResponse.json({ items: translated, cached: false });
  } catch {
    if (cache) return NextResponse.json({ items: cache.items, cached: true, stale: true });
    return NextResponse.json({ items: [], error: "news unavailable" }, { status: 502 });
  }
}

// ---------- 한글 자동번역 (DeepL 우선, MyMemory 폴백 · 24h 캐시) ----------
const koCache = new Map<string, { text: string; at: number }>();
const KO_TTL = 24 * 3600 * 1000;

async function translateDeepL(texts: string[]): Promise<(string | null)[]> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return texts.map(() => null);
  try {
    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts, source_lang: "EN", target_lang: "KO" }),
    });
    if (!res.ok) return texts.map(() => null);
    const j = await res.json();
    const out: (string | null)[] = (j.translations ?? []).map((t: { text?: string }) =>
      typeof t?.text === "string" && t.text.trim() ? t.text : null,
    );
    while (out.length < texts.length) out.push(null);
    return out;
  } catch {
    return texts.map(() => null);
  }
}

async function translateMyMemory(text: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const j = await res.json();
    if (j.responseStatus !== 200 || j.quotaFinished) return null;
    const t = j.responseData?.translatedText as string | undefined;
    // 번역 실패 시 원문 그대로 반환됨 → 원문과 동일하면 버림
    if (!t || t.trim() === text.trim()) return null;
    return t;
  } catch {
    return null;
  }
}

async function attachKorean(items: NewsItem[]): Promise<NewsItem[]> {
  const now = Date.now();
  const missing = items.filter((i) => {
    const c = koCache.get(i.id);
    return !(c && now - c.at < KO_TTL);
  });
  // DeepL 배치 1회 → 실패분만 MyMemory 개별
  const dl = await translateDeepL(missing.map((m) => m.title));
  for (let k = 0; k < missing.length; k++) {
    if (dl[k]) {
      koCache.set(missing[k].id, { text: dl[k] as string, at: now });
    } else {
      const t = await translateMyMemory(missing[k].title);
      if (t) koCache.set(missing[k].id, { text: t, at: now });
    }
    while (koCache.size > 500) {
      const first = koCache.keys().next().value;
      if (!first) break;
      koCache.delete(first);
    }
  }
  return items.map((i) => {
    const ko = koCache.get(i.id)?.text;
    return {
      ...i,
      titleKo: ko ? applyGlossary(ko) : undefined,
      mood: classifyMood(`${i.title} ${ko ?? ""}`),
    };
  });
}

// MyMemory가 영어 그대로 둔 금융 고유명사만 한글로 교정
const GLOSSARY: [RegExp, string][] = [
  [/\bNasdaq\b/gi, "나스닥"],
  [/\bDow Jones\b/gi, "다우존스"],
  [/\bWall Street\b/gi, "월스트리트"],
  [/\bFederal Reserve\b/gi, "연준"],
  [/\bWhite House\b/gi, "백악관"],
  [/\bSupreme Court\b/gi, "대법원"],
  [/\bTreasury Department\b/gi, "재무부"],
];

function applyGlossary(text: string): string {
  return GLOSSARY.reduce((t, [re, ko]) => t.replace(re, ko), text);
}
