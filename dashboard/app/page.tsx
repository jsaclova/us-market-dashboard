import { SiteHeader } from "@/components/SiteHeader";
import { OverviewView } from "@/components/views/OverviewView";

/** 메인: 스크롤 없이 한 화면 고정 (헤더/지수/환율/티커, 여백 16px 균일) */
export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-400 dark:text-zinc-50">
      <SiteHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pt-4">
        <OverviewView />
      </main>
      {/* 고정 티커 자리 확보 (티커 높이 + 16px 간격) */}
      <div className="h-[92px] shrink-0" />
    </div>
  );
}
