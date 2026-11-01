import { NextResponse, type NextRequest } from "next/server";

/**
 * Protects the dashboard and API.
 * - Browser: HTTP Basic auth with DASHBOARD_USER / DASHBOARD_PASSWORD.
 * - API clients: `Authorization: Bearer $ADMIN_API_TOKEN`.
 * In production the app refuses to serve anything until auth is configured.
 * The authenticated user name is forwarded as `x-actor` for audit logs.
 */
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"] };

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function next(req: NextRequest, actor: string) {
  const headers = new Headers(req.headers);
  headers.set("x-actor", actor);
  return NextResponse.next({ request: { headers } });
}

export function middleware(req: NextRequest) {
  const user = process.env.DASHBOARD_USER || "admin";
  const password = process.env.DASHBOARD_PASSWORD;
  const apiToken = process.env.ADMIN_API_TOKEN;
  const auth = req.headers.get("authorization") ?? "";

  if (apiToken && auth.startsWith("Bearer ") && safeEqual(auth.slice(7), apiToken)) return next(req, "api");

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Set DASHBOARD_PASSWORD to enable the dashboard.", { status: 503 });
    }
    return next(req, "dev");
  }

  if (auth.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(auth.slice(6)).split(":");
      if (safeEqual(u, user) && safeEqual(rest.join(":"), password)) return next(req, u);
    } catch {
      /* fall through */
    }
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Client Generator"' } });
}
