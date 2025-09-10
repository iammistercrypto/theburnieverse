// lib/redis.ts
// Minimal Redis wrapper that no-ops when Upstash isn't configured.
// Lets the app compile & run even without @upstash/redis or env vars.

export type RedisLike = {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, opts?: any) => Promise<any>;
  del: (key: string) => Promise<any>;
};

// Reusable shim (used when creds or package are missing)
const shim: RedisLike = {
  get: async () => null,
  set: async () => "OK",
  del: async () => 1,
};

// Cache the real client once constructed
let client: RedisLike | undefined;

export function getRedis(): RedisLike {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // No credentials? return shim.
  if (!url || !token) return shim;

  // Already created
  if (client) return client;

  try {
    // Lazy-require only when we actually have credentials
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redis } = require("@upstash/redis");
    // Cast the instance to our minimal interface
    client = new Redis({ url, token }) as unknown as RedisLike;
    return client;
  } catch {
    // Package missing at runtime — keep working with the shim
    return shim;
  }
}
