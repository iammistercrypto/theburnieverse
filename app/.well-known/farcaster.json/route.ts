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

  // Base Builder allowlist (comma-separated)
  const allowed =
    (process.env.NEXT_PUBLIC_BASE_BUILDER_ADDRESS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  // Required: discovery tags (lowercase, <=20 chars, no spaces)
  const tags =
    (process.env.NEXT_PUBLIC_APP_TAGS || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

  // Optional: screenshots (comma-separated). Accept absolute or /public paths.
  const screenshots =
    (process.env.NEXT_PUBLIC_APP_SCREENSHOTS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  // Prefer YOUR domain assets over third-party hosts
  const iconUrl =
    process.env.NEXT_PUBLIC_APP_ICON || `${origin}/icon-1024.png`;        // 1024x1024 PNG
  const splashImageUrl =
    process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || `${origin}/splash-200.png`; // ~200x200 PNG
  const heroImageUrl =
    process.env.NEXT_PUBLIC_APP_HERO_IMAGE || `${origin}/burnie-og.png`;     // 1200x630
  const ogImageUrl =
    process.env.NEXT_PUBLIC_APP_OG_IMAGE || `${origin}/burnie-og.png`;       // 1200x630

  const common = withValidProperties({
    // Identity & launch
    version: '1',
    name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'BurnieVerse',
    homeUrl: origin,
    iconUrl,
    // Splash
    splashImageUrl,
    splashBackgroundColor:
      process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || '#000000',
    // Discovery
    primaryCategory:
      process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY || 'entertainment',
    tags, // ✅ now included
    noindex: false, // keep discoverable in production
    // Display info
    subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
    heroImageUrl,
    // OG / social
    ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE || 'BurnieVerse',
    ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
    ogImageUrl,
    // Optional extras
    // requiredChains: ['eip155:8453'], // enable if you want to declare Base mainnet explicitly
    screenshotUrls: screenshots.length
      ? screenshots.map((s) => (s.startsWith('http') ? s : `${origin}${s}`))
      : undefined,
    castShareUrl: process.env.NEXT_PUBLIC_CAST_SHARE_URL,
  });

  const body = {
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    // Return only `frame` (Base.dev rejects manifests containing both `frame` and `miniapp`)
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
