"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FxItem, FxResponse } from "@/app/api/fx/route";
import { fmtPct } from "@/lib/utils";
const PAIR_KO: Record<string, string> = {
  USD: "원/달러",
  EUR: "원/유로",
  JPY: "원/엔(100엔)",
  GBP: "원/파운드",
};

function FxCell({ item }: { item: FxItem }) {
  const up = item.change >= 0;
  return (
    <div className="rounded-lg border border-zinc-700/60 px-4 py-3.5">
      <div className="text-sm text-zinc-400">{PAIR_KO[item.code] ?? item.pair}</div>
      <div className="mt-1 flex items-baseline gap-2.5 whitespace-nowrap">
        <span className="text-2xl font-bold tabular-nums text-white">
          {item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원
        </span>
        <span className={`text-lg font-bold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
          {fmtPct(item.changePct)}
        </span>
      </div>
    </div>
  );
}

/** 외환 4종 (USD/EUR/JPY100/GBP 대원) — 3대 지수 아래 배치, 5분 자동 갱신 */
export function FxBar() {
  const [fx, setFx] = useState<FxResponse | null>(null);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/fx");
      if (!res.ok) throw new Error("bad");
      setFx(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="shrink-0 border-zinc-800 bg-[#131722] text-zinc-50">
      <CardHeader className="p-4 pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-zinc-50">환율 · 원화 고시</CardTitle>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            {fx && <span>{fx.source} · {fx.date}</span>}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={load} aria-label="환율 새로고침">
              <RefreshCw className="size-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {error && !fx && <p className="text-sm text-zinc-500">환율 정보를 불러오지 못했습니다.</p>}
        {!fx && !error && <p className="text-sm text-zinc-500">불러오는 중…</p>}
        {fx && (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {fx.items.map((item) => (
              <FxCell key={item.code} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
