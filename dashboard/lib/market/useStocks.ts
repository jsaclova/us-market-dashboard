"use client";

import { useMemo } from "react";
import { STOCKS, type Instrument } from "@/lib/market/symbols";
import { useDashboard } from "@/lib/portfolio/store";

/** 고정 30종 + 관리자 추가 종목 */
export function useStocks(): Instrument[] {
  const custom = useDashboard((s) => s.customStocks);
  return useMemo(
    () => [...STOCKS, ...custom.map((c) => ({ symbol: c.symbol, name: c.name, base: c.base }))],
    [custom],
  );
}
