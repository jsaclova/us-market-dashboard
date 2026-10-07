export type Mood = "bull" | "bear" | "neutral";

const BULL = [
  "surge", "soar", "rally", "record high", "record-high", "all-time high",
  "rebound", "recovery", "recover", "boom", "beats", "better than expected",
  "upgrade", "breakthrough", "approved", "approval", "deal", "agreement",
  "rate cut", "easing", "stimulus", "profit", "surplus", "growth", "bullish",
  "급등", "폭등", "상승", "반등", "회복", "흑자", "성장", "호조", "개선", "돌파",
  "승인", "합의", "타결", "서프라이즈", "최고치", "사상 최고", "금리 인하", "인하",
];

const BEAR = [
  "plunge", "plummet", "slump", "crash", "tumble", "warning", "warn",
  "recession", "deficit", "bankrupt", "default", "sanction", "tariff",
  "inflation", "layoff", "job cut", "probe", "lawsuit", "fraud", "misses",
  "downgrade", "crisis", "fear",
  "급락", "폭락", "하락", "추락", "적자", "손실", "침체", "경고", "파산", "부도",
  "제재", "관세", "소송", "사기", "악화", "붕괴", "위기", "감원", "실업",
];

/** 키워드 휴리스틱 감성 분류 (영문+한글 제목 동시 판정) */
export function classifyMood(text: string): Mood {
  const t = text.toLowerCase();
  let bull = 0;
  let bear = 0;
  for (const k of BULL) if (t.includes(k.toLowerCase())) bull++;
  for (const k of BEAR) if (t.includes(k.toLowerCase())) bear++;
  if (bull > bear) return "bull";
  if (bear > bull) return "bear";
  return "neutral";
}

/** 호재 녹색 · 중립 기본(검정) · 악재 빨강 */
export function moodClass(mood?: Mood): string {
  if (mood === "bull") return "text-emerald-600 dark:text-emerald-400";
  if (mood === "bear") return "text-red-600 dark:text-red-400";
  return "";
}

export function moodLabel(mood?: Mood): string {
  if (mood === "bull") return "호재";
  if (mood === "bear") return "악재";
  return "중립";
}

export function moodBadge(mood?: Mood): string {
  if (mood === "bull") return "border-transparent bg-emerald-600 text-white";
  if (mood === "bear") return "border-transparent bg-red-600 text-white";
  return "border-transparent bg-zinc-500 text-white";
}
