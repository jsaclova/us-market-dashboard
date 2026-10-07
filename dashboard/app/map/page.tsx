"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Sp500Map } from "@/components/Sp500Map";
import type { MapStock } from "@/app/api/sp500/route";

const LEGEND = ["-3%", "-2%", "-1%", "0%", "+1%", "+2%", "+3%"];

export default function MapPage() {
  const [stocks, setStocks] = useState<MapStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/sp500");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data.stocks) {
          setStocks(data.stocks);
          setLoading(false);
        }
      } catch {
        /* 다음 폴링에 재시도 */
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-500 text-zinc-50 dark:bg-zinc-800 dark:text-zinc-50">
      <SiteHeader />
      <main className="mx-auto flex min-h-0 w-full flex-1 flex-col px-4 pt-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-800 bg-[#131722] p-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-lg font-bold text-zinc-50">S&P 500 MAP <span className="text-xs font-normal text-red-500">(시총가중)</span></span>
            <span className="flex items-center gap-1 text-xs">
              {LEGEND.map((l) => (
                <span
                  key={l}
                  className="rounded px-1.5 py-0.5 font-semibold"
                  style={{
                    background: l.startsWith("+") ? "#2e7d32" : l.startsWith("-") ? "#c62828" : "#455a64",
                    color: "#fff",
                  }}
                >
                  {l}
                </span>
              ))}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            {loading ? (
              <p className="p-8 text-sm text-zinc-400">500종 수집 중… (첫 로딩 10~20초)</p>
            ) : (
              <Sp500Map stocks={stocks} />
            )}
          </div>
        </div>
      </main>
      <div className="h-[92px] shrink-0" />
    </div>
  );
}
