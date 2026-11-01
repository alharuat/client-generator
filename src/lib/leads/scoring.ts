import type { Priority, ProspectType } from "@prisma/client";
import { websiteDomain } from "./dedupe";

export interface ScoringInput {
  websiteUrl?: string | null;
  googleRating?: number | null;
  reviewCount?: number | null;
  phone?: string | null;
  email?: string | null;
  socialLinks?: Record<string, unknown> | null;
  prospectType?: ProspectType;
}

/**
 * Prospect type from public data alone. B vs C needs a website audit
 * (Phase 3), so any business with a real website stays UNKNOWN until then.
 */
export function classifyProspect(input: Pick<ScoringInput, "websiteUrl" | "prospectType">): ProspectType {
  if (input.prospectType && input.prospectType !== "UNKNOWN") return input.prospectType;
  return websiteDomain(input.websiteUrl) ? "UNKNOWN" : "NO_WEBSITE";
}

/**
 * Rule-based 0-100 opportunity score used before the Claude analysis runs.
 * Weights: website gap 45, reputation 30, reachability 15, social presence 10.
 */
export function preliminaryScore(input: ScoringInput): number {
  const type = classifyProspect(input);
  const gap = { NO_WEBSITE: 45, POOR_WEBSITE: 35, WEBSITE_OPPORTUNITY: 20, UNKNOWN: 10 }[type];

  const rating = input.googleRating ?? 0;
  const reviews = input.reviewCount ?? 0;
  // Busy, well-rated businesses are the best prospects: they can afford it and have customers to convert.
  const ratingPts = rating >= 4.5 ? 15 : rating >= 4 ? 12 : rating >= 3.5 ? 8 : rating > 0 ? 4 : 0;
  const reviewPts = reviews >= 200 ? 15 : reviews >= 50 ? 11 : reviews >= 10 ? 6 : reviews > 0 ? 2 : 0;

  const reach = (input.phone ? 10 : 0) + (input.email ? 5 : 0);
  const socials = Object.values(input.socialLinks ?? {}).filter(Boolean).length;
  const socialPts = Math.min(10, socials * 5);

  return Math.max(0, Math.min(100, gap + ratingPts + reviewPts + reach + socialPts));
}

export function priorityFromScore(score: number): Priority {
  if (score >= 80) return "URGENT";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}
