"use client";

import * as React from "react";
import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";

/* ========= App/env ========= */
const APP_NAME =
  process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ?? "BurnieVerse";
const APP_URL =
  process.env.NEXT_PUBLIC_URL ?? "https://theburnieverse.vercel.app";
const APP_ICON =
  process.env.NEXT_PUBLIC_ICON_URL ??
  "https://pbs.twimg.com/media/GzcMDP_XwAAYV-u.jpg";

const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "MISSING_WC_PROJECT_ID";

// Use the same key for MiniKit + OnchainKit
const OCK_API_KEY =
  process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ??
  process.env.NEXT_PUBLIC_CDP_API_KEY ??
  "";

// Helpful safety checks (non-fatal)
if (process.env.NODE_ENV === "production") {
  if (!OCK_API_KEY) {
    // eslint-disable-next-line no-console
    console.error(
      "[providers] Missing NEXT_PUBLIC_ONCHAINKIT_API_KEY (or NEXT_PUBLIC_CDP_API_KEY). MiniKit/OnchainKit features may not work."
    );
  }
  if (!WC_PROJECT_ID || WC_PROJECT_ID === "MISSING_WC_PROJECT_ID") {
    // eslint-disable-next-line no-console
    console.error(
      "[providers] Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. WalletConnect may not initialize."
    );
  }
}

/* ========= wagmi (RainbowKit default config) ========= */
export const wagmiConfig = getDefaultConfig({
  appName: APP_NAME,
  projectId: WC_PROJECT_ID,
  chains: [base],
  ssr: true,
  appDescription: "Vote the lore for BurnieVerse on Base.",
  appUrl: APP_URL,
  appIcon: APP_ICON,
});

/* ========= React Query ========= */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // keeps UI snappy and reduces refetch churn
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* MiniKit enables Base mini-app runtime (frame handoff, setFrameReady, etc.) */}
        <MiniKitProvider apiKey={OCK_API_KEY} chain={base}>
          {/* OnchainKit (identity, tx, wallet UI helpers) */}
          <OnchainKitProvider apiKey={OCK_API_KEY} chain={base}>
            <RainbowKitProvider
              initialChain={base}
              modalSize="compact"
              theme={darkTheme({
                accentColor: "#ff4500",
                accentColorForeground: "white",
                borderRadius: "large",
                fontStack: "system",
              })}
            >
              {children}
            </RainbowKitProvider>
          </OnchainKitProvider>
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
