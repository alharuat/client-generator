import type { BusinessCategory, LeadStatus, Priority, ProspectType } from "@prisma/client";

export const LEAD_STATUSES: LeadStatus[] = [
  "NEW_LEAD",
  "ANALYZED",
  "QUALIFIED",
  "CONTACTED",
  "INTERESTED",
  "PROPOSAL_SENT",
  "ACCEPTED",
  "IN_DEVELOPMENT",
  "REVIEW",
  "DELIVERED",
  "REJECTED",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW_LEAD: "New Lead",
  ANALYZED: "Analyzed",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  PROPOSAL_SENT: "Proposal Sent",
  ACCEPTED: "Accepted",
  IN_DEVELOPMENT: "In Development",
  REVIEW: "Review",
  DELIVERED: "Delivered",
  REJECTED: "Rejected",
};

export const CATEGORY_LABEL: Record<BusinessCategory, string> = {
  DOCTOR: "Doctor",
  DENTIST: "Dentist",
  CLINIC: "Clinic / medical practice",
  RESTAURANT: "Restaurant",
  CAFE: "Café",
  FAST_FOOD: "Fast food",
  PHARMACY: "Pharmacy",
  BAKERY: "Bakery / pastry shop",
  BEAUTY_SALON: "Beauty salon",
  BARBERSHOP: "Barbershop",
  HOTEL: "Hotel",
  GUEST_HOUSE: "Guest house",
  REAL_ESTATE: "Real estate agency",
  LAWYER: "Lawyer",
  ACCOUNTING: "Accounting firm",
  LOCAL_SHOP: "Local shop",
  SERVICE_PROVIDER: "Service provider",
  OTHER: "Other",
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as BusinessCategory[];

export const PROSPECT_LABEL: Record<ProspectType, string> = {
  UNKNOWN: "Not assessed",
  NO_WEBSITE: "A · No website",
  POOR_WEBSITE: "B · Poor website",
  WEBSITE_OPPORTUNITY: "C · Website opportunity",
};

export const PROSPECT_TYPES = Object.keys(PROSPECT_LABEL) as ProspectType[];

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};
export const PRIORITIES = Object.keys(PRIORITY_LABEL) as Priority[];
