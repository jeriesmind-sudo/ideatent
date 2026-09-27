import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
type PdfBusiness = { name: string; industry?: string; city?: string; country?: string };
type PdfIdea = {
  day: string;
  platform: string;
  contentType: string;
  category: string;
  idea: string;
  hook: string;
  designCopy?: string | null;
  whyItWorks: string;
  creativeDirection: string;
  captionDirection: string;
  cta: string;
  trendTitle?: string | null;
  trendSourceTitle?: string | null;
  trendSourceUrl?: string | null;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const TEXT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

export async function buildWeeklyPlanPdf(business: PdfBusiness, weekStart: string, ideas: PdfIdea[]) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const context = { document, regular, bold, page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN };

  drawBrandHeader(context, business, weekStart);
  for (let index = 0; index < ideas.length; index += 1) {
    drawIdea(context, ideas[index], index + 1);
  }
  drawFooters(document.getPages(), regular);

  document.setTitle(`${business.name} - IdeaTent weekly plan`);
  document.setAuthor("IdeaTent");
  document.setSubject(`Weekly content plan for ${weekStart}`);
  return document.save();
}

type PdfContext = {
  document: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
};

function drawBrandHeader(context: PdfContext, business: PdfBusiness, weekStart: string) {
  const { page, bold, regular } = context;
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 168, width: PAGE_WIDTH, height: 168, color: rgb(0.12, 0.1, 0.27) });
  page.drawText("IDEATENT", { x: MARGIN, y: PAGE_HEIGHT - 56, font: bold, size: 11, color: rgb(0.72, 0.68, 1) });
  page.drawText(clean(business.name), { x: MARGIN, y: PAGE_HEIGHT - 93, font: bold, size: 26, color: rgb(1, 1, 1) });
  page.drawText(`Weekly content plan - ${formatDate(weekStart)}`, { x: MARGIN, y: PAGE_HEIGHT - 119, font: regular, size: 12, color: rgb(0.86, 0.84, 0.94) });
  const descriptor = [business.industry, business.city, business.country].filter(Boolean).map((value) => clean(value!)).join(" | ");
  if (descriptor) page.drawText(descriptor, { x: MARGIN, y: PAGE_HEIGHT - 141, font: regular, size: 9, color: rgb(0.68, 0.66, 0.78) });
  context.y = PAGE_HEIGHT - 205;
}

function drawIdea(context: PdfContext, idea: PdfIdea, position: number) {
  const sections = [
    { label: "Text for the design", value: designerCopy(idea) },
    { label: "Designer instructions", value: idea.creativeDirection },
    { label: "Caption to post", value: idea.captionDirection },
    { label: "CTA", value: idea.cta },
    { label: "Why this works", value: idea.whyItWorks },
  ];
  const titleLines = wrapText(clean(idea.idea), context.bold, 17, TEXT_WIDTH - 42);
  const bodyHeight = sections.reduce((total, section) => total + 23 + (wrapText(clean(section.value), context.regular, 10, TEXT_WIDTH - 42).length * 14), 0);
  const sourceHeight = idea.trendSourceUrl ? 36 : 0;
  const height = 72 + (titleLines.length * 21) + bodyHeight + sourceHeight;
  ensureSpace(context, Math.min(height, PAGE_HEIGHT - (MARGIN * 2)));

  const startY = context.y;
  context.page.drawRectangle({ x: MARGIN, y: startY - 34, width: 28, height: 28, color: rgb(0.36, 0.3, 0.77) });
  context.page.drawText(String(position), { x: MARGIN + 10, y: startY - 24, font: context.bold, size: 10, color: rgb(1, 1, 1) });
  context.page.drawText(`${clean(idea.day)}  |  ${clean(idea.platform)}  |  ${clean(idea.contentType)}  |  ${clean(idea.category)}`, {
    x: MARGIN + 42, y: startY - 18, font: context.bold, size: 8.5, color: rgb(0.36, 0.3, 0.77),
  });
  context.y -= 46;
  drawLines(context, titleLines, context.bold, 17, 21, rgb(0.09, 0.08, 0.13), MARGIN + 42);
  context.y -= 7;

  for (const section of sections) {
    ensureSpace(context, 58);
    context.page.drawText(section.label.toUpperCase(), { x: MARGIN + 42, y: context.y, font: context.bold, size: 7.5, color: rgb(0.43, 0.42, 0.49) });
    context.y -= 15;
    drawLines(context, wrapText(clean(section.value), context.regular, 10, TEXT_WIDTH - 42), context.regular, 10, 14, rgb(0.16, 0.15, 0.2), MARGIN + 42);
    context.y -= 8;
  }

  if (idea.trendSourceUrl) {
    ensureSpace(context, 40);
    context.page.drawText("SOURCE", { x: MARGIN + 42, y: context.y, font: context.bold, size: 7.5, color: rgb(0.43, 0.42, 0.49) });
    context.y -= 14;
    drawLines(context, wrapText(clean(`${idea.trendSourceTitle || idea.trendTitle}: ${idea.trendSourceUrl}`), context.regular, 8.5, TEXT_WIDTH - 42), context.regular, 8.5, 12, rgb(0.26, 0.22, 0.58), MARGIN + 42);
  }
  context.y -= 18;
  context.page.drawLine({ start: { x: MARGIN, y: context.y }, end: { x: PAGE_WIDTH - MARGIN, y: context.y }, thickness: 0.7, color: rgb(0.88, 0.87, 0.91) });
  context.y -= 25;
}

function designerCopy(idea: PdfIdea) {
  return idea.designCopy?.trim() || `HEADLINE\n${idea.hook}\n\nSUPPORTING TEXT\n${idea.idea}\n\nCTA\n${idea.cta}`;
}

function ensureSpace(context: PdfContext, required: number) {
  if (context.y - required > MARGIN + 20) return;
  context.page = context.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.y = PAGE_HEIGHT - MARGIN;
}

function drawLines(context: PdfContext, lines: string[], font: PDFFont, size: number, lineHeight: number, color: ReturnType<typeof rgb>, x: number) {
  for (const line of lines) {
    ensureSpace(context, lineHeight + 8);
    context.page.drawText(line, { x, y: context.y, font, size, color });
    context.y -= lineHeight;
  }
}

function drawFooters(pages: PDFPage[], font: PDFFont) {
  pages.forEach((page, index) => {
    page.drawText(`IdeaTent private beta  |  Page ${index + 1} of ${pages.length}`, {
      x: MARGIN, y: 24, font, size: 8, color: rgb(0.45, 0.44, 0.5),
    });
  });
}

function wrapText(value: string, font: PDFFont, size: number, width: number) {
  const paragraphs = value.split(/\r?\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function clean(value: string) {
  return value.normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\n\r]/g, "?");
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function planPdfFilename(businessName: string, weekStart: string) {
  const safeName = clean(businessName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "business";
  return `ideatent-${safeName}-${weekStart}.pdf`;
}

