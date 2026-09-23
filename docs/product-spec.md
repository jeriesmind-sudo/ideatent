# IdeaTent — MVP Build Handoff

This is the full product and engineering handoff for the IdeaTent private beta.

The source document is preserved verbatim below.

---

# IdeaTent — MVP Build Handoff

## 1. Product Summary

**IdeaTent** is a lightweight content-planning product for businesses.

The core promise is:

> Tell IdeaTent about your business once, and never run out of relevant, high-quality content ideas.

A business owner signs up, completes a business profile, and IdeaTent automatically researches current trends, identifies what is relevant to that business, generates a weekly content plan, saves it to their account, and emails it to them.

This first version is a **private invite-only beta**.

The goal is not to build a full social-media management platform.

---

# 2. Core User Journey

The complete MVP journey should be:

**Admin approves email**
↓  
**Business owner signs in**
↓  
**Completes business profile**
↓  
**IdeaTent stores profile**
↓  
**Weekly research runs automatically**
↓  
**Relevant trends are identified**
↓  
**AI generates a personalized weekly content plan**
↓  
**Quality-control pass checks the plan**
↓  
**Plan is saved**
↓  
**Weekly plan is emailed to the business**
↓  
**Business can view current and previous plans online**

The user should not need to manually ask IdeaTent to generate content every week.

---

# 3. MVP Scope

Build only the following features.

## Authentication

Use simple email authentication.

Preferred approach:

**Magic-link login**

If that significantly complicates Gmail-based email delivery, a basic email/password system is acceptable for the beta.

Requirements:

- Only approved email addresses can create/access accounts.
- One user = one business.
- Admin can activate or deactivate access.
- Disabled users cannot log in.

---

# 4. Invite-Only Access

Create an `approved_users` table.

Suggested fields:

- id
- email
- status: `active | disabled`
- created_at
- business_id
- last_login_at

Before registration/login is completed, verify that the user's email exists in this table and is active.

There is no public signup in V1.

Admin should have a very simple way to:

- add approved email
- see approved users
- disable user
- reactivate user

Do not build complex roles or permissions.

---

# 5. Business Profile

After first login, the user completes onboarding.

Keep onboarding clean and divided into short steps.

## Business information

Collect:

- Business name
- Industry/category
- Country
- City/location
- Website, optional
- Instagram/social page, optional
- Short description of the business

## Products and services

Collect:

- Main products/services
- Primary offers
- Important products/services they want promoted
- Typical price positioning if relevant:
  - budget
  - mid-market
  - premium

## Audience

Collect:

- Target audience
- Customer age range, optional
- Customer location
- B2B / B2C / both
- Main customer needs/problems

## Brand

Collect:

- Brand personality
- Preferred tone of voice
- Words/themes to avoid
- Topics they do not want associated with the brand

Allow simple tone choices such as:

- Professional
- Friendly
- Playful
- Educational
- Premium
- Bold
- Conversational

Also allow optional free-text guidance.

## Content goals

Allow selection of:

- Brand awareness
- Engagement
- Leads
- Sales
- Education
- Community growth
- Authority/thought leadership

## Content preferences

For V1:

- Primary social platform
- Number of posts wanted per week

Start with:

- Instagram
- LinkedIn

Other platforms can be added later.

Maximum initial recommendation:

**5 content ideas per week**

---

# 6. Main Dashboard

Keep the UI extremely simple.

No complicated sidebar.

The main navigation should contain approximately:

**Home | Previous Plans | Business Profile**

Admin access should only appear for admin users.

## Home

Show:

- Business name
- Current week's plan
- generation status
- next expected plan date

Possible states:

- Profile incomplete
- Waiting for first plan
- Generating
- Ready
- Generation failed

The main message should feel like:

**Your ideas for this week**

---

# 7. Weekly Content Plan

Generate approximately **5 ideas per business per week**.

Each content item should contain:

### Basic information
- Day
- Platform
- Content type

Examples:

- Reel
- Carousel
- Single-image post
- Text post
- Story idea

### Idea
A clear explanation of what the business should post.

### Hook
Suggested opening line/headline.

### Why this works
Short explanation of why this idea fits:

- the brand
- their audience
- a current trend
- seasonal relevance
- their business goal

### Creative direction
Explain what should visually happen.

For video:

- scene/content direction

For graphics:

- design/visual concept

### Caption direction
Not necessarily a fully finished caption every time.

Give enough direction for the user to produce the post.

### CTA
Suggested action such as:

- DM us
- Comment
- Visit website
- Save this post
- Share
- Book
- Learn more

### Content category

Tag each idea:

- Trend-based
- Educational
- Promotional
- Community
- Evergreen
- Authority
- Entertainment

The weekly plan should contain a reasonable mix instead of five promotional posts.

---

# 8. Trend Research System

Do not perform completely separate web research for every business.

Research should be reusable.

Create trend pools based on combinations such as:

**Industry + Country/Region**

Example:

`Real Estate + Nigeria`

Research this once and reuse the findings for multiple relevant businesses.

Store research results.

Suggested table:

`trend_research`

Fields:

- id
- industry
- country
- research_date
- expires_at
- raw_results
- summarized_trends
- source_urls
- created_at

Research should expire after approximately:

**7 days**

If valid research already exists, reuse it.

---

# 9. Research Provider

For the beta use:

**Tavily Free API**

Use it to find:

- current industry conversations
- recent relevant news
- cultural moments
- seasonal opportunities
- useful statistics/topics
- questions people are discussing
- emerging content themes

Do not chase every viral trend.

Trend relevance matters more than trend popularity.

Store source URLs where possible.

---

# 10. AI Architecture

Do not tightly couple IdeaTent to one AI provider.

Create a provider abstraction.

Example:

`generateContent()`

`analyseTrends()`

`qualityCheck()`

The rest of the application should not care which model performs the request.

Initial options:

### Primary
Cloudflare Workers AI

### Secondary/fallback
Gemini API free tier

The provider should be replaceable later with:

- OpenAI
- Anthropic
- another provider

without rebuilding the application.

---

# 11. AI Pipeline

Weekly generation should use several controlled stages.

## Stage 1 — Research

Find recent information relevant to:

- industry
- location
- time period

Do not include irrelevant general internet trends.

## Stage 2 — Trend analysis

AI should turn raw research into structured trend objects.

Example:

- trend title
- summary
- industries it applies to
- locations
- relevance score
- content opportunities
- source
- expiry/relevance period

## Stage 3 — Business matching

Combine:

**Business profile + current trend pool**

Determine which trends actually fit the individual brand.

A trend should be rejected if it conflicts with:

- audience
- brand voice
- industry
- business goals
- location
- products/services

It is acceptable for some weekly ideas to be evergreen rather than trend-based.

Do not force trends.

## Stage 4 — Generate content plan

Generate five diverse content ideas.

Avoid:

- repetitive ideas
- generic AI advice
- five versions of the same concept
- irrelevant viral trends
- invented business information
- unsupported factual claims

## Stage 5 — Quality control

Run a second AI pass.

Check:

- relevance
- repetition
- factual reliability
- brand fit
- variety
- usefulness
- clarity
- promotional balance

If an idea fails quality checks, replace it before saving the calendar.

---

# 12. Prevent Repetitive Content

Store previous generated ideas.

Before generating a new week, provide the AI with a summary of recent content.

The system should avoid recreating substantially similar ideas.

Maintain approximately:

**8–12 weeks of history**

It does not need infinite history for V1.

---

# 13. Weekly Automation

Use:

**Cloudflare Cron Triggers**

The weekly process should be:

Cron starts
↓
Find active businesses due for generation
↓
Group businesses by industry/location
↓
Check for existing fresh research
↓
Research missing groups
↓
Generate individual calendars
↓
Quality check
↓
Save calendar
↓
Send email
↓
Record successful/failed status

Do not generate every business simultaneously.

Process them safely in batches.

Prevent duplicate generation.

Every weekly plan should have a unique:

`business_id + week_start`

constraint.

---

# 14. Email Delivery

For the private beta, use a dedicated Gmail account through the Gmail API.

Example:

`ideatent@gmail.com`

or another available Gmail address.

Emails should include:

- business name
- week
- short introduction
- five content ideas
- link to view full calendar

Do not make the email overly designed.

Clean HTML email is enough.

Also store:

- email_sent_at
- email_status
- error if failed

The application must not generate a second content calendar simply because an email failed.

Retry only the email.

---

# 15. Database

Use:

**Cloudflare D1**

Suggested primary tables:

### approved_users
Controls beta access.

### users
Account information.

### businesses
Core business.

### business_profiles
Detailed onboarding information.

### trend_research
Cached research.

### weekly_plans
One record per business/week.

### content_ideas
Individual ideas belonging to weekly plans.

### generation_jobs
Track generation status/errors.

### email_logs
Track weekly email delivery.

Schema can be adjusted if a simpler normalized design is preferable.

---

# 16. Hosting

Use Cloudflare only.

Recommended:

**Cloudflare Workers**
- backend/API
- scheduled tasks
- frontend if appropriate

**Cloudflare D1**
- structured data

Use the free:

`*.workers.dev`

domain during the beta.

Do not require purchasing a domain for V1.

---

# 17. UI Direction

The product should be:

**clean**
**simple**
**visually appealing**
**not complicated**

Visual direction:

- generous white space
- modern sans-serif typography
- soft rounded cards
- restrained accent colour
- subtle gradients
- subtle shadows/borders
- smooth micro-interactions
- minimal navigation
- mobile-first
- excellent spacing
- strong hierarchy

Do not create:

- dense SaaS dashboards
- complicated analytics panels
- giant sidebars
- dozens of settings
- endless scrolling pages

The user should immediately understand what to do.

---

# 18. Onboarding UX

Use a short multi-step experience.

Example:

### Step 1
Tell us about your business.

### Step 2
Who are you trying to reach?

### Step 3
How should your brand sound?

### Step 4
What do you want your content to achieve?

### Step 5
Where do you post?

Then:

**You're all set. IdeaTent will prepare your content ideas.**

Show progress such as:

`3 of 5`

Do not present one enormous form.

---

# 19. What NOT to Build

Explicitly exclude the following from this MVP:

- Payments
- Pricing plans
- Public registration
- Teams
- Multiple businesses per account
- Social-media publishing
- Instagram API integration
- LinkedIn publishing API
- TikTok publishing
- Analytics
- Engagement analytics
- AI image generation
- Video generation
- Design editor
- Drag-and-drop calendar
- Content approval workflow
- Client collaboration
- Competitor monitoring
- Social inbox
- Comments/DM management
- Mobile app
- Unlimited regeneration
- AI chatbot
- Complex notifications
- Referral system
- Affiliate system
- Public marketplace

Do not add these even if they seem useful.

The beta is intended to test one hypothesis:

> Can IdeaTent consistently give businesses content ideas they genuinely want to use?

---

# 20. Admin

The admin interface should be extremely small.

Admin needs to see:

### Users
- Email
- Business
- Active/disabled
- Date joined
- Last login

### Businesses
- Business name
- Industry
- Location
- Profile completeness
- Last generated week
- Next generation

### Jobs
- Successful
- Failed
- Pending

### Access actions
- Approve email
- Disable access
- Reactivate access

Optional:

- Manually trigger generation for a business for debugging.

Do not build a full enterprise admin dashboard.

---

# 21. Feedback

Add simple feedback underneath each weekly calendar:

**Was this week's plan useful?**

Buttons:

**Yes**
**Not really**

Optional comment field:

**Anything we could improve?**

Store the feedback.

This is important because content usefulness is the primary beta metric.

---

# 22. Error Handling

The system must fail safely.

Examples:

### Tavily unavailable
Use existing fresh research if available.

### AI provider unavailable
Try fallback provider.

### Both AI providers fail
Mark generation as failed and notify admin.

Do not send low-quality incomplete calendars.

### Gmail fails
Keep generated calendar saved.

Retry email separately.

### Cron accidentally runs twice
Unique database constraints prevent duplicate weekly plans.

---

# 23. Cost Protection

The beta should have a configurable capacity limit.

Start with:

**30 active businesses maximum**

This is an admin limit, not an architectural limit.

Generation limits:

- one automatic calendar/business/week
- approximately five ideas/calendar
- no unlimited regeneration
- cached industry research
- reuse research wherever appropriate

Add simple usage counters for:

- Tavily requests
- AI calls
- generated calendars
- emails

This allows costs to be monitored before expanding.

---

# 24. Security

Minimum requirements:

- secrets stored as Cloudflare environment secrets
- never expose Gmail credentials
- never expose Tavily keys
- never expose AI API keys
- validate all server-side input
- users can access only their own business
- admin endpoints require admin authentication
- rate-limit authentication endpoints
- sanitize anything rendered into HTML emails/pages
- no raw confidential business information sent to unnecessary services

---

# 25. Environment Variables

Likely variables:

`TAVILY_API_KEY`

`GEMINI_API_KEY`

Cloudflare Workers AI binding/configuration

`GMAIL_CLIENT_ID`

`GMAIL_CLIENT_SECRET`

`GMAIL_REFRESH_TOKEN`

`GMAIL_SENDER_EMAIL`

`ADMIN_EMAIL`

Authentication/session secrets

Exact implementation may vary.

---

# 26. Suggested Build Order

## Phase 1 — Foundation

Build:

- Cloudflare project
- D1 schema
- authentication
- approved-user access
- business profile onboarding
- simple dashboard

Acceptance:

A manually approved user can sign in, complete their business profile and return later to see it.

---

## Phase 2 — Research

Build:

- Tavily integration
- research cache
- industry/location grouping
- structured trend analysis

Acceptance:

System can create and store a reusable trend report for an industry/location.

---

## Phase 3 — Generation

Build:

- AI provider abstraction
- business/trend matching
- weekly calendar generation
- quality-control pass
- content history/repetition protection

Acceptance:

System can generate five high-quality, clearly differentiated content ideas for a test business.

---

## Phase 4 — Automation

Build:

- Cloudflare Cron
- weekly generation scheduling
- generation job tracking
- duplicate prevention
- failure handling

Acceptance:

A business can receive a new plan without any manual trigger.

---

## Phase 5 — Email

Build:

- Gmail API integration
- weekly calendar email
- retry handling
- email logs

Acceptance:

Generated plan is automatically emailed and remains accessible in the dashboard.

---

## Phase 6 — Beta Hardening

Test with two real businesses.

Check:

- relevance
- repeated ideas
- mobile usability
- generation failures
- research relevance
- email reliability
- unauthorized access
- duplicate calendars
- API usage

Fix issues before inviting additional users.

---

# 27. First Beta Test

Start with exactly:

**2 businesses**

Preferably from different industries.

Run for at least several weekly generations.

Evaluate:

- Did they use any ideas?
- Were ideas specific to the business?
- Were the trends genuinely relevant?
- Was the content repetitive?
- Was anything obviously AI-generated/generic?
- Did they understand the interface?
- Did the emails arrive reliably?
- Did they need features we intentionally excluded?

Only expand after the basic loop proves reliable.

---

# 28. Beta Expansion

Suggested progression:

**2 businesses**
→ internal validation

**10 businesses**
→ onboarding/content-quality testing

**20–30 businesses**
→ closed beta

**50 businesses**
→ free-tier and automation stress test

Do not open unrestricted public registration during V1.

---

# 29. Definition of Done

The MVP is complete when:

1. Admin can approve an email.
2. Approved user can sign in.
3. User can create/update their business profile.
4. IdeaTent can research relevant current topics.
5. Research can be reused across similar businesses.
6. IdeaTent generates five personalized weekly ideas.
7. Generated ideas pass a quality-control stage.
8. Previous ideas are considered to reduce repetition.
9. Plan is stored in D1.
10. User can view current and previous plans.
11. Plan is automatically emailed through Gmail.
12. Weekly generation happens through Cloudflare Cron.
13. Failed generation does not corrupt existing plans.
14. Admin can disable access.
15. System prevents duplicate weekly generation.
16. Interface works well on desktop and mobile.
17. Two real businesses can use the complete flow without developer intervention.

---

# 30. Core Product Rule

Do not expand the scope until this loop works consistently:

**Learn the business → Research → Match → Generate → Quality check → Deliver → Learn from feedback.**

Every development decision should support that loop.

If a proposed feature does not improve that loop for the private beta, defer it.

