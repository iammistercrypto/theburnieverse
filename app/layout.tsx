// app/layout.tsx  (Server Component — no "use client")
import "./theme.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { Providers } from "./providers";
import ClientWrapper from "./client-wrapper";

const inter = Inter({ subsets: ["latin"] });

/**
 * ✅ Dynamic metadata for Base Mini App (frame) embeds.
 * Reads from environment variables so you can tweak without code changes.
 * Note: do NOT export a static `metadata` alongside this.
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  const title =
    process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Based Burnie Mini App";
  const description =
    process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Vote with $BURN in the BurnieVerse";

  const ogImage =
    process.env.NEXT_PUBLIC_APP_OG_IMAGE || "/burnie-og.png";
  const ogTitle =
    process.env.NEXT_PUBLIC_APP_OG_TITLE || title;
  const ogDescription =
    process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || description;

  const heroImage =
    process.env.NEXT_PUBLIC_APP_HERO_IMAGE || ogImage;
  const splashImage =
    process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || ogImage;
  const splashBg =
    process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#000000";

  const projectName =
    process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Based Burnie Mini App";

  return {
    title,
    description,
    // Use globalThis.URL so we never shadow the constructor
    metadataBase: new globalThis.URL(siteUrl),
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
      other: [{ rel: "icon", url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      url: siteUrl,
      title: ogTitle,
      description: ogDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: "BurnieVerse Voting" }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
      creator: "@BasedBurnie",
    },
    // Mini App frame metadata
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: heroImage,
        button: {
          title: `Launch ${projectName}`,
          action: {
            type: "launch_frame",
            name: projectName,
            url: siteUrl,
            splashImageUrl: splashImage,
            splashBackgroundColor: splashBg,
          },
        },
      }),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Force Lit into production mode on the client */}
        <Script id="lit-prod-mode" strategy="beforeInteractive">
          {`globalThis.litDevMode = false;`}
        </Script>

        {/* Fallback OG tags for older crawlers */}
        <meta property="og:title" content="Based Burnie Mini App" />
        <meta property="og:description" content="Vote with $BURN in the BurnieVerse" />
        <meta property="og:image" content="/burnie-og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Providers>
          <ClientWrapper>{children}</ClientWrapper>
        </Providers>
      </body>
    </html>
  );
}
