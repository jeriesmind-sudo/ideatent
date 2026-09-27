import { mkdir, writeFile } from "node:fs/promises";
import { buildWeeklyPlanPdf } from "../lib/plan-pdf";

const ideas = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, index) => ({
  day,
  platform: index % 2 ? "LinkedIn" : "Instagram",
  contentType: index % 2 ? "Text post" : "Carousel",
  category: index === 4 ? "Promotional" : "Educational",
  idea: `A useful, specific content idea for day ${index + 1}`,
  hook: "Start with one clear promise your customer immediately understands.",
  whyItWorks: "It connects the business offer to a recognisable audience need without relying on unsupported claims.",
  creativeDirection: "Use a clean opening frame, one idea per slide, generous spacing, and a simple branded closing frame.",
  captionDirection: "Most strong content begins with a useful observation, not a sales pitch. Explain the problem in plain language, share one practical takeaway, and finish with a natural invitation to continue the conversation.",
  cta: "Save this and share it with your team.",
  trendType: "evergreen" as const,
  trendTitle: null,
  trendSourceTitle: null,
  trendSourceUrl: null,
  trendPublishedAt: null,
}));

await mkdir("tmp/pdfs", { recursive: true });
const pdf = await buildWeeklyPlanPdf(
  { name: "Cedar & Finch", industry: "Brand studio", city: "Lagos", country: "Nigeria" },
  "2026-09-28",
  ideas,
);
await writeFile("tmp/pdfs/ideatent-sample.pdf", pdf);

