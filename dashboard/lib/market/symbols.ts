export interface Instrument {
  symbol: string;
  name: string;
  base: number;
}

export const INDICES: Instrument[] = [
  { symbol: "SP500", name: "S&P 500", base: 5850 },
  { symbol: "NASDAQ", name: "Nasdaq Composite", base: 18250 },
  { symbol: "DJI", name: "Dow Jones", base: 44200 },
];

export const STOCKS: Instrument[] = [
  { symbol: "AAPL", name: "Apple", base: 232 },
  { symbol: "MSFT", name: "Microsoft", base: 428 },
  { symbol: "NVDA", name: "NVIDIA", base: 131 },
  { symbol: "AMZN", name: "Amazon", base: 205 },
  { symbol: "META", name: "Meta", base: 585 },
  { symbol: "GOOGL", name: "Alphabet", base: 175 },
  { symbol: "TSLA", name: "Tesla", base: 248 },
  { symbol: "AVGO", name: "Broadcom", base: 245 },
  { symbol: "AMD", name: "AMD", base: 168 },
  { symbol: "NFLX", name: "Netflix", base: 762 },
  { symbol: "PLTR", name: "Palantir", base: 68 },
  { symbol: "JPM", name: "JPMorgan", base: 265 },
  { symbol: "V", name: "Visa", base: 310 },
  { symbol: "XOM", name: "ExxonMobil", base: 118 },
  { symbol: "UNH", name: "UnitedHealth", base: 505 },
  { symbol: "MA", name: "Mastercard", base: 560 },
  { symbol: "BAC", name: "Bank of America", base: 46 },
  { symbol: "DIS", name: "Disney", base: 112 },
  { symbol: "WMT", name: "Walmart", base: 82 },
  { symbol: "ORCL", name: "Oracle", base: 172 },
  { symbol: "CRM", name: "Salesforce", base: 335 },
  { symbol: "QCOM", name: "Qualcomm", base: 178 },
  { symbol: "TXN", name: "Texas Instruments", base: 195 },
  { symbol: "NKE", name: "Nike", base: 88 },
  { symbol: "MCD", name: "McDonald's", base: 305 },
  { symbol: "ABBV", name: "AbbVie", base: 198 },
  { symbol: "LLY", name: "Eli Lilly", base: 770 },
  { symbol: "MRK", name: "Merck", base: 108 },
  { symbol: "PEP", name: "PepsiCo", base: 172 },
  { symbol: "CSCO", name: "Cisco", base: 62 },
];

export const ALL_INSTRUMENTS: Instrument[] = [...INDICES, ...STOCKS];

export function instrumentLabel(symbol: string): string {
  return ALL_INSTRUMENTS.find((i) => i.symbol === symbol)?.name ?? symbol;
}
