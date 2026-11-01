import type { AgentKind, Priority } from "@prisma/client";

export interface TaskTemplate {
  key: string;
  title: string;
  description: string;
  priority: Priority;
  agent: AgentKind;
  /** Days after project start when the task is due. */
  dueInDays: number;
  dependsOn: string[];
  acceptanceCriteria: string[];
}

/** The 14 standard tasks created for every client website project. */
export const STANDARD_TASKS: TaskTemplate[] = [
  {
    key: "business-research",
    title: "Business research",
    description: "Collect public information about the business: services, opening hours, reviews, photos, social accounts, competitors in the area.",
    priority: "HIGH",
    agent: "RESEARCH",
    dueInDays: 1,
    dependsOn: [],
    acceptanceCriteria: ["Business profile written", "Top 3 local competitors listed", "Existing brand assets (logo, colors, photos) inventoried"],
  },
  {
    key: "client-requirements",
    title: "Client requirements",
    description: "Confirm goals, must-have pages and features, content the client will supply, and constraints (languages, booking tools, budget).",
    priority: "HIGH",
    agent: "RESEARCH",
    dueInDays: 2,
    dependsOn: ["business-research"],
    acceptanceCriteria: ["Requirements list approved by the client", "Content owner identified for every page"],
  },
  {
    key: "website-specification",
    title: "Website specification",
    description: "Write the sitemap, page-by-page content outline, feature list and technical stack decision.",
    priority: "HIGH",
    agent: "DEVELOPMENT",
    dueInDays: 3,
    dependsOn: ["client-requirements"],
    acceptanceCriteria: ["Sitemap defined", "Each page has sections and CTAs listed", "Stack and integrations chosen"],
  },
  {
    key: "design-branding",
    title: "Design and branding",
    description: "Produce a unique visual direction: palette, typography, imagery style, logo treatment, key page mockups.",
    priority: "HIGH",
    agent: "DESIGN",
    dueInDays: 5,
    dependsOn: ["website-specification"],
    acceptanceCriteria: ["Style guide with palette and type scale", "Home page mockup approved", "Accessible color contrast (WCAG AA)"],
  },
  {
    key: "uiux-implementation",
    title: "UI/UX implementation",
    description: "Turn the approved design into reusable components and page layouts.",
    priority: "HIGH",
    agent: "DESIGN",
    dueInDays: 7,
    dependsOn: ["design-branding"],
    acceptanceCriteria: ["Component library matches mockups", "Navigation and CTAs are consistent across pages"],
  },
  {
    key: "frontend-development",
    title: "Frontend development",
    description: "Build all pages in Next.js + TypeScript + Tailwind with real content.",
    priority: "HIGH",
    agent: "DEVELOPMENT",
    dueInDays: 9,
    dependsOn: ["uiux-implementation"],
    acceptanceCriteria: ["All sitemap pages implemented", "Build and lint pass", "No placeholder text left"],
  },
  {
    key: "backend-integration",
    title: "Backend integration (if necessary)",
    description: "Contact forms, booking, menus/catalog data, WhatsApp and Google Maps embeds; Supabase only when dynamic data is required.",
    priority: "MEDIUM",
    agent: "DEVELOPMENT",
    dueInDays: 10,
    dependsOn: ["frontend-development"],
    acceptanceCriteria: ["Forms deliver to the client's inbox", "WhatsApp link opens a chat with a prefilled message", "Map shows the correct location"],
  },
  {
    key: "seo-optimization",
    title: "SEO optimization",
    description: "Metadata, Open Graph, structured data (LocalBusiness), sitemap.xml, robots.txt, local keywords.",
    priority: "MEDIUM",
    agent: "DEVELOPMENT",
    dueInDays: 11,
    dependsOn: ["frontend-development"],
    acceptanceCriteria: ["Unique title and description per page", "LocalBusiness JSON-LD validates", "sitemap.xml and robots.txt served"],
  },
  {
    key: "mobile-responsiveness",
    title: "Mobile responsiveness",
    description: "Verify and polish layouts on phone and tablet breakpoints.",
    priority: "HIGH",
    agent: "QA",
    dueInDays: 11,
    dependsOn: ["frontend-development"],
    acceptanceCriteria: ["No horizontal scroll at 360px", "Tap targets at least 44px", "Tablet layout reviewed"],
  },
  {
    key: "performance-optimization",
    title: "Performance optimization",
    description: "Optimize images, fonts and scripts for fast loading on mobile networks.",
    priority: "MEDIUM",
    agent: "DEVELOPMENT",
    dueInDays: 12,
    dependsOn: ["backend-integration", "seo-optimization"],
    acceptanceCriteria: ["Lighthouse performance ≥ 90 on mobile", "LCP < 2.5s on the preview URL"],
  },
  {
    key: "testing-qa",
    title: "Testing and QA",
    description: "Automated browser tests and the QA checklist: devices, navigation, forms, links, accessibility, security headers.",
    priority: "URGENT",
    agent: "QA",
    dueInDays: 13,
    dependsOn: ["mobile-responsiveness", "performance-optimization"],
    acceptanceCriteria: ["QA report generated with no failing checks", "No broken links", "Accessibility score ≥ 90"],
  },
  {
    key: "client-review",
    title: "Client review",
    description: "Share the preview URL with the client and collect feedback. Requires human approval before contacting the client.",
    priority: "HIGH",
    agent: "DELIVERY",
    dueInDays: 15,
    dependsOn: ["testing-qa"],
    acceptanceCriteria: ["Client feedback recorded", "All requested changes resolved or scoped out"],
  },
  {
    key: "deployment",
    title: "Deployment",
    description: "Deploy to production on Vercel and connect the domain. Requires human approval to publish.",
    priority: "URGENT",
    agent: "DEVELOPMENT",
    dueInDays: 16,
    dependsOn: ["client-review"],
    acceptanceCriteria: ["Publish approval recorded", "Production URL live over HTTPS", "Domain DNS verified"],
  },
  {
    key: "final-delivery",
    title: "Final delivery",
    description: "Delivery package: live URL, repository, documentation, SEO and performance reports, maintenance recommendations. Credentials shared only after approval.",
    priority: "HIGH",
    agent: "DELIVERY",
    dueInDays: 17,
    dependsOn: ["deployment"],
    acceptanceCriteria: ["Delivery package sent", "Credentials shared through a secure channel after approval", "Project marked Delivered"],
  },
];

export const projectName = (businessName: string) => `${businessName} - Website Development`;

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}
