import { env } from "cloudflare:workers";

export async function isFrontierService(headers: Headers) {
  const token = headers.get("x-radar-service-token");
  const expected = env.FRONTIER_UPDATE_TOKEN;
  if (!token || !expected) return false;
  const hash = (value: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [actualHash, expectedHash] = await Promise.all([hash(token), hash(expected)]);
  return crypto.subtle.timingSafeEqual(actualHash, expectedHash);
}
