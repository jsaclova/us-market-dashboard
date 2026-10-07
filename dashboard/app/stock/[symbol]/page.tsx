import { SiteHeader } from "@/components/SiteHeader";
import { StockDetail } from "./StockDetail";

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 text-zinc-50 dark:bg-zinc-400 dark:text-zinc-50">
      <SiteHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pt-4">
        <StockDetail symbol={decodeURIComponent(symbol).toUpperCase()} />
      </main>
      <div className="h-[92px] shrink-0" />
    </div>
  );
}
