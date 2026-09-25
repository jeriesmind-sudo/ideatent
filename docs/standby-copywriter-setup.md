# Standby copywriter production setup

The application code now supports this weekly loop:

1. Reuse fresh industry-and-country research or request current research from Tavily.
2. Generate five complete, platform-ready posts with Cloudflare Workers AI.
3. Run a second editorial pass for relevance, repetition, factual safety, voice, and variety.
4. Save the posts and their source metadata in D1.
5. Email the plan when Gmail credentials are configured.
6. Let the business revise each post from the dashboard.

## Required app Worker bindings and secrets

The main `ideatent` Worker needs its existing `DB` and `AI` bindings plus:

- `TAVILY_API_KEY` — secret used for current trend research.
- `AUTOMATION_SECRET` — a long random secret shared only with the automation Worker.
- `APP_URL` — `https://ideatent.jeriesmind.workers.dev`.

For automatic email delivery, also add these secrets:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_SENDER_EMAIL`

Never place these values in Git or `wrangler.jsonc`.

## Database migration

Apply `drizzle/0001_copywriter_trend_sources.sql` to the production `ideatent-db` database before deploying the new application code. It adds source metadata without deleting or rewriting existing plans.

## Weekly automation Worker

`automation/wrangler.jsonc` defines a separate Worker that runs every Monday at 06:00 UTC. It calls the protected weekly endpoint and processes up to five due businesses sequentially. Repeated runs are safe because D1 enforces one plan per business and week.

Set these secrets on `ideatent-weekly-automation`:

- `AUTOMATION_SECRET` — exactly the same value used by the app Worker.
- `ACCESS_CLIENT_ID`
- `ACCESS_CLIENT_SECRET`

The last two values should belong to a Cloudflare Access service token allowed to reach the IdeaTent application. This keeps the private beta protected while permitting the scheduled Worker.

## Safe rollout order

1. Apply the D1 migration.
2. Configure `TAVILY_API_KEY`, `AUTOMATION_SECRET`, and `APP_URL` on the app Worker.
3. Deploy the app Worker and test one manual plan.
4. Confirm that a post displays `Ready-to-post copy`, source information where applicable, and working revision buttons.
5. Configure Gmail secrets and confirm one test email.
6. Configure and deploy the automation Worker.
7. Trigger the automation Worker once manually, verify that no duplicate plan is created, then leave the Monday schedule enabled.

If Tavily is unavailable or unconfigured, IdeaTent creates grounded evergreen posts. If Gmail is unavailable, the saved plan remains intact and its delivery stays pending or failed; generation is not repeated merely to retry email.
