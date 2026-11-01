import { integrationStatuses } from "@/lib/core/env";
import { handle } from "@/server/api";

export const dynamic = "force-dynamic";

/** Configuration status only; secret values are never returned. */
export const GET = handle(async () => integrationStatuses().map(({ id, name, configured, missing, phase }) => ({ id, name, configured, missing, phase })));
