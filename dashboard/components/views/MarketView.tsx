"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketItem, MarketResponse, SpreadInfo, YieldItem } from "@/app/api/market/route";
import { cn, fmtPct } from "@/lib/utils";

export function MarketView() {
  const [macro, setMacro] = useState<MarketResponse | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market");
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setMacro(data);
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
    <div className="grid h-full min-h-0 flex-1 grid-rows-2 gap-4">
      {/* 금리 블록: 국채금리 + 역전 모니터 */}
      <section className="grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-2">
        {macro && macro.yields.length > 0 && (
          <Card className="h-full min-h-0 overflow-hidden border-zinc-800 bg-[#131722] text-zinc-50">
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-zinc-50">미국 국채금리 <span className="text-xs font-normal text-zinc-400">CNBC · Tradeweb 실시간</span></CardTitle>
                <span className="text-xs text-zinc-400">{macro.yields[0]?.time}</span>
              </div>
            </CardHeader>
            <CardContent className="flex h-full min-h-0 flex-col p-3 pt-1">
              <div className="grid h-full min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-2 gap-2">
                {macro.yields.map((y) => (
                  <YieldCell key={y.tenor} y={y} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {macro && <InversionWidget yields={macro.yields} spread={macro.spread} />}
      </section>

      {/* 시장 블록: 원자재 + 주요통화 */}
      <section className="grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-2">
        {macro && macro.commodities.length > 0 && (
          <Card className="h-full min-h-0 overflow-hidden border-zinc-800 bg-[#131722] text-zinc-50">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm text-zinc-50">원자재 <span className="text-xs font-normal text-zinc-400">선물 실시간 · Yahoo Finance</span></CardTitle>
            </CardHeader>
            <CardContent className="flex h-full min-h-0 flex-col p-3 pt-1">
              <div className="grid h-full min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-2 gap-2 md:grid-cols-3">
                {macro.commodities.map((m) => (
                  <QuoteCell key={m.code} m={m} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {macro && macro.fxMajors.length > 0 && (
          <Card className="h-full min-h-0 overflow-hidden border-zinc-800 bg-[#131722] text-zinc-50">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm text-zinc-50">주요통화 <span className="text-xs font-normal text-zinc-400">실시간 · Yahoo Finance</span></CardTitle>
            </CardHeader>
            <CardContent className="flex h-full min-h-0 flex-col p-3 pt-1">
              <div className="grid h-full min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-2 gap-2">
                {macro.fxMajors.map((m) => (
                  <QuoteCell key={m.code} m={m} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function YieldCell({ y }: { y: YieldItem }) {
  const up = y.changeBp >= 0;
  return (
    <div className="min-h-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
      <div className="text-[11px] text-zinc-400">미국채 {y.tenor}</div>
      <div className="flex items-center justify-between gap-1.5 whitespace-nowrap">
        <span className="text-xl font-bold tabular-nums text-zinc-50">{y.price.toFixed(3)}%</span>
        <Badge variant={up ? "up" : "down"} className="shrink-0 px-1 text-[10px]">
          {up ? "▲" : "▼"} {Math.abs(y.changeBp).toFixed(1)}bp
        </Badge>
      </div>
    </div>
  );
}

function Spark({ history, up }: { history: { date: string; value: number }[]; up: boolean }) {
  if (history.length < 2) return null;
  const W = 160;
  const H = 30;
  const vals = history.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const yy = (v: number) => H - 2 - ((v - min) / span) * (H - 4);
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)},${yy(v).toFixed(1)}`).join(" ");
  const color = up ? "#16a34a" : "#dc2626";
  return (
    <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={W} cy={yy(vals[vals.length - 1])} r="3" fill={color} />
    </svg>
  );
}

function QuoteCell({ m }: { m: MarketItem }) {
  const up = m.change >= 0;
  const dollar = m.unit.startsWith("$");
  const fmt = (n: number) =>
    `${dollar ? "$" : ""}${n.toLocaleString("en-US", { minimumFractionDigits: m.decimals, maximumFractionDigits: m.decimals })}`;
  return (
    <div className="min-h-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
      <div className="truncate text-[11px] text-zinc-400">{m.name} {m.unit && `· ${m.unit}`}</div>
      <div className="flex items-center justify-between gap-1.5 whitespace-nowrap">
        <span className="text-base font-bold tabular-nums text-zinc-50">{fmt(m.price)}</span>
        <Badge variant={up ? "up" : "down"} className="shrink-0 px-1 text-[10px]">
          {up ? "▲" : "▼"} {fmtPct(m.changePct)}
        </Badge>
      </div>
      <div className="mt-1">
        <Spark history={m.history} up={up} />
      </div>
    </div>
  );
}

function InversionWidget({ yields, spread }: { yields: YieldItem[]; spread: SpreadInfo }) {
  // 현재 커브 (2/10/20/30)
  const pts = yields.filter((y) => ["2Y", "10Y", "20Y", "30Y"].includes(y.tenor));
  const W = 260;
  const H = 120;
  const vals = pts.map((p) => p.price);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0);
  const span = max - min || 1;
  const X = (i: number) => 24 + (i / Math.max(1, pts.length - 1)) * (W - 48);
  const Y = (v: number) => H - 24 - ((v - min) / span) * (H - 44);
  const line = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.price).toFixed(1)}`).join(" ");

  // 스프레드 30일 + 0선
  const SW = 260;
  const SH = 120;
  const hist = spread.history.map((h) => h.bp);
  const sMin = Math.min(...hist, 0);
  const sMax = Math.max(...hist, 0);
  const sSpan = sMax - sMin || 1;
  const sY = (v: number) => SH - 16 - ((v - sMin) / sSpan) * (SH - 32);
  const sX = (i: number) => (i / Math.max(1, hist.length - 1)) * SW;
  const sLine = hist.map((v, i) => `${sX(i).toFixed(1)},${sY(v).toFixed(1)}`).join(" ");
  const zeroY = sY(0);

  return (
    <Card className={`h-full min-h-0 overflow-hidden border-zinc-800 bg-[#131722] text-zinc-50 ${spread.inverted ? "border-red-400 dark:border-red-800" : ""}`}>
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-zinc-50">
            10Y-2Y 스프레드 · 금리역전 모니터{" "}
            <span className="text-xs font-normal text-zinc-400">장단기 금리차 = 경기선행지표</span>
          </CardTitle>
          <Badge variant={spread.inverted ? "down" : "up"}>
            {spread.inverted ? "역전 (Inverted)" : "정상 (Normal)"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex h-full min-h-0 flex-col justify-center p-3 pb-8 pt-1">
        <div className="grid w-full items-center gap-6 md:grid-cols-3">
          <div>
            <div className="text-[11px] text-zinc-400">현재 스프레드</div>
            <div className={`text-4xl font-bold tabular-nums ${spread.inverted ? "text-red-500" : "text-emerald-400"}`}>
              {spread.bp > 0 ? "+" : ""}{spread.bp.toFixed(1)}bp
            </div>
          </div>
          <div className="-ml-6">
            <div className="mb-1 text-xs text-zinc-500">현재 커브 (실시간)</div>
            <svg width={W} height={H} className="h-24 w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
              <polyline points={line} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {pts.map((p, i) => (
                <g key={p.tenor}>
                  <circle cx={X(i)} cy={Y(p.price)} r="3.5" fill="#6366f1" />
                  <text x={X(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.6">{p.tenor}</text>
                  <text x={X(i)} y={Y(p.price) - 8} fontSize="10" textAnchor="middle" fill="currentColor">{p.price.toFixed(2)}</text>
                </g>
              ))}
            </svg>
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500">스프레드 30일 추이 (Yahoo)</div>
            {hist.length > 1 ? (
              <svg width={SW} height={SH} className="h-24 w-full" viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" aria-hidden>
                <line x1="0" y1={zeroY} x2={SW} y2={zeroY} stroke="currentColor" strokeDasharray="4 3" opacity="0.4" />
                <polyline points={sLine} fill="none" stroke={spread.inverted ? "#dc2626" : "#16a34a"} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <text x={SW - 4} y={zeroY - 4} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.6">0bp</text>
              </svg>
            ) : (
              <p className="text-xs text-zinc-500">히스토리 없음 (실시간가 기준 표시)</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
