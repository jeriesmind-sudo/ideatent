# IdeaTent

IdeaTent is a lightweight, invite-only content-planning product for businesses.

Its core promise is simple:

> Tell IdeaTent about your business once, and never run out of relevant, high-quality content ideas.

Each week, IdeaTent researches timely industry and regional trends, matches them to a business profile, generates a personalized content plan, checks it for quality, saves it, and emails it to the business owner.

## MVP status

IdeaTent is currently in the product-definition stage. The MVP scope and technical handoff are complete; implementation has not started.

The private beta is designed to test one question: **Can IdeaTent consistently give businesses content ideas they genuinely want to use?**

## Planned stack

- Cloudflare Workers for the application and scheduled jobs
- Cloudflare D1 for structured data
- Cloudflare Workers AI with Gemini as a fallback
- Tavily for reusable trend research
- Gmail API for weekly email delivery
- A mobile-first web interface

## Core product loop

`Learn the business → Research → Match → Generate → Quality check → Deliver → Learn from feedback`

## MVP boundaries

The first version is an invite-only beta for up to 30 active businesses. It intentionally excludes payments, public signup, social-media publishing, analytics, image/video generation, team features, and other platform expansion.

## Documentation

- [Full MVP product and engineering handoff](docs/product-spec.md)

## Suggested implementation order

1. Foundation: authentication, approved-user access, D1 schema, onboarding, and dashboard
2. Research: Tavily integration, caching, and industry/location trend pools
3. Generation: provider abstraction, plan generation, quality control, and repetition protection
4. Automation: weekly cron, batching, job tracking, and duplicate prevention
5. Delivery: Gmail integration, email retry handling, and logs
6. Beta hardening: validate the full loop with two real businesses

## Security note

API keys, Gmail credentials, and session secrets must be stored as Cloudflare secrets and must never be committed to this repository.

