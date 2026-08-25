import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMITED");
    this.name = "RateLimitError";
  }
}

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

const prune = (now: number) => {
  if (buckets.size < MAX_BUCKETS) return;
  Array.from(buckets.entries()).forEach(([key, bucket]) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
};

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

type HeaderSource =
  | NextRequest
  | Request
  | { headers?: Record<string, string | string[] | undefined> };

function readHeader(source: HeaderSource, name: string): string | null {
  const headers = (source as { headers?: unknown }).headers;
  if (!headers) return null;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const value = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

// The trusted proxy appends the real client to x-forwarded-for, so the last
// entry is the only one a client cannot spoof.
export function getClientIp(source: HeaderSource): string {
  const forwarded = readHeader(source, "x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return readHeader(source, "x-real-ip") ?? "unknown";
}
