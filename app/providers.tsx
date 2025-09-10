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
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";

const queryClient = new QueryClient();

const appName =
  process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "BurnieVerse";
const appUrl = process.env.NEXT_PUBLIC_URL || "https://theburnieverse.vercel.app";
const appIcon =
  process.env.NEXT_PUBLIC_ICON_URL ||
  "https://pbs.twimg.com/media/GzcMDP_XwAAYV-u.jpg";

const wagmiConfig = getDefaultConfig({
  appName,
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "MISSING_WC_PROJECT_ID",
  chains: [base],
  ssr: true,
  wallets: undefined, // use RainbowKit defaults (Injected, Coinbase Wallet, WalletConnect)
  appDescription: "Vote the lore for BurnieVerse on Base.",
  appUrl,
  appIcon,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const cdpKey =
    process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ||
    process.env.NEXT_PUBLIC_CDP_API_KEY ||
    "";

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider apiKey={cdpKey} chain={base}>
          <OnchainKitProvider apiKey={cdpKey} chain={base}>
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
