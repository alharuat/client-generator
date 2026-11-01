/**
 * Demo data for local development. Clearly fictional businesses; never run against production.
 *   npm run db:seed
 */
import { prisma } from "../src/lib/db";
import { createLead, changeLeadStatus } from "../src/lib/leads/service";
import type { LeadCreateInput } from "../src/lib/leads/schemas";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed in production.");
  process.exit(1);
}

const DEMO: LeadCreateInput[] = [
  { name: "Trattoria Demo Roma", category: "RESTAURANT", city: "Casablanca", neighborhood: "Maarif", phone: "+212 600 000 001", googleRating: 4.3, reviewCount: 412, socialLinks: { instagram: "https://instagram.com/example" } },
  { name: "Cabinet Dentaire Demo", category: "DENTIST", city: "Rabat", neighborhood: "Agdal", phone: "+212 600 000 002", googleRating: 4.8, reviewCount: 96 },
  { name: "Pharmacie Demo Atlas", category: "PHARMACY", city: "Marrakech", phone: "+212 600 000 003", websiteUrl: "https://example.com", googleRating: 4.1, reviewCount: 58 },
  { name: "Boulangerie Demo Soleil", category: "BAKERY", city: "Casablanca", neighborhood: "Gauthier", phone: "+212 600 000 004", googleRating: 4.6, reviewCount: 233, socialLinks: { instagram: "https://instagram.com/example2", facebook: "https://facebook.com/example2" } },
  { name: "Salon Demo Yasmine", category: "BEAUTY_SALON", city: "Tangier", phone: "+212 600 000 005", googleRating: 4.4, reviewCount: 61 },
  { name: "Riad Demo Zitoun", category: "GUEST_HOUSE", city: "Marrakech", phone: "+212 600 000 006", websiteUrl: "https://example.org", googleRating: 4.7, reviewCount: 380 },
  { name: "Cabinet Demo Avocats", category: "LAWYER", city: "Rabat", phone: "+212 600 000 007", googleRating: 4.0, reviewCount: 12 },
  { name: "Barber Demo Kings", category: "BARBERSHOP", city: "Fes", phone: "+212 600 000 008", googleRating: 4.9, reviewCount: 147, socialLinks: { tiktok: "https://tiktok.com/@example" } },
];

async function main() {
  const existing = await prisma.lead.count({ where: { name: { contains: "Demo" } } });
  if (existing) {
    console.log("Demo data already present, skipping.");
    return;
  }
  await prisma.teamMember.upsert({ where: { email: "owner@example.com" }, update: {}, create: { name: "Agency Owner", email: "owner@example.com", role: "owner" } });
  const created = [];
  for (const d of DEMO) created.push(await createLead({ ...d, source: "MANUAL" }, "seed"));
  await changeLeadStatus(created[1].id, "ANALYZED", { actor: "seed" });
  await changeLeadStatus(created[0].id, "QUALIFIED", { actor: "seed" }); // creates a pending approval
  console.log(`Seeded ${created.length} demo leads.`);
}

main().finally(() => prisma.$disconnect());
