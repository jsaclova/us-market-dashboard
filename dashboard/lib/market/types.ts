import type { UTCTimestamp } from "lightweight-charts";

export type Symbol = string;

export interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Quote {
  symbol: Symbol;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  time: number;
  isMock: boolean;
}

export type Timeframe = "1M" | "3M" | "6M" | "1Y" | "ALL";

export const TIMEFRAME_BARS: Record<Timeframe, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 252,
  ALL: 500,
};

export interface MarketProvider {
  readonly id: string;
  readonly label: string;
  readonly isMock: boolean;
  getHistory(symbol: Symbol): Candle[];
  subscribe(symbol: Symbol, onTick: (q: Quote, bar: Candle) => void): () => void;
  getQuote(symbol: Symbol): Quote;
}
