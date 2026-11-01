import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "@/lib/core/errors";
import { createLogger } from "@/lib/core/logger";
import { rateLimit } from "@/lib/core/rate-limit";

const log = createLogger("api");

/** Wrap an API handler with rate limiting and consistent JSON errors. */
export function handle<A extends unknown[]>(fn: (req: Request, ...rest: A) => Promise<unknown>) {
  return async (req: Request, ...rest: A) => {
    try {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      rateLimit(`api:${ip}`, 60, 10);
      const data = await fn(req, ...rest);
      return data instanceof Response ? data : NextResponse.json(data);
    } catch (e) {
      if (e instanceof ZodError) return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid input", issues: e.issues } }, { status: 400 });
      if (isAppError(e)) return NextResponse.json({ error: { code: e.code, message: e.message, details: e.details } }, { status: e.httpStatus });
      log.error("unhandled", { error: e instanceof Error ? e.stack : String(e), url: req.url });
      return NextResponse.json({ error: { code: "INTERNAL", message: "Internal error" } }, { status: 500 });
    }
  };
}

export function actorFrom(req: Request) {
  return req.headers.get("x-actor") ?? "api";
}
