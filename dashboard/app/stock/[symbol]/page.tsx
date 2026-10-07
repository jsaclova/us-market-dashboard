import { SiteHeader } from "@/components/SiteHeader";
import { StockDetail } from "./StockDetail";

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-400 dark:text-zinc-50">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pt-4 pb-28">
        <StockDetail symbol={decodeURIComponent(symbol).toUpperCase()} />
      </main>
    </div>
  );
}
