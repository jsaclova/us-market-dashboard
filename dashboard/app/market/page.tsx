import { SiteHeader } from "@/components/SiteHeader";
import { MarketView } from "@/components/views/MarketView";

export default function MarketPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 text-zinc-50 dark:bg-zinc-400 dark:text-zinc-50">
      <SiteHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pt-4">
        <MarketView />
      </main>
      <div className="h-[92px] shrink-0" />
    </div>
  );
}
