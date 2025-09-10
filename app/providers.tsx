"use client";

import * as React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";

const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  storage: null, // avoid reconnect loops in embedded webviews
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName:
        process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ||
        "Based Burnie Mini App",
      appLogoUrl:
        process.env.NEXT_PUBLIC_ICON_URL ||
        "https://pbs.twimg.com/media/GzcMDP_XwAAYV-u.jpg",
    }),
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "MISSING_WC_PROJECT_ID",
      showQrModal: true,
      metadata: {
        name: "BurnieVerse",
        description: "Vote on the lore for BurnieVerse on Base",
        url: process.env.NEXT_PUBLIC_URL || "https://example.com",
        icons: [
          process.env.NEXT_PUBLIC_ICON_URL ||
            "https://pbs.twimg.com/media/GzcMDP_XwAAYV-u.jpg",
        ],
      },
    }),
  ],
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"
    ),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const cdpKey =
    process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ||
    process.env.NEXT_PUBLIC_CDP_API_KEY ||
    "";

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* MiniKit must wrap the app for frame lifecycle */}
        <MiniKitProvider apiKey={cdpKey} chain={base}>
          {/* OnchainKitProvider supplies UI context & APIs */}
          <OnchainKitProvider apiKey={cdpKey} chain={base}>
            <RainbowKitProvider
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
