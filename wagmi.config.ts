// wagmi.config.ts
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { createPublicClient } from 'viem';

// 🔧 Wagmi v2: do NOT pass `publicClient` into createConfig.
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName:
        process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ||
        'Based Burnie Mini App',
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
      metadata: {
        name: 'BurnieVerse MiniApp',
        description: 'Vote the Burnie lore',
        url: process.env.NEXT_PUBLIC_URL ?? 'https://burnieverse.app',
        icons: ['https://pbs.twimg.com/media/GzcMDP_XwAAYV-u.jpg'],
      },
      showQrModal: true,
      isNewChainsStale: false,
    }),
  ],
  transports: {
    [base.id]: http(), // or http('https://mainnet.base.org')
  },
  ssr: true,
});

// ✅ If you need a viem client elsewhere, export it separately
export const publicClient = createPublicClient({
  chain: base,
  transport: http(), // same RPC as above
});
