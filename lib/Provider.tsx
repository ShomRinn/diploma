"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState, useEffect } from "react";
import { type State, WagmiProvider } from "wagmi";
import { StorageInitializer } from "../components/StorageInitializer";
import { setupFetchInterceptor } from "./fetch-interceptor";

import { getConfig } from "../wagmi.config";

type Props = {
  children: ReactNode;
  initialState: State | undefined;
};

export function Provider({ children, initialState }: Props) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  // Setup fetch interceptor for automatic token refresh
  useEffect(() => {
    setupFetchInterceptor();
  }, []);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <StorageInitializer />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}