# Composed — Product Brief

*Generated from codebase audit. Intended as input for market analysis.*

---

## What This App Is

Composed is a soccer training companion app for youth players (U12–Senior) that turns unstructured solo practice into a tracked, personalized development journey. Players log sessions, track shooting/passing/fitness stats, get AI-powered video analysis and drill recommendations, follow structured multi-week programs, and see their improvement quantified through a position-weighted "Pace" metric and identity-aware narrative. Coaches can manage rosters, assign daily training plans, scout upcoming opponents via AI, and monitor squad-level progress. Parents get a privacy-controlled read-only window into their child's training. The app is a PWA (Progressive Web App) that works offline, runs in the browser, and is installable on mobile home screens without app stores.

---

## Target Users

Based on the code, three distinct personas are built into the role system:

### Primary: Youth Soccer Player (U12–U18)
- Trains solo 3–5 times per week outside of team practice
- Wants to know if they're actually improving (not just training more)
- Identifies with a playing archetype ("Scoring goals from anywhere", "Too fast to catch", etc.)
- Has access to basic equipment (ball, wall, cones) but not full facilities
- Uses a phone — the UI is mobile-first, every interaction designed for one-handed use
- May or may not have a coach; the app fills the gap when they don't

### Secondary: Youth Coach
- Manages a roster of 5–25 players
- Assigns individual daily training plans remotely
- Wants to see which players are training consistently and which are slipping
- Uses opponent scouting to prepare match-day game plans
- Communicates with players via in-app messaging

### Tertiary: Parent
- Wants visibility into their child's training without being overbearing
- The player controls what the parent can see (ratings, coach feedback, goals)
- Read-only dashboard — parents observe but don't direct

---

## Complete Feature Inventory

### Training & Session Logging
- **Session Logger**: Multi-screen form collecting date, duration, drills performed, session type, position played, RPE (1–10), intention/focus, and free-text notes
- **Shooting Stats**: Shots taken, goals scored, left/right foot breakdown, shot-detail groups (zone × type × approach × pressure level)
- **Passing Stats**: Attempts, completed, key passes, auto-calculated completion %
- **Fitness Stats**: Sprints completed, distance covered (km/mi), RPE
- **Body Check**: Pre-session readiness (sleep hours, HRV, hydration, energy, soreness, injury notes)
- **Reflection**: Post-session confidence/focus/enjoyment ratings + free-text reflection
- **Quick Mode**: Simplified one-tap session entry (duration + rating only)
- **Session Templates**: Save and reuse common session configurations
- **IDP Goal Tagging**: Tag which Individual Development Plan goals a session addressed
- **Media Links**: Attach YouTube/Drive URLs to sessions

### Drill Library & Programs
- **76 Preset Drills** across 10 categories: Shooting, Passing, Dribbling, Crossing, Goalkeeping, Strength, Speed, Movement, Defending, Psychological
- Each drill has: description, coaching points, variations, equipment needed, space needed, difficulty level, position relevance, estimated duration
- **Drill Explorer**: Browse/filter by category, subcategory, difficulty, position, search text
- **Custom Drills**: Players can create their own and reuse across sessions
- **4 Structured Programs**: Finishing Mastery, Ball Mastery, Complete Player, Speed & Agility — each multi-week, periodized, with daily session plans
- **Program Enrollment**: Enroll in one program at a time, track completion by week/day

### AI & Intelligence Layer
- **Video Analysis** (Google Gemini multimodal): Upload training footage → client-side H.264 compression via FFmpeg.wasm (10x size reduction) → Tus resumable upload → Gemini extracts shots taken, pass accuracy, technique quality, foot usage, RPE estimate → auto-fills session form
- **Ask Composed** (Gemini chat): Context-aware AI assistant that knows the player's last 10 sessions, active IDP goals, streak, and current program. 50 messages/day. Players can ask for drill advice, form tips, progress analysis.
- **Opponent Scouting** (Manus API): Request a research report on any youth club. Returns structured markdown: formation, playing style, key players, strengths, weaknesses. 3 reports/day.
- **Game Plan Generator** (rules-based + Gemini fallback): Parses scouting report, detects 9 tactical style flags (high press, possession-based, direct play, strong set pieces, etc.), cross-references opponent weaknesses with player's drill library, generates personalized pre-match brief + warmup session (5–10 position-relevant drills).
- **Session Insights** (rules-based engine): After each logged session, auto-generates 2–3 personalized insights comparing metrics to personal baselines. Deduplicates contradictory insights by category priority.
- **Daily Plan Generator** (rules-based): Auto-generates a training plan for today based on position, IDP goals, recent session history, pace metrics, and available equipment. Selects from the 76-drill library with position-relevance weighting and identity-driven category boosts.

### Analytics & Progress Tracking
- **Training Score** (0–100): Composite metric with position-weighted sub-scores for Consistency, Shooting, Passing, Physical, Endurance, and Mental. Shows week-over-week delta.
- **Pace Metric**: Measures improvement velocity (% change week-over-week) with position-specific weight tables. A Striker's pace is 40% shooting, 10% passing; a CDM is 35% passing, 5% shooting. Labels: Accelerating (>+2%), Steady, Stalling (<-2%).
- **Weekly Summary Card**: Sessions completed, total time, avg shot %, avg pass %, avg RPE, streak count, week-over-week deltas.
- **Personal Records**: Tracks all-time bests for every measurable stat. New PRs trigger badge unlocks and celebration screens.
- **Benchmark Tests**: LSPT (Linear Speed/Power Test) and LSST (Linear Speed/Strength Test) with score tracking over time.
- **Training Calendar**: Weekly view showing sessions, assigned plans, and program schedule overlaid.
- **Session History**: Scrollable list of all past sessions with date, drills, stats, and rating.
- **Metric Trend Views**: Tap any metric to see a 5-week chart with trend line.
- **Peer Benchmarking**: Compares Pace against published youth development norms (FA England + US Soccer DA), segmented by age group and skill level. Labeled as static benchmarks, not a live cohort.

### Player Identity System
- 5 archetypes: Scorer, Speedster, Playmaker, Engine, Rock — each with distinct:
  - Primary metric focus (e.g., Scorer → shooting)
  - Narrative copy ("Your Scorer's Pace is ACCELERATING")
  - Pace label ("SCORER'S PACE" instead of "YOUR PACE")
  - Metric-specific tips when a stat declines
  - Drill category weight boosts for daily plan generation
  - Motivation quotes
  - Peer comparison labels ("scorers at your level")
- Multi-select: players can pick multiple identities + add custom free-text
- When multiple are selected, drill boosts blend (averaged); narrative uses the first preset for copy
- Identity is chosen during onboarding and editable in Settings

### Coach Tools
- **Roster Management**: Generate invite codes (with expiry), players join via code, remove players
- **Plan Assignment**: Pick a player, pick a date, choose drills from the 76-library, set target duration. Player sees it on their Plan tab.
- **Squad Pulse**: Aggregate dashboard showing each player's: sessions this week, shot/pass accuracy trends, RPE, compliance rate (assigned plans completed), pace label. Batched SQL queries (3 total regardless of roster size).
- **Player Detail**: Drill down into any player's sessions, stats, and IDP progress.
- **Scouting Report Sharing**: Coach scouts an opponent, then shares the report with the entire team.
- **Coach Chat**: Direct messaging with each player (adaptive polling: 10s–60s backoff, pauses when tab is hidden).

### Parent Features
- **Read-Only Dashboard**: Child's training activity, streaks, XP/level, badges, recent sessions, coach feedback
- **Privacy Controls**: The player (not the parent) controls what's visible via 3 toggles: show ratings, show coach feedback, show IDP goals
- **Invite Flow**: Player generates a 6-character code → parent redeems it → link is established
- **Multi-Child Support**: A parent can link to multiple players

### Social & Community
- **Friend Connections**: Search by username, add friends, view friend list
- **Activity Feed**: See friends' recent sessions, badge unlocks, personal records
- **Session Comments**: Friends can comment on each other's sessions
- **Direct Messaging**: Text chat between any two connected users

### Gamification
- **XP System**: 25 XP per session + 10 per streak day + 10 for 60+ min sessions + 100 for new PR + 50 for completing daily plan
- **Levels**: 1 level per 200 XP (displayed as "Level N" badge)
- **15 Badges**: Session milestones (1/5/10/25/50/100), streak achievements (3/7/14/30 days), skill badges (80%+ accuracy, weak-foot hero, early bird, marathon session, video pro)
- **Celebration Screen**: Multi-phase animation on session complete — confetti, XP earned, badge unlocks, new PR highlights
- **Streak Tracking**: Consecutive days trained, displayed prominently on Dashboard

### Data Management
- **Export**: Download all user data as JSON (sessions, settings, goals, plans, records, templates)
- **Import**: Upload JSON to restore/migrate data
- **Clear All Data**: Wipe all user data (sessions, plans, goals, settings) — exists as a delete-my-data mechanism

---

## Core User Loops

### Onboarding Flow (first-time user, ~3 minutes)
```
[7-screen intro animation: Welcome → Problem → Solution → App reveal → Features → Trust → CTA]
  ↓
[Login screen: "Continue with Google" / username+password / "I'm a New User"]
  ↓
[Onboarding: Role → Name → Position* → Age Group → Skill Level → Equipment → Identity → Weekly Goal]
  ↓  (*position and identity are multi-select, position is required)
[Google flow: adds "Pick a username" step, skips the password signup form]
  ↓
[Signup form (password) or /google/complete (Google)]
  ↓
[Main app — Dashboard with first daily plan generated]
```

### Daily Loop (returning player, ~2 minutes to start)
```
Open app → Dashboard shows:
  - Training Score (how am I doing overall?)
  - This Week summary (am I on pace for my weekly goal?)
  - Weekly Pace card ("Your Scorer Pace is ACCELERATING +46%")
  - Today's Training (auto-generated or coach-assigned plan)
    → "Start & Record" (live session with timer + camera)
    → "Log manually" (session form)
    → "Upload a Video" (post-session analysis)
  - Recent sessions (quick access to history)
  - Coach's Notes (2-3 insights from AI)
```

### Session Flow (logging a training session, ~5 minutes)
```
Start:
  → Pick drills from 76-library (or templates)
  → Set duration, session type, intention
Mid:
  → Shooting stats (shots/goals, foot breakdown, shot context details)
  → Passing stats (attempts/completed/key passes)
  → Fitness stats (sprints, distance, RPE)
End:
  → Session reflection (confidence/focus/enjoyment + notes)
  → Tag IDP goals addressed
  → Optionally attach media links
Submit:
  → Session saved + AI insights generated
  → XP awarded, streak updated, PRs checked
  → Celebration screen (confetti, badges, PR highlights)
  → Return to Dashboard (updated stats)
```

### Coach-Player Loop (weekly cadence)
```
Coach:
  1. Views Squad Pulse → identifies who's slipping
  2. Assigns daily plans for the week (drills + duration)
  3. Scouts upcoming opponent → generates game plan
  4. Shares game plan with team
  5. Messages individual players with feedback

Player:
  1. Opens app → sees coach-assigned plan for today
  2. Completes session → logs it → stats flow to coach view
  3. Views pre-match brief before game day
  4. Messages coach with questions

Parent:
  1. Opens parent dashboard → sees child's activity at a glance
  2. Sees streak, XP, badges, coach feedback (if player allows)
  3. No write access — observe only
```

---

## Tech Stack & Platform

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + Tailwind CSS v4 |
| **Backend** | Express 5 (Node.js) + better-sqlite3 |
| **Database** | SQLite (26 tables, 25 migrations) |
| **Auth** | JWT (1h access + 7d refresh) + Google OAuth 2.0 + bcrypt (12 rounds) |
| **AI — Video** | Google Gemini (multimodal) + FFmpeg.wasm (client-side H.264) |
| **AI — Chat** | Google Gemini with player-context system prompt |
| **AI — Scouting** | Manus API (async task-based research) |
| **AI — Game Plans** | Rules-based engine (9 tactical flags) + Gemini fallback |
| **Video Upload** | Tus protocol (resumable, chunked) |
| **Charts** | Recharts |
| **PWA** | vite-plugin-pwa + Workbox (NetworkFirst for API, cache-first for assets) |
| **Offline** | IndexedDB (idb library) + service worker + draft auto-save |
| **Gamification** | canvas-confetti + custom XP/badge engine |
| **Validation** | Zod schemas (server-side body validation) |
| **Security** | Helmet (CSP/HSTS/etc.), express-rate-limit, XSS sanitization, CSRF origin check |
| **Testing** | Vitest + supertest (15 auth tests, additional API tests) |

**Platform**: Browser-based PWA. No native mobile app. Installable on iOS/Android home screens via "Add to Home Screen." Offline-capable with service worker caching and IndexedDB persistence. Mobile-first responsive design — every UI element is designed for phone-width viewports.

---

## Data Model Summary

### Core Entities & Relationships

```
users (1) ──── (*) sessions
  │                    │
  │                    └── (*) video_analyses
  │                    └── (*) session_comments
  │
  ├── (1) settings (position[], identity[], age, skill, equipment)
  ├── (*) idp_goals (4 corners: tech/tactical/physical/psych)
  ├── (*) training_plans (weekly schedule)
  ├── (*) templates (reusable session configs)
  ├── (*) custom_drills
  ├── (*) benchmarks (LSPT/LSST scores)
  ├── (*) decision_journal (post-match reflections)
  ├── (1) personal_records (JSON blob of all-time bests)
  ├── (*) scouting_reports (opponent analysis)
  │
  ├── coach_players ──── users (coach ↔ player, M:M)
  ├── assigned_plans (coach assigns to player on a date)
  ├── parent_player_links (parent ↔ player, M:M)
  ├── parent_visibility_settings (player controls parent access)
  │
  ├── friend_connections (user ↔ user, symmetric)
  ├── messages (user → user, timestamped)
  │
  └── user_programs (enrollment in 1 of 4 preset programs)
         └── programs ──── program_sessions (week × day structure)

drills (76 preset, standalone library — referenced by name in sessions/plans)
invite_codes (coach/parent invite flow, expires, single-use)
```

### Key Design Patterns
- **Multi-tenant isolation**: Every query filters by `req.userId`. No cross-user data leakage.
- **JSON-in-TEXT columns**: Complex nested data (shooting stats, body check, drill lists, coaching points) stored as JSON strings in SQLite TEXT columns. Parsed on read.
- **Array-as-JSON**: Position and identity are multi-select arrays stored as JSON strings with lazy migration (legacy single-string values parsed gracefully on read).
- **Partial unique indexes**: Scouting reports use `WHERE status IN ('pending','ready')` to prevent duplicate active reports while allowing failed retries.
- **Token versioning**: `token_version` column on users table enables instant revocation of all sessions on password change or security events.

---

## Current Monetization

**None.** There is no payment integration, subscription logic, paywall, or pricing tier anywhere in the codebase. Every feature is available to every user. The AI features have per-user daily quotas (soft rate limits) but no paid upgrade path.

The quota structure suggests a natural freemium split:

| Feature | Current Quota | Potential Free Tier | Potential Paid Tier |
|---------|--------------|--------------------|--------------------|
| Video uploads | 10/day | 2/day | Unlimited |
| Video analyses | 20/day | 3/day | Unlimited |
| AI chat | 50/day | 10/day | Unlimited |
| Scouting reports | 3/day | 1/week | Unlimited |
| Game plans | 10/day | 2/day | Unlimited |

---

## What's Built vs. Stubbed/Incomplete

### Fully Built & Functional
- Complete session logging flow with shooting/passing/fitness/reflection
- 76-drill library with search, filters, and full detail
- 4 structured training programs with enrollment and tracking
- JWT + Google OAuth authentication with token revocation
- Coach roster management with invite codes
- Coach plan assignment with compliance tracking
- Squad Pulse dashboard (batch-optimized queries)
- Parent dashboard with privacy controls
- IDP goal tracking (4 corners)
- Video upload pipeline (FFmpeg.wasm compression + Tus resumable)
- Gemini video analysis with auto-fill
- Gemini AI chat ("Ask Composed")
- Manus opponent scouting integration
- Game plan generator (rules + AI)
- Pace metric with position-specific weights
- Identity system with multi-select and narrative
- XP/levels/badges gamification
- Social feed + friend connections + messaging
- PWA with offline caching
- Data export/import/clear
- Training calendar
- Personal records + benchmark tests
- Session templates

### Partially Built / Could Be Deeper
- **Benchmark Tests**: Only 2 test types (LSPT, LSST). No percentile ranking against peers. No auto-detected benchmarks from session data.
- **Decision Journal**: Schema exists, routes exist, but no prominent UI entry point on the main Dashboard — buried and unlikely to get used.
- **Drill Diagrams**: SVG system exists (DrillDiagram.jsx is 1000+ lines) but not all 76 drills have visual diagrams.
- **Offline Queue**: IndexedDB and service worker are configured, but there's no visible "you're offline, we'll sync when you're back" UI or explicit offline-mode indicator beyond a small `<OfflineIndicator />` component.
- **Friend Activity Feed**: Functional but thin — shows session completions only. No "reactions" or rich social interactions.
- **Session Comments**: Exist in the API but not prominently surfaced in the session detail UI.

### Not Built (Opportunities)
- **Email sending**: No transactional email integration. No password reset, no email verification for password users, no weekly recap emails, no coach/parent invite emails.
- **Push notifications**: No web push or notification system. Players aren't reminded to train.
- **Team/club entity**: Coaches manage individual rosters, but there's no "team" concept. A coach can't create "FC Barcelona U16" as an entity with team-level stats.
- **Match integration**: Matches are logged but disconnected from sessions — no "pre-match prep → match → post-match review" flow.
- **Leaderboards**: Despite having XP/levels and friend connections, there are no competitive leaderboards.
- **Stripe/payments**: No monetization infrastructure.
- **Admin dashboard**: No internal tools for monitoring users, costs, or abuse.
- **Analytics/telemetry**: No usage tracking, funnel analysis, or product analytics.

---

## Distinctive / Unusual Implementation Details

1. **Client-side video compression**: FFmpeg.wasm runs entirely in the browser, encoding uploaded video to H.264 at 720p before uploading. This is unusual — most apps upload raw video and compress server-side. The benefit: 10x smaller uploads on cellular connections, no server CPU cost. The tradeoff: ~30–60s encoding time on mobile, and FFmpeg.wasm is a 25MB WASM binary that loads on first use.

2. **Position-weighted everything**: The app doesn't treat all players the same. A Striker's Training Score weights shooting at 40%; a CDM's weights passing at 35%. Pace, daily plan drill selection, and identity-aware tips all respect this. This is the single most product-differentiating implementation detail — generic fitness trackers don't do this.

3. **Identity-driven narrative**: Every metric surface (Dashboard header, Pace tab hero, weekly card, daily plan tips) changes its copy based on the player's chosen identity. "Your Scorer's Pace is ACCELERATING" vs "Your Engine's Pace is STEADY." The identity also boosts specific drill categories in the daily plan generator, so a Scorer gets more shooting drills and a Playmaker gets more passing.

4. **Seeded PRNG for warmup drills**: The game plan generator uses a Mulberry32 seeded random number generator (seeded with FNV-1a hash of club name + report ID) so the same scouting report always produces the same warmup drill selection. This prevents the "refresh and get different drills" problem that would undermine coach trust.

5. **Rules-based game plan with AI fallback**: The game plan generator first tries a deterministic rules engine (9 style flags parsed from the scouting report markdown), and only falls back to Gemini when the rules engine can't generate enough tactical advice. This makes game plans faster, cheaper, and more predictable than pure AI generation.

6. **Adaptive polling with Page Visibility API**: Coach chat uses recursive `setTimeout` with exponential backoff (10s → 60s) that pauses entirely when the browser tab is hidden. Saves ~17,000 wasted requests/day per idle user compared to the naive fixed-interval approach.

7. **Multi-role in one codebase**: Players, coaches, and parents all share the same React app with conditional tab bars. The coach sees Roster/Assign/Overview; the player sees Home/Pace/Plan/Scout/Drills/Community; the parent sees a read-only dashboard. Role switching is available in Settings.

8. **Privacy-controlled parent access**: The player — not the parent or coach — controls what their parent can see via 3 boolean toggles (ratings, coach feedback, IDP goals). This is a thoughtful product decision for a youth app where autonomy matters.

9. **Pending Google token pattern**: Google sign-in uses a 2-minute pending JWT with a distinct `typ: 'google_pending'` claim. The user row isn't created until onboarding finishes, so abandoned signups leave no trace. Three layers of defense prevent the pending token from being used as an access token (authMiddleware, extractAuth, dev fallback all check the `typ` claim).

10. **No external CSS framework runtime**: Tailwind v4 compiles to pure CSS at build time. The entire app ships as a single 47KB CSS file. No Bootstrap, no Material UI, no component library — every UI element is hand-built with utility classes.

---

*This document was generated by auditing the full codebase: 26 database tables, 119 API endpoints, 50+ React components, 76 drills, 4 programs, 15 badges, 25 migrations, and ~15,000 lines of application logic across server and client.*
