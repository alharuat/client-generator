import { describe, expect, it } from "vitest";
import { dedupeKey, normalizePhone, normalizeText, websiteDomain } from "@/lib/leads/dedupe";

describe("dedupe", () => {
  it("normalizes phone numbers across formats", () => {
    expect(normalizePhone("+212 6 12-34-56-78")).toBe("612345678");
    expect(normalizePhone("06 12 34 56 78")).toBe("612345678");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });

  it("extracts website domains and ignores social/maps links", () => {
    expect(websiteDomain("https://www.Pizzeria-Roma.ma/menu")).toBe("pizzeria-roma.ma");
    expect(websiteDomain("pizzeria-roma.ma")).toBe("pizzeria-roma.ma");
    expect(websiteDomain("https://instagram.com/pizzeria")).toBeNull();
    expect(websiteDomain("https://m.facebook.com/x")).toBeNull();
    expect(websiteDomain("https://maps.app.goo.gl/abc")).toBeNull();
    expect(websiteDomain("not a url")).toBeNull();
  });

  it("normalizes names, accents and legal suffixes", () => {
    expect(normalizeText("Café de la Paix SARL")).toBe("cafe paix");
    expect(normalizeText("  Le  Petit Four & Co ")).toBe("petit four co");
  });

  it("prefers the strongest identity for the dedupe key", () => {
    expect(dedupeKey({ name: "X", googlePlaceId: "ChIJ123", phone: "0612345678" })).toBe("gp:ChIJ123");
    expect(dedupeKey({ name: "X", phone: "0612345678", websiteUrl: "x.ma" })).toBe("ph:612345678");
    expect(dedupeKey({ name: "X", websiteUrl: "www.x.ma" })).toBe("wd:x.ma");
    expect(dedupeKey({ name: "Café Atlas", city: "Rabat" })).toBe("nm:cafe atlas|rabat");
  });
});
