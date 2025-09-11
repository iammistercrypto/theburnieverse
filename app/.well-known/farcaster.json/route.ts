// app/.well-known/farcaster.json/route.ts

export const runtime = 'edge';          // fast & small
export const revalidate = 0;            // no ISR
export const dynamic = 'force-dynamic'; // always compute on request

function withValidProperties(
  properties: Record<string, undefined | string | string[] | boolean>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, v]) =>
      Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ''
    ),
  );
}

export async function GET(req: Request) {
  // Prefer explicit env; otherwise use the current request origin
  const origin = process.env.NEXT_PUBLIC_URL || new URL(req.url).origin;

  // Allow one or many addresses via comma-separated env var
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

  const body = {
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    baseBuilder: {
      allowedAddresses: allowed,
    },
    frame: withValidProperties({
      version: '1',
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'BurnieVerse',
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      screenshotUrls: [], // add up to 3 later
      iconUrl: process.env.NEXT_PUBLIC_APP_ICON,
      splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || '#000000',
      homeUrl: origin,
      webhookUrl: `${origin}/api/webhook`,
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY || 'entertainment',
      tags,
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE || 'BurnieVerse',
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE,
      // Keep true while testing; set to false (or remove) for production discovery.
      noindex: false,
      // requiredChains: ['eip155:8453'], // uncomment if you want to declare Base mainnet
    }),
  };

  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
    status: 200,
  });
}
