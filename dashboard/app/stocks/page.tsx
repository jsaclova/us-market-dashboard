import { SiteHeader } from "@/components/SiteHeader";
import { StocksAutoCycle } from "@/components/StocksAutoCycle";

export default function StocksPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-500 text-zinc-50 dark:bg-zinc-800 dark:text-zinc-50">
      <SiteHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pt-4">
        <StocksAutoCycle />
      </main>
      <div className="h-[92px] shrink-0" />
    </div>
  );
}
