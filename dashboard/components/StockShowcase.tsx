"use client";

import { useEffect, useRef, useState } from "react";
import { PriceChart } from "@/components/PriceChart";
import { useStockData } from "@/lib/market/useStockData";
import { cn, fmtPct, fmtUSD } from "@/lib/utils";

/** 조작 버튼 없는 순수 차트 화면 (자동 순환 전용, Yahoo 실측) */
export function StockChartView({ symbol, position }: { symbol: string; position: string }) {
  const { quote, history, liveBar, error } = useStockData(symbol);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [chartH, setChartH] = useState(420);
  const up = (quote?.change ?? 0) >= 0;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setChartH(Math.max(240, el.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col text-zinc-50">
      <div className="flex flex-wrap items-end gap-x-2 pb-1">
        <div className="text-2xl font-bold text-white">
          {symbol}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-white">
            {error ? "조회 실패" : quote ? fmtUSD(quote.price) : "—"}
          </span>
          <span className={cn("text-lg font-semibold tabular-nums", up ? "text-emerald-400" : "text-red-400")}>
            {quote ? `${up ? "+" : ""}${fmtUSD(quote.change)} (${fmtPct(quote.changePct)})` : ""}
          </span>
        </div>
        <span className="ml-auto text-sm tabular-nums text-zinc-400">{position}</span>
      </div>
      <div ref={wrapRef} className="min-h-0 flex-1">
        <PriceChart candles={history} liveBar={liveBar} dark height={chartH} />
      </div>
      <div className="flex gap-4 pt-2 text-xs text-zinc-400">
        <span>H {quote ? fmtUSD(quote.dayHigh) : "—"}</span>
        <span>L {quote ? fmtUSD(quote.dayLow) : "—"}</span>
        <span>Vol {quote ? quote.volume.toLocaleString() : "—"}</span>
      </div>
    </div>
  );
}
