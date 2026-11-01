import { createLead, listLeads } from "@/lib/leads/service";
import { actorFrom, handle } from "@/server/api";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  return listLeads(params);
});

export const POST = handle(async (req: Request) => {
  const lead = await createLead(await req.json(), actorFrom(req));
  return Response.json(lead, { status: 201 });
});
