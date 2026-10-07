# US Market Dashboard

실시간 미국 증시 대시보드. 3대 지수 인트라데이 차트, 30종목 자동 순환, 외환·금리·원자재 시장지표, 한글 실시간 뉴스로 구성된다.
스크롤 없는 한 화면 고정형(키오스크) + 서브 페이지 구조다.

- Live: **http://localhost:3000** (`dashboard/` 실행 시)

## 화면 구성

| 경로 | 내용 |
|---|---|
| `/` 메인 | 3대 지수 finviz식 다크 캔들 차트 + 원화 환율 4종 + 하단 뉴스 티커 |
| `/stocks` 주요종목 | 30종 그리드 1회 표시 후 차트 자동 순환 (수동 조작 없음) |
| `/stock/[symbol]` | 개별 종목 차트 자동 순환 (다음 종목으로 자동 전환) |
| `/market` 시장지표 | 미국채 2/10/20/30Y + 10Y-2Y 역전 모니터 + 원자재 6종 + 주요통화 4종 |
| `/news` 뉴스 | 한글 번역 뉴스 전체 목록 (호재/중립/악재 색상 구분) |
| `/admin` 관리자 | 차트 전환주기·티커 속도·테마·종목 추가·뉴스 숨기기 (직접 URL 접속) |

## 데이터 출처 (전부 실측 검증됨, 키 불필요)

| 데이터 | 소스 | 방식 |
|---|---|---|
| 지수 (S&P·나스닥·다우) | Yahoo Finance 현물 + ETF 파생 실시간가 (finviz 방식) | `/api/indices` 30초 캐시 |
| 개별 30종목 | Yahoo Finance 2년 일봉 + 시세 | `/api/stock/[s]` (히스토리 1h·시세 30초 캐시), `/api/stocks/quotes` 배치 |
| 환율 (USD/EUR/JPY100/GBP 대원) | Frankfurter (ECB 고시) 크로스 계산 | `/api/fx` 10분 캐시 |
| 국채금리 2/10/20/30Y | CNBC Tradeweb 실시간 | `/api/market` 5분 캐시 |
| 원자재·주요통화·스프레드 히스토리 | Yahoo Finance | `/api/market` 5분 캐시 |
| 뉴스 | CNBC·Investing.com·연준 공식발표 RSS (주식 키워드 필터) | `/api/news` 2분 캐시, 화면 30초 폴링 |

> 무료 구간 한계: 분 단위 실시간 틱이 아니라 스냅샷 폴링이다. 지수는 약 10분 지연(Yahoo 무료 특성),
> 환율은 ECB 일간 고시, 뉴스는 RSS 갱신 주기(15분~1시간)를 따른다.

### 한글번역
- DeepL API 우선 (키: `.env.local`의 `DEEPL_API_KEY`, 미설정 시 MyMemory 폴백)
- 신규 기사만 번역, 24시간 캐시 + 금융 고유명사 후처리
- 번역량: 제목 기준 월 수천자 수준 (DeepL 무료 50만자 내 충분)

## 기술 스택

- Next.js 16 App Router + TypeScript + Tailwind CSS v4 + shadcn/ui 패턴
- TradingView Lightweight Charts 5.2.1 (npm, `lightweight-charts/`는 API 레퍼런스용 로컬 클론)
- Zustand (persist, localStorage) + TanStack Query
- 폰트: 네이버 D2Coding 셀프호스팅 (`public/fonts`)

## 실행

```bash
cd dashboard
npm install
npm run dev    # 개발 (http://localhost:3000)
npm run build && npm run start  # 프로덕션
```

## 디렉토리

```
dashboard/
  app/
    page.tsx                 # 메인 (한 화면 고정)
    stocks/page.tsx          # 주요종목 자동 순환
    stock/[symbol]/          # 개별 종목 (자동 전환)
    market/page.tsx          # 시장지표 (한 화면 고정)
    news/page.tsx            # 뉴스 전체
    admin/page.tsx           # 관리자
    api/
      indices/route.ts       # 지수 ETF 파생가
      stock/[symbol]/route.ts# 개별 종목 히스토리+시세
      stocks/quotes/route.ts # 30종 배치 시세
      fx/route.ts            # 환율 4종
      market/route.ts        # 금리·원자재·통화·스프레드
      news/route.ts          # 뉴스 수집+번역+감성+필터
  components/
    IndexCard.tsx            # finviz식 지수 카드 (캔들+거래량+전일선)
    NewsTicker.tsx           # 하단 뉴스 티커
    FxBar.tsx                # 환율 스트립
    StockShowcase.tsx        # 종목 차트 (조작 없음)
    StocksAutoCycle.tsx      # 그리드→순환 오케스트레이션
    SiteHeader.tsx           # 헤더 (US Market LIVE)
    views/MarketView.tsx     # 시장지표 섹션들
  lib/market/                # symbols, hooks(useStockData·useIndexFutures·useNews),
                             # sentiment(호재/중립/악재), stockFilter (전량 실측, 목업 없음)
  lib/portfolio/store.ts     # timeframe·rotateSecs·tickerSecs·customStocks·hiddenNews
lightweight-charts/          # TradingView 공식 저장소 클론 (참고용, git 제외)
```

## 관리자 설정 (localStorage `rt-stock-v2`, 즉시 반영)

- 종목 차트 전환 주기 (3–120초), 뉴스 티커 속도 (기사당 2–20초)
- 테마 (다크/라이트), 종목 추가/삭제, 뉴스 숨기기/복원, 기본값 복원
