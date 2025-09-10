import type { MiniAppNotificationDetails } from "@farcaster/frame-sdk"; // ok (deprecation is only a warning)
import { getRedis } from "./redis";

const notificationServiceKey =
  process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ?? "minikit";

// Create a single client instance (shim if not configured)
const redis = getRedis();

function userKey(fid: number): string {
  return `${notificationServiceKey}:user:${fid}`;
}

export async function getUserNotificationDetails(
  fid: number,
): Promise<MiniAppNotificationDetails | null> {
  const value = await redis.get(userKey(fid));
  // Our Redis shim returns `any`; cast to the intended type.
  return (value ?? null) as MiniAppNotificationDetails | null;
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: MiniAppNotificationDetails,
): Promise<void> {
  await redis.set(userKey(fid), notificationDetails);
}

export async function deleteUserNotificationDetails(fid: number): Promise<void> {
  await redis.del(userKey(fid));
}
