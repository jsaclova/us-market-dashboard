import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { NewsTicker } from "@/components/NewsTicker";
import { AutoCycle } from "@/components/AutoCycle";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "US Market Dashboard",
  description: "미국 지수·종목·외환·뉴스 실시간 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AutoCycle />
          <div className="min-h-screen">{children}</div>
          <NewsTicker />
        </Providers>
      </body>
    </html>
  );
}
