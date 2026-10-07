"use client";

import { useEffect, useState } from "react";

export function SiteHeader() {
  const [dots, setDots] = useState(3);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b-2 border-zinc-700 bg-[#131722] font-bold text-zinc-50">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-5">
        <div className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          Realtime US Market
          <span className="flex items-center gap-1 text-3xl text-red-600">
            <span className="inline-block size-2.5 animate-pulse rounded-full bg-red-600" />
            LIVE<span className="inline-block w-6 text-left">{".".repeat(dots)}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
