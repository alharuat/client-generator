import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "up", latencyMs: Date.now() - started });
  } catch {
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
