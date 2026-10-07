"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Card, CardContent } from "@/components/ui/card";
import type { IndexFuture } from "@/app/api/indices/route";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  fut?: IndexFuture | null;
  active?: boolean;
  onSelect?: () => void;
}

function fmtPts(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 해당 ET 날짜의 9:30 / 16:00 (UTC 초). 프리마켓 포함 시 시작만 앞당김 */
function sessionWindow(nowMs: number, firstBarSec: number): { from: number; to: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get("year");
  const mo = get("month");
  const d = get("day");
  const off = etOffsetMs(new Date(nowMs));
  const open = Date.UTC(y, mo - 1, d, 9, 30) - off;
  const close = Date.UTC(y, mo - 1, d, 16, 0) - off;
  return { from: Math.min(firstBarSec * 1000, open) / 1000, to: close / 1000 };
}

function etOffsetMs(at: Date): number {
  const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const tz = new Date(at.toLocaleString("en-US", { timeZone: "America/New_York" })).getTime();
  return tz - utc;
}

/** finviz식: 당일캔들 + 거래량 + 노란 현재가 + 빨간 전일종가선 + 전체 세션 축 */
export function IndexCard({ name, fut, active, onSelect }: Props) {
  const chartEl = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastRef = useRef<ISeriesApi<"Line"> | null>(null);
  const prevLineRef = useRef<IPriceLine | null>(null);

  const candles = useMemo(
    () =>
      (fut?.intraday ?? []).map((p) => ({
        time: p.t as UTCTimestamp,
        open: p.o,
        high: p.h,
        low: p.l,
        close: p.c,
      })),
    [fut],
  );
  const vols = useMemo(
    () =>
      (fut?.intraday ?? []).map((p) => ({
        time: p.t as UTCTimestamp,
        value: p.vol,
        color: "rgba(41,98,255,0.55)",
      })),
    [fut],
  );

  useEffect(() => {
    const el = chartEl.current;
    if (!el) return;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: Math.max(200, el.clientHeight || 200),
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#787b86", fontSize: 11 },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)", style: LineStyle.Dashed },
        horzLines: { color: "rgba(255,255,255,0.06)", style: LineStyle.Dashed },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        // UTC 타임스탬프를 미 동부(ET) 시각으로 표시
        tickMarkFormatter: (time: UTCTimestamp) =>
          new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "America/New_York",
          }).format(new Date((time as number) * 1000)),
      },
      crosshair: { mode: 1 },
    });
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const vs = chart.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" } });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.88, bottom: 0 }, visible: true, borderVisible: false });
    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.04, bottom: 0.04 }, borderVisible: false });
    chart.priceScale("left").applyOptions({ visible: false, borderVisible: false });
    // 노란 현재가 태그 전용 (선은 숨김)
    const ys = chart.addSeries(LineSeries, {
      color: "#f5c518",
      lineVisible: false,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
      pointMarkersVisible: false,
      priceScaleId: "right",
    });
    candleRef.current = cs;
    volRef.current = vs;
    lastRef.current = ys;
    chartRef.current = chart;
    const ro = new ResizeObserver(() => {
      if (chartEl.current) {
        chart.applyOptions({
          width: chartEl.current.clientWidth,
          height: Math.max(200, chartEl.current.clientHeight),
        });
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
      lastRef.current = null;
      prevLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cs = candleRef.current;
    if (!cs || !fut || candles.length === 0) return;
    cs.setData(candles);
    volRef.current?.setData(vols);
    const last = candles[candles.length - 1];
    lastRef.current?.setData([{ time: last.time, value: last.close }]);
    // 전일종가 빨간 점선 (최초 1회)
    if (!prevLineRef.current) {
      prevLineRef.current = cs.createPriceLine({
        price: fut.prevClose,
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "",
      });
    }
    // 스케일에 전일종가 포함 + 전체 세션 축(데이터 앞 5분 ~ +12시간)
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    // 기준선 중앙 정렬: 전일종가 기준 상하 대칭 스케일
    const dev = Math.max(
      Math.max(...highs) - fut.prevClose,
      fut.prevClose - Math.min(...lows),
      (Math.max(...highs) - Math.min(...lows)) * 0.1 || 1,
    ) * 1.1;
    const lo = fut.prevClose - dev;
    const hi = fut.prevClose + dev;
    const pad = (hi - lo || 1) * 0.08;
    cs.applyOptions({
      autoscaleInfoProvider: () => ({ priceRange: { minValue: lo - pad, maxValue: hi + pad } }),
    });
    const first = candles[0].time as number;
    const win = sessionWindow(fut.time, first);
    chartRef.current?.timeScale().setVisibleRange({ from: win.from as UTCTimestamp, to: win.to as UTCTimestamp });
  }, [candles, vols, fut]);

  const chg = fut?.change ?? 0;
  const chgPct = fut?.changePct ?? 0;
  const up = chg >= 0;
  const dateStr = fut
    ? new Date(fut.time).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <button onClick={onSelect} className="h-full text-left">
      <Card className={cn("h-full overflow-hidden border-zinc-800 bg-[#131722] text-zinc-100", active && "ring-2 ring-indigo-500")}>
        <CardContent className="flex h-full min-h-0 flex-col p-4">
          <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xl font-bold tracking-tight">{name}</div>
              <div className="text-[10px] tracking-wide text-zinc-500">ETF DERIVED</div>
            </div>
            <div className="text-xs text-zinc-400">{dateStr}</div>
            <div className={cn("text-lg font-bold tabular-nums", up ? "text-emerald-400" : "text-red-400")}>
              {fut ? `${up ? "+" : "-"}${fmtPts(Math.abs(chg))} (${up ? "+" : ""}${chgPct.toFixed(2)}%)` : "—"}
            </div>
          </div>
          </div>
          <div className="relative mt-1 min-h-0 w-full flex-1">
            <div ref={chartEl} className="absolute inset-0" />
            <span className="pointer-events-none absolute bottom-1 left-1 text-[9px] tracking-wide text-zinc-500">
              RELATIVE VOLUME
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
