// app/.well-known/farcaster.json/route.ts
export const runtime = 'edge';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

function withValidProperties(
  properties: Record<string, undefined | string | string[] | boolean>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, v]) =>
      Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ''
    ),
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function GET(req: Request) {
  const origin = process.env.NEXT_PUBLIC_URL || new URL(req.url).origin;

  // Optional allowlist for Base Builder
  const allowed =
    (process.env.NEXT_PUBLIC_BASE_BUILDER_ADDRESS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const tags =
    (process.env.NEXT_PUBLIC_APP_TAGS || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

  // Use PNG assets hosted on YOUR domain (recommended)
  const iconUrl =
    process.env.NEXT_PUBLIC_APP_ICON || `${origin}/icon-1024.png`;          // 1024x1024 PNG (no alpha)
  const splashImageUrl =
    process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || `${origin}/splash-200.png`; // 200x200 PNG
  const heroImageUrl =
    process.env.NEXT_PUBLIC_APP_HERO_IMAGE || `${origin}/burnie-og.png`;     // 1200x630 PNG
  const ogImageUrl =
    process.env.NEXT_PUBLIC_APP_OG_IMAGE || `${origin}/burnie-og.png`;       // 1200x630 PNG

  const common = withValidProperties({
    version: '1',
    name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'BurnieVerse',
    subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    homeUrl: origin,
    iconUrl,
    splashImageUrl,
    splashBackgroundColor:
      process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || '#000000',
    primaryCategory:
      process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY || 'entertainment',
    tags,
    heroImageUrl,
    tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
    ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE || 'BurnieVerse',
    ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
    ogImageUrl,
    noindex: false,
    // requiredChains: ['eip155:8453'], // enable if you want to declare Base mainnet explicitly
    // screenshotUrls: [`${origin}/shot-1.png`, `${origin}/shot-2.png`], // 1284x2778
  });

  const body = {
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    // ✅ New key expected by the latest spec
    miniapp: common,
    // ↔︎ Back-compat for older consumers still reading `frame`
    frame: common,
    baseBuilder: {
      allowedAddresses: allowed,
    },
  };

  return json(body);
}

// Some crawlers do HEAD first; return 200 so they don’t bail.
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}
