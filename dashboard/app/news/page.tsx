"use client";

import { Newspaper } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNews } from "@/lib/market/useNews";
import { moodBadge, moodClass, moodLabel } from "@/lib/market/sentiment";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function NewsPage() {
  const { items, updatedAt, loading, error } = useNews();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-400 dark:text-zinc-50">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pt-4 pb-28">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-1.5 text-lg">
                <Newspaper className="size-5" /> US Market News · 한글
              </CardTitle>
              {updatedAt && (
                <span className="text-xs text-zinc-500">
                  {new Date(updatedAt).toLocaleTimeString()} 갱신 · 60초 자동
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {loading && <p className="text-sm text-zinc-500">Loading live news…</p>}
            {error && items.length === 0 && (
              <p className="text-sm text-zinc-500">뉴스를 불러오지 못했습니다. 잠시 후 다시 시도됩니다.</p>
            )}
            {items.map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                title={n.titleKo ? n.title : undefined}
                className="rounded-lg px-3 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <div className={cn("text-base font-medium leading-snug", moodClass(n.mood))}>{n.titleKo ?? n.title}</div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
                  <Badge variant="outline" className="border-transparent bg-orange-500 text-white">{n.source}</Badge>
                  <Badge variant="outline" className={moodBadge(n.mood)}>{moodLabel(n.mood)}</Badge>
                  <span>{new Date(n.publishedAt).toLocaleString("ko-KR")}</span>
                  <span>· {timeAgo(n.publishedAt)}</span>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
