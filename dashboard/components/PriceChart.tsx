"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/market/types";

interface Props {
  candles: Candle[];
  liveBar?: Candle | null;
  dark?: boolean;
  height?: number;
}

function ma(values: Candle[], period = 20) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += values[i - j].close;
    out.push({ time: values[i].time, value: Math.round((sum / period) * 100) / 100 });
  }
  return out;
}

export function PriceChart({ candles, liveBar, dark, height = 420 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maRef = useRef<ISeriesApi<"Line"> | null>(null);

  // 차트 생성 (마운트 1회, 테마 변경 시 옵션만 갱신)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: dark ? "#a1a1aa" : "#52525b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        horzLines: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { labelBackgroundColor: "#6366f1" },
        horzLine: { labelBackgroundColor: "#6366f1" },
      },
    });
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
      borderVisible: false,
    });
    const vs = chart.addSeries(HistogramSeries, {
      priceScaleId: "vol",
      priceFormat: { type: "volume" },
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const ms = chart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    chartRef.current = chart;
    candleRef.current = cs;
    volRef.current = vs;
    maRef.current = ms;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // 테마 변경 시 색상만 갱신
  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: { textColor: dark ? "#a1a1aa" : "#52525b" },
      grid: {
        vertLines: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        horzLines: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
      },
    });
  }, [dark]);

  // 높이 변경 반영
  useEffect(() => {
    chartRef.current?.applyOptions({ height });
  }, [height]);

  // 심볼/타임프레임 변경 시 전량 세팅
  useEffect(() => {
    if (!candleRef.current || candles.length === 0) return;
    candleRef.current.setData(candles.map(({ volume, ...c }) => c));
    volRef.current?.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? "rgba(22,163,74,0.4)" : "rgba(220,38,38,0.4)",
      })),
    );
    maRef.current?.setData(ma(candles));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // 실시간 틱은 update()만 (setData 금지)
  useEffect(() => {
    if (!liveBar || !candleRef.current) return;
    const { volume, ...bar } = liveBar;
    candleRef.current.update(bar);
    volRef.current?.update({
      time: liveBar.time,
      value: volume ?? 0,
      color: liveBar.close >= liveBar.open ? "rgba(22,163,74,0.4)" : "rgba(220,38,38,0.4)",
    });
  }, [liveBar]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
