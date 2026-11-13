import "server-only";

// In-memory, per-server-instance rate limiting. Good enough for a single
// small Vercel deployment at low traffic; it resets on cold start and is
// NOT shared across instances, so it only slows down abuse, it doesn't hard
// -stop it at scale. Before horizontal scaling, replace this with a shared
// store (Upstash Redis's @upstash/ratelimit is the usual pick) — see
// replica/backend.md.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true };
}
