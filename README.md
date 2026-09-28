# IdeaTent

IdeaTent is a private-beta lightweight content strategist. It learns a business profile and current priority, considers evergreen and timely opportunities, shortlists more ideas than it publishes, selects five strong weekly posts, learns gradually from owner feedback, and can deliver the finished plan by email on a Cloudflare schedule.

Production rollout instructions are in [docs/standby-copywriter-setup.md](docs/standby-copywriter-setup.md).

IdeaTent is an invite-only weekly content-planning product for businesses. It learns a business profile once, generates a five-idea weekly plan, saves the plan, and records owner feedback.

## Live private beta

- App: https://my.ideatent.workers.dev
- Hosting: Cloudflare Workers
- Access: Cloudflare Zero Trust sign-in plus an in-app email allowlist
- Data: Cloudflare D1
- Generation: Cloudflare Workers AI

The live app is private. Visitors must pass the configured Cloudflare Access policy before the Worker receives their request.

## Implemented

- Five-step business onboarding with required-field validation
- Authenticated, persisted business profiles
- Priority-led candidate shortlisting and AI-generated weekly plans with schema validation and a safe starter-plan fallback
- Reusable backlog for strong ideas that do not make the current week
- Per-idea used, skipped, worked-well, and revision learning signals
- Saved plan history
- Downloadable branded PDF plans
- PDF attachment on every delivered weekly-plan email
- Per-plan usefulness feedback
- Private Worker access and server-side identity checks
- Administrator page for approving, disabling, and reactivating beta users without code changes
- Enforced 20-active-user private-beta limit with a visible admin count
- Tavily-powered trend research and caching
- Daily due-user processing with Cloudflare Cron Triggers, capped at five generations per day
- Weekly email delivery and delivery logging
- Repetition and preference checks across earlier plans without treating one action as a permanent rule
- Mobile-first dashboard and onboarding flow

## Next hardening work

- Automatic retry processing for failed email deliveries
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
- D1 migrations: `drizzle/0000_ideatent_foundation.sql` through `drizzle/0003_strategy_learning.sql`
- Plan generator: `lib/plan-generator.ts`
- Main interface: `app/ideatent-app.tsx`
- Hosting bindings: `.openai/hosting.json`

API keys, identity credentials, and other secrets must stay in Cloudflare secrets and must never be committed.

## Product documentation

- [MVP product and engineering handoff](docs/product-spec.md)
