"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/discovery", label: "Lead Discovery" },
  { href: "/crm", label: "CRM" },
  { href: "/approvals", label: "Approvals" },
  { href: "/projects", label: "ClickUp Projects" },
  { href: "/agents", label: "AI Agents" },
  { href: "/portfolio", label: "Website Portfolio" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ pendingApprovals }: { pendingApprovals: number }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map((i) => {
        const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"}`}
          >
            {i.label}
            {i.href === "/approvals" && pendingApprovals > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-zinc-900">{pendingApprovals}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
