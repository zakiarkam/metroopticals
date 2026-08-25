import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMITED");
    this.name = "RateLimitError";
  }
}

type Bucket = { count: number; resetAt: number };

// Fixed-window in-memory limiter. The app runs as a single instance on
// Railway, so process-local state is sufficient; swap for Redis if the
// deployment ever scales horizontally.
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

const prune = (now: number) => {
  if (buckets.size < MAX_BUCKETS) return;
  Array.from(buckets.entries()).forEach(([key, bucket]) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
};

/**
 * Throws RateLimitError when `key` exceeds `limit` calls per `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new RateLimitError();
  }
}

/** Best-effort client IP for rate-limit keys (Railway sets x-forwarded-for). */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
