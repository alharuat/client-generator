import { z } from "zod";
import { decideApproval } from "@/lib/approvals/service";
import { AppError } from "@/lib/core/errors";
import { actorFrom, handle } from "@/server/api";

type Ctx = { params: Promise<{ id: string }> };
const body = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().max(2000).optional() });

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const actor = actorFrom(req);
  // Approvals are human checkpoints: machine tokens may read but not decide.
  if (actor === "api") throw new AppError("VALIDATION", "Approvals must be decided by a signed-in person.");
  const { decision, note } = body.parse(await req.json());
  return decideApproval((await ctx.params).id, decision, actor, note);
});
