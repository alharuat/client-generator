import { describe, expect, it } from "vitest";
import { allowedTransitions, approvalRequiredFor, canTransition } from "@/lib/leads/status";

describe("lead pipeline", () => {
  it("allows forward moves and rejection from open states", () => {
    expect(canTransition("NEW_LEAD", "ANALYZED")).toBe(true);
    expect(canTransition("NEW_LEAD", "REJECTED")).toBe(true);
    expect(canTransition("NEW_LEAD", "DELIVERED")).toBe(false);
    expect(canTransition("DELIVERED", "REJECTED")).toBe(false);
    expect(allowedTransitions("REJECTED")).toEqual(["NEW_LEAD"]);
  });

  it("requires approval for qualifying, contacting and starting a project", () => {
    expect(approvalRequiredFor("ANALYZED", "QUALIFIED")).toBe("QUALIFY_LEAD");
    expect(approvalRequiredFor("NEW_LEAD", "QUALIFIED")).toBe("QUALIFY_LEAD");
    expect(approvalRequiredFor("QUALIFIED", "CONTACTED")).toBe("CONTACT_BUSINESS");
    expect(approvalRequiredFor("ACCEPTED", "IN_DEVELOPMENT")).toBe("CREATE_PROJECT");
  });

  it("never requires approval to step back or for ungated moves", () => {
    expect(approvalRequiredFor("CONTACTED", "QUALIFIED")).toBeNull();
    expect(approvalRequiredFor("NEW_LEAD", "ANALYZED")).toBeNull();
    expect(approvalRequiredFor("REVIEW", "IN_DEVELOPMENT")).toBeNull();
  });
});
