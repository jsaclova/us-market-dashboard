import type { CustomStock } from "@/lib/portfolio/store";

/** 관리자 추가 종목의 기준가 오버라이드 레지스트리 (mock 차트 시드용) */
const customBases: Record<string, number> = {};

export function syncCustomBases(list: Pick<CustomStock, "symbol" | "base">[]) {
  for (const k of Object.keys(customBases)) delete customBases[k];
  for (const s of list) {
    if (s.symbol && s.base > 0) customBases[s.symbol] = s.base;
  }
}

export function baseOverride(symbol: string): number | undefined {
  return customBases[symbol];
}
