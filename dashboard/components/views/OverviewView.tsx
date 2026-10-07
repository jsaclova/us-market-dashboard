"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IndexCard } from "@/components/IndexCard";
import { FxBar } from "@/components/FxBar";
import { INDICES } from "@/lib/market/symbols";
import { useIndexFutures } from "@/lib/market/useIndexFutures";

export function OverviewView() {
  const router = useRouter();
  const futs = useIndexFutures();
  const [geom, setGeom] = useState({ head: 0, fx: 0, tick: 76, vh: 800 });

  useEffect(() => {
    const header = document.querySelector("header");
    const fx = document.getElementById("fx-block");
    const tick = document.getElementById("news-ticker");
    const measure = () =>
      setGeom({
        head: header?.offsetHeight ?? 0,
        fx: fx?.offsetHeight ?? 0,
        tick: tick?.offsetHeight ?? 76,
        vh: window.innerHeight,
      });
    measure();
    const ro = new ResizeObserver(measure);
    if (header) ro.observe(header);
    if (fx) ro.observe(fx);
    if (tick) ro.observe(tick);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // 헤더/환율/티커 실측 + 여백 56px 제외한 나머지를 지수에 몰아줌
  const sectionH = Math.max(300, geom.vh - geom.head - geom.fx - geom.tick - 56);

  return (
    <div className="flex h-full flex-col gap-4">
      <section className="grid shrink-0 gap-4 md:grid-cols-3" style={{ height: sectionH }}>
        {INDICES.map((i) => (
          <IndexCard
            key={i.symbol}
            name={i.name}
            fut={futs?.[i.symbol]}
            onSelect={() => router.push("/market")}
          />
        ))}
      </section>

      <div id="fx-block">
        <FxBar />
      </div>
    </div>
  );
}
