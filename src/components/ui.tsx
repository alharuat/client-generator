import type { LeadStatus, Priority, ProspectType } from "@prisma/client";
import type { ReactNode } from "react";
import { PRIORITY_LABEL, PROSPECT_LABEL, STATUS_LABEL } from "@/lib/leads/constants";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-400">{hint}</div>}
    </div>
  );
}

const STATUS_COLOR: Record<LeadStatus, string> = {
  NEW_LEAD: "bg-zinc-100 text-zinc-700",
  ANALYZED: "bg-sky-100 text-sky-800",
  QUALIFIED: "bg-indigo-100 text-indigo-800",
  CONTACTED: "bg-violet-100 text-violet-800",
  INTERESTED: "bg-fuchsia-100 text-fuchsia-800",
  PROPOSAL_SENT: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-lime-100 text-lime-800",
  IN_DEVELOPMENT: "bg-cyan-100 text-cyan-800",
  REVIEW: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function ProspectBadge({ type }: { type: ProspectType }) {
  const c = { UNKNOWN: "bg-zinc-100 text-zinc-600", NO_WEBSITE: "bg-rose-100 text-rose-800", POOR_WEBSITE: "bg-amber-100 text-amber-800", WEBSITE_OPPORTUNITY: "bg-teal-100 text-teal-800" }[type];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{PROSPECT_LABEL[type]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = { LOW: "text-zinc-500", MEDIUM: "text-sky-700", HIGH: "text-amber-700", URGENT: "text-red-700" }[priority];
  return <span className={`text-xs font-semibold ${c}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function Score({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-zinc-400">–</span>;
  const c = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-lime-500" : value >= 40 ? "bg-amber-500" : "bg-zinc-400";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-200">
        <span className={`block h-full ${c}`} style={{ width: `${value}%` }} />
      </span>
      <span className="text-xs tabular-nums text-zinc-700">{value}</span>
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="text-sm font-medium">{title}</div>
      {children && <div className="mt-1 max-w-md text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      {error ?? ok}
    </div>
  );
}

export function formatDate(d: Date | null | undefined) {
  if (!d) return "–";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}
