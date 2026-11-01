/**
 * Duplicate detection. A lead's identity is, in order of strength:
 *  1. Google Place ID
 *  2. normalized phone number
 *  3. website domain
 *  4. normalized name + city
 */

const STOPWORDS = new Set(["the", "le", "la", "les", "el", "al", "de", "du", "des", "and", "et", "sarl", "sa", "llc", "ltd", "inc"]);

export function normalizeText(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w))
    .join(" ")
    .trim();
}

/** Digits only, international prefix dropped; compares the last 9 digits so +212 6.. and 06.. match. */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits.slice(-9);
}

const SOCIAL_HOSTS = ["facebook.com", "instagram.com", "tiktok.com", "linktr.ee", "wa.me", "google.com", "goo.gl", "maps.app.goo.gl", "business.site"];

/** Registrable-ish host without www. Social/maps URLs are not treated as a website domain. */
export function websiteDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".")) return null;
    if (SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
    return host;
  } catch {
    return null;
  }
}

export interface IdentityInput {
  name: string;
  city?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  googlePlaceId?: string | null;
}

export function dedupeKey(i: IdentityInput): string {
  if (i.googlePlaceId) return `gp:${i.googlePlaceId}`;
  const phone = normalizePhone(i.phone);
  if (phone) return `ph:${phone}`;
  const domain = websiteDomain(i.websiteUrl);
  if (domain) return `wd:${domain}`;
  return `nm:${normalizeText(i.name)}|${normalizeText(i.city)}`;
}

export function identityFields(i: IdentityInput) {
  return {
    dedupeKey: dedupeKey(i),
    phoneNormalized: normalizePhone(i.phone),
    websiteDomain: websiteDomain(i.websiteUrl),
  };
}
