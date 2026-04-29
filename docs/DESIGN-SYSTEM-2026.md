# BJHUNT Design System 2026 — Refonte spec

> **Locked decisions.** All frontend agents working on the refonte MUST follow this spec exactly. No improvisation on tokens, no fallback hex values, no gradients/shadows beyond what's listed.

Inspired by **VoltAgent DESIGN.md** (deep black + warm charcoal hairlines + state-only colors) cross-validated with **Vercel Geist** (typographic precision) and 2026 dashboard best practices (Linear, Stripe, Tailscale, Sentry).

---

## 1. Color tokens (single source of truth)

```css
/* Surfaces — deep black, two-shade system */
--bjhunt-bg:           #050507;   /* canvas */
--bjhunt-bg-surface:   #101010;   /* cards, buttons, code, inputs */
--bjhunt-bg-elevated:  #16161a;   /* modals, popovers (rare) */
--bjhunt-bg-overlay:   rgba(0,0,0,0.7);  /* scrim */

/* Borders — warm charcoal, NEVER cool gray */
--bjhunt-border:           #3d3a39;       /* default 1px hairline */
--bjhunt-border-strong:    #5a5654;       /* 2px when needed */
--bjhunt-border-active:    var(--state); /* state color when selected */

/* Text — off-white, not pure white */
--bjhunt-text:           #f2f2f2;   /* primary body */
--bjhunt-text-secondary: #b8b3b0;   /* warm parchment, descriptions */
--bjhunt-text-muted:     #8b949e;   /* steel slate, metadata/timestamps */
--bjhunt-text-disabled:  rgba(242,242,242,0.4);
--bjhunt-text-inverted:  #ffffff;   /* RARE — only hero/max-emphasis */

/* States — the ONLY chromatic accents allowed */
--state-success: #00d992;   /* emerald signal — "ok / running / verified" */
--state-warning: #ffba00;   /* warning amber — "degraded / pending" */
--state-critical: #fb565b;  /* danger coral — "failed / breached" */

/* State tints (12% alpha for fills) */
--state-success-tint:  rgba(0,217,146,0.12);
--state-warning-tint:  rgba(255,186,0,0.12);
--state-critical-tint: rgba(251,86,91,0.12);

/* Severity aliases (semantic mapping for findings) */
--bjhunt-severity-critical: var(--state-critical);
--bjhunt-severity-high:     var(--state-critical);  /* same coral, different label */
--bjhunt-severity-medium:   var(--state-warning);
--bjhunt-severity-low:      var(--state-success);
--bjhunt-severity-info:     var(--bjhunt-text-muted);  /* not an accent — neutral gray */
```

**RETIRED — DO NOT USE ANYWHERE:**
- ❌ `#6366F1` indigo brand → DELETED, no brand accent. White text + state colors are the brand.
- ❌ `#FF453A`, `#FF9F0A`, `#FFD60A`, `#30D158`, `#64D2FF` (Apple system colors) → REPLACED by 3-state system.
- ❌ `#00cc8a` legacy green → REPLACED by `#00d992`.
- ❌ Any hex that's not in the table above. Hard-coded hex outside CSS vars = build break.

---

## 2. Typography

```css
--bjhunt-font-display: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
--bjhunt-font-sans:    Inter, var(--bjhunt-font-display);
--bjhunt-font-mono:    "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
```

| Role | Size | Weight | Line-height | Letter-spacing | Font |
|---|---|---|---|---|---|
| Display / Hero | `clamp(40px, 5vw, 60px)` | 400 | 1.00 | -0.011em | display |
| H1 | `clamp(28px, 3vw, 36px)` | 400 | 1.11 | -0.025em | display |
| H2 | `clamp(22px, 2.4vw, 24px)` | 600 | 1.33 | -0.025em | display |
| H3 | 20px | 600 | 1.4 | -0.01em | sans |
| H4 | 16px | 600 | 1.5 | normal | sans |
| Body L | 16px | 400 | 1.6 | normal | sans |
| Body | 14px | 400 | 1.5 | normal | sans |
| Caption | 13px | 400 | 1.4 | normal | sans |
| Eyebrow | 12px | 600 | 1.4 | +0.18em | mono UPPERCASE |
| Code | 13px | 400 | 1.45 | normal | mono |
| Micro | 11px | 500 | 1.3 | normal | mono |

**Rules:**
- Display + H1 + H2 use `system-ui` (instant render, OS authority). Body + UI use `Inter`.
- IDs, IPs, hashes, timestamps, paths, severities → ALWAYS mono.
- Uppercase + tracking is for eyebrows only. Headings never uppercase.
- Body weight defaults to 400 (NOT 300 — that's too thin on dark for accessibility).

---

## 3. Spacing & layout

```css
--bjhunt-space-1:   4px;
--bjhunt-space-2:   8px;   /* base unit */
--bjhunt-space-3:   12px;
--bjhunt-space-4:   16px;
--bjhunt-space-5:   20px;
--bjhunt-space-6:   24px;
--bjhunt-space-8:   32px;
--bjhunt-space-10:  40px;
--bjhunt-space-12:  48px;
--bjhunt-space-16:  64px;
--bjhunt-space-24:  96px;
```

- **Container max-width:** 1280px (default), 1440px (wide pages with right rail).
- **Section vertical rhythm:** 64–96px between major sections.
- **Card padding:** compact 16, regular 24, loose 32.
- **Component gap:** 16–24px.

---

## 4. Radii

```css
--bjhunt-radius-xs:    2px;     /* tight technical detail */
--bjhunt-radius-sm:    4px;     /* badges, chips */
--bjhunt-radius:       6px;     /* buttons, inputs (default) */
--bjhunt-radius-md:    8px;     /* cards */
--bjhunt-radius-lg:    12px;    /* large surfaces */
--bjhunt-radius-pill:  9999px;  /* status dots, pills */
```

**No more `border-radius: 0 !important` global.** Each component picks the right radius from this scale.

---

## 5. Element sizing (locked)

| Element | Mobile | Desktop |
|---|---|---|
| Top bar height | 56 | 64 |
| Sidebar width — expanded | drawer 280 | 240 |
| Sidebar width — collapsed | n/a | 56 (icons + tooltip) |
| Content max-width | 100% | 1280 (1440 wide) |
| Content padding | 16 | 32 |
| Card padding | 16 | 24 |
| Button height — sm / md / lg | n/a / 36 / 44 | 32 / 36 / 40 |
| Input height | 44 (touch) | 40 |
| Icon size — inline / button / nav / hero | 14 / 16 / 20 / 24 | 16 / 16 / 20 / 24 |
| Sidebar nav item height | 44 (touch) | 36 |
| Body font | 16 | 14 |

---

## 6. Breakpoints (Tailwind v4 mobile-first)

```
sm  640px   — large phones, inline form fields
md  768px   — tablet portrait, drawer sidebar
lg  1024px  — tablet landscape, persistent collapsed sidebar
xl  1280px  — desktop, expanded sidebar
2xl 1536px  — wide desktop, contained 1440 max
3xl 1920px  — ultrawide (custom)
```

**Mandatory:**
- Single-column on `<sm`.
- Sidebar = drawer overlay with backdrop on `<md`.
- Sidebar persistent collapsed (icons only, w-14) on `md+`.
- Sidebar persistent expanded on `xl+`.
- Tables use `hidden md:table-cell` to drop columns at narrow widths (don't horizontal-scroll).
- Forms: full-width inputs `<sm`, side-by-side on `md+`.

---

## 7. Component primitives

### Button — Ghost (default)
```
bg: transparent
text: var(--bjhunt-text)
border: 1px solid var(--bjhunt-border)
radius: 6px
padding: 0 16px
height: 36 (md) / 44 (lg)
hover: bg rgba(255,255,255,0.04), border var(--bjhunt-border-strong)
focus: outline 2px var(--state-success), outline-offset 2px
```

### Button — State CTA (primary action)
```
bg: var(--bjhunt-bg-surface)
text: var(--state-success)  // or warning/critical for destructive
border: 1px solid var(--state-success)
hover: bg var(--state-success-tint)
```

### Card
```
bg: var(--bjhunt-bg-surface)
border: 1px solid var(--bjhunt-border)
radius: 8px
padding: 24
hover (interactive only): border var(--bjhunt-border-strong)
selected: border 2px var(--state-success) (or relevant state)
NO shadows on default state. Border-weight is the depth system.
```

### Input
```
bg: var(--bjhunt-bg-surface)
border: 1px solid var(--bjhunt-border)
radius: 6px
height: 40 desktop / 44 mobile
text: var(--bjhunt-text), placeholder var(--bjhunt-text-muted)
focus: border var(--state-success), ring 2px var(--state-success-tint)
error: border var(--state-critical)
```

### Table
- Header: bg `var(--bjhunt-bg)`, eyebrow style (12px mono uppercase +0.18em var(--bjhunt-text-muted))
- Body rows: transparent, 1px solid var(--bjhunt-border) bottom hairline only (no vertical rules, no zebra)
- Hover: bg rgba(255,255,255,0.02)
- Cell padding: 12 vertical, 16 horizontal
- Severity columns: state-color text, NOT pill backgrounds

### Status dot (replaces pill badges where possible)
```
<StatusDot state="success|warning|critical|neutral" label="Running" />
```
- 6px circle, state color, optional 2px outer ring at state tint (pulsing for "live")
- Followed by 13px label in body color

### Eyebrow
- Always mono, 12px, weight 600, +0.18em letter-spacing, UPPERCASE, color `var(--bjhunt-text-muted)`
- Used above section titles, in card headers, in table headers

---

## 8. Iconography

- **System: Lucide (1.5px stroke, 24×24 grid).** Already in use across 67 files. Keep.
- Sizes: 14 (inline text), 16 (buttons / table), 20 (nav), 24 (hero).
- Color: `currentColor` always — they recolor with the surrounding text.
- ❌ NO duotone, NO filled glyphs, NO rounded Material style, NO emoji, NO 3D renders, NO photography of people.
- 2 hand-rolled SVGs in `app/not-found.tsx` → replace with `<ArrowUpRight />`.

---

## 9. Illustrations

- **Allowed:** monospaced ASCII-style diagrams, dot-pattern dark backgrounds, hairline node graphs (1px), real product screenshots (dark theme), terminal blocks, dashed `1px dashed rgba(140,140,150,0.4)` workflow lines.
- **Banned:** isometric 3D cubes, gradient illustrations, photography of people, claymorphism, glossy 3D characters, neumorphism, neon synth wave aesthetics.
- **Delete (no callers):** `components/animations/{hex-grid,signal-wave,price-bars,scan-radar,api-circuit,contact-visual}.tsx`.
- **Replace:**
  - `IsometricServerSVG` → flat hairline server-rack SVG (1px strokes only, no float anim).
  - `NetworkTopologySVG` → monospaced terminal-style topology (ASCII glyphs `┌─┐ │ └─┘` in a `<pre>` aesthetic).
  - 4 inline neural-net SVGs in `technology/page.tsx` → 1 reusable hairline component, monospaced labels.

---

## 10. Motion

```css
--bjhunt-duration-fast:  100ms;  /* state flip */
--bjhunt-duration-base:  150ms;  /* hover/focus */
--bjhunt-duration-slow:  250ms;  /* modal/sheet */
--bjhunt-ease-out:       cubic-bezier(0.16, 1, 0.3, 1);   /* entrances */
--bjhunt-ease-standard:  cubic-bezier(0.4, 0, 0.2, 1);    /* hover/focus */
```

- Live "running" indicators: 2px → 8px drop-shadow pulse in `--state-success`, 1.5s ease-in-out infinite.
- `prefers-reduced-motion: reduce` zeros all durations and disables pulses.
- NO whileInView fade-up on every card — heavy, breaks SSR fold visibility, was causing invisible-section bug. Use only on hero + 1-2 key sections.

---

## 11. Cmd-K command palette (NEW — replaces sidebar nav primary)

- Trigger: `Cmd+K` / `Ctrl+K` global, plus a "⌘K" hint badge in the top bar.
- Modal: 640×480 max, dark surface, mono input.
- Sections: Pages, Engagements, Findings, Settings, Actions.
- Library: `cmdk` or hand-roll on top of `<dialog>`.
- Keep sidebar but de-emphasize — Cmd-K is the primary nav for power users.

---

## 12. The 3 visual moves that DEFINE BJHUNT 2026

1. **Border-weight depth replaces shadow.** 1px hairline (default) → 2px state-color (selected) → 3px (heavy container). NO box-shadows on data UI. Shadows only on Level 4 (modal), Level 5 (popover).

2. **Two-shade canvas + warm charcoal hairlines.** `#050507` + `#101010` + `#3d3a39`. The slight warm undertone in the border is what prevents the dark theme from feeling clinical. Warm — not neutral, not cool.

3. **Compressed display type with negative tracking on system-ui.** Hero 60/1.0/-0.65px, H1 36/1.11/-0.9px. Mono used for all real data (IDs, IPs, severity, timestamps, paths). The page reads as a tool, not a brochure.

---

## 13. Anti-patterns to retire (immediate)

- ❌ Glassmorphism layers stacking (was on hero meta + features cards) — flat surface only
- ❌ `whileInView` on every section (caused empty fold visible bug) — opt-in per section
- ❌ Apple system colors (#FF453A etc) — replaced
- ❌ Indigo brand (#6366F1) — DELETED
- ❌ Hardcoded hex outside design-tokens.css — build error
- ❌ Inline `style={{}}` on `motion.*` components (framer-motion v12 strips it) — use Tailwind classes or wrap motion around plain elements
- ❌ Sidebar that doesn't collapse on viewport (P0 from responsive audit)
- ❌ `border-radius: 0 !important` global retired — pick from radii scale
- ❌ font-weight 200 ultralight everywhere — was poor a11y on dark, default to 400
- ❌ Eyebrow chaos (10 tracking values) — locked at +0.18em
- ❌ 1986-line god-components — split

---

## 14. Implementation order (waves)

**Wave A — Foundation (sequential, MUST land first):**
1. `app/design-tokens.css` rewritten with new tokens
2. `app/globals.css` cleaned (delete dead, fix duplicates, viewport meta + safe-area)
3. `components/ui/typography.tsx` (H1/H2/H3/Display/Eyebrow/Body/Caption/Code/Micro)
4. `components/ui/status-dot.tsx`, `state-text.tsx`
5. `components/ui/button.tsx`, `card.tsx`, `input.tsx` aligned to new spec
6. Delete 6 unused animation components
7. Replace `IsometricServerSVG` + `NetworkTopologySVG`
8. Add `public/{favicon.ico,apple-touch-icon.png,og-image.png,manifest.webmanifest}`

**Wave B — Surfaces (parallel on worktrees):**
- B1 Marketing landing (`app/[locale]/page.tsx`, `_components/*`, `technology/`)
- B2 Auth shells (login, forgot, reset, verify, contact, beta)
- B3 Pricing total rebuild
- B4 Dashboard shell rebuild (responsive sidebar, drawer, Cmd-K)
- B5 Chat page TOTAL rebuild (keep logic only) — split into ≤300 LOC components
- B6 Findings + audits + audits-client
- B7 Admin pages
- B8 Settings + billing + skills + guide
- B9 Legal + investors
- B10 Atomic dashboard components (severity-badge, finding-card, evidence-block, agent-transition, progress-bar-phases, terminal, hero-terminal)

---

**End of spec.** Any deviation requires explicit user approval.
