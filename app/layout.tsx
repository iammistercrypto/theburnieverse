// Server Component (do NOT add "use client")
import "./theme.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@rainbow-me/rainbowkit/styles.css";

import { Providers } from "./providers";
import ClientWrapper from "./client-wrapper";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// ✅ Dynamic metadata for Base Mini App embeds (fc:miniapp + fc:frame)
export async function generateMetadata(): Promise<Metadata> {
  const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://example.com";
  const title =
    process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Based Burnie Mini App";
  const description =
    process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Vote with $BURN in the BurnieVerse";

  const ogImage = process.env.NEXT_PUBLIC_APP_OG_IMAGE || "/burnie-og.png"; // 1200x630
  const hero = process.env.NEXT_PUBLIC_APP_HERO_IMAGE || ogImage;            // preview
  const splash = process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || ogImage;        // 200x200 PNG
  const splashBg =
    process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#000000";

  const fcMiniApp = {
    version: "1",
    imageUrl: hero,
    button: {
      title: `Launch ${title}`,
      action: {
        type: "launch_frame",
        name: title,
        url: SITE_URL,
        splashImageUrl: splash,
        splashBackgroundColor: splashBg,
      },
    },
  };

  const fcFrame = {
    version: "next",
    imageUrl: hero,
    button: {
      title: `Launch ${title}`,
      action: {
        type: "launch_frame",
        name: title,
        url: SITE_URL,
        splashImageUrl: splash,
        splashBackgroundColor: splashBg,
      },
    },
  };

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
      other: [
        {
          rel: "icon",
          url: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    openGraph: {
      type: "website",
      url: SITE_URL,
      title: process.env.NEXT_PUBLIC_APP_OG_TITLE || title,
      description:
        process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: process.env.NEXT_PUBLIC_APP_OG_TITLE || title,
      description:
        process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || description,
      images: [ogImage],
      creator: "@BasedBurnie",
    },
    other: {
      "fc:miniapp": JSON.stringify(fcMiniApp),
      "fc:frame": JSON.stringify(fcFrame),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Force Lit into production mode on the client */}
        <Script id="lit-prod-mode" strategy="beforeInteractive">
          {`globalThis.litDevMode = false;`}
        </Script>

        {/* Mobile/web-app niceties */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* Basic fallbacks for older crawlers */}
        <meta property="og:title" content="Based Burnie Mini App" />
        <meta
          property="og:description"
          content="Vote with $BURN in the BurnieVerse"
        />
        <meta property="og:image" content="/burnie-og.png" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* PWA / manifest */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        {/* Wagmi + React Query + OnchainKit + MiniKit */}
        <Providers>
          <ClientWrapper>{children}</ClientWrapper>
        </Providers>
      </body>
    </html>
  );
}
