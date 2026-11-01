import { headers } from "next/headers";

export async function getActor(): Promise<string> {
  const h = await headers();
  return h.get("x-actor") ?? "dev";
}
