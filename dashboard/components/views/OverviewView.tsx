"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IndexCard } from "@/components/IndexCard";
import { FxBar } from "@/components/FxBar";
import { INDICES } from "@/lib/market/symbols";
import { useIndexFutures } from "@/lib/market/useIndexFutures";
import { useNews } from "@/lib/market/useNews";

function HeadlineBar() {
  const { items } = useNews();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, 8000);
    return () => clearInterval(id);
  }, [items.length]);

  const top = items.length > 0 ? items[idx % items.length] : null;
  if (!top) return null;
  const time = new Date(top.publishedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div id="headline-bar" className="flex shrink-0 items-center gap-2 rounded-xl border border-zinc-800 bg-[#131722] px-3 py-2">
      <span className="shrink-0 text-sm">
        <span className="text-zinc-400">☆ Today, </span>
        <span className="font-semibold text-red-500">{time}</span>
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-50">
        {top.titleKo ?? top.title}
      </span>
    </div>
  );
}

export function OverviewView() {
  const router = useRouter();
  const futs = useIndexFutures();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <HeadlineBar />
      <section className="grid min-h-[280px] flex-1 gap-4 md:grid-cols-3">
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
