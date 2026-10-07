"use client";

import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, Moon, Plus, RotateCcw, Sun, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNews } from "@/lib/market/useNews";
import { STOCKS } from "@/lib/market/symbols";
import { useDashboard } from "@/lib/portfolio/store";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { theme, setTheme } = useTheme();
  const { rotateSecs, setRotateSecs, tickerSecs, setTickerSecs, customStocks, addCustomStock, removeCustomStock, hiddenNews, hideNews, showNews, resetAdmin } =
    useDashboard();
  const { allItems } = useNews();

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [base, setBase] = useState("100");
  const [formError, setFormError] = useState("");

  const submitStock = () => {
    const sym = symbol.trim().toUpperCase();
    if (!/^[A-Z.]{1,7}$/.test(sym)) {
      setFormError("심볼은 영문 1–7자 (예: COIN, HOOD)로 입력하세요.");
      return;
    }
    if (!name.trim()) {
      setFormError("종목명을 입력하세요.");
      return;
    }
    const baseNum = Number(base);
    if (!baseNum || baseNum <= 0) {
      setFormError("기준가는 0보다 큰 숫자로 입력하세요.");
      return;
    }
    if (STOCKS.some((s) => s.symbol === sym) || customStocks.some((s) => s.symbol === sym)) {
      setFormError(`${sym}은(는) 이미 등록된 종목입니다.`);
      return;
    }
    addCustomStock({ symbol: sym, name: name.trim(), base: baseNum });
    setSymbol("");
    setName("");
    setBase("100");
    setFormError("");
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-400 dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <Link href="/" aria-label="대시보드로 돌아가기">
            <Button variant="ghost" size="icon" asChild>
              <span><ArrowLeft /></span>
            </Button>
          </Link>
          <div className="font-bold tracking-tight">관리자 설정</div>
          <Badge variant="secondary">localStorage 저장 · 즉시 반영</Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 pt-4 pb-28">
        {/* 종목 차트 전환 주기 */}
        <Card>
          <CardHeader>
            <CardTitle>종목 차트 전환 주기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={3}
                max={120}
                step={1}
                value={rotateSecs}
                onChange={(e) => setRotateSecs(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
                aria-label="종목 차트 전환 주기 (초)"
              />
              <span className="w-20 text-right text-2xl font-bold tabular-nums">{rotateSecs}s</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              종목 상세 화면에서 다음 종목으로 자동 전환되는 간격입니다. 3–120초 범위.
            </p>
          </CardContent>
        </Card>

        {/* 뉴스 티커 속도 */}
        <Card>
          <CardHeader>
            <CardTitle>뉴스 티커 속도</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={tickerSecs}
                onChange={(e) => setTickerSecs(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
                aria-label="뉴스 티커 속도 (기사당 초)"
              />
              <span className="w-24 text-right text-2xl font-bold tabular-nums">{tickerSecs}s/건</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              하단 티커가 기사 1건을 보여주는 시간입니다. 숫자가 클수록 느리게 이동합니다. 2–20초 범위.
            </p>
          </CardContent>
        </Card>

        {/* 테마 */}
        <Card>
          <CardHeader>
            <CardTitle>테마</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={theme !== "light" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className={cn(theme !== "light" && "font-bold")}
              >
                <Moon /> 다크
              </Button>
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className={cn(theme === "light" && "font-bold")}
              >
                <Sun /> 라이트
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              즉시 전체 화면(대시보드 포함)에 적용되며, 차트 색상도 함께 바뀝니다.
            </p>
          </CardContent>
        </Card>

        {/* 종목 추가 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>종목 관리</CardTitle>
              <span className="text-xs text-zinc-500">
                기본 {STOCKS.length}종 + 추가 {customStocks.length}종 = 총 {STOCKS.length + customStocks.length}종
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="심볼 (예: COIN)"
                className="w-32"
                maxLength={7}
              />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="종목명 (예: Coinbase)"
                className="w-44"
              />
              <Input
                value={base}
                onChange={(e) => setBase(e.target.value)}
                placeholder="기준가"
                type="number"
                min={0}
                className="w-28"
              />
              <Button size="sm" onClick={submitStock}>
                <Plus className="size-4" /> 종목 추가
              </Button>
            </div>
            {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
            <p className="mt-2 text-xs text-zinc-500">
              기준가는 차트 시드의 현재가 위치로 사용됩니다. 추가 즉시 메인 타일·개별종목 순환·시장지표에 포함됩니다.
            </p>

            {customStocks.length > 0 && (
              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>심볼</TableHead>
                      <TableHead>종목명</TableHead>
                      <TableHead className="text-right">기준가</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customStocks.map((s) => (
                      <TableRow key={s.symbol}>
                        <TableCell className="font-semibold">{s.symbol}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell className="text-right tabular-nums">${s.base.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCustomStock(s.symbol)}
                            aria-label={`${s.symbol} 삭제`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 뉴스 관리 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>뉴스 관리</CardTitle>
              <span className="text-xs text-zinc-500">숨김 {hiddenNews.length}건 · 티커/뉴스페이지에서 제외</span>
            </div>
          </CardHeader>
          <CardContent className="flex max-h-[420px] flex-col gap-1 overflow-y-auto">
            {allItems.map((n) => {
              const hidden = hiddenNews.includes(n.id);
              return (
                <div
                  key={n.id}
                  className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", hidden && "opacity-50")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{n.titleKo ?? n.title}</div>
                    <div className="text-xs text-zinc-500">{n.source}</div>
                  </div>
                  {hidden ? (
                    <Button variant="outline" size="sm" onClick={() => showNews(n.id)}>
                      <Undo2 className="size-4" /> 복원
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => hideNews(n.id)} aria-label="뉴스 숨기기">
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 초기화 */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-xs text-zinc-500">차트전환 10초·티커 9초/건·숨긴 뉴스 복원으로, 추가 종목 전체 삭제</p>
            <Button variant="outline" size="sm" onClick={resetAdmin}>
              <RotateCcw className="size-4" /> 기본값 복원
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
