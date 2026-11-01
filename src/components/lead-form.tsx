import type { Lead, TeamMember } from "@prisma/client";
import { CATEGORIES, CATEGORY_LABEL, PRIORITIES, PRIORITY_LABEL, PROSPECT_LABEL, PROSPECT_TYPES } from "@/lib/leads/constants";

function F({ label, name, defaultValue, type = "text", placeholder, required }: { label: string; name: string; defaultValue?: string | number | null; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} step={type === "number" ? "any" : undefined} />
    </label>
  );
}

/** Shared create/edit form for a lead. Works without client JS (server actions). */
export function LeadForm({ action, lead, members, submitLabel }: { action: (fd: FormData) => Promise<void>; lead?: Lead; members?: TeamMember[]; submitLabel: string }) {
  const social = (lead?.socialLinks ?? {}) as Record<string, string>;
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Business name *" name="name" defaultValue={lead?.name} required placeholder="Italian Restaurant Casablanca" />
        <label className="block">
          <span className="label">Category</span>
          <select className="input" name="category" defaultValue={lead?.category ?? "RESTAURANT"}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </label>
        <F label="City" name="city" defaultValue={lead?.city} placeholder="Casablanca" />
        <F label="Country" name="country" defaultValue={lead?.country} placeholder="Morocco" />
        <F label="Neighborhood" name="neighborhood" defaultValue={lead?.neighborhood} placeholder="Maarif" />
        <F label="Address" name="address" defaultValue={lead?.address} />
        <F label="Phone" name="phone" defaultValue={lead?.phone} placeholder="+212 6 12 34 56 78" />
        <F label="Email (public only)" name="email" type="email" defaultValue={lead?.email} />
        <F label="Website URL" name="websiteUrl" defaultValue={lead?.websiteUrl} placeholder="Leave empty if none" />
        <F label="Google Maps URL" name="googleMapsUrl" defaultValue={lead?.googleMapsUrl} />
        <F label="Google rating" name="googleRating" type="number" defaultValue={lead?.googleRating} />
        <F label="Number of reviews" name="reviewCount" type="number" defaultValue={lead?.reviewCount} />
        <F label="Instagram" name="social_instagram" defaultValue={social.instagram} />
        <F label="Facebook" name="social_facebook" defaultValue={social.facebook} />
        <F label="TikTok" name="social_tiktok" defaultValue={social.tiktok} />
        <F label="WhatsApp" name="social_whatsapp" defaultValue={social.whatsapp} />
        {lead && (
          <>
            <label className="block">
              <span className="label">Prospect type</span>
              <select className="input" name="prospectType" defaultValue={lead.prospectType}>
                {PROSPECT_TYPES.map((p) => <option key={p} value={p}>{PROSPECT_LABEL[p]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Priority</span>
              <select className="input" name="priority" defaultValue={lead.priority}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Assigned to</span>
              <select className="input" name="assigneeId" defaultValue={lead.assigneeId ?? ""}>
                <option value="">Unassigned</option>
                {members?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
          </>
        )}
      </div>
      <label className="block">
        <span className="label">Notes</span>
        <textarea className="input min-h-20" name="notes" defaultValue={lead?.notes ?? ""} />
      </label>
      <button className="btn" type="submit">{submitLabel}</button>
    </form>
  );
}
