"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MapStock } from "@/app/api/sp500/route";

function capOf(s: MapStock): number {
  return (s as MapStock & { cap?: number }).cap ?? 0;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// finviz식 등락 색상 (-3% ~ +3%)
function heatColor(pct: number): string {
  const t = Math.max(-1, Math.min(1, pct / 3));
  const lerp = (a: number[], b: number[], k: number) =>
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
  if (t >= 0) return lerp([55, 71, 79], [46, 125, 50], t);
  return lerp([55, 71, 79], [198, 40, 40], -t);
}

function worstRatio(row: number[], w: number): number {
  const s = row.reduce((a, b) => a + b, 0);
  if (s === 0) return Infinity;
  const mx = Math.max(...row);
  const mn = Math.min(...row);
  return Math.max((w * w * mx) / (s * s), (s * s) / (w * w * mn));
}

// squarify: 무게 리스트 → 같은 박스 안 사각형 분할
function squarify(weights: number[], x: number, y: number, w: number, h: number): Rect[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const scale = total > 0 ? (w * h) / total : 0;
  const items = weights.map((v, i) => ({ v: v * scale, i })).filter((o) => o.v > 0);
  const rects: (Rect & { i: number })[] = [];
  let cx = x;
  let cy = y;
  let cw = w;
  let ch = h;
  let row: typeof items = [];
  const layoutRow = () => {
    const s = row.reduce((a, o) => a + o.v, 0);
    if (s <= 0) return;
    if (cw >= ch) {
      const rw = s / ch;
      let ry = cy;
      for (const o of row) {
        const rh = o.v / rw;
        rects.push({ x: cx, y: ry, w: rw, h: rh, i: o.i });
        ry += rh;
      }
      cx += rw;
      cw -= rw;
    } else {
      const rh = s / cw;
      let rx = cx;
      for (const o of row) {
        const rw = o.v / rh;
        rects.push({ x: rx, y: cy, w: rw, h: rh, i: o.i });
        rx += rw;
      }
      cy += rh;
      ch -= rh;
    }
    row = [];
  };
  for (const o of items) {
    const shortSide = Math.min(cw, ch);
    if (row.length === 0 || worstRatio([...row.map((r) => r.v), o.v], shortSide) <= worstRatio(row.map((r) => r.v), shortSide)) {
      row.push(o);
    } else {
      layoutRow();
      row.push(o);
    }
  }
  layoutRow();
  const byIdx: Rect[] = new Array(weights.length);
  for (const r of rects) byIdx[r.i] = r;
  return items.map((o) => byIdx[o.i] ?? { x, y, w: 0, h: 0 });
}

const SECTOR_ORDER = [
  "Information Technology",
  "Communication Services",
  "Financials",
  "Consumer Discretionary",
  "Health Care",
  "Industrials",
  "Consumer Staples",
  "Energy",
  "Utilities",
  "Materials",
  "Real Estate",
];

export function Sp500Map({ stocks }: { stocks: MapStock[] }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(16 / 9);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientHeight > 0) setAspect(el.clientWidth / el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = 1600;
  const H = Math.min(1200, Math.max(500, Math.round(W / aspect)));

  // 3단: 섹터 → 세부산업 → 종목 (finviz 구조)
  const sectors = new Map<string, Map<string, MapStock[]>>();
  for (const s of stocks) {
    if (!sectors.has(s.sector)) sectors.set(s.sector, new Map());
    const subs = sectors.get(s.sector)!;
    const key = s.sub || "Other";
    if (!subs.has(key)) subs.set(key, []);
    subs.get(key)!.push(s);
  }
  // 시총 가중 (finviz 방식). cap 없는 종목은 중앙값으로 대체
  const allCaps = stocks.map((s) => capOf(s)).filter((c) => c > 0).sort((a, b) => a - b);
  const median = allCaps[Math.floor(allCaps.length / 2)] || 1;
  const w = (s: MapStock) => capOf(s) || median;
  const sectorList = [...sectors.entries()].sort(
    (a, b) => SECTOR_ORDER.indexOf(a[0]) - SECTOR_ORDER.indexOf(b[0]),
  );
  const sectorRects = squarify(
    sectorList.map(([, subs]) => [...subs.values()].flat().reduce((a, s) => a + w(s), 0)),
    0,
    0,
    W,
    H,
  );

  return (
    <div ref={wrapRef} className="h-full w-full">
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="S&P 500 map">
      {sectorList.map(([name, subs], si) => {
        const sr = sectorRects[si];
        if (!sr || sr.w <= 0) return null;
        const subList = [...subs.entries()].sort(
          (a, b) => b[1].reduce((x, s) => x + w(s), 0) - a[1].reduce((x, s) => x + w(s), 0),
        );
        const hasSubHead = sr.w > 90 && sr.h > 40;
        const subRects = squarify(
          subList.map(([, ms]) => ms.reduce((a, s) => a + w(s), 0)),
          sr.x,
          sr.y + (hasSubHead ? 20 : 0),
          sr.w,
          sr.h - (hasSubHead ? 20 : 0),
        );
        return (
          <g key={name}>
            <rect x={sr.x} y={sr.y} width={sr.w} height={sr.h} fill="#1c2530" stroke="#0b0e13" strokeWidth={2} />
            {hasSubHead && (
              <text x={sr.x + 6} y={sr.y + 15} fontSize={13} fontWeight="bold" fill="#ffffff">
                {name.toUpperCase().slice(0, Math.max(0, Math.floor((sr.w - 12) / 8)))}
              </text>
            )}
            {subList.map(([sub, ms], subi) => {
              const br = subRects[subi];
              if (!br || br.w <= 0 || br.h <= 0) return null;
              const hasHead = br.w > 70 && br.h > 50;
              const rects = squarify(
                ms.map((s) => w(s)),
                br.x + 1,
                br.y + (hasHead ? 14 : 0),
                br.w - 2,
                br.h - (hasHead ? 14 : 0),
              );
              return (
                <g key={sub}>
                  {hasHead && (
                    <text x={br.x + 4} y={br.y + 11} fontSize={9} fill="#78909c">
                      {sub.toUpperCase().slice(0, Math.max(0, Math.floor((br.w - 8) / 6)))}
                    </text>
                  )}
                  {ms.map((s, i) => {
                    const r = rects[i];
                    if (!r || r.w < 4 || r.h < 4) return null;
                    const big = r.w > 64 && r.h > 44;
                    const mid = r.w > 40 && r.h > 28;
                    // 대기업 박스일수록 큰 글씨
                    const symSize = big ? Math.min(38, Math.max(16, Math.min(r.w, r.h) / 5)) : 10;
                    const pctSize = Math.max(10, Math.round(symSize * 0.75));
                    return (
                      <g
                        key={s.symbol}
                        onClick={() => router.push(`/stock/${s.symbol}`)}
                        className="cursor-pointer"
                      >
                        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={heatColor(s.changePct)} stroke="#0b0e13" strokeWidth={1} />
                        {mid && (
                          <text x={r.x + r.w / 2} y={r.y + r.h / 2 - (big ? symSize * 0.45 : -4)} textAnchor="middle" fontSize={big ? symSize : 10} fontWeight="bold" fill="#fff">
                            {s.symbol.replace(".", "-")}
                          </text>
                        )}
                        {big && (
                          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + pctSize} textAnchor="middle" fontSize={pctSize} fill="#fff">
                            {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
    </div>
  );
}
