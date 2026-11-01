import { z } from "zod";
import { CATEGORIES, LEAD_STATUSES, PRIORITIES, PROSPECT_TYPES } from "./constants";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => {
    if (!v) return true;
    try {
      new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      return true;
    } catch {
      return false;
    }
  }, "Invalid URL")
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v));

export const socialLinksSchema = z.record(z.string(), z.string().trim().max(500)).default({});

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.enum(CATEGORIES as [string, ...string[]]).default("OTHER"),
  prospectType: z.enum(PROSPECT_TYPES as [string, ...string[]]).optional(),
  city: optionalText,
  country: optionalText,
  neighborhood: optionalText,
  address: optionalText,
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  websiteUrl: optionalUrl,
  googleMapsUrl: optionalUrl,
  googlePlaceId: optionalText,
  googleRating: z.coerce.number().min(0).max(5).optional().nullable(),
  reviewCount: z.coerce.number().int().min(0).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  socialLinks: socialLinksSchema,
  source: z.enum(["MANUAL", "GOOGLE_PLACES", "IMPORT"]).default("MANUAL"),
  notes: z.string().trim().max(5000).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});
export type LeadCreateInput = z.input<typeof leadCreateSchema>;

export const leadUpdateSchema = leadCreateSchema
  .omit({ source: true })
  .partial()
  .extend({
    priority: z.enum(PRIORITIES as [string, ...string[]]).optional(),
    score: z.coerce.number().int().min(0).max(100).optional().nullable(),
  });
export type LeadUpdateInput = z.input<typeof leadUpdateSchema>;

export const leadFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
  category: z.enum(CATEGORIES as [string, ...string[]]).optional(),
  prospectType: z.enum(PROSPECT_TYPES as [string, ...string[]]).optional(),
  city: z.string().trim().max(100).optional(),
  assigneeId: z.string().optional(),
  noWebsite: z.coerce.boolean().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(["score", "recent", "name", "rating"]).default("score"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type LeadFilter = z.infer<typeof leadFilterSchema>;

export const statusChangeSchema = z.object({
  status: z.enum(LEAD_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(2000).optional(),
});
