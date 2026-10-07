"use client";

import { useEffect, useState } from "react";
import { StockChartView } from "@/components/StockShowcase";
import type { Quote } from "@/lib/market/types";
import { useStocks } from "@/lib/market/useStocks";
import { useDashboard } from "@/lib/portfolio/store";
import { cn, fmtPct, fmtUSD } from "@/lib/utils";

/** 주요종목 화면: 그리드 1회 → 전 종목 차트 자동 순환 (수동 조작 없음) */
export function StocksAutoCycle() {
  const stocks = useStocks();
  const rotateSecs = useDashboard((s) => s.rotateSecs);
  const [phase, setPhase] = useState<"grid" | "cycle">("grid");
  const [idx, setIdx] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/stocks/quotes");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data.quotes) setQuotes(data.quotes);
      } catch {
        /* 다음 폴링에 재시도 */
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // 그리드 1회 표시 후 순환 시작
  useEffect(() => {
    if (phase !== "grid") return;
    const id = setTimeout(() => setPhase("cycle"), Math.max(3, rotateSecs) * 1000);
    return () => clearTimeout(id);
  }, [phase, rotateSecs]);

  // 차트 순환
  useEffect(() => {
    if (phase !== "cycle" || stocks.length === 0) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % stocks.length);
    }, Math.max(3, rotateSecs) * 1000);
    return () => clearInterval(id);
  }, [phase, stocks.length, rotateSecs]);

  if (phase === "grid") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-zinc-800 bg-[#131722] p-4">
        <div className="pb-2 text-lg font-bold text-zinc-50">주요종목 · {stocks.length} Live</div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[repeat(15,minmax(0,1fr))] gap-4 sm:grid-cols-3 sm:grid-rows-[repeat(10,minmax(0,1fr))] xl:grid-cols-5 xl:grid-rows-6">
          {stocks.map((s) => {
            const q = quotes[s.symbol];
            const chg = q?.changePct ?? 0;
            const up = chg > 0;
            const flat = !q || chg === 0;
            return (
              <div
                key={s.symbol}
                className={cn(
                  "min-h-0 overflow-hidden rounded-lg border px-2 py-1.5",
                  flat
                    ? "border-zinc-600 bg-zinc-800"
                    : up
                      ? "border-emerald-700 bg-emerald-950"
                      : "border-red-800 bg-red-950",
                )}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-bold text-white">{s.symbol}</span>
                  <span className={cn("text-[11px] font-bold tabular-nums", flat ? "text-zinc-300" : "text-white")}>
                    {q ? fmtPct(chg) : "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="truncate text-[10px] text-zinc-300">{s.name}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-white">
                    {q ? fmtUSD(q.price) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (stocks.length === 0) return null;
  const s = stocks[idx % stocks.length];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-zinc-800 bg-[#131722] p-4">
      <StockChartView symbol={s.symbol} position={`${(idx % stocks.length) + 1} / ${stocks.length}`} />
    </div>
  );
}
