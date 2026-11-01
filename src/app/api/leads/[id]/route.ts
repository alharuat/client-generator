import { getLead, updateLead } from "@/lib/leads/service";
import { actorFrom, handle } from "@/server/api";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => getLead((await ctx.params).id));

export const PATCH = handle(async (req: Request, ctx: Ctx) => updateLead((await ctx.params).id, await req.json(), actorFrom(req)));
