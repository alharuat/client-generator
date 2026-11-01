import { AppError } from "./errors";

/**
 * In-process token bucket. Good enough for a single worker / serverless instance;
 * swap for a Redis/Upstash limiter when running several workers.
 */
export class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.last = now();
  }

  private refill() {
    const t = this.now();
    const elapsed = (t - this.last) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.last = t;
  }

  tryTake(n = 1): boolean {
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }

  /** Milliseconds until `n` tokens are available. */
  waitTime(n = 1): number {
    this.refill();
    if (this.tokens >= n) return 0;
    return Math.ceil(((n - this.tokens) / this.refillPerSecond) * 1000);
  }

  async take(n = 1, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))): Promise<void> {
    while (!this.tryTake(n)) await sleep(this.waitTime(n));
  }
}

const buckets = new Map<string, TokenBucket>();

/** Per-key limiter (e.g. per IP for API routes, per provider for outbound calls). */
export function rateLimit(key: string, capacity: number, refillPerSecond: number): void {
  let b = buckets.get(key);
  if (!b) {
    b = new TokenBucket(capacity, refillPerSecond);
    buckets.set(key, b);
  }
  if (!b.tryTake()) throw new AppError("RATE_LIMITED", "Too many requests, slow down.", { retryAfterMs: b.waitTime() });
}

/** Shared limiters for outbound providers (requests per second). */
export const providerLimiters = {
  googlePlaces: new TokenBucket(10, 5),
  anthropic: new TokenBucket(5, 1),
  clickup: new TokenBucket(10, 1.5), // ClickUp: 100 req/min on most plans
  github: new TokenBucket(10, 1),
  vercel: new TokenBucket(5, 1),
};
