// 사용법: node scripts/fetch-sp500.mjs > data/sp500.json
// Wikipedia 구성종목 + CNBC 시가총액 스냅샷 (월 1회 갱신 권장)
const UA = "Mozilla/5.0";

function parseCap(s) {
  if (!s) return null;
  const m = String(s).replace(/,/g, "").match(/^([\d.]+)([TBMK])$/);
  if (!m) return null;
  const mult = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 }[m[2]];
  return Math.round(parseFloat(m[1]) * mult);
}

async function fetchCaps(symbols) {
  const out = new Map();
  for (let i = 0; i < symbols.length; i += 40) {
    const batch = symbols.slice(i, i + 40);
    try {
      const url = `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${batch.map(encodeURIComponent).join("%7C")}&requestMethod=quick&noform=1&partnerId=2&fund=1&exthrs=1&output=json`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const j = await res.json();
      for (const q of j?.FormattedQuoteResult?.FormattedQuote ?? []) {
        const cap = parseCap(q.mktcapView);
        if (q.symbol && cap) out.set(q.symbol.toUpperCase(), cap);
      }
    } catch {
      /* 다음 배치 계속 */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return out;
}

const res = await fetch("https://en.wikipedia.org/w/api.php?action=parse&page=List_of_S%26P_500_companies&prop=wikitext&format=json&section=1", { headers: { "User-Agent": UA } });
const j = await res.json();
const t = j.parse.wikitext["*"];
const rows = t.split("\n|-").slice(1);
const clean = (c) => c.replace(/^\s*\|\s*/, "").replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2").trim();
const out = [];
for (const r of rows) {
  const cells = r.split("\n|").slice(1).map(clean);
  let sym = cells[0] || "";
  const m = sym.match(/\{\{\w+\|([A-Za-z.\-]+)\}\}/);
  if (m) sym = m[1];
  sym = sym.toUpperCase().replace(/-/g, ".");
  if (!/^[A-Z.]{1,7}$/.test(sym)) continue;
  out.push({ symbol: sym, name: cells[1] || sym, sector: cells[2] || "Other", sub: cells[3] || "" });
}
const seen = new Set();
const SKIP = new Set(["GOOG"]); // GOOGL과 중복 (알파벳 C주)
const dedup = out.filter((s) => (seen.has(s.symbol) || SKIP.has(s.symbol) ? false : (seen.add(s.symbol), true)));
const caps = await fetchCaps(dedup.map((s) => s.symbol));
const missing = [];
for (const s of dedup) {
  s.cap = caps.get(s.symbol) ?? null;
  if (!s.cap) missing.push(s.symbol);
}
console.log(JSON.stringify({ updated: new Date().toISOString().slice(0, 10), count: dedup.length, stocks: dedup }));
console.error(`missing caps (${missing.length}): ${missing.slice(0, 20).join(",")}`);
