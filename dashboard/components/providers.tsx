"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { syncCustomBases } from "@/lib/market/custom";
import { useDashboard } from "@/lib/portfolio/store";

function CustomBaseSync() {
  const custom = useDashboard((s) => s.customStocks);
  useEffect(() => {
    syncCustomBases(custom);
  }, [custom]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={client}>
        <CustomBaseSync />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
