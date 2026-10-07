"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useStocks } from "@/lib/market/useStocks";
import { useDashboard } from "@/lib/portfolio/store";

const CYCLE_PAGES = ["/", "/stocks", "/market", "/map"];

/**
 * 전체 화면 사이클 (수동 조작 없음):
 * 메인 → 맵 → 종목 5개(그리드) → 5개 개별차트 → 메인 → 다음 5개 … (30개) → 시장지표 → 반복.
 * 각 구간 길이는 관리자 rotateSecs. 사이클 외 페이지에선 동작 안 함.
 */
export function AutoCycle() {
  const pathname = usePathname();
  const router = useRouter();
  const stocks = useStocks();
  const rotateSecs = useDashboard((s) => s.rotateSecs);
  const cycleBatch = useDashboard((s) => s.cycleBatch);
  const setCycleBatch = useDashboard((s) => s.setCycleBatch);
  const detailRef = useRef(0);

  useEffect(() => {
    const onCycle = CYCLE_PAGES.includes(pathname) || pathname.startsWith("/stock/");
    if (!onCycle || stocks.length === 0) return;
    const ms = Math.max(3, rotateSecs) * 1000;
    const id = setTimeout(() => {
      if (pathname === "/") {
        detailRef.current = 0;
        router.push("/map");
      } else if (pathname === "/map") {
        router.push("/stocks");
      } else if (pathname === "/stocks") {
        const syms = stocks.slice(cycleBatch * 5, cycleBatch * 5 + 5);
        if (syms.length === 0) {
          router.push("/");
          return;
        }
        detailRef.current = 0;
        router.push(`/stock/${syms[0].symbol}`);
      } else if (pathname.startsWith("/stock/")) {
        const syms = stocks.slice(cycleBatch * 5, cycleBatch * 5 + 5);
        const next = detailRef.current + 1;
        if (next < syms.length) {
          detailRef.current = next;
          router.push(`/stock/${syms[next].symbol}`);
        } else {
          router.push("/market");
        }
      } else if (pathname === "/market") {
        setCycleBatch((cycleBatch + 1) % 6);
        router.push("/");
      }
    }, ms);
    return () => clearTimeout(id);
  }, [pathname, cycleBatch, rotateSecs, router, setCycleBatch, stocks]);

  return null;
}
