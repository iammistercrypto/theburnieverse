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

// ✅ Dynamic metadata for Base Mini App (frame) embeds.
// Reads from env so you can tweak without code changes.
export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL || "https://example.com";
  const ogImage = process.env.NEXT_PUBLIC_APP_OG_IMAGE || "/burnie-og.png";
  const hero = process.env.NEXT_PUBLIC_APP_HERO_IMAGE || ogImage;

  return {
    title:
      process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Based Burnie Mini App",
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
      "Vote with $BURN in the BurnieVerse",
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
      url: URL,
      title:
        process.env.NEXT_PUBLIC_APP_OG_TITLE || "Based Burnie Mini App",
      description:
        process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION ||
        "Vote with $BURN in the BurnieVerse",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title:
        process.env.NEXT_PUBLIC_APP_OG_TITLE || "Based Burnie Mini App",
      description:
        process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION ||
        "Vote with $BURN in the BurnieVerse",
      images: [ogImage],
      creator: "@BasedBurnie",
    },
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: hero,
        button: {
          title: `Launch ${
            process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ||
            "Based Burnie Mini App"
          }`,
          action: {
            type: "launch_frame",
            name:
              process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ||
              "Based Burnie Mini App",
            url: URL,
            splashImageUrl:
              process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || ogImage,
            splashBackgroundColor:
              process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#000000",
          },
        },
      }),
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

        <meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="format-detection" content="telephone=no" />

        {/* Fallback OG/Twitter for older crawlers */}
        <meta property="og:title" content="Based Burnie Mini App" />
        <meta
          property="og:description"
          content="Vote with $BURN in the BurnieVerse"
        />
        <meta property="og:image" content="/burnie-og.png" />
        <meta name="twitter:card" content="summary_large_image" />
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
