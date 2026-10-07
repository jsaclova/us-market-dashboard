"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "메인", match: (p: string) => p === "/" },
  { href: "/stocks", label: "주요종목", match: (p: string) => p.startsWith("/stocks") || p.startsWith("/stock") },
  { href: "/market", label: "시장지표", match: (p: string) => p.startsWith("/market") },
  { href: "/news", label: "뉴스", match: (p: string) => p.startsWith("/news") },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [dots, setDots] = useState(3);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b-2 border-zinc-700 bg-[#131722] font-bold text-zinc-50">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-5">
        <nav className="flex flex-1 gap-1.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              <Button
                variant={n.match(pathname) ? "default" : "ghost"}
                className={cn("h-auto py-1 text-2xl", n.match(pathname) && "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700")}
              >
                {n.label}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          US Market
          <span className="flex items-center gap-1 text-3xl text-red-600">
            <span className="inline-block size-2.5 animate-pulse rounded-full bg-red-600" />
            LIVE<span className="inline-block w-6 text-left">{".".repeat(dots)}</span>
          </span>
        </div>
        <div className="flex-1" />
      </div>
    </header>
  );
}
