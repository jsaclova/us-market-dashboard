"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import type { Quote } from "@/lib/market/types";
import { useStocks } from "@/lib/market/useStocks";
import { useDashboard } from "@/lib/portfolio/store";
import { cn, fmtPct, fmtUSD } from "@/lib/utils";

/** 주요종목: 사이클 배치 5종 표시 (자동 전환, 수동 조작 없음) */
function BatchGrid() {
  const stocks = useStocks();
  const batch = useDashboard((s) => s.cycleBatch);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const list = stocks.slice(batch * 5, batch * 5 + 5);

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="text-xl font-bold text-zinc-50">
        주요종목 · {batch * 5 + 1}–{Math.min(batch * 5 + 5, stocks.length)} / {stocks.length}
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-5 gap-4">
        {list.map((s) => {
          const q = quotes[s.symbol];
          const chg = q?.changePct ?? 0;
          const up = chg > 0;
          const flat = !q || chg === 0;
          return (
            <div
              key={s.symbol}
              className={cn(
                "flex min-h-0 items-center gap-4 overflow-hidden rounded-xl border px-5",
                flat
                  ? "border-zinc-600 bg-zinc-800"
                  : up
                    ? "border-emerald-700 bg-emerald-950"
                    : "border-red-800 bg-red-950",
              )}
            >
              <span className="w-32 shrink-0 text-2xl font-bold text-white">{s.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-xl text-zinc-300">{s.name}</span>
              <span className="shrink-0 text-3xl font-bold tabular-nums text-white">
                {q ? fmtUSD(q.price) : "—"}
              </span>
              <span className={cn("w-36 shrink-0 text-right text-2xl font-bold tabular-nums", flat ? "text-zinc-300" : "text-white")}>
                {q ? fmtPct(chg) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StocksPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-500 text-zinc-50 dark:bg-zinc-800 dark:text-zinc-50">
      <SiteHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pt-4">
        <BatchGrid />
      </main>
      <div className="h-[92px] shrink-0" />
    </div>
  );
}
