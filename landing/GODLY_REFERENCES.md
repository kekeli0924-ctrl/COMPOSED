# Godly.website references — editorial/dark DNA for Composed

Research brief: find 3 sites on godly.website that share aesthetic DNA with `truestaging.co.uk` but sit in different industries, so Composed doesn't end up cloning one lane.

> **Update (2026-04-20)**: The original brief excluded sites with loaded video backgrounds (single-file constraint). That constraint has since been lifted — Composed is planning to generate a hero video via Kling. **Reference 4 (Atlas Card)** has been added to cover that technique specifically.

## Anchor: truestaging.co.uk — inspected

Before the three picks, the anchor reference, inspected from the shipped CSS/JS.

- **Hero copy**: "Discover what's possible."
- **Font-family (display)**: `Roslindale` — commercial (David Jonathan Ross). Loaded as `Roslindale-DisplayCondensedLight.woff2`. Stack falls back to `Georgia, Cambria, "Times New Roman", Times, serif`.
  - **System-safe / free alternative for Composed**: `Instrument Serif` (Google Fonts; condensed editorial serif, Regular 400 + Italic, free SIL OFL) — or Fraunces Soft-Condensed axis if variable is acceptable. Final fallback: `ui-serif, Georgia, serif`.
- **Font-weight**: 300 (Light).
- **Font-size**: clamp-like pattern — 4rem (64px) base → 7.5rem (120px) at ≥sm → 11.25rem (180px) at ≥lg.
- **Letter-spacing**: −0.02em (slight negative tracking — keeps the very-large light-weight serif from feeling loose at 180px).
- **Line-height**: 1.125 at mobile, 1 at ≥sm (essentially locked to the glyph box on desktop).
- **Color**: `#F5EFEB` (cream/bone) on a dark atmospheric backdrop.
- **Load animation (via GSAP-ish custom DSL in theme.js)**:
  - The headline span is **split into characters**. Each char is individually **masked, translated up from `y: 5rem`, and scale-in**, staggered per glyph. Trigger at t=0.
  - Followed by subtitle (split text, `rotate: 15deg` per word) at t=0.6, copy title (`rotate: 5deg`) at t=0.6, body copy (`rotate: 10deg`, stagger 0.15s) at t=0.7, and a small mono footer (`yPercent: 600` rising, expo.out ease, stagger 0.3s) at t=0.8.
  - Net effect: the headline reads first (per-character rise + scale), then the surrounding editorial copy lifts in at slight rotations. Total intro sequence ≈ 1.2s.
- **Secondary type**: `Alliance` grotesque (paid) — used at ~24px (t-24 / t-32@lg) for the subtitle, and tiny all-caps (~10–14px) for the mono-ish small copy. Free substitute: Inter (variable) or Manrope.

Everything below is read against this anchor.

---

## Reference 1 — KidSuper World
- URL: https://www.kidsuper.world/
- Category: brand (fashion / creative studio)
- One-sentence feel: Everything is uppercase monospace on near-black, so the page reads like a zine printed on a newsroom dot-matrix — confident, anti-corporate, all signal.

### What I'd steal (principles, not assets)
- **Systemic case + type choice as the identity.** The whole document sets `text-transform: uppercase` + monospace at the `<html>` level. That one rule does more brand work than any logo lockup. Composed could pick a narrow signature — e.g. every kicker and data label in a single monospace — and let the discipline become recognisable.
- **One type family, two weights, done.** No serif/sans pairing; no third display family. The restraint is the statement. Our current page has serif italic + sans + mono in three registers, which works but spends more attention than it earns.
- **Hero that opens on near-invisible copy.** The hero headline is authored with `opacity: 0; visibility: hidden` and gets lifted in via a small JS hook — nothing else on the page runs before the headline lands. A clean "nothing else exists until this sentence is spoken" beat.
- **Text that sits at viewport-relative sizes** (`font-size: max(14px, 0.729vw)`). The type breathes with the container instead of switching at breakpoints. Our current `clamp()` ranges are fine, but the continuous scale reads more intentional on large monitors.

### Hero treatment
- Type treatment: Monospace, semi-bold + bold weights, uppercased at the root. Sizes run modest (~14px to ~60px for the tallest stacks) because the monospace density does the work — they don't need 180px.
- Animation on load: Headline + secondary copy start `opacity: 0; visibility: hidden`. The site's entry script flips visibility then tweens opacity/translate — it's more of a curtain-lift than a splittext show. No per-character rotation.
- Color palette: Background sits around `#040404` (near-pure black); text in an off-white (`~#f1ede6`/`~#e8e3dc` feel). No saturated accent — colour comes from imagery and the occasional pill.
- Background texture: None. Flat near-black. The visual texture is the monospace grid itself.

### Signature moment
- The whole site as signature: every glyph is the same width. Lists, headlines, labels, prices — all share one grid. Scrolling feels like advancing through a ledger.

### What I'd leave behind
- **Full uppercase everywhere** would collide with Composed's narrative paragraphs (a youth player's lede, a coach's quote, a parent's reassurance). Case matters for warmth.
- **Single-weight monospace as the only font** would sacrifice the intimate serif-italic beats we already use for emotional lines ("Pace isn't a score. It's *velocity.*").
- **Flat black with no warm undertone** — Composed's palette sits on a slightly warm `#050505`/`#0a0806` and that warmth is doing real work for the sport/field mood. KidSuper's coolness reads like a gallery, not a training companion.

---

## Reference 2 — Umbrel
- URL: https://umbrel.com/
- Category: product (consumer tech / home-server OS hardware)
- One-sentence feel: A product page that photographs its hardware like an object of desire but lets the typography carry the brand — confident grotesque display, dark matte surface, long vertical chapter structure.

### What I'd steal (principles, not assets)
- **Chapter-by-chapter layout with deliberate breathing room.** Umbrel builds the page as a stack of tall "one-idea-per-screen" sections. No section has to compete with the next — scrolling feels like turning pages. Composed's current scrollytelling (Pace Rotation, Video) is dense and sticky; an Umbrel-style calm section between them would give the reader somewhere to rest.
- **Display-grotesque at 40–60px as the upper bound, not 180px.** Umbrel doesn't try to shout. A `font-weight: 600` grotesque with `letter-spacing: −0.02em` at 43–60px reads editorial enough for a product page without demanding the Apple-cinematic treatment. This is a healthier upper bound for a web-first soccer product than truestaging's 180px fashion-house scale.
- **System colour as a lighting decision.** Every section carries its own flat dark tone — the surface isn't one black, it's three or four near-blacks with just enough hue shift that the reader feels the lighting change. That's a dark-mode palette done like a photographer's light kit, not like a Tailwind theme.
- **Pair a hero-product visual with short, declarative body copy.** Umbrel trusts two-sentence paragraphs next to the hero visual. Composed currently leans on three- and four-sentence paragraphs per chapter, and Umbrel's discipline is worth stealing: cut to one thought per paragraph.

### Hero treatment
- Type treatment: `Inter Display` (a free variant of Inter, SIL OFL — exactly our proposed free alternative). Weight 600 (semi-bold). Letter-spacing −0.02em. Line-height 130% for supporting copy, tighter on headlines. Hero marks sit ~40–60px.
  - **Free alternative for us**: Inter itself (already free) or `DM Sans` / `General Sans` (Fontshare, free).
- Animation on load: Framer's stock entry — elements fade in and lift by ~8–16px as they enter the viewport. No character-splitting. No rotation. Simple, restrained. The animation says "this is settled," not "look what I can do."
- Color palette: Near-black base (`~#000`), section surfaces in the `#0b0b0e` → `#131317` range, near-white text (`rgb(255,255,255)` and `rgb(211,211,211)` for secondary). No accent — the hardware photography brings warmth.
- Background texture: None in HTML/CSS (no grain overlay); any apparent texture is in the product photography itself.

### Signature moment
- The repeated "dark chapter → hardware object → dark chapter" rhythm. The product photography is composed like an editorial still life (lit object on near-black), and the type restraint lets it breathe. That restraint *is* the signature — there's no one moment that jumps out, which is deliberate.

### What I'd leave behind
- **Hero dominated by a hardware photograph.** Composed doesn't have a physical object to show. Translating this directly would mean showing app screens, which we've already committed to avoiding as the main hook.
- **Pure functional grotesque with no serif beats.** Umbrel has no emotional italic moment anywhere. Composed's strongest line ("Pace isn't a score. It's *velocity.*") depends on exactly the switch Umbrel refuses.
- **Flat entry animation.** The fade-and-lift is too quiet for a first-time visitor landing on a pre-launch pilot invite. We need the headline to *arrive* — closer to the truestaging character-rise treatment.

---

## Reference 3 — Tatem
- URL: https://tatem.com/
- Category: product (software / email client)
- One-sentence feel: A dark-mode product site that treats the hero as a landscape painting — a wide soft blue-grey atmospheric gradient sits behind compact, precise type, and the product UI surfaces as an inset frame rather than a screenshot dump.

### What I'd steal (principles, not assets)
- **Hero as atmospheric landscape, not a product shot.** The hero uses a custom `--hero: linear-gradient(180deg, #5a7694 → #abb7b5)` — a painterly fog that functions as the sky. The product mockup arrives underneath, inside that atmosphere, rather than as a pasted JPEG on flat black. Composed could treat the Pace Payoff ivory moment similarly: an atmosphere first, then the artifact.
- **White at multiple transparencies as the entire text scale.** Tatem's text tokens are `#fffffff2` (95%) → `#ffffffb3` (70%) → `#ffffff8c` (55%) → `#ffffff59` (35%). One hue, five steps of air. No grey. That's a much cleaner hierarchy tool than the mute-and-soft greys we currently juggle, and it reads more editorial.
- **A full animation vocabulary that you can't see on first look.** Tatem ships named keyframes (`contact-up`, `contact-down`, `submit-btn-shrink`, `success-message`, `editing`, `float`) — each tied to a specific interactive beat, each with a deliberate ease (`cubic-bezier(.645,.045,.355,1)` — ease-in-out-cubic). They're almost all off-screen until the user acts. That's a discipline: animation per *event*, not animation per *page*.
- **Titles that stay under 40px.** `--text-title-large: 2.5rem; --text-title: 1.875rem`. The confidence is in the precision, not the scale. For a product page read on a phone, this sizing holds up better than a 180px display that has to wrap at 16:9.

### Hero treatment
- Type treatment: `Inter` variable (SIL OFL, free). Weight 450 (between Regular and Medium) — a quiet detail that sits between the usual 400/500 steps. Title sizes run 1.25rem / 1.875rem / 2.5rem (20/30/40px). Letter-spacing: `-0.12px` on body, slightly negative on titles.
- Animation on load: `fade-in 0.7s` on the hero container using `ease-in-out-cubic`. No split-text. No rotation. A calm entrance. The motion budget is reserved for interactive moments (submit button shrink/grow, success message, contact form slide).
- Color palette: Surface `#0a0a0a` (near-black). Hero gradient 180° from `#5a7694` → `#758da5` → `#7e96a8` → `#9cadb3` → `#abb7b5` — a slate-blue-to-bone fog. Text: white at 95%/70%/55%/35%.
- Background texture: None declared. The atmosphere is the gradient itself; no grain/noise overlay.

### Signature moment
- The hero gradient reads as a real painted sky. When you scroll, the UI inset appears to rise *out* of the fog (rather than the fog fading out), because the section is `sticky top-0 h-screen` with the gradient fixed behind. That "object emerging from atmosphere" is exactly the kind of editorial moment that would transfer cleanly to Composed's Pace Payoff chapter.

### What I'd leave behind
- **A cool-toned blue-grey sky.** Tatem's gradient is corporate-calm; Composed's palette has explicitly warm undertones (`#0a0806`, brass accent, stone accent in the payoff). We'd paint the atmosphere in the warm family instead — think late-afternoon field light, not morning boardroom fog.
- **Animation reserved almost entirely for interaction.** Composed's story is denser than an email client's — we need the scroll-linked Pace rotation and the video analysis board. Tatem's "animate only on click" discipline is too austere for a narrative product page.
- **Absent serif beat.** Tatem never switches to italic or serif. Composed keeps the serif italic as its emotional voice; that can stay.

---

## Reference 4 — Atlas Card
- URL: https://www.atlascard.com/
- Category: product (fintech / invite-only charge card, luxury-experiential)
- One-sentence feel: A near-black hero with a slow, atmospheric product/lifestyle video behind a single light-grotesque headline — the video never sells anything directly, it just sets a mood and the type cuts through it.

### What I'd steal (principles, not assets)
- **Video as atmosphere, not demo.** The Atlas hero video isn't a product walkthrough — it's a moodboard of lit restaurants, dusk hotels, half-glimpsed napkin-folded tables. It's about *what kind of life this card lives in*, shot in slow pans and close crops. For Composed, this is the right brief for the Kling-generated clip: not a demo of the app, but the life of a youth player training alone — backyard at blue hour, ball against a brick wall, foot on ball mid-thought, breath visible in cold air.
- **Headline sits on top of the video, not inside it.** The hero type is full-screen light grotesque at 97–117px, positioned absolutely over the video, starting at `opacity: 0` and easing in with `translateY(50px) → 0` over 0.75s using a custom ease with a slight overshoot (`cubic-bezier(.28, 1.1, .74, 1)`). The type never loses priority to the footage. That's what keeps it editorial instead of cinematic-ad.
- **Headline has its own subtle fade on the text fill** — `background: linear-gradient(173deg, #fff -55%, transparent 231%); -webkit-background-clip: text`. The letters themselves softly fade from solid near-white at the top to slightly transparent at the bottom, so they read as "lit from above" rather than as a flat paint-fill. Tiny detail; big atmosphere.
- **Declare a full easing vocabulary, use it consistently.** Atlas's CSS declares `--ease-in-quad` through `--ease-in-out-expo` as named tokens (16 in total). Every transition picks from that shelf. Composed currently uses ad-hoc cubic-beziers — moving to a named ease palette would make the motion feel authored rather than invented per-element.
- **Pair the atmospheric hero with a structured, tightly-typeset scroll body below.** After the cinematic opener, Atlas shifts into a conventional editorial grid (feature sections, small-caps labels, product screens in autoplay video loops). The hero burns the budget; the rest of the page is quiet.

### Hero treatment
- Type treatment: `Sequel Sans Display Book` (commercial, humanist grotesque, weight 400). Hero sits at `clamp(61px, 7vw + ~27px, 97px)` up through `clamp(97px, 4.2vw + ~37px, 117px)` at desktop breakpoints. Line-height 100–103%. No letter-spacing override (neutral tracking).
  - **Free alternative for us**: `DM Sans` (variable, Google Fonts, SIL OFL) — closest humanist-grotesque feel; or `General Sans` / `Satoshi` on Fontshare (free). Final fallback stack: `system-ui, -apple-system, "Segoe UI", sans-serif`.
- Animation on load: headline has `.transition--fade-up` — starts `opacity: 0; transform: translateY(50px)`; on `.enter` class resolves to `opacity: 1; transform: translateY(0)` over **0.75s**. Transform uses `cubic-bezier(.28, 1.1, .74, 1)` (a gentle overshoot — the headline arrives and settles). Opacity uses `cubic-bezier(.59, .41, .68, .49)`.
- Color palette: body background `--body-background: var(--color-black)` (true black). Body text `#f8f8f8` (near-white). The hero video sits full-bleed behind, and a subtle radial/gradient vignette around the edges keeps the text-legibility layer over the footage. Headline uses a 173° gradient-to-transparent fill.
- Background texture: **the video itself is the texture**. Additionally the headline has a text-gradient mask (light at top, fading). No grain/noise overlay on top of the video in the CSS I inspected — the video's own film grain (if any) is baked into the source.

### Signature moment
- The hero video's opening 3–4 seconds: a slow, warm, almost still frame that resolves into gentle motion (a door opening, a candle's flicker, a car pulling up in rain) while the headline fades up and settles with a tiny overshoot. It's the kind of beat a good film trailer uses — "you're about to watch something," spoken without any text doing the telling.

### Kling-prompt guidance for Composed (strategic notes for generating our own hero video)
Since Composed is planning to generate a video via Kling, here's what to aim the prompt at so the result reads in the same editorial register as Atlas (not the Silicon Valley product-demo register).

- **Subject**: a single youth player training alone — not a team, not a match, not a coach. One of these micro-scenes: **(a)** a teenager juggling a ball in a backyard at dusk, shot from 6m away in slow-motion, or **(b)** a close-up on a worn leather cleat striking a ball against a brick wall, repeated, with ball-bounce sound implied by the rhythm, or **(c)** a wide shot of an empty 5-a-side cage at night, one silhouette running lines.
- **Lighting and palette**: golden-hour blue-hour transition, warm-tinted shadows, stone-cream highlights. Avoid daylight-blue stadium lighting. Match the `#0a0806` warm-dark Composed already uses.
- **Pace**: slow. Aim for ~8–15 second loop, seamless. No quick cuts. One camera move (slow pan, slow push, static with internal motion). If Kling allows frame-rate direction, aim for 24fps with subtle motion blur — 60fps reads like sports broadcast, which we don't want.
- **Lens feel**: shallow depth of field, soft-focus background, grain pass on the master output. 50–85mm equivalent. Avoid wide-angle drama.
- **What NOT to show**: branded apparel, club logos, a phone or screen, an app UI. The video is about the private hours, not the product.
- **Overlay brief for the video file itself**: render clean — no burned-in type, no lower-thirds, no watermark. All text (`Stop Guessing. / Start Proving.`) sits on top as live HTML, not baked into the mp4, so the intro animation can fade the headline up over the video independently.
- **Technical deliverable for the single-file-ish constraint**: two encodings side by side — `HeroVideo.mp4` (H.264, ~8–12s, 1080p desktop, <3MB target) and `HeroVideo-mobile.mp4` (720×1280 portrait, <1.5MB). `muted playsinline disableRemotePlayback` attributes and lazy-load (`data-src`) so the page doesn't block on it. Use a low-fi `poster` image (`HeroImage.webp`) so the hero reads before the video boots.

### What I'd leave behind
- **Luxury-signalling aesthetic.** Atlas's video leans on gold-light restaurants and hotel lobbies — the signifiers of private club access. Composed's audience is a 14-year-old who wants to get better at finishing with their weak foot. If we copy the lighting kit, we have to strip out the luxury objects entirely. Our "life around the product" is a wall, a ball, a park, a breath.
- **Headline that gives away nothing.** Atlas's hero copy is "Your key to the world's most exclusive experiences" — pure aspiration, zero information. Composed's hero has already earned "Stop Guessing. / *Start Proving.*" — a sharper promise. Keep ours; don't mistake Atlas's vagueness for restraint.
- **Full-bleed video that blocks interaction.** Atlas fills the entire viewport with video on first load. For a pre-launch pilot page that needs the reader to reach the "8 teams" invite within 10 seconds, we'd want the video as a fixed layer *behind* a slightly shortened hero (maybe 80vh), with a visible "continue scrolling" hint. Don't let the video hold the page hostage.

---

## Synthesis

Across the four references, the shared principles are:

1. **One type family, held with discipline** — KidSuper's all-mono, Umbrel's single grotesque, Tatem's single Inter-variable. The brand signature is in *what they refuse to add*, not in what they stack. For Composed that means picking one secondary typeface (either mono or grotesque) and using it everywhere, instead of drifting between several.
2. **Dark-mode as a lighting setup, not a single token** — All three ship 3–5 near-black surfaces (`#040404`, `#0a0a0a`, `#0b0b0e`) that differ by 2–3% luminance and slight hue shifts. The page has a "mood lit with two lamps" feel, not a flat `--bg: black`. Composed already does this in v3 (`--bg`, `--bg-elevated`, `--bg-warm`, `--bg-cool`, `--bg-deep`) — the principle is to keep using it and push the hue shifts harder.
3. **Animation budget goes to the hero headline, or to interaction — not to every section** — truestaging burns its whole motion budget on the character-rise intro. KidSuper does a single curtain lift. Umbrel and Tatem spend almost none on reveals, and save everything for interaction states. Composed currently spends animation at every section (reveal, eyebrow, scrollytelling, payoff) — that's a lot. If we want the editorial documentary feel, the fix is to spend it all at the top (character-splitting the hero h1) and let the rest of the page load without theatrics.
4. **When video enters, it carries atmosphere — never instruction** — Atlas treats video as "the world the product lives in," not as a demo. The hero video shows unbranded objects and half-glimpsed scenes, set in a lighting register the type cuts cleanly through. For Composed's Kling-generated hero, the directive is the same: render the private hours of a youth player alone, not a tour of the app. The video is the atmosphere; the headline ("Stop Guessing. / *Start Proving.*") is the instruction, and it sits on top as live HTML.

Sources examined: `truestaging.co.uk`, `kidsuper.world`, `umbrel.com`, `tatem.com`, `atlascard.com`. Sites ruled out for failing the brief: `superpower.com`, `phantom.app`, `reflect.app`, `cosmos.so`, `authkit.com`, `andagain.uk` (hero-video — would have qualified under the revised constraint; re-examine if more video references are wanted); `samara.com`, `family.co`, `opalcamera.com`, `visitors.now` (light-primary); `unveil.fr`, `savoirfaire.nyc` (WebGL); `limitless.ai` (placeholder "acquired by Meta" page); `bpco.kr`, `vercel.com/ship` (agency / event with grid-primary layout, not editorial display).
