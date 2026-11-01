import type { LeadStatus } from "@prisma/client";
import { changeLeadStatus } from "@/lib/leads/service";
import { statusChangeSchema } from "@/lib/leads/schemas";
import { actorFrom, handle } from "@/server/api";

type Ctx = { params: Promise<{ id: string }> };

/** Moves the lead, or returns 202 with a pending approval for gated steps. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const body = statusChangeSchema.parse(await req.json());
  const res = await changeLeadStatus((await ctx.params).id, body.status as LeadStatus, { actor: actorFrom(req), note: body.note });
  return Response.json(res, { status: res.pendingApproval ? 202 : 200 });
});
