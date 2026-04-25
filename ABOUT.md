# Composed

A personalized training tracker for soccer players who train outside of team practice. Built for U12–Senior youth players, the coaches who guide them, and the parents who watch from the sideline.

## What Composed Is

Most soccer players who want to improve train alone. They juggle in the backyard, hit the wall with a bag of balls, run cones in an empty parking lot. Hundreds of hours a year of unstructured, unmeasured work that rarely connects to anything. Coaches can't see it. Parents don't know what to say about it. The player themselves can't tell whether any of it is moving the needle.

Composed turns that solo training into a tracked development journey. A player logs what they did, how long, and a handful of stats (shots, passes, RPE). The app compresses that into a position-weighted "Pace" metric — a week-over-week improvement score that weights shooting 40% for a Striker and passing 35% for a CDM. Pace is auditable: tap it and the app explains exactly which sessions and which metrics moved it, in plain English, with a sentence a parent or coach can read in fifteen seconds.

The wedge is two things most development tools don't do together: position-aware analytics that treat a goalkeeper differently from a winger, and AI video analysis that works on any phone without proprietary hardware. A player films a drill in their backyard, the browser compresses the footage to H.264 client-side via FFmpeg.wasm (10x smaller before it ever leaves the device), uploads it resumably via Tus, and Google Gemini returns structured stats that pre-fill the session form. No tripod, no sensors, no subscription to a device ecosystem. It's a PWA — installable from a link, works offline, zero app-store gatekeeping.

## Who It's For

**Youth player (primary).** A U12–U18 kid who trains solo 3–5 times a week outside of team sessions. They want to know if they're actually improving, not just training more. They identify with a playing archetype ("I want to be a scorer, not just someone who plays"), they have access to basic equipment (ball, wall, maybe cones), and they're on a phone. Everything in the UI is designed for one-handed operation and sub-90-second interactions. The app fills the coaching gap when they don't have one, and amplifies the relationship when they do.

**Coach (secondary).** A youth coach managing a roster of 5–25 players across a season. They get a Squad Pulse dashboard as their landing screen — a scannable list showing who trained this week, who's slipping, and each player's current Pace direction. They can generate invite codes for players to join their roster, assign daily training plans by date, scout upcoming opponents via AI-generated reports, and message players directly. The coach view is deliberately different from the player view: a player asks "am I improving?"; a coach asks "who's doing the work?"

**Parent (tertiary).** A parent with a child on Composed gets a read-only dashboard showing their kid's activity, streaks, and development goals — but only the fields the player themselves has permitted. Three toggles in the player's settings control what the parent sees: session ratings, coach feedback, and IDP goals. This is deliberate. The app is built around player autonomy; parents observe, they don't direct. Multiple parents can link to one player; one parent can watch multiple kids.

## Core Features

### Training & Session Logging

Players log training sessions through one of three paths: a two-screen quick form (drills + duration, then stats + RPE, ~90 seconds), a live session with a timer and optional rear-camera recording, or an AI video analysis path that pre-fills stats from footage. Every session captures shooting (shots, goals, foot breakdown, optional shot context tags for zone × type × approach × pressure), passing (attempts, completed, key passes), fitness (sprints, distance, RPE), a pre-session body check (sleep, HRV, hydration, soreness), and a post-session reflection across confidence, focus, and enjoyment. Most fields are optional — the server schema requires only id, date, and duration. The full multi-screen form is always accessible via an "Add more details" link for players who want depth.

### Drill Library & Programs

**76 preset drills** across five categories: **Technical** (Shooting, Passing, Dribbling, Crossing, Goalkeeping), **Physical** (Strength, Speed), **Tactical** (Movement, Defending), **Psychological**, and **Warm-Up & Cool-Down**. Each drill carries coaching points, variations, equipment requirements, space requirements, difficulty level, position relevance, and an estimated duration. Players can create unlimited custom drills alongside the preset library. **4 preset programs** are available for enrollment: *4-Week Finishing Mastery*, *Ball Mastery Fundamentals*, *Complete Player*, and *Speed & Agility Camp*. Each program is periodized with session-by-session prescriptions; the player enrolls in one at a time and marks daily sessions complete.

### AI & Intelligence Layer

The intelligence layer combines rules-based engines with AI providers where appropriate:

- **Video analysis** runs client-side FFmpeg.wasm compression to H.264 at 720p, Tus resumable chunked upload, then Google Gemini multimodal extraction of shots taken, pass accuracy, technique quality, foot usage, and RPE estimate. The pipeline has a shared state machine and 18 mapped failure modes — every failure falls back to manual entry with no data lost.
- **Ask Composed** is a context-aware chat with Gemini. It receives the player's last 10 sessions, active IDP goals, current streak, and any active program in the system prompt. 50 messages per day.
- **Opponent scouting** uses the Manus API (async task-based) to research a youth club and return a structured markdown report: formation, playing style, key players, strengths, weaknesses. Rate-limited to 3 reports per day per user.
- **Game plans** are generated by a deterministic rules engine that parses the scouting report for 9 tactical style flags (high press, possession-based, direct play, strong set pieces, weak aerially, etc.), cross-references opponent weaknesses with the player's position-relevant drills, and emits a pre-match brief + warmup session. Gemini is a fallback only when the rules engine can't produce enough tactical advice. Warmup drill selection uses a seeded PRNG so the same report always produces the same warmup.
- **Session insights** are rules-based only — local heuristics that compare each logged session to personal baselines, flag anomalies, and surface 2–3 deduplicated insights on the Dashboard. No external API call.

### Analytics & Progress Tracking

The **Pace** metric is the center of the app. It computes a week-over-week improvement velocity across five sub-metrics (shooting, passing, consistency, duration, load), weighted by the player's position. A Striker's Pace weights shooting at 40% and passing at 10%; a CDM flips to 5% shooting and 35% passing; a Goalkeeper weights consistency at 30% and load at 30%. The thresholds are simple: greater than +2% is ACCELERATING, less than −2% is STALLING, otherwise STEADY. Pace is fully auditable: tapping any Pace display routes to a dedicated view that shows the exact sessions contributing, the position weight breakdown, the before/after metric values, and a generated plain-English sentence like *"Your Pace dropped because your training volume decreased and you trained 2 fewer times this week."*

Around Pace sit a constellation of standard analytics: a 0–100 composite **Training Score** with week-over-week delta, a **Weekly Summary** (sessions, total time, shot %, pass %, RPE), **Personal Records** with automatic PR detection at session save, **Benchmark Tests** for LSPT and LSST scores, a **Training Calendar** with assigned plans and program overlays, and **Peer Benchmarks** comparing the player's metrics against published youth development norms (FA England + US Soccer DA), labeled clearly as a static benchmark until real cohort data accumulates.

### Player Identity System

Five archetypes drive narrative copy across the app: **Scorer**, **Speedster**, **Playmaker**, **Engine**, **Rock**. The archetype is multi-select — a player can pick more than one — and supports custom free-text for players who want an identity that isn't listed. The chosen identity shapes:

- The Pace label ("Your Scorer's Pace is ACCELERATING" instead of "Your Pace is ACCELERATING")
- The narrative copy on Dashboard and Pace screens
- Metric-specific tips when a stat declines
- Category weight boosts in the daily plan generator (a Scorer gets more shooting drills, a Playmaker more passing)
- Motivation quotes and peer comparison labels

When multiple identities are selected, drill boosts blend across them (averaged); narrative copy uses the first preset.

### Coach Tools

The coach's landing screen is a compact roster list — name, position, sessions this week, pace label pill, and a red/yellow/green compliance dot (red = no activity this week, yellow = active but below 70% compliance on assigned plans, green = active and compliant). Tap any player for a detail view showing recent sessions, assigned plan compliance, active IDP goals, and direct messaging. Coaches can generate 6-character invite codes with expiry, assign training plans to specific players on specific dates, scout opponents, and share scouting reports with the entire team. The Squad Pulse endpoint uses 3 batched SQL queries regardless of roster size — the original implementation was 8+ queries per player, which would crash at any real scale.

### Parent Features

Parents see a read-only dashboard of their child's training activity, streaks, XP level, badges, recent sessions, and coach feedback — all filtered through three visibility toggles the **player** controls, not the parent. A parent-child link is established via a 6-character invite code the player generates. One player can link multiple parents; one parent can link multiple children.

### Social

A lightweight friend system: search by username, add friends, see their recent session activity in a feed, exchange direct messages, comment on each other's sessions. Coach-player messaging is a separate channel with adaptive polling (10s to 60s backoff, pauses when the tab is hidden via the Page Visibility API — saves roughly 17,000 wasted requests per day per idle user compared to the naive fixed-interval approach).

### Gamification

**15 badges** spanning session milestones (First Touch, Getting Serious, Dedicated, Quarter Century, Half Century, Centurion at 1/5/10/25/50/100 sessions), streak achievements (Hat Trick, Week Warrior, Fortnight Fighter, Iron Will at 3/7/14/30-day streaks), and skill-specific awards (Sharpshooter, Weak Foot Hero, Early Bird, Marathon Session, Video Pro). XP is earned per session (25 base + 10 streak + 10 for 60+ min + 100 for any new PR + 50 for completing an assigned daily plan). Levels advance every 200 XP. Session submission triggers a five-phase celebration screen: confetti (for streaks ≥3 or badge unlocks), stats vs. last session, XP breakdown with level progress, badges and PRs, and finally a Pace-aware beat showing how this specific session affected the player's Pace trajectory — with a "See why" link into the audit view.

### Data Management

Players can export their full training history as JSON, import a JSON archive to restore data, or clear all their data. The Coach Report feature renders a one-page PNG summary of the last 4 weeks (header, Pace headline, plain-English "why" sentence, weekly session bars, top moving metrics, active IDP goals) and triggers the native Web Share API on mobile with a download fallback on desktop. Parent visibility toggles are respected on the Coach Report too — a field hidden from a parent is hidden from the report by default.

## The Core Loops

### Onboarding

```
7-screen intro animation → Login / Google / "I'm a New User"
    ↓
Role selection (player | coach | parent)
    ↓  (player path)
Name → Position (multi-select, required)
    ↓
Age Group + Skill Level (both required)
    ↓
Player Identity (multi-select, required, with custom text)
    ↓
Pace Preview  ("Here's what your Dashboard will look like")
    ↓
Weekly Goal + Equipment
    ↓
First Session Choice: Quick Log | Record + AI | Skip
    ↓
Account created → auto-navigate to chosen first-session mode
```

### Daily Player Loop

```
Open app → Dashboard
    ↓
Pace hero card: "Your Scorer's Pace is ACCELERATING +4.2%"   [tap → audit]
Contextual nudge: "Coach assigned a plan for today"
Today's Training: one "Start training" CTA
    ↓ tap
Mode selection: Quick Log  |  Record + AI  |  Live session with timer
    ↓
Session form (90-second quick path, or AI pipeline, or live timer)
    ↓
Celebration: confetti → stats → XP/badges/PRs → Pace beat
    ↓
Back to Dashboard with updated Pace
```

### Coach–Player–Parent Weekly Cadence

```
Monday
  Coach opens app → Squad Pulse → sees who's slipping (red dots)
  Coach assigns plans to specific players for the week
  Weekly leaderboard resets (ranked by Pace delta)

Mid-week
  Players log sessions → compliance flows to coach view
  Players see their rank move on the Dashboard's Team Rank card
  Parents see streak / XP / session counts (filtered by player toggles)

Match day
  Coach scouts opponent → AI game plan + warmup generated
  Coach shares report with team
  Players see pre-match brief on their Scout tab

Saturday evening
  Player taps "Share with Coach" → generates a PNG of the week
  Shares via iMessage / WhatsApp / whatever
```

## What Makes It Different

- **Client-side FFmpeg video compression.** The 25MB WASM binary loads on first use, then compresses video to H.264 720p entirely in the browser — 10x smaller uploads before bytes ever leave the phone. Most video-analysis apps upload raw video and compress server-side, which breaks on cellular.
- **Position-weighted everything.** Pace weights, daily plan drill selection, identity-aware tips, and peer benchmarks all respect the player's position. A CDM's flat shot accuracy doesn't drag their Pace the way a Striker's would. This is the single most product-differentiating implementation detail.
- **Identity-driven narrative.** Every metric surface — Dashboard hero, Pace tab, weekly card, daily plan tips, celebration copy — changes its language based on the player's chosen archetype. "Your Scorer's Pace is STEADY. Keep stacking sessions" reads differently than a generic percentage. The identity also boosts specific drill categories in the daily plan generator.
- **Seeded PRNG for warmup drill selection.** The game plan generator uses Mulberry32 seeded with an FNV-1a hash of the club name + report ID, so the same scouting report always produces the same warmup. No "refresh and get different drills" that undermines coach trust.
- **Rules-based game plans with AI fallback.** The game plan engine tries a deterministic rules engine first (9 tactical style flags parsed from the scouting markdown), and only falls back to Gemini when the rules can't produce enough tactical advice. Faster, cheaper, more predictable than pure AI generation.
- **Adaptive polling with Page Visibility API.** Coach chat and background pollers use recursive `setTimeout` with exponential backoff (10s → 60s) that pauses entirely when the browser tab is hidden. Per-user request volume drops by roughly an order of magnitude against the naive fixed-interval approach.
- **Multi-role single codebase.** Players, coaches, and parents share the same React app with conditional tab bars and role-aware Dashboard routing. No separate "coach app" to install. A role switch in Settings is instant.
- **Player-controlled parent privacy.** The player — not the parent and not the coach — controls three visibility toggles that determine what their linked parent can see. A thoughtful product decision for a youth app where autonomy matters.
- **PWA with zero app-store dependency.** Installable from a link, works offline via a Workbox service worker, IndexedDB for persistent local state, native Web Share API for the Coach Report. No TestFlight, no Play Store review cycle.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.2 |
| Build tool | Vite | 7.3 |
| Styling | Tailwind CSS | 4.2 |
| Charts | Recharts | 3.7 |
| Backend framework | Express | 5.2 |
| Database | better-sqlite3 | 12.6 |
| Auth | JWT (jsonwebtoken) + Google OAuth (google-auth-library) + bcryptjs | 9.0 / 10.6 / 3.0 |
| Validation | Zod | 4.3 |
| AI (video + chat) | Google Gemini via @google/genai | 1.47 |
| AI (alt provider) | Anthropic Claude via @anthropic-ai/sdk | 0.80 |
| Scouting | Manus API (custom client) | — |
| Video compression | FFmpeg.wasm (@ffmpeg/ffmpeg) | 0.12 |
| Video upload | Tus protocol (@tus/server + tus-js-client) | 2.3 / 4.3 |
| PWA | vite-plugin-pwa + Workbox | 1.2 |
| Offline persistence | idb (IndexedDB wrapper) | 8.0 |
| Confetti | canvas-confetti | 1.9 |
| Wake lock | nosleep.js | 0.12 |
| Security | Helmet + express-rate-limit | 8.1 / 8.3 |
| Compression | compression middleware | 1.8 |
| Testing | Vitest + supertest | 4.0 / 7.2 |
| Runtime | Node.js (ES modules) | — |

Deployment target is a single Node process serving both the API and the built Vite bundle, with SQLite on local disk. No required external services for the core app; Gemini / Manus / Google OAuth are optional integrations that gracefully degrade when their env vars are missing.

## Data Model at a Glance

**26 SQLite tables** managed via 25 numbered migrations in `server/db.js`. The shape is conventional:

- **`users`** is the root — id, username, password_hash, role (player | coach | parent), email, email_verified, google_id, token_version. Every other per-user table foreign-keys back here.
- **`sessions`** is the densest table. Each row is one training session with duration, drills (JSON array), notes, intention, shooting/passing/fitness/body_check/reflection (all JSON blobs), quick_rating, session_type, position, and session_insights (AI output).
- **`settings`** holds per-user profile and preferences — player_name, age_group, skill_level, position (JSON array, multi-select), equipment, player_identity (JSON array, multi-select), weekly_goal, distance_unit, onboarding_complete.
- **`drills`** is the standalone library (76 presets + user-created custom drills). **`custom_drills`** is a legacy table kept for backward compat.
- **`programs`** + **`program_sessions`** + **`user_programs`** form the structured training program system. 4 presets. Players enroll in one at a time.
- **`coach_players`** is the roster relationship (coach_id → player_id). **`parent_player_links`** is the parent-child relationship with status (pending / active / revoked).
- **`parent_visibility_settings`** holds the three toggles the player controls for each linked parent.
- **`idp_goals`** tracks Individual Development Plan goals across four corners (technical, tactical, physical, psychological).
- **`assigned_plans`** is coach → player plan assignments on specific dates.
- **`video_analyses`** tracks uploaded video metadata, compression output, Gemini analysis results, and status.
- **`scouting_reports`** holds opponent scouting requests and Manus API responses, with a partial unique index to prevent duplicate active reports for the same club/date.
- **`messages`** + **`friend_connections`** + **`session_comments`** are the social surface.
- **`benchmarks`**, **`personal_records`**, **`templates`**, **`training_plans`**, **`decision_journal`**, **`invite_codes`**, **`matches`** round out the schema.

Cross-cutting design patterns: every user-scoped query filters by `user_id`; complex nested data is stored as JSON strings in TEXT columns and parsed on read; token versioning on `users` enables instant revocation of all JWTs on password change.

**API surface:** 23 route files under `server/routes/` exposing roughly 99 REST endpoints, plus 9 auth endpoints in `server/auth.js`. Every endpoint except health check and auth is behind JWT middleware. Per-user daily quotas on AI-consuming endpoints (video upload: 10/day, video analysis: 20/day, AI chat: 50/day, scouting reports: 3/day, game plans: 10/day).

## Status

### Fully Built & Shipping
- Session logging across three paths (quick form, live timer, AI video)
- Complete drill library and program enrollment system
- JWT + Google OAuth authentication with token revocation
- Coach roster management, plan assignment, Squad Pulse, scouting report sharing
- Parent dashboard with privacy controls
- IDP goal tracking across four corners
- Client-side FFmpeg compression + Tus upload + Gemini analysis pipeline with 18 mapped failure modes
- Ask Composed AI chat with player context
- Manus opponent scouting + rules-based game plan generator
- Position-weighted Pace metric + plain-English audit view
- Multi-select identity system with narrative, drill-boost, and motivation integration
- XP / levels / 15 badges / celebration screen with five animated phases
- Social feed, friend connections, direct messaging, session comments
- PWA with offline caching and IndexedDB persistence
- Data export / import / wipe
- Coach Report (shareable PNG)
- Team leaderboard (weekly, roster-scoped, Pace-delta ranked, resets Monday)

### Partial / Could Be Deeper
- Benchmark Tests ships with two test types (LSPT, LSST) and no percentile ranking against peers
- Decision Journal has routes and a schema but no prominent UI entry point
- Not all 76 drills have SVG diagrams yet (the DrillDiagram component supports it)
- Friend activity feed shows session completions but has no reactions or richer interactions
- Session comments are in the API but not surfaced prominently on session detail

### Intentionally Not Yet Built
- **Monetization.** No Stripe, no subscription tier, no paywall. The quota structure hints at a natural freemium split when the time comes.
- **Push notifications.** No service worker push subscription, no web-push integration. The in-app Dashboard nudge (contextual one-liner) is the substitute until push is warranted.
- **Native app.** The PWA route is deliberate; no Capacitor wrapper or Play Store / App Store submission.
- **Team entity.** Coaches manage individual rosters; there's no "FC Barcelona U16" team concept with shared identity and team-level stats.
- **Email infrastructure.** No transactional email (Resend/Postmark/SES) — no password reset flow, no email verification for password signups, no weekly recap emails, no coach/parent invite emails. This is the biggest deployment gap.
- **Payments.** No Stripe integration.
- **Admin tools.** No internal dashboard for monitoring users, costs, or abuse.
- **Analytics/telemetry.** No usage tracking or funnel analysis.
- **Leaderboards beyond the team.** No global, age-group, position, or friends-based leaderboards. Only the roster-scoped weekly leaderboard, deliberately.
