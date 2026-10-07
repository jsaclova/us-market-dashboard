"use client";

import { useEffect, useState } from "react";
import type { IndexFuture } from "@/app/api/indices/route";

/** 지수선물 30초 폴링 — /api/indices (ES·NQ·YM 실측) */
export function useIndexFutures(): Record<string, IndexFuture> | null {
  const [data, setData] = useState<Record<string, IndexFuture> | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/indices");
        if (!res.ok) return;
        const j = await res.json();
        if (!alive) return;
        const map: Record<string, IndexFuture> = {};
        for (const f of j.indices as IndexFuture[]) map[f.symbol] = f;
        setData(map);
      } catch {
        /* 다음 폴링에 재시도 */
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return data;
}
