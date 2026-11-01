/** Minimal structured JSON logger. Never pass secrets in `data`. */
type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const lvl = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
  return ORDER[lvl] ?? ORDER.info;
}

const SECRET_KEY = /(key|token|secret|password|authorization)/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function emit(level: Level, scope: string, message: string, data?: Record<string, unknown>) {
  if (ORDER[level] < threshold()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, scope, message, ...(data ? { data: redact(data) } : {}) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(scope: string) {
  return {
    debug: (m: string, d?: Record<string, unknown>) => emit("debug", scope, m, d),
    info: (m: string, d?: Record<string, unknown>) => emit("info", scope, m, d),
    warn: (m: string, d?: Record<string, unknown>) => emit("warn", scope, m, d),
    error: (m: string, d?: Record<string, unknown>) => emit("error", scope, m, d),
  };
}
export type Logger = ReturnType<typeof createLogger>;
