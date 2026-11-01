import { describe, expect, it } from "vitest";
import { classifyProspect, preliminaryScore, priorityFromScore } from "@/lib/leads/scoring";

describe("scoring", () => {
  it("classifies businesses without a real website as Type A", () => {
    expect(classifyProspect({ websiteUrl: null })).toBe("NO_WEBSITE");
    expect(classifyProspect({ websiteUrl: "https://instagram.com/shop" })).toBe("NO_WEBSITE");
    expect(classifyProspect({ websiteUrl: "https://shop.ma" })).toBe("UNKNOWN");
    expect(classifyProspect({ websiteUrl: "https://shop.ma", prospectType: "POOR_WEBSITE" })).toBe("POOR_WEBSITE");
  });

  it("ranks a busy, well-rated business with no website highest", () => {
    const hot = preliminaryScore({ websiteUrl: null, googleRating: 4.6, reviewCount: 320, phone: "0612345678", socialLinks: { instagram: "x" } });
    const cold = preliminaryScore({ websiteUrl: "https://ok.ma", googleRating: 3.2, reviewCount: 4 });
    expect(hot).toBe(45 + 15 + 15 + 10 + 5);
    expect(hot).toBeGreaterThan(cold);
    expect(cold).toBeLessThan(40);
  });

  it("clamps to 0..100", () => {
    const s = preliminaryScore({ websiteUrl: null, googleRating: 5, reviewCount: 1000, phone: "0612345678", email: "a@b.c", socialLinks: { a: "1", b: "2", c: "3" } });
    expect(s).toBeLessThanOrEqual(100);
  });

  it("maps score to priority", () => {
    expect(priorityFromScore(85)).toBe("URGENT");
    expect(priorityFromScore(60)).toBe("HIGH");
    expect(priorityFromScore(40)).toBe("MEDIUM");
    expect(priorityFromScore(10)).toBe("LOW");
  });
});
