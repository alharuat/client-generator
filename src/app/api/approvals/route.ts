import { listApprovals } from "@/lib/approvals/service";
import { handle } from "@/server/api";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const s = new URL(req.url).searchParams.get("status") ?? "PENDING";
  const status = (["PENDING", "APPROVED", "REJECTED", "CANCELLED", "ALL"].includes(s) ? s : "PENDING") as "PENDING";
  return listApprovals(status);
});
