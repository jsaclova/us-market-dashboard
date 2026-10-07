"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StockChartView } from "@/components/StockShowcase";
import { Button } from "@/components/ui/button";
import { useStocks } from "@/lib/market/useStocks";
import { useDashboard } from "@/lib/portfolio/store";

/** 종목 상세: 다음 종목으로 자동 전환 (수동 조작 없음) */
export function StockDetail({ symbol }: { symbol: string }) {
  const router = useRouter();
  const stocks = useStocks();
  const rotateSecs = useDashboard((s) => s.rotateSecs);
  const idx = stocks.findIndex((s) => s.symbol === symbol);

  useEffect(() => {
    if (stocks.length === 0) return;
    const id = setInterval(() => {
      const i = stocks.findIndex((x) => x.symbol === symbol);
      router.push(`/stock/${stocks[(i + 1) % stocks.length].symbol}`);
    }, Math.max(3, rotateSecs) * 1000);
    return () => clearInterval(id);
  }, [stocks, symbol, router, rotateSecs]);

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
