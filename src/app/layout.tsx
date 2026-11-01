import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Client Generator", description: "AI-powered website agency platform" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pending = await prisma.approval.count({ where: { status: "PENDING" } }).catch(() => 0);
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-zinc-950 p-4 md:flex">
            <div className="mb-6 px-3">
              <div className="text-sm font-semibold text-white">Client Generator</div>
              <div className="text-xs text-zinc-500">AI website agency</div>
            </div>
            <Nav pendingApprovals={pending} />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
              <span className="text-sm font-semibold">Client Generator</span>
              <details className="relative">
                <summary className="cursor-pointer text-sm">Menu</summary>
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg bg-zinc-950 p-2">
                  <Nav pendingApprovals={pending} />
                </div>
              </details>
            </header>
            <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
