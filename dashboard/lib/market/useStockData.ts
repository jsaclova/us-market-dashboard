"use client";

import { useEffect, useState } from "react";
import type { Candle, Quote } from "@/lib/market/types";

export interface StockData {
  quote: Quote | null;
  history: Candle[];
  liveBar: Candle | null;
  error: boolean;
}

/** 개별 종목 실측 (Yahoo) — 히스토리 + 10초 시세 폴링 */
export function useStockData(symbol: string): StockData {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<Candle[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setQuote(null);
    setHistory([]);
    setError(false);
    const load = async () => {
      try {
        const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        if (!alive) return;
        setQuote(data.quote);
        setHistory(data.history);
        setError(false);
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol]);

  const last = history[history.length - 1];
  const liveBar: Candle | null =
    quote && last
      ? {
          ...last,
          close: quote.price,
          high: Math.max(last.high, quote.price),
          low: Math.min(last.low, quote.price),
        }
      : null;

  return { quote, history, liveBar, error };
}
