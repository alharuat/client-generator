import { describe, expect, it, vi } from "vitest";
import { backoffDelay, isRetryableHttpError, withRetry } from "@/lib/core/retry";
import { TokenBucket } from "@/lib/core/rate-limit";
import { integrationStatuses } from "@/lib/core/env";
import { redact } from "@/lib/core/logger";
import { STANDARD_TASKS } from "@/lib/projects/templates";

describe("retry", () => {
  it("retries transient failures then succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce(Object.assign(new Error("busy"), { status: 503 })).mockResolvedValue("ok");
    await expect(withRetry(fn, { sleep: async () => {} })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry client errors", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error("bad"), { status: 400 }));
    await expect(withRetry(fn, { sleep: async () => {} })).rejects.toThrow("bad");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error("down"), { status: 500 }));
    await expect(withRetry(fn, { retries: 2, sleep: async () => {} })).rejects.toThrow("down");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("caps exponential backoff", () => {
    expect(backoffDelay(1, 100, 1000, () => 1)).toBe(100);
    expect(backoffDelay(3, 100, 1000, () => 1)).toBe(400);
    expect(backoffDelay(10, 100, 1000, () => 1)).toBe(1000);
    expect(isRetryableHttpError({ status: 429 })).toBe(true);
    expect(isRetryableHttpError({ status: 404 })).toBe(false);
  });
});

describe("rate limiting", () => {
  it("refills tokens over time", () => {
    let now = 0;
    const b = new TokenBucket(2, 1, () => now);
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(false);
    expect(b.waitTime()).toBe(1000);
    now = 1000;
    expect(b.tryTake()).toBe(true);
  });
});

describe("env and logging", () => {
  it("reports missing integration variables without exposing values", () => {
    const s = integrationStatuses({ DATABASE_URL: "postgres://x", ANTHROPIC_API_KEY: "sk-secret" });
    expect(s.find((i) => i.id === "database")?.configured).toBe(true);
    expect(s.find((i) => i.id === "anthropic")?.configured).toBe(true);
    expect(s.find((i) => i.id === "clickup")?.missing).toEqual(["CLICKUP_API_TOKEN", "CLICKUP_SPACE_ID"]);
    expect(JSON.stringify(s)).not.toContain("sk-secret");
  });

  it("redacts secret-looking keys in logs", () => {
    expect(redact({ apiKey: "x", nested: { token: "y", ok: 1 } })).toEqual({ apiKey: "[redacted]", nested: { token: "[redacted]", ok: 1 } });
  });
});

describe("project template", () => {
  it("has the 14 standard tasks with valid, acyclic dependencies", () => {
    expect(STANDARD_TASKS).toHaveLength(14);
    const keys = new Set(STANDARD_TASKS.map((t) => t.key));
    expect(keys.size).toBe(14);
    STANDARD_TASKS.forEach((t, i) => {
      for (const d of t.dependsOn) {
        expect(keys.has(d)).toBe(true);
        expect(STANDARD_TASKS.findIndex((x) => x.key === d)).toBeLessThan(i);
      }
      expect(t.acceptanceCriteria.length).toBeGreaterThan(0);
    });
  });
});
