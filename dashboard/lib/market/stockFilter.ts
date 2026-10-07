const STOCK_KEYS = [
  // 시장 일반
  "stock", "market", "share", "investor", "trading", "trade", "wall street",
  "s&p", "nasdaq", "dow jones", "nyse", "etf", "futures", "index",
  "bull", "bear", "rally", "sell-off", "selloff", "ipo", "dividend", "buyback",
  "earnings", "revenue", "profit", "loss", "guidance",
  // 거시/정책 (증시에 직결)
  "fed", "fomc", "rate cut", "rate hike", "interest rate", "inflation", "cpi",
  "treasury", "yield", "bond", "recession", "gdp", "jobs report", "payrolls",
  "tariff", "opec",
  // 종목
  "tesla", "apple", "nvidia", "microsoft", "amazon", "meta", "alphabet", "amd",
  // 한글
  "주식", "주가", "증시", "증권", "투자", "거래", "월가", "연준", "금리",
  "인플레", "물가", "실적", "상장", "배당", "자사주", "매수", "매도", "랠리",
  "급등", "급락", "폭등", "폭락", "상승", "하락", "국채", "수익률", "채권",
  "경기", "침체", "고용", "관세", "펀드", "증시",
];

/** 주식/증시 관련 기사만 통과 */
export function isStockRelated(text: string): boolean {
  const t = text.toLowerCase();
  return STOCK_KEYS.some((k) => t.includes(k.toLowerCase()));
}
