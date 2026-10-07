"use client";

import { Badge } from "@/components/ui/badge";
import { useNews } from "@/lib/market/useNews";
import { useDashboard } from "@/lib/portfolio/store";
import { moodBadge, moodLabel } from "@/lib/market/sentiment";
import { cn } from "@/lib/utils";

function tickerMood(mood?: "bull" | "bear" | "neutral"): string {
  if (mood === "bull") return "text-emerald-400";
  if (mood === "bear") return "text-red-400";
  return "text-zinc-50";
}

function shortAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** 하단 고정 뉴스 티커 — 우 → 좌 이동, hover 시 일시정지 (속도는 관리자 설정) */
export function NewsTicker() {
  const { items } = useNews();
  const tickerSecs = useDashboard((s) => s.tickerSecs);
  if (items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <div id="news-ticker" className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-[#131722] text-zinc-50">
      <div className="flex items-stretch">
        <div className="flex shrink-0 items-center gap-2 bg-red-600 px-5 py-4 text-2xl font-bold text-white">
          <span className="inline-block size-2.5 animate-pulse rounded-full bg-white" />
          LIVE 뉴스
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div
            className="ticker-track flex w-max items-center gap-4 px-5 py-4"
            style={{ animationDuration: `${Math.max(30, items.length * tickerSecs)}s` }}
          >
            {loop.map((n, i) => (
              <a
                key={`${n.id}-${i}`}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-hidden={i >= items.length}
                tabIndex={i >= items.length ? -1 : undefined}
                title={n.titleKo ? n.title : undefined}
                className="flex items-center gap-3 whitespace-nowrap text-[30px] leading-snug hover:underline"
              >
                <Badge variant="outline" className="shrink-0 border-transparent bg-orange-500 px-3 py-1 text-sm text-white">{n.source}</Badge>
                <span className="shrink-0 text-lg text-zinc-400">· {shortAgo(n.publishedAt)}</span>
                <span className={cn("font-semibold", tickerMood(n.mood))}>{n.titleKo ?? n.title}</span>
                <Badge variant="outline" className={cn("shrink-0 px-3 py-1 text-sm", moodBadge(n.mood))}>{moodLabel(n.mood)}</Badge>
                <span className="ml-10 text-xl text-blue-500">●</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
