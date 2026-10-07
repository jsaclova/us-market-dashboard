"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewsItem } from "@/app/api/news/route";
import { useDashboard } from "@/lib/portfolio/store";

/** /api/news 30초 폴링 — 숨긴 뉴스 제외, 티커·뉴스페이지·관리자가 공유 */
export function useNews() {
  const hiddenNews = useDashboard((s) => s.hiddenNews);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      setItems(data.items ?? []);
      setUpdatedAt(Date.now());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const visible = items.filter((n) => !hiddenNews.includes(n.id));
  return { items: visible, allItems: items, updatedAt, loading, error, reload: load };
}
