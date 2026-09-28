import { env } from "cloudflare:workers";
import type { GeneratedIdea } from "@/lib/plan-generator";
import { buildWeeklyPlanPdf, planPdfFilename } from "@/lib/plan-pdf";

type EmailBusiness = { name: string; industry?: string; city?: string; country?: string };

export async function sendWeeklyPlanEmail(
  recipient: string,
  business: EmailBusiness,
  weekStart: string,
  ideas: GeneratedIdea[],
) {
  const required = [env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, env.GMAIL_REFRESH_TOKEN, env.GMAIL_SENDER_EMAIL];
  if (required.some((value) => !value)) return { sent: false as const, skipped: true as const, error: "Gmail delivery is not configured" };

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID!,
      client_secret: env.GMAIL_CLIENT_SECRET!,
      refresh_token: env.GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) return { sent: false as const, skipped: false as const, error: `Gmail authorization failed (${tokenResponse.status})` };
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return { sent: false as const, skipped: false as const, error: "Gmail authorization returned no access token" };

  const appUrl = (env.APP_URL || "https://my.ideatent.workers.dev").replace(/\/$/, "");
  const subject = `Your IdeaTent posts for the week of ${weekStart}`;
  const html = renderPlanEmail(business.name, weekStart, ideas, `${appUrl}/#home`);
  const pdf = await buildWeeklyPlanPdf(business, weekStart, ideas);
  const filename = planPdfFilename(business.name, weekStart);
  const mixedBoundary = `ideatent-mixed-${crypto.randomUUID()}`;
  const alternativeBoundary = `ideatent-alternative-${crypto.randomUUID()}`;
  const mime = [
    `From: IdeaTent <${env.GMAIL_SENDER_EMAIL}>`,
    `To: ${recipient}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
    `--${alternativeBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    `--${alternativeBoundary}--`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    `Content-Disposition: attachment; filename="${filename}"`,
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(pdf),
    `--${mixedBoundary}--`,
  ].join("\r\n");

  const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: base64Url(mime) }),
  });
  if (!sendResponse.ok) return { sent: false as const, skipped: false as const, error: `Gmail delivery failed (${sendResponse.status})` };
  return { sent: true as const, skipped: false as const };
}

function base64Lines(value: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    binary += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function renderPlanEmail(businessName: string, weekStart: string, ideas: GeneratedIdea[], appUrl: string) {
  const posts = ideas.map((idea) => `<section style="margin:24px 0;padding:20px;border:1px solid #e8e6ef;border-radius:14px">
    <p style="margin:0 0 6px;color:#6558d3;font-size:12px;font-weight:700;text-transform:uppercase">${escapeHtml(idea.day)} · ${escapeHtml(idea.platform)} · ${escapeHtml(idea.contentType)}</p>
    <h2 style="margin:0 0 12px;font-size:19px">${escapeHtml(idea.idea)}</h2>
    <p style="margin:16px 0 6px;color:#6558d3;font-size:11px;font-weight:700;text-transform:uppercase">Text for the design</p>
    <div style="margin:0 0 16px;padding:14px;background:#f7f6fa;border-radius:10px;white-space:pre-wrap;line-height:1.55">${escapeHtml(idea.designCopy || `HEADLINE\n${idea.hook}\n\nSUPPORTING TEXT\n${idea.idea}\n\nCTA\n${idea.cta}`)}</div>
    <p style="margin:0 0 6px;color:#6558d3;font-size:11px;font-weight:700;text-transform:uppercase">Visual direction</p>
    <p style="margin:0 0 16px;line-height:1.55">${escapeHtml(idea.creativeDirection)}</p>
    <p style="margin:0 0 6px;color:#6558d3;font-size:11px;font-weight:700;text-transform:uppercase">Caption to post</p>
    <p style="margin:0 0 12px;white-space:pre-wrap;line-height:1.55">${escapeHtml(idea.captionDirection)}</p>
    <p style="margin:0;color:#514b62"><strong>CTA:</strong> ${escapeHtml(idea.cta)}</p>
    ${idea.trendSourceUrl ? `<p style="margin:12px 0 0;font-size:12px"><a href="${escapeAttribute(idea.trendSourceUrl)}">Trend source: ${escapeHtml(idea.trendSourceTitle || idea.trendTitle)}</a></p>` : ""}
  </section>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f7f6fa;color:#201d2a;font-family:Arial,sans-serif"><main style="max-width:680px;margin:0 auto;padding:32px 20px"><div style="background:white;padding:28px;border-radius:18px"><p style="color:#6558d3;font-weight:700">IdeaTent</p><h1 style="font-size:28px">Your posts are ready, ${escapeHtml(businessName)}</h1><p>Here is your copywriter plan for the week of ${escapeHtml(weekStart)}. Review, personalise any business-specific details, and publish.</p>${posts}<p style="margin-top:28px"><a href="${escapeAttribute(appUrl)}" style="display:inline-block;background:#5547c6;color:white;padding:12px 18px;border-radius:10px;text-decoration:none">Open your full plan</a></p></div></main></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function escapeAttribute(value: string) {
  return /^https?:\/\//.test(value) ? escapeHtml(value) : "#";
}

function base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
