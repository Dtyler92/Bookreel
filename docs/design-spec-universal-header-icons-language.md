# BookReel Design Spec
## Universal Header · Icon System · Cinematic Language
**Author:** Penny (Lead Designer) · **Date:** June 2026 · **Status:** Ready for Implementation

---

## Brand Foundation (Quick Reference)

| Token | Value | Usage |
|---|---|---|
| `--color-paper` | `#FDFCF9` | Page background |
| `--color-paper-warm` | `#FAF8F5` | Card / panel backgrounds |
| `--color-ink` | `#0D0D0B` | Primary text, logo |
| `--color-ink-secondary` | `#2B2B2B` | Body text |
| `--color-muted` | `#8A8278` | Labels, placeholders |
| `--color-muted-light` | `#9C9286` | Disabled states |
| `--color-border` | `#E8E2D5` | Hairline dividers |
| `--color-fill-light` | `#EDE9E0` | Pill backgrounds, chips |
| `--color-red` | `#C8402F` | Primary accent, CTA |
| `--color-red-hover` | `#A8351F` | Red hover state |
| `--font-display` | Playfair Display | All headings, logo wordmark |
| `--font-body` | Inter | All body text, UI labels, nav links |

---

## 1. Universal Header — Full Specification

### Overview

The header is a **sticky, full-width navigation bar** that sits fixed at the top of every page (z-index: 50). It is `64px` tall on desktop, `56px` on mobile. It uses a **warm translucent blur** treatment — not a flat opaque bar — so it floats cinematically above page content as the user scrolls.

### Visual Character

The header should feel like the masthead of a premium literary journal: refined, unhurried, confident. It does NOT shout. Every element earns its place. There are no rounded buttons, no gradients, no drop shadows heavier than a whisper.

---

### Background & Border

- **Background:** `rgba(253, 252, 249, 0.92)` — the paper color at 92% opacity
- **Backdrop filter:** `blur(12px) saturate(160%)` — frosted glass effect, warm-toned
- **Border bottom:** `1px solid rgba(232, 226, 213, 0.7)` — the `--color-border` at 70% opacity, so it reads as a delicate ruled line rather than a hard wall
- **Box shadow:** none. The blur + border does the work. A drop shadow here would feel wrong — too web-2010.

---

### Layout (Desktop — 1024px+)

Three zones in a single horizontal row, `max-width: 1400px`, centered, `padding: 0 40px`:

```
[ LOGO ]          [ NAV LINKS ]          [ CREDIT CHIP  ·  PROFILE ]
Left-aligned      Center-aligned         Right-aligned, gap: 20px
```

#### Zone 1 — Logo (Left)

The **BookReel wordmark** rendered in Playfair Display, `font-size: 22px`, `font-weight: 700`, `letter-spacing: -0.02em`, `color: #0D0D0B`.

The word "Book" is set in normal weight; "Reel" uses a **BookReel red `#C8402F`** — achieved by wrapping `<span>` around "Reel" with `color: #C8402F`. No icon or clapperboard glyph. The typographic contrast between the two halves IS the logo.

To the immediate left of the wordmark: a **film-frame mark** — a custom 18×20px SVG that evokes a single frame of 35mm film. It is `#0D0D0B` with two small `#C8402F` perforation-hole rectangles (2×4px each, one top, one bottom). This sits `6px` to the left of "BookReel" text, vertically centered.

**Logo container:** `<a href="/">`, `display: flex`, `align-items: center`, `gap: 6px`, `text-decoration: none`. No hover color change — only a very subtle `opacity: 0.85` on hover.

---

#### Zone 2 — Navigation Links (Center)

Centered between logo and right cluster. On smaller desktops (1024–1200px), this cluster shifts toward the right and the center gap compresses.

**Link style:**
- Font: Inter, `font-size: 14px`, `font-weight: 500`, `letter-spacing: 0.01em`
- Color: `#8A8278` (muted) at rest
- Hover: `color: #0D0D0B` + a `2px` underline that slides in from the left, `color: #C8402F`, `transition: 200ms ease`
- Active page: `color: #0D0D0B`, `font-weight: 600`, underline persistent

**Link order (left to right):**
1. Browse
2. Pricing
3. Audiobooks *(show only when user has a book with audiobook, or always if marketing wants)*
4. Dashboard *(only when authenticated)*

**Gap between links:** `32px`. Do NOT use `|` separators — the spacing IS the separator.

---

#### Zone 3 — Right Cluster

Two items, displayed as a flex row with `gap: 16px`, `align-items: center`.

---

##### 3a — Credit Balance Chip

This is the premium element. It must never look like a discount badge or a browser tab counter. It reads as a **private member's balance** — the kind you'd see in a fine hotel or private club app.

**Shape & Size:**
- A pill shape: `border-radius: 100px`
- Width: auto (fits content), `min-width: 80px`
- Height: `36px`
- Padding: `0 14px 0 10px`

**Surface:**
- Background: `#EDE9E0` (the warm fill-light color) at rest
- Border: `1px solid #D9D2C5` — slightly darker than the fill, gives a pressed-coin quality
- On hover: background shifts to `#E5DDD2`, border to `#C8402F` at `40% opacity`

**Content (left to right inside pill):**
- The **coin icon** (see Icon System, section 2): `16px` × `16px`, `color: #C8402F`
- A `6px` gap
- The credit balance number: Inter, `font-size: 14px`, `font-weight: 600`, `color: #0D0D0B`
- A `4px` gap  
- The word "credits" — **omit this label entirely**. The icon tells the story. Less is more.

**Hover state:** The entire pill gets a `cursor: pointer`. A very subtle `transform: translateY(-1px)` with `box-shadow: 0 2px 8px rgba(200, 64, 47, 0.12)` — a crimson ghost shadow, barely perceptible, gives the chip a sense of lift. `transition: all 180ms ease`.

**Click behavior:** Links to `/dashboard/credits`. This page shows the full credit history and buy options.

**Zero-state:** When the user has 0 credits, the number renders in `#C8402F` (red, not alarming — merely a gentle signal), and the pill gets a `border-color: rgba(200, 64, 47, 0.35)`.

**Loading state:** While credits are fetching, replace the number with a `28px × 10px` animated shimmer rectangle — `background: linear-gradient(90deg, #EDE9E0 25%, #F5EFE6 50%, #EDE9E0 75%)`, `background-size: 200% 100%`, `animation: shimmer 1.4s infinite`.

---

##### 3b — Profile / Account Icon

This is the element that will define BookReel's editorial character. No silhouette. No generic avatar circle. This is the **Embossed Initial Seal**.

**Concept:** A `36px × 36px` circle that evokes a **wax seal or embossed letterpress initial** — the kind found on fine stationery or a publisher's colophon. It should read as "this belongs to a person with literary taste."

**Construction:**

1. **Outer circle:**
   - Diameter: `36px`
   - Background: `#0D0D0B` (deep charcoal ink — the reverse of the page)
   - Border: `1.5px solid #3A3835` — a slightly lighter charcoal ring, so the circle has depth and doesn't bleed into surrounding darkness
   - `border-radius: 50%`

2. **Inner texture:**
   - Inside the circle, a very faint radial texture is simulated with a CSS `radial-gradient`: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.07) 0%, transparent 60%)` — a subtle specular highlight, like light catching an embossed surface. This is the detail that separates "premium" from "generic avatar."

3. **The Initial:**
   - The user's first initial, centered inside the circle
   - Font: Playfair Display, `font-size: 16px`, `font-weight: 700`, `color: #FDFCF9` (paper white — the reverse treatment)
   - The initial should feel **set into the surface**, not floating on top of it. Achieve this with: `text-shadow: 0 1px 2px rgba(0,0,0,0.4)` (depth below) and `letter-spacing: 0.02em`

4. **The Seal Ring:**
   - A second concentric ring *inside* the circle — `2px` from the outer edge, `1px` wide, `rgba(253, 252, 249, 0.15)` — barely visible, like the edge of a wax impression. This ring appears only on hover.

5. **Hover state:**
   - The outer border shifts from `#3A3835` to `#C8402F` — the BookReel red ring appears, making it feel like the seal has been freshly pressed.
   - `transition: border-color 200ms ease`
   - A dropdown menu appears below (see Dropdown spec)

**Fallback (no user / unauthenticated):**
- Replace the initial with the **quill icon** (see Icon System) at `16px`, `color: #FDFCF9`, centered. This signals "sign in to write" without being a generic person-silhouette.

**Dropdown Menu (on click or hover after 300ms delay):**
- Appears `8px` below the icon, right-aligned
- `min-width: 180px`
- Background: `#FDFCF9`
- Border: `1px solid #E8E2D5`
- Border-radius: `8px`
- Box-shadow: `0 4px 20px rgba(13, 13, 11, 0.10)` — a warm charcoal shadow, not cold blue-grey
- Items: Dashboard · My Books · Credits · Settings · Sign Out
- Item style: Inter `14px`, `color: #2B2B2B`, `padding: 10px 16px`, hover: `background: #F5F0E8`
- A `1px solid #EDE9E0` hairline divides "Settings" from "Sign Out"
- "Sign Out" text color: `#8A8278` (muted — it's a destructive departure, handle it quietly)

---

### Layout (Mobile — up to 768px)

The header compresses to `56px` height. Two zones:

```
[ LOGO ]          [ CREDIT CHIP  ·  PROFILE  ·  HAMBURGER ]
Left-aligned       Right-aligned, gap: 12px
```

The center nav links are hidden. They live inside the hamburger drawer.

**Mobile Credit Chip:** Shrinks slightly — `height: 32px`, `padding: 0 10px 0 8px`. The coin icon stays; the number stays. Still fully legible.

**Mobile Profile Icon:** Same `36px` embossed initial — no change needed.

**Hamburger Icon:** Three horizontal rules, `20px × 14px` total, `2px` stroke, `#0D0D0B`. On open: morphs to an ✕ (CSS transform animation, `300ms ease`). No libraries needed.

**Drawer:**
- Slides in from the right, `280px` wide, full viewport height
- Background: `#FDFCF9`
- Border-left: `1px solid #E8E2D5`
- Contains: nav links (stacked, `18px` Playfair Display), then a divider, then account links (Inter `14px`)
- Backdrop: `rgba(13, 13, 11, 0.4)` overlay on the left
- Close on backdrop tap or ✕

---

### Header States

| State | Treatment |
|---|---|
| Scrolled 0px (top of page) | Background `rgba(253,252,249,0.0)` → fully transparent. Border invisible. Blur still active (prevents flash on load). |
| Scrolled 1–20px | Background transitions from transparent to `0.92` opacity. `transition: background 300ms ease`. |
| Scrolled 20px+ | Full `0.92` opacity, border visible. Stays there. |

This "hero fade-in" behavior makes the header feel alive rather than stamped onto every page identically.

---

## 2. Icon System

### Philosophy

BookReel's icons sit in the tension between a **print publication** and a **film production house**. They should feel like they were drawn by a book designer who moonlights as a cinematographer — confident, deliberate, slightly literary. They are NOT startup SaaS icons (no rounded speech bubbles, no Material-style filled blobs, no flat minimalism that could belong to any app).

---

### Core Principles

**Stroke weight:** `1.5px` at `24px` size. At `16px` (small contexts like chips and nav), scale strokes DOWN to `1.25px` — never let icons go chunky at small sizes. The stroke weight is the single most important brand decision in an icon set. `1.5px` reads as "considered and precise" — thinner than a generic UI kit, heavier than a fashion-brand icon, exactly where a literary brand lives.

**Style:** Primarily **outlined** with **selective fills**. The rule: outlines carry information; fills carry emphasis. Filled icons are used ONLY for active/selected states and the coin/credit icon (which should always feel solid — money is tangible). No mixed stroke/fill within a single icon except for the coin.

**Terminations:** Square ends on straight strokes, round joins at corners. NOT rounded endpoints (those read as "casual and friendly" — wrong brand). NOT butt caps (those read as "developer placeholder"). Square ends have a deliberate, typeset quality that echoes the fonts.

**Corner radius:** `1.5px` on internal corners only. Outer shapes use true geometric forms — circles are perfect circles, rectangles use `0` radius unless the icon is inherently pill-shaped.

**Grid:** All icons designed on a `24×24px` grid, 1px padding inset all sides, so the optical area is `22×22px`. The `1px` inset padding ensures icons don't feel cramped at the edge.

**Color in use:**
- Default: `currentColor` — inherits from parent. Set parent to `#8A8278` (muted) for inactive, `#0D0D0B` for active.
- Accent icons (credit/coin only): `#C8402F`
- Never hardcode icon colors inside the SVG `fill` or `stroke` attributes — always `currentColor`

---

### Individual Icon Descriptions

---

#### 💰 Credit / Coin Icon

**Concept:** A **hexagonal coin** — not circular. A hex coin reads as rarer and more intentional than a standard coin shape; it evokes poker chips and private tokens. The BookReel credit is a currency worth holding.

**Construction:**
- A regular hexagon, flat-top orientation, `20px` across, centered in the `24px` grid
- Stroke: `1.5px`, filled with `#C8402F` (the coin is ALWAYS filled red — it's the only filled icon in the system)
- Inside the hex: a thin `1px` inner hex ring, `3px` inset from outer edge, `color: rgba(255,255,255,0.25)` — a deboss ring suggesting the coin has been struck
- In the absolute center: a small `BookReel "B"` monogram letterform, `6px` tall, rendered in `rgba(255,255,255,0.7)`, Playfair Display weight 700. The monogram is the "face" of the coin.
- No stroke on the outer hexagon for the filled version — the silhouette is clear

**At 16px:** Simplify — drop the inner ring and monogram. Just the solid hex.

---

#### 👤 Account / Profile Icon (the Seal Mark)

**Concept:** The **quill nib** — used only when no user is signed in, as the unauthenticated state. A sign that creativity is waiting.

**Construction:**
- A calligraphy nib / quill tip: the classic diamond-cut nib shape, pointing downward
- The nib body: a diamond form `12px` tall, `8px` wide, centered in the grid
- A horizontal split line across the nib tip (`1px` notch, `4px` long), suggesting a real split nib
- The quill shaft: a `6px` angled line extending from the top of the nib body to the upper-left corner of the icon, `1.5px` stroke
- The ink drop: a `3px` filled circle in `#C8402F`, positioned `2px` below the nib tip — a single ink dot. This red dot is the only color accent in the quill icon, and it makes the whole thing read as "ready to write."
- Overall: outlined, `1.5px` stroke, feels like a printer's mark or publisher's colophon

**Note:** When the user IS signed in, the Profile icon in the nav is the **Embossed Initial Seal** (described in header spec), not this quill. The quill is for the unauthenticated/generic state only.

---

#### ⬆️ Upload Icon

**Concept:** The **manuscript lift** — evokes paper being raised from a desk, not a cloud or arrow.

**Construction:**
- A horizontal baseline: a `20px` wide, `1.5px` stroke horizontal line near the bottom of the icon, with two short `4px` vertical legs at each end (like the legs of a table or a stage platform)
- A sheet of paper: a `12px × 16px` rectangle with a `3px × 3px` dog-ear fold at the top-right corner. The fold is expressed as a tiny right-triangle cutout from the corner, with a diagonal `1.5px` line completing the fold crease.
- The paper floats `4px` above the baseline platform
- A single upward arrow below the paper, pointing toward it: `8px` tall, `1.5px` stroke, centered, with an arrowhead at the top (the arrow is pointing UP into the paper, as if lifting it)
- The paper and arrow together form a complete "lifting manuscript" gesture

---

#### 🎧 Audiobook Icon

**Concept:** The **open book with a sound wave** — literary AND sonic in one mark.

**Construction:**
- An open book: two `10px × 12px` rectangles hinged at the center, with a slight perspective — the spine is a `2px` wide vertical, the pages have `3` horizontal `1px` ruled lines on each half (like text lines), drawn at `1px` opacity — faint, suggesting printed pages. The overall book is `20px` wide, `14px` tall.
- Emerging from the book's spine, at the top: a sound wave arc. Three concentric arcs of increasing radius: `4px`, `7px`, `10px`, all centered on the spine top. Only the right side of the arcs (the quarter-circle facing right). `1.5px` stroke. This is the audio signal emanating from the words.
- The combination reads instantly as "a book that speaks."

---

#### 🎬 Trailer / Video Icon

**Concept:** The **film frame** — not a play triangle (too generic), not a video camera (too literal). A single frame of 35mm film, matching the logo's film-frame mark.

**Construction:**
- A `18px × 14px` rounded-rectangle (corner radius `2px`), centered in the grid
- Along the top and bottom edges: `3` perforation holes each, evenly spaced — each hole is a `2.5px × 3.5px` rectangle with `0.5px` corner radius, offset `2px` inside the outer edge. These are the sprocket holes of a film strip.
- Inside the main frame area: a `6px` equilateral play triangle (right-pointing), centered, `1.5px` stroke — this is the only icon in the set with a triangle, because the play action makes sense here within the film-frame metaphor
- The outer rectangle has the standard `1.5px` stroke

---

#### ⚙️ Settings Icon

**Concept:** The **letterpress compositing rule** — not a gear (too mechanical), not a slider (too tech). A compositing rule evokes typographic craft.

**Construction:**
- Three horizontal rules stacked vertically, `16px` wide, `1.5px` stroke, `4px` apart
- Each rule has a small **circular adjustment knob** — a `5px` diameter circle with `1.5px` stroke — positioned at a different horizontal position on each rule:
  - Top rule: knob at `30%` from left
  - Middle rule: knob at `65%` from left
  - Bottom rule: knob at `45%` from left
- The knob circles are hollow (outlined), with the horizontal rule passing through them as if they slide. The overall effect reads as three adjustable type-setting rules — a nod to letterpress composition tools.
- This is the only icon with no diagonal lines — it maintains the horizontal editorial rhythm.

---

### Icon Usage Rules

1. **Never resize by percentage.** Icons exist at `16px`, `20px`, and `24px` only. Scale by choosing the right variant.
2. **Never add drop shadows to icons.** Their precision is their quality.
3. **Never animate icons** except for a single case: the Settings icon may rotate `180°` when its panel opens (`transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1)`).
4. **Touch targets:** Even at `16px`, wrap icons in a `40px × 40px` invisible touch target for mobile.
5. **Pairing with labels:** When an icon sits left of a text label, the gap is `6px` for 16px icons and `8px` for 24px icons. The icon is vertically centered to the **cap-height** of the text, not the total line-height.

---

## 3. Cinematic Language — Replacing "AI"

BookReel never uses the word "AI" in user-facing copy. It's not that we're hiding something — it's that "AI" is the language of engineers describing how something works, not the language of storytellers describing what it does. A film studio doesn't tell audiences about the lens optics; it tells them about the story.

Below are five approved replacement phrases, each with usage guidance.

---

### The Five Phrases

---

#### 1. **"Cinematic engine"** (noun, infrastructure)

*Use when describing the underlying technology powering BookReel.*

> ~~"Our AI analyzes your manuscript"~~ → **"BookReel's cinematic engine reads your manuscript"**

> ~~"Powered by AI"~~ → **"Powered by our cinematic engine"**

The phrase positions BookReel as a production studio that has built proprietary craft technology — not a chatbot wrapper. "Engine" suggests precision machinery; "cinematic" anchors it in the art form. This is the **most versatile phrase** — use it for technical explanations, feature descriptions, and About copy.

---

#### 2. **"Produced by BookReel"** (passive attribution)

*Use on output screens, generated assets, trailers — anywhere we show the user what was made.*

> ~~"AI-generated trailer"~~ → **"Produced by BookReel"**

> ~~"Your AI-generated audiobook"~~ → **"Your BookReel production"**

Positioning: BookReel is a production house. Your book is the source material. We produced it. This is how film studios and record labels describe their work — nobody says a movie was "AI-directed," they say it was "produced by Universal." The user is the author; BookReel is the studio. This phrase makes authors feel they hired a studio, not a script.

---

#### 3. **"Brought to life"** (verb phrase, transformation)

*Use in action-oriented copy — buttons, step labels, progress states, onboarding.*

> ~~"AI is generating your trailer"~~ → **"Bringing your story to life…"**

> ~~"Let AI create your audiobook"~~ → **"Let BookReel bring your words to life"**

> ~~"AI-powered voiceover"~~ → **"Characters brought to life"**

This phrase is emotionally resonant for authors — "bringing a story to life" is what every writer wants. It frames BookReel as the realization of the author's vision, not a replacement for it.

---

#### 4. **"Crafted from your manuscript"** (provenance phrase)

*Use when emphasizing that the output is specific to the author's work — not generic.*

> ~~"AI reads your book and generates scenes"~~ → **"Every scene crafted from your manuscript"**

> ~~"AI-written screenplay"~~ → **"Screenplay crafted from your story"**

Authors are deeply proud of their source material and often anxious that "AI" will produce something generic. "Crafted from your manuscript" reassures them that the output is derived from THEIR work, not a template. It's also subtly artisanal — "crafted" implies skill and intention.

---

#### 5. **"Directed by the story"** (the boldest choice — for marketing moments)

*Use in hero copy, landing page headlines, and emotional touchpoints. Use sparingly.*

> ~~"AI generates a trailer based on your book"~~ → **"Trailers directed by the story itself"**

> ~~"AI narrates your audiobook"~~ → **"Let your story find its voice"**

This phrase anthropomorphizes the manuscript — it's the story that's in charge, not a machine. It's the most evocative of the five and the most at home in advertising copy, trailer end-cards, and email subject lines. Don't overuse it; save it for where you want genuine wonder.

---

### Usage Anti-Patterns (Never Use)

| ❌ Don't say | ✅ Say instead |
|---|---|
| "Our AI" | "BookReel's cinematic engine" |
| "AI-generated" | "Produced by BookReel" / "Crafted from your manuscript" |
| "The AI will…" | "BookReel will…" |
| "AI-powered" | "Cinematic technology" |
| "Using machine learning to…" | Delete the phrase entirely — just describe the outcome |
| "Smart AI" / "Advanced AI" | Never. Ever. |
| "GPT" / "LLM" / "model" | Never in user-facing copy |

---

## 4. Implementation Notes for Developer

### Header Priority Notes

1. **GlobalNav.tsx** (`src/components/shared/GlobalNav.tsx`) is the canonical component. All changes go here.
2. The `paddingTop: '64px'` on page wrappers compensates for the fixed header — this must update to `56px` on mobile via a CSS media query or a conditional class.
3. Credit balance fetches from the `profiles` table `trailer_credits` column — this is already in the DB. Wire the chip to this value via the existing auth session.
4. The profile initial should pull from `profiles.full_name` — take `name.charAt(0).toUpperCase()`. Fallback to `email.charAt(0).toUpperCase()` if no full_name.
5. The scroll-based opacity transition on the header requires a `useScrollPosition` hook or `window.addEventListener('scroll', ...)`. Throttle with `requestAnimationFrame`.

### Icon Implementation

SVGs should be implemented as React components in `src/components/icons/` — one file per icon, each accepting `size` (default `24`) and `className` props, using `currentColor`. Do NOT import from icon libraries (Heroicons, Lucide, etc.) — these icons are custom to BookReel.

### Cinematic Language

Create a constants file at `src/lib/copy.ts` with the approved phrases as named exports, so developers never have to guess:

```ts
export const CINEMATIC_COPY = {
  poweredBy: "BookReel's cinematic engine",
  generated: "Produced by BookReel",
  generating: "Bringing your story to life…",
  crafted: "Crafted from your manuscript",
  marketing: "Directed by the story",
} as const
```

---

*— Penny, BookReel Design*
*"A book deserves to be seen."*
