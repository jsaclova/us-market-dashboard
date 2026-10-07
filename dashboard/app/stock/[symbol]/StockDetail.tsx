"use client";

import Link from "next/link";
import { StockChartView } from "@/components/StockShowcase";
import { Button } from "@/components/ui/button";
import { useStocks } from "@/lib/market/useStocks";

/** 종목 상세: 자동 사이클이 화면 전환 담당 (수동 조작 없음) */
export function StockDetail({ symbol }: { symbol: string }) {
  const stocks = useStocks();
  const idx = stocks.findIndex((s) => s.symbol === symbol);

  if (idx < 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#131722] p-8 text-center">
        <p className="font-semibold">"{symbol}" 종목을 찾을 수 없습니다.</p>
        <Link href="/stocks">
          <Button size="sm" className="mt-4">주요종목으로</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex-1 rounded-xl border border-zinc-800 bg-[#131722] p-4">
      <StockChartView symbol={stocks[idx].symbol} position={`${idx + 1} / ${stocks.length}`} />
    </div>
  );
}
