import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Timeframe } from "@/lib/market/types";

export interface CustomStock {
  symbol: string;
  name: string;
  base: number;
}

interface DashboardState {
  timeframe: Timeframe;
  setTimeframe: (t: Timeframe) => void;
  /** 종목 차트 자동 전환 주기 (초) */
  rotateSecs: number;
  setRotateSecs: (n: number) => void;
  /** 뉴스 티커 속도 (기사당 초) */
  tickerSecs: number;
  setTickerSecs: (n: number) => void;
  /** 관리자 추가 종목 */
  customStocks: CustomStock[];
  addCustomStock: (s: CustomStock) => void;
  removeCustomStock: (symbol: string) => void;
  /** 숨긴 뉴스 id */
  hiddenNews: string[];
  hideNews: (id: string) => void;
  showNews: (id: string) => void;
  /** 자동 사이클용 종목 배치 (0~5) */
  cycleBatch: number;
  setCycleBatch: (n: number) => void;
  resetAdmin: () => void;
}

export const useDashboard = create<DashboardState>()(
  persist(
    (set) => ({
      timeframe: "6M",
      setTimeframe: (timeframe) => set({ timeframe }),
      rotateSecs: 3,
      setRotateSecs: (rotateSecs) => set({ rotateSecs: Math.min(120, Math.max(3, Math.round(rotateSecs))) }),
      tickerSecs: 9,
      setTickerSecs: (tickerSecs) => set({ tickerSecs: Math.min(20, Math.max(2, Math.round(tickerSecs))) }),
      customStocks: [],
      addCustomStock: (s) =>
        set((st) =>
          st.customStocks.some((x) => x.symbol === s.symbol) ? st : { customStocks: [...st.customStocks, s] },
        ),
      removeCustomStock: (symbol) =>
        set((st) => ({ customStocks: st.customStocks.filter((x) => x.symbol !== symbol) })),
      hiddenNews: [],
      hideNews: (id) =>
        set((st) => (st.hiddenNews.includes(id) ? st : { hiddenNews: [...st.hiddenNews, id] })),
      showNews: (id) => set((st) => ({ hiddenNews: st.hiddenNews.filter((x) => x !== id) })),
      cycleBatch: 0,
      setCycleBatch: (n) => set({ cycleBatch: n }),
      resetAdmin: () => set({ rotateSecs: 3, tickerSecs: 9, customStocks: [], hiddenNews: [] }),
    }),
    {
      name: "rt-stock-v2",
      version: 2,
      // 기존 저장값(티커 6초)이면 새 기본값 9초로 이전
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<DashboardState>;
        if (version === 0 && (s.tickerSecs === 6 || s.tickerSecs === undefined)) s.tickerSecs = 9;
        if (version < 2 && s.rotateSecs === 10) s.rotateSecs = 3;
        return s as DashboardState;
      },
    },
  ),
);
