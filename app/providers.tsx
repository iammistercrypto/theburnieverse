"use client";

import * as React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  storage: null, // avoid reconnect loops in embedded webviews
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName:
        process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Based Burnie Mini App",
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
        url: process.env.NEXT_PUBLIC_SITE_URL || "https://based-burnie-miniapp.example",
        icons: [
          process.env.NEXT_PUBLIC_ICON_URL ||
            "https://pbs.twimg.com/media/GzcMDP_XwAAYV-u.jpg",
        ],
      },
    }),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <MiniKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
            chain={base}
          >
            <OnchainKitProvider
              apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
              chain={base}
            >
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
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
