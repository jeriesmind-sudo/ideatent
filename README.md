# IdeaTent

IdeaTent is a private-beta standby social-media copywriter. It learns a business profile, researches reusable current trends, produces five complete weekly posts, runs an editorial quality check, remembers recent ideas, supports on-demand rewrites, saves the plan, and can deliver it by email on a Cloudflare schedule.

Production rollout instructions are in [docs/standby-copywriter-setup.md](docs/standby-copywriter-setup.md).

IdeaTent is an invite-only weekly content-planning product for businesses. It learns a business profile once, generates a five-idea weekly plan, saves the plan, and records owner feedback.

## Live private beta

- App: https://ideatent.jeriesmind.workers.dev
- Hosting: Cloudflare Workers
- Access: Cloudflare Zero Trust email allowlist
- Data: Cloudflare D1
- Generation: Cloudflare Workers AI

The live app is private. Visitors must pass the configured Cloudflare Access policy before the Worker receives their request.

## Implemented

- Five-step business onboarding with required-field validation
- Authenticated, persisted business profiles
- AI-generated weekly plans with schema validation and a safe starter-plan fallback
- Saved plan history
- Per-plan usefulness feedback
- Private Worker access and server-side identity checks
- Mobile-first dashboard and onboarding flow

## Still planned for the MVP

- Tavily-powered trend research and caching
- Automated weekly generation with Cloudflare Cron Triggers
- Weekly email delivery and retry logging
- Repetition checks across earlier plans
- Beta hardening with real businesses

## Local development

Requirements: Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

The portable development profile provides a local test identity at `/signin-with-chatgpt?return_to=/`. Production identity is provided by Cloudflare Access.

Useful checks:

```sh
npx tsc --noEmit
npx eslint app db lib vite.config.ts
npm run build
```

The production build emits its deployable Worker configuration under `dist/server/`.

## Data and configuration

- D1 schema: `db/schema.ts`
- D1 migration: `drizzle/0000_ideatent_foundation.sql`
- Plan generator: `lib/plan-generator.ts`
- Main interface: `app/ideatent-app.tsx`
- Hosting bindings: `.openai/hosting.json`

API keys, identity credentials, and other secrets must stay in Cloudflare secrets and must never be committed.

## Product documentation

- [MVP product and engineering handoff](docs/product-spec.md)
