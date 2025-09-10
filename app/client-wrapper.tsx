'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
      console.warn('WalletConnect projectId is not set. QR modal may be limited.');
    }
  }, []);

  // Prefer API key if you add one; fallback to public Base RPC otherwise
  const ockApiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

  return (
    <RainbowKitProvider modalSize="compact">
      <OnchainKitProvider
        chain={base}
        {...(ockApiKey ? { apiKey: ockApiKey } : { rpcUrl })}
        config={{
          appearance: { name: 'BurnieVerse', theme: 'default', mode: 'auto' },
        }}
      >
        {children}
      </OnchainKitProvider>
    </RainbowKitProvider>
  );
}
