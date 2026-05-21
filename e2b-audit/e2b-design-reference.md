# E2B Design Reference — Complete Audit Report

> Source: e2b.dev Webflow site, CSS (138KB minified) + JS (8 files)
> Purpose: Exact design reference for bjhunt.com recreation

---

## 1. CSS Custom Properties (Design Tokens)

### Light Mode (default)

```css
:root {
  /* Backgrounds */
  --color--bg-primary: #fafafa;
  --color--bg-primary-hover: #f5f5f5;
  --color--bg-secondary: #ebebeb;
  --color--bg-tertiary: #e6e6e6;
  --color--bg-dark-secondary: #1f1f1f;
  --color--bg-codesnippet: black;

  /* Content / Text */
  --color--content-primary: #000;
  --color--content-secondary: #333;
  --color--content-tertiary: #666;
  --color--content-quad: #999;
  --color--content-on-black: white;
  --color--content-keep-white: white;
  --color--content-keep-black: #000;
  --color--content-positive: #49a147;
  --color--content-negative: #eb361c;

  /* Opacity-based content */
  --color--content-dark10: #0000001a;   /* 10% black */
  --color--content-dark20: #0003;       /* 20% black */
  --color--content-dark40: #0006;       /* 40% black */
  --color--content-dark60: #0009;       /* 60% black */
  --color--content-dark80: #000c;       /* 80% black */

  /* Strokes / Borders */
  --color--stroke-primary: #d6d6d6;
  --color--stroke-primary-hover: #b8b8b8;
  --color--stroke-secondary: #ebebeb;
  --color--stroke-on-black: #222;
  --color--stroke-codesnippet: black;
  --color--stroke-img-outline: #fff0;   /* transparent */

  /* CTA / Brand */
  --color--cta-primary: black;
  --color--cta-primary-hover: #1f1f1f;
  --color--brand: #f80;                 /* orange #FF8800 */
  --color--black: black;

  /* Brand accents (LLM logos) */
  --color--accent-openai: orangered;
  --color--accent-meta: #0467df;
  --color--accent-anthropic: #cc7d5d;
  --color--accent-mistral: #ffa300;
  --color--accent-gemini: #8e75b2;

  /* Brand language colors */
  --color--brand-jsts-bg: #f7df1e;
  --color--brand-jsts-text: #000;
  --color--brand-python-bg: #3776ab;
  --color--brand-python-text: white;

  /* Typography */
  --font-family-sans: "IBM Plex Sans", sans-serif;
  --mono-400: "Ibm Plex Mono 400", sans-serif;
  --mono-500: "Ibm Plex Mono 500", sans-serif;
  --mono-700: "Ibm Plex Mono 700", sans-serif;
}
```

### Dark Mode Variables (class-based, not prefers-color-scheme)

```css
/* Dark mode tokens — applied via `.dark` class or similar */
--dark--bg-primary: #000;
--dark--bg-primary-hover: #0a0a0a;
--dark--bg-secondary: #141414;
--dark--bg-tertiary: #1a1a1a;
--dark--bg-codesnippet: #141414;

--dark--content-primary: white;
--dark--content-secondary: #ccc;
--dark--content-tertiary: #777;
--dark--content-quad: #666;
--dark--content-on-black: #000;
--dark--content-dark80: #fffc;   /* 80% white */
--dark--content-dark60: #fff9;   /* 60% white */
--dark--content-dark40: #fff6;   /* 40% white */
--dark--content-dark20: #fff3;   /* 20% white */
--dark--content-dark10: #ffffff1a;

--dark--cta-primary: white;
--dark--cta-primary-hover: #ebebeb;

--dark--stroke-primary: #292929;
--dark--stroke-primary-hover: #3d3d3d;
--dark--stroke-codesnippet: #292929;
--dark--stroke-on-black: #ebebeb;
--dark--stroke-img-outline: #292929;

--dark--brand-jsts-bg: #272301;
--dark--brand-jsts-text: #f7df1e;
--dark--brand-python-bg: #0f202e;
--dark--brand-python-text: #659ecd;
```

---

## 2. Color Palette Summary

### Primary Colors (by frequency and role)

| Color | Hex | Role |
|---|---|---|
| Background primary | `#fafafa` | Page bg (almost white) |
| Background secondary | `#ebebeb` | Hover bg, tag bg, secondary bg |
| Background tertiary | `#e6e6e6` | Input hover bg, dropdown bg |
| Background primary hover | `#f5f5f5` | Hover state bg |
| Text primary | `#000` | Headings, primary text |
| Text secondary | `#333` | Body text, links |
| Text tertiary | `#666` | Muted text, placeholder |
| Text quad | `#999` | Subtle text |
| Brand / Accent | `#f80` | CTA highlights, brand accent |
| CTA primary | `black` | Button background |
| CTA primary hover | `#1f1f1f` | Button hover |
| Stroke primary | `#d6d6d6` | Borders, dividers |
| Stroke primary hover | `#b8b8b8` | Border hover |
| Positive | `#49a147` | Success, form success |
| Negative | `#eb361c` | Error, form error |

### Accent Colors (LLM logos)

| Color | Hex | Purpose |
|---|---|---|
| OpenAI | `orangered` | OpenAI accent |
| Meta | `#0467df` | Meta accent |
| Anthropic | `#cc7d5d` | Anthropic accent |
| Mistral | `#ffa300` | Mistral accent |
| Gemini | `#8e75b2` | Gemini accent |

### Language Brand Colors

| Color | Hex | Purpose |
|---|---|---|
| JS/TS bg | `#f7df1e` | JavaScript/TypeScript badge bg |
| JS/TS text | `#000` | JavaScript/TypeScript badge text |
| Python bg | `#3776ab` | Python badge bg |
| Python text | `white` | Python badge text |

---

## 3. Typography Scale

### Font Families

| Token | Value | Usage |
|---|---|---|
| `--font-family-sans` | `"IBM Plex Sans", sans-serif` | Body text, headings (h2-h6), labels, paragraphs |
| `--mono-400` | `"Ibm Plex Mono 400", sans-serif` | Labels, code, small tech text |
| `--mono-500` | `"Ibm Plex Mono 500", sans-serif` | Medium-weight mono text, buttons |
| `--mono-700` | `"Ibm Plex Mono 700", sans-serif` | H1, H2, pricing, large labels |

### Font Size Scale

| Class/Element | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| `.h1` (hero) | `4rem` (64px) | 700 | `100%` | `-.02rem` |
| `.h1` (subpage) | `3rem` (48px) | 700 | — | `-.02rem` |
| `.h1` tablet | `3.25rem` (52px) | 700 | — | — |
| `.h1` mobile | `2rem` (32px) | 700 | — | — |
| `.h1` mobile small | `1.75rem` (28px) | 700 | — | — |
| `.h1-flip` | `4rem` (64px) → `3.25rem` tablet | 700 | `100%` | `-.02rem` |
| `.h2` | `3.75rem` (60px) → `3rem` tablet → `1.75rem` mobile | 700 | `3.5rem` → mobile `1.75rem` | `-.05rem` |
| `.h2-sans` | `1.375rem` (22px) | 700 | `2rem` | — |
| `.h2-blog-featured` | `2rem` → mobile `1rem` | 700 | `2.25rem` | — |
| `.h2-pricing` | `2rem` | 700 | `100%` | `-.05rem` |
| `.h2-highlight` | (inline bg) | — | `2.75rem` → mobile `1.75rem` | — |
| `.h3` | `1rem` (16px) | 700 | `1.25rem` | — |
| `.h3-pricing` | `2rem` → mobile `1.5rem` | 700 | `100%` | `-.05rem` |
| `.h3-blog-item` | `1.125rem` (18px) | 700 | `1.5rem` | — |
| `.h3-sign-up-wrap` | `1.5rem` | 700 | `1.75rem` | — |
| `.h4` | `1rem` (16px) | 700 | `20px` | — |
| `.h5` | `24px` → `22px` tablet → `18px` mobile | 700 | `100%` | — |
| `.h5-2` | `1rem` (16px) | 700 | `1.25rem` | — |
| `.p` (body) | `1rem` (16px) | 400 | `1.5rem` (24px) | — |
| `.p.perex` | `1rem` | 500 | `24px` | `-.01rem` |
| `.p.small` | `.875rem` (14px) | — | `1.25rem` (20px) | — |
| `.label` | `.75rem` (12px) | 400 | `.875rem` (14px) | — |
| `.label.large` | `1.5rem` (24px) | 700 | `1.5rem` | — |
| `.label.medium` | `1rem` | 500 | `100%` | — |
| `.button` | `.75rem` (12px) | 500 | `.875rem` (14px) | — |
| Body (default) | `14px` | — | `20px` | — |
| `blockquote` | `18px` | — | `22px` | — |
| `.svg-text` | `8px` → tablet `6px` → mobile `5px` → `3.5px` | 500 | `9px` → `7px` → `6px` → `4px` | — |
| h1 (reset) | `38px` | 700 | `44px` | — |
| h2 (reset) | `32px` | 700 | `36px` | — |
| h3 (reset) | `24px` | 700 | `30px` | — |
| h4 (reset) | `18px` | 700 | `24px` | — |
| h5 (reset) | `14px` | 700 | `20px` | — |
| h6 (reset) | `12px` | 700 | `18px` | — |

### Text Transform

- `.h1`, `.h2`, `.label` — `text-transform: uppercase`
- `.h2-italic` — `text-transform: none` (override), `font-style: italic`

---

## 4. Spacing System

### Common Padding/Margin Values

| Value | Common Usage |
|---|---|
| `0` | Reset margins |
| `.125rem` (2px) | Minimal gaps |
| `.25rem` (4px) | Tag gaps, small spacing |
| `.375rem` (6px) | Grid gaps, icon gaps |
| `.5rem` (8px) | Small gaps, icon spacing |
| `.625rem` (10px) | Label gaps |
| `.75rem` (12px) | Medium spacing, row gaps |
| `.875rem` (14px) | Button padding horizontal |
| `1rem` (16px) | Standard gap, grid gap, padding |
| `1.125rem` (18px) | Button padding vertical |
| `1.25rem` (20px) | Sidebar padding, section gaps |
| `1.5rem` (24px) | Nav gap, row gaps, blog gaps |
| `2rem` (32px) | Section padding, content spacing |
| `2.5rem` (40px) | Footer box padding |
| `2.75rem` (44px) | Card padding vertical |
| `3rem` (48px) | Column gaps, large spacing |
| `3.25rem` (52px) | Section padding bottom |
| `3.75rem` (60px) | Page cover top/bottom (mobile) |
| `4rem` (64px) | Blog detail margin, large spacing |
| `5.75rem` (92px) | Main top margin, footer padding |
| `6.25rem` (100px) | Section intro padding, page-content top |
| `10rem` (160px) | Page cover padding |

### Section Spacing (Vertical)

| Section | Padding Top | Padding Bottom |
|---|---|---|
| `.section-intro` | `6.25rem` | `6.25rem` |
| `.section-intro` (mobile) | `4rem` | `4rem` |
| `.footer` | `5.75rem` (top padding) | `5.75rem` |
| `.footer` (mobile) | `3rem` (top padding) | `3rem` |
| `.page-content` | `6.25rem` | `3.25rem` |
| `.page-content` (tablet) | `5rem` | `4rem` |
| `.page-cover` | `10rem` | `10rem` |
| `.page-cover` (mobile) | `5rem` | `5rem` |
| `.main` top margin | `5.75rem` | — |
| `.main` (mobile) top margin | `7rem` | — |

---

## 5. Border System

### Border Widths

| Value | Usage |
|---|---|
| `1px solid` | Default border for all cards, sections, dividers, inputs |
| `5px solid` | Blockquote left border |

### Border Colors

| Variable | Value | Usage |
|---|---|---|
| `--color--stroke-primary` | `#d6d6d6` | Default borders, dividers |
| `--color--stroke-primary-hover` | `#b8b8b8` | Hover borders |
| `--color--stroke-secondary` | `#ebebeb` | Secondary borders |
| `--color--stroke-on-black` | `#222` | Dark borders (on dark bg) |
| `--color--cta-primary` | `black` | Button borders (small variant) |
| `--color--cta-primary-hover` | `#1f1f1f` | Button border hover |

### Border Radius

| Value | Usage |
|---|---|
| `0` | All buttons, cards, inputs, tags (sharp corners — E2B signature) |
| `50%` | Radio buttons, avatar |
| `3rem` | Blog detail avatar |
| `4rem` | `.icon-anyllm` (LLM icon circle) |
| `.375rem` | `.f-24h-dot` |
| `.5rem` | `.icon-live-dot` |
| `2px` | Pagination, form radio reset |
| `3px` | Lightbox, badge |

> **Design note**: E2B uses `border-radius: 0` (sharp/right angles) as the default for几乎所有elements — buttons, cards, tags, inputs. This is a distinctive design choice.

---

## 6. Shadows

| Value | Usage |
|---|---|
| `0 0 3px 1px #3898ec` | Focus ring (Webflow default) |
| `0 0 0 2px #fff` | Slider focus |
| `0 0 3px #3336` | Nav shadow dots (dark variant) |
| `0 0 0 1px #0000001a, 0 1px 3px #0000001a` | Webflow badge |
| `inset -1rem 0rem .75rem 0 var(--color--bg-primary)` | Logo carousel gradient left |
| `inset 1rem 0rem .75rem 0 var(--color--bg-primary)` | Logo carousel gradient right |

---

## 7. Layout System

### Container / Max-Widths

| Element | Max-Width |
|---|---|
| `.main` | `75rem` (1200px) |
| `.main.careers` | `76.25rem` (1220px) |
| `.navbar-container` | `75rem` (1200px) |
| `.button-cookbook-link` | `75rem` |
| `.button-loadmore` | `75rem` |
| `.hp-cookbook-item-wrap` | `75rem` |
| `.alumni-item` | `75rem` |
| `.footer-wrap` | `75rem` |
| `.blog-detail-content` | `49.5rem` (792px) |
| `.blog-sidebar` | `24rem` |
| `.changelog-item-body` | `49.5rem` |
| `.wrap-h` | `56rem` |

### Grid Layouts

| Pattern | Columns | Gap | Usage |
|---|---|---|---|
| Default grid | `1fr 1fr` | `16px` | `.w-layout-grid` |
| Section 3-col | `1fr 1fr 1fr` | varies | Features, customers, tiers |
| Footer columns | `1fr 1fr 1fr 1fr` | `1rem` | Footer |
| ProPlan grid | `1fr 1fr 1fr` | `-1px` | Pricing tiers |
| Use cases grid | `1fr 1fr 1fr` | varies | Use cases |
| Usage costs header | `1fr minmax(80px,80px) minmax(136px,136px)` | varies | RAM pricing table |
| Features grid (tablet) | `1fr 1fr` | `0px` | Enterprise bento |

### Breakpoints

| Name | Value | Target |
|---|---|---|
| Desktop large | `min-width: 1920px` | Large screens |
| Desktop | default | > 991px |
| Tablet | `max-width: 991px` | 768-991px |
| Mobile landscape | `max-width: 767px` | 480-767px |
| Mobile portrait | `max-width: 479px` | < 480px |
| Lightbox | `min-width: 768px` | Desktop lightbox |

---

## 8. Header / Navigation

### Header (`.header`)

```css
.header {
  z-index: 100;
  background-color: var(--color--bg-primary);
  position: fixed;
  inset: 0% 0% auto;  /* top: 0, left: 0, right: 0 */
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
}
```

### Navbar Container (`.navbar-container`)

```css
.navbar-container {
  grid-column-gap: 1rem;
  grid-row-gap: 1rem;
  grid-template-rows: auto;
  grid-template-columns: 1fr 1fr 1fr;
  justify-content: space-between;
  place-items: center stretch;
  width: 100%;
  max-width: 75rem;          /* 1200px */
  height: 100%;
  display: grid;
}
```

### Navbar Height

- Default: `3.25rem` (52px) via `.navbar { height: 3.25rem }`
- Mobile: Full-height mobile menu (`100dvh`)

### Navbar Items (`.navbar-item`)

```css
.navbar-item {
  padding-top: 1rem;
  padding-bottom: 1rem;
  text-decoration: none;
}
.navbar-item:hover, .navbar-item.w--current {
  color: var(--color--content-primary);
  text-decoration: underline;
}
```

### Navbar Menu Primary (`.navbar-menu-primary`)

```css
.navbar-menu-primary {
  grid-column-gap: 1.5rem;
  grid-row-gap: 1.5rem;
  justify-content: space-between;
  align-items: center;
  display: flex;
}
```

### Logo (`.logo`)

```css
.logo {
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  display: flex;
}
```

### Nav Divider (`.nav-divider`)

```css
.nav-divider {
  background-color: var(--color--stroke-primary);
  width: 1px;
  height: 1.5rem;
}
```

### Dropdown (`.navbar-dropdown-wrap`)

```css
.navbar-dropdown-wrap {
  z-index: 10;
  width: 240px;
  position: absolute;
  top: 40px;        /* Aligns with 3.25rem header */
  display: none;
}
.navbar-dropdown-container {
  border: 1px solid var(--color--stroke-primary);
  background-color: var(--color--bg-primary);
}
.navbar-dropdown-item {
  width: 100%;
  height: 40px;
  padding-left: .5rem;
  padding-right: .5rem;
}
.navbar-dropdown-item:hover {
  background-color: var(--color--bg-primary-hover);
}
```

### Mobile Menu (Tablet)

```css
@media (max-width: 991px) {
  .navbar-menu {
    background-color: var(--color--bg-primary);
    flex-flow: column;
    height: 100dvh;
    padding: 1.5rem 1.25rem 1.25rem;
  }
  .navbar-item { padding-top: .5rem; padding-bottom: .5rem; }
  .navbar-menu-secondary {
    grid-template-rows: auto auto auto;
    grid-template-columns: 1fr;
  }
}
```

---

## 9. Hero / Cover Section

### `.s-cover`

```css
.s-cover {
  border-bottom: 1px solid var(--color--stroke-primary);
  flex-flow: column;
  justify-content: center;
  align-items: center;
  height: 32rem;              /* 512px */
  display: flex;
  position: relative;
}
.s-cover.float { height: 31.25rem; }   /* 500px */
.s-cover.s-faq { height: 20rem; }       /* 320px */
.s-cover.s-alumni {
  border-bottom-style: none;
  min-height: 15rem;                     /* mobile */
  padding: 4rem 2rem;                    /* mobile override */
}
.s-cover.s-investors {
  height: auto;
  padding-top: 6.25rem;
  padding-bottom: 6.25rem;
}
/* Mobile */
@media (max-width: 767px) {
  .s-cover { height: auto; padding: 4rem 2rem; }
  .s-cover.s-faq { height: 15rem; }
}
```

### `.s-cover-title`

```css
.s-cover-title {
  grid-column-gap: 1rem;
  grid-row-gap: 1rem;
  flex-flow: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  display: flex;
}
```

### Hero Heading `.h1`

```css
.h1 {
  font-family: var(--mono-700);
  color: var(--color--content-primary);
  text-align: center;
  letter-spacing: -.02rem;
  text-transform: uppercase;
  margin-bottom: 4.25rem;
  font-size: 4rem;
  font-weight: 700;
  line-height: 100%;
}
.h1.subpage { text-align: left; font-size: 3rem; }
/* Tablet */ .h1 { margin-bottom: 3.5rem; font-size: 3.25rem; }
/* Mobile */ .h1 { margin-bottom: 2.25rem; font-size: 2rem; }
/* Small mobile */ .h1 { margin-bottom: 2rem; font-size: 1.75rem; }
```

### Hero Heading `.h1-flip`

```css
.h1-flip {
  background-color: var(--color--cta-primary);      /* black bg */
  height: 3.625rem;                                  /* 58px */
  color: var(--color--content-on-black);             /* white text */
  letter-spacing: -.02rem;
  text-transform: uppercase;
  font-family: var(--mono-700);
  font-size: 4rem;
  font-weight: 700;
  line-height: 100%;
  padding-bottom: 3px;
  padding-left: .25rem;
  padding-right: .25rem;
}
/* Tablet */   font-size: 3.25rem; height: 3.125rem;
/* Mobile */   font-size: 2rem; height: 2rem;
/* Small */     font-size: 1.75rem; height: 1.75rem;
```

### Section Heading `.h2`

```css
.h2 {
  font-family: var(--mono-700);
  color: var(--color--content-primary);
  text-align: center;
  letter-spacing: -.05rem;
  text-transform: uppercase;
  font-size: 3.75rem;
  font-weight: 700;
  line-height: 3.5rem;
}
/* Tablet */ .h2 { font-size: 3rem; line-height: 3rem; }
/* Mobile */ .h2 { font-size: 1.75rem; line-height: 1.75rem; }
```

### Perex (Subheading) `.p.perex`

```css
.p.perex {
  text-align: center;
  letter-spacing: -.01rem;
  font-weight: 500;
  line-height: 24px;
}
```

---

## 10. Button Variants

### Base Button (`.button`)

```css
.button {
  background-color: var(--color--cta-primary);       /* black */
  height: 2.5rem;                                     /* 40px */
  font-family: var(--mono-500);
  color: var(--color--content-on-black);               /* white */
  text-align: center;
  text-transform: uppercase;
  border-radius: 0;                                    /* SHARP CORNERS */
  justify-content: center;
  align-items: center;
  padding: 0 1rem;
  font-size: .75rem;                                   /* 12px */
  font-weight: 500;
  line-height: .875rem;                                /* 14px */
  text-decoration: none;
  display: flex;
}
```

### Large Primary (`.button.large.primary`)

```css
.button.large {
  height: 3.25rem;                                     /* 52px */
  padding-top: 1.125rem;
  padding-bottom: 1.125rem;
}
.button.large.primary._w-fixed { width: 11.25rem; }
.button.large.primary._w-fixed:hover { background-color: var(--color--cta-primary-hover); }
/* Tablet: full width on mobile */
```

### Large Secondary (`.button.large.secondary`)

```css
.button.large.secondary {
  border: 1px solid var(--color--stroke-primary);    /* #d6d6d6 */
  background-color: var(--color--bg-primary);         /* #fafafa */
  color: var(--color--content-primary);                /* black */
}
.button.large.secondary._w-fixed:hover { border-color: var(--color--stroke-primary-hover); }
```

### Large on-black (`.button.large.on-black`)

```css
.button.large.on-black._w-fixed {
  background-color: var(--color--bg-primary);          /* #fafafa */
  width: 11.25rem;
  color: var(--color--content-primary);
}
.button.large.on-black._w-fixed:hover { background-color: var(--color--bg-secondary); }
```

### Medium Primary (`.button.medium.primary`)

```css
.button.medium.primary:hover { background-color: var(--color--cta-primary-hover); }
```

### Medium Secondary (`.button.medium.secondary`)

```css
.button.medium.secondary {
  border: 1px solid var(--color--stroke-primary);
  background-color: var(--color--bg-primary);
  color: var(--color--content-primary);
}
.button.medium.secondary:hover { border-color: var(--color--stroke-primary-hover); }
.button.medium.secondary.full-width { width: 100%; line-height: .75rem; }
```

### Small (`.button.small`)

```css
.button.small {
  border: 1px solid var(--color--cta-primary);         /* black */
  height: 2rem;                                        /* 32px */
  font-family: var(--mono-400);
  padding: .5rem .875rem;
}
.button.small.primary:hover { border-color: var(--color--cta-primary-hover); background-color: var(--color--cta-primary-hover); }
.button.small.secondary {
  border-color: var(--color--stroke-primary);
  background-color: var(--color--bg-primary);
  color: var(--color--content-primary);
}
.button.small.secondary:hover { border-color: var(--color--stroke-primary-hover); }
```

> **Key design pattern**: All buttons have `border-radius: 0` (sharp corners). Primary buttons are black bg with white text. Secondary buttons are outlined with `#d6d6d6` border. Hover states darken borders/backgrounds slightly.

---

## 11. Tag / Badge Styles

### `.tag` (base)

```css
.tag {
  justify-content: center;
  align-items: center;
  padding: .25rem .375rem;     /* 4px 6px */
  display: flex;
}
```

### Tag Variants

| Class | Background | Text Color | Notes |
|---|---|---|---|
| `.tag.brand` | `--color--brand` (#f80) | `--color--content-on-black` (white) | Orange badge |
| `.tag.primary` | `--color--bg-secondary` (#ebebeb) | inherit | Gray bg |
| `.tag.outline` | — | — | `border: 1px solid var(--color--content-primary)` |
| `.tag.on-black` | `--color--stroke-on-black` (#222) | — | For dark backgrounds |
| `.tag.secondary` | `--color--stroke-primary` (#d6d6d6) | — | `display: inline-flex` |
| `.tag.jsts` | `--color--brand-jsts-bg` (#f7df1e) | — | JS/TS badge |
| `.tag.python` | `--color--brand-python-bg` (#3776ab) | — | Python badge |

---

## 12. Card Styles

### Use Case Item Box (`.use-case-item-box`)

```css
.use-case-item-box {
  z-index: 10;
  border: 1px solid var(--color--stroke-primary);
  background-color: var(--color--bg-primary);
  flex-flow: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 2.75rem 2.5rem;          /* 44px 40px */
  display: flex;
  position: relative;
}
```

### Tier / Pricing Box (`.section-tiers-box`)

```css
.section-tiers-box {
  z-index: 10;
  border: 1px solid var(--color--stroke-primary);
  background-color: var(--color--bg-primary);
  flex-flow: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 30rem;                    /* 480px */
  display: flex;
  position: relative;
}
.section-tiers-box.pro {
  background-color: var(--color--cta-primary);   /* black */
  border-style: none;
}
```

### Footer Box (`.s-footer-box`)

```css
.s-footer-box {
  border: 1px solid var(--color--stroke-primary);
  background-color: var(--color--bg-primary);
  flex-flow: column;
  justify-content: center;
  align-items: center;
  min-width: 100%;
  min-height: 100%;
  padding: 2.5rem 2rem;
  display: flex;
}
```

### Feature Box (`.feature-box`)

```css
.feature-box {
  justify-content: center;
  align-items: flex-end;
  width: 100%;
  height: 100%;
  padding-bottom: 3rem;
  display: flex;
  position: relative;
}
.feature-box.middle {
  border-right: 1px solid var(--color--stroke-primary);
  border-left: 1px solid var(--color--stroke-primary);
}
```

### Cookbook Item (`.hp-cookbook-item-wrap`)

```css
.hp-cookbook-item-wrap {
  z-index: 10;
  border: 1px solid var(--color--stroke-primary);
  background-color: var(--color--bg-primary);
  flex-flow: column;
  justify-content: center;
  align-items: stretch;
  width: 100%;
  max-width: 75rem;
  height: 7rem;                     /* 112px */
  margin-bottom: -1px;
  padding: 1rem 3rem 1.25rem 1.25rem;
  text-decoration: none;
  display: flex;
  position: relative;
}
```

### Customers Box (`.s-customers-box`)

```css
.s-customers-box {
  background-color: var(--color--bg-primary);
  flex-flow: column;
  justify-content: center;
  align-items: center;
  padding: 1.75rem 2rem 2.5rem;
  display: flex;
}
.s-customers-box.enterprise { min-height: 15rem; }
```

---

## 13. Input / Form Styles

### Text Input (`.input.medium` / `.s-cookbook-search`)

```css
.input.medium, .s-cookbook-search {
  border: 1px solid var(--color--bg-secondary);       /* #ebebeb */
  background-color: var(--color--bg-secondary);
  height: 2.5rem;                                      /* 40px */
  padding-left: .75rem;
  padding-right: .75rem;
  font-family: var(--font-family-sans);
  font-size: .875rem;
  line-height: 1.25rem;
}
.input.medium:hover, .s-cookbook-search:hover {
  border-color: var(--color--bg-tertiary);
  background-color: var(--color--bg-tertiary);
}
.input.medium:focus, .s-cookbook-search:focus {
  border-color: var(--color--stroke-primary-hover);    /* #b8b8b8 */
  background-color: var(--color--bg-tertiary);
  color: var(--color--content-primary);
}
.s-cookbook-search::placeholder { color: var(--color--content-tertiary); }
```

---

## 14. Animations & Transitions

### @keyframes

```css
@keyframes spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}
/* Used on: .w-lightbox-spinner, duration: 0.8s, linear infinite */
```

### CSS Transitions

| Property | Duration | Easing | Context |
|---|---|---|---|
| `all` | `.3s` | — | `.w-lightbox-control` hover |
| `background-color` | `.15s` | — | `.s-contact-cs` hover |
| `background-color` | `.1s` | — | `.w-slider-dot` default |
| `color` | `.1s` | — | `.w-slider-dot` color |
| `background-color` | `.1s`, `color` | `.1s` | `.w-slider-dot` (combined) |

### Hover States Summary

| Element | Hover Effect |
|---|---|
| `.button.large.primary._w-fixed:hover` | `background-color: var(--color--cta-primary-hover)` (#1f1f1f) |
| `.button.large.secondary._w-fixed:hover` | `border-color: var(--color--stroke-primary-hover)` |
| `.button.large.on-black._w-fixed:hover` | `background-color: var(--color--bg-secondary)` |
| `.button.medium.primary:hover` | `background-color: var(--color--cta-primary-hover)` |
| `.button.medium.secondary:hover` | `border-color: var(--color--stroke-primary-hover)` |
| `.button.small.primary:hover` | `border-color: var(--color--cta-primary-hover); background-color: var(--color--cta-primary-hover)` |
| `.button.small.secondary:hover` | `border-color: var(--color--stroke-primary-hover)` |
| `.navbar-item:hover` | `color: var(--color--content-primary); text-decoration: underline` |
| `.navbar-dropdown:hover` | `color: var(--color--content-primary); text-decoration: underline` |
| `.navbar-dropdown-item:hover` | `background-color: var(--color--bg-primary-hover)` (#f5f5f5) |
| `.logo-right-click-menu-item:hover` | `background-color: var(--color--bg-primary-hover)` |
| `.tab-link:hover` | `text-decoration: underline` |
| `.tab-link-icon:hover` | `text-decoration: underline` |
| `.link.small.link-underline:hover` | `color: var(--color--content-secondary); text-decoration: underline` |
| `.p.small.link-none:hover` | `color: var(--color--content-primary); text-decoration: underline` |
| `.p.perex.link-underline:hover` | `color: var(--color--content-tertiary)` |
| `.label.link-underline:hover` | `opacity: .8` |
| `.promo-banner-text:hover` | `opacity: .8` |
| `.s-contact-cs:hover` | `background-color: var(--color--bg-tertiary)` (#e6e6e6) |
| `.h2-blog-featured:hover` | `text-decoration: underline` |
| `.h3-blog-item:hover` | `text-decoration: underline` |
| `.h4-blog-item:hover` | `text-decoration: underline` |
| `.dropdown-item:hover` | `background-color: var(--color--bg-secondary)` |
| `.rtb-blog-detail a:hover` | `color: var(--color--content-primary)` |
| `.rtb-changelog a:hover` | `color: var(--color--content-primary)` |
| `.icon-18.llm-*:hover` | (no specific hover, but `.icon-18.llm-*` has `opacity: .4` default) |

### E2B Interactive Behavior Patterns (from IX2 data)

The site uses **Webflow IX2 (Interactions 2.0)** for:
- Scroll-triggered animations
- Mouse hover states
- Page load animations
- Element show/hide state management

These are configured via Webflow's visual editor and stored as JSON data in the `IX2_RAW_DATA_IMPORTED` payload. The interactions use the `tram` animation library (Webflow's built-in) with customizable easing functions.

---

## 15. Label Styles

### Base Label (`.label`)

```css
.label {
  font-family: var(--mono-400);
  color: var(--color--content-primary);
  text-align: left;
  text-transform: uppercase;
  font-size: .75rem;              /* 12px */
  font-weight: 400;
  line-height: .875rem;           /* 14px */
}
```

### Label Variants

| Class | Font | Size | Weight | Color | Notes |
|---|---|---|---|---|---|
| `.label.large` | `--mono-700` | `1.5rem` (24px) | 700 | primary | Large label |
| `.label.medium` | `--mono-500` | `1rem` | 500 | quad (#999) | Non-uppercase |
| `.label.navbar-link` | same as base | — | — | — | `text-transform: uppercase` |
| `.label.brand` | — | — | — | `--color--brand` (#f80) | Orange accent |
| `.label.secondary` | — | — | — | `--color--content-secondary` (#333) | Gray text |
| `.label.tertiary` | — | — | — | `--color--content-tertiary` (#666) | Muted |
| `.label.on-black` | — | — | — | `--color--content-on-black` (white) | Dark bg |
| `.label.dark20` | — | — | — | `--color--content-dark20` | 20% opacity |
| `.label.lowercase` | — | — | — | — | `text-transform: none` |
| `.label.changelog-date` | — | — | — | — | `margin-top: -2px` |
| `.label.jsts` | — | — | — | `--color--brand-jsts-text` | JS/TS color |
| `.label.python` | — | — | — | `--color--brand-python-text` | Python color |

---

## 16. Transition Durations (from JS/Webflow IX2)

### Tram Animation Library

Webflow's `tram` library is bundled in `schunk-2.js`. It provides these built-in easing functions:

| Name | Cubic Bezier |
|---|---|
| ease | Webflow custom (not CSS ease) |
| ease-in | cubic-bezier(0.550, 0.085, 0.680, 0.530) |
| ease-out | Webflow custom |
| ease-in-out | Webflow custom |
| linear | linear |
| ease-in-quad | cubic-bezier(0.550, 0.085, 0.680, 0.530) |
| ease-out-quad | cubic-bezier(0.250, 0.460, 0.450, 0.940) |
| ease-in-out-quad | cubic-bezier(0.455, 0.030, 0.515, 0.955) |
| ease-in-cubic | cubic-bezier(0.550, 0.055, 0.675, 0.190) |
| ease-out-cubic | cubic-bezier(0.215, 0.610, 0.355, 1) |
| ease-in-out-cubic | cubic-bezier(0.645, 0.045, 0.355, 1) |
| ease-in-quart | cubic-bezier(0.895, 0.030, 0.685, 0.220) |
| ease-out-quart | cubic-bezier(0.165, 0.840, 0.440, 1) |
| ease-in-out-quart | cubic-bezier(0.770, 0, 0.175, 1) |
| ease-in-quint | cubic-bezier(0.755, 0.050, 0.855, 0.060) |
| ease-out-quint | cubic-bezier(0.230, 1, 0.320, 1) |
| ease-in-out-quint | cubic-bezier(0.860, 0, 0.070, 1) |
| ease-in-sine | cubic-bezier(0.470, 0, 0.745, 0.715) |
| ease-out-sine | cubic-bezier(0.390, 0.575, 0.565, 1) |

Default animation duration in tram: `500ms`

---

## 17. JS Analysis

### `main.js` (1.8KB)
- Webpack bundler entry point (rspack v1.3.9)
- Loads chunk dependencies: manages module loading for the site

### `schunk-1.js` (41KB)
- **Bezier easing library** — cubic bezier math functions for animations
- **Lodash utility functions** — `_`, get, set, clone, merge, etc.
- Core Webflow animation runtime dependencies

### `schunk-2.js` (276KB) — Main Interaction Engine
- **Tram animation library** — Webflow's custom animation engine
  - All easing functions listed above
  - Support for `transform`, `opacity`, `color`, `background-color` animations
  - Duration parsing, unit handling
- **IX2 Engine** — Webflow Interactions 2.0
  - Action types: `GENERAL_START_ACTION`, playback, instance management
  - Supports: scroll-triggered, mouse hover, page load interactions
  - `IX2_RAW_DATA_IMPORTED` — stores site-specific interaction data
  - Manages viewport width changes, reduced motion
- **Scroll tracking** — 222 references to scroll behavior
- **Transform animations** — 79 transform-related operations
- **Opacity animations** — 30 references
- **Rotate animations** — 28 references
- **Slide animations** — 40 references
- **Keyframe animations** — 5 references
- **Motion/reduced motion support** — 17 references

### `schunk-3.js` (9.5KB)
- **Webflow Forms module** — form validation, submission, file uploads
- Turnstile captcha integration
- Form field validation (email regex, etc.)

### `schunk-4.js` (3KB)
- **Webflow Tabs module** — tab component behavior
- Tab switching with easing/duration configuration
- Active tab state management (`w--current`, `w--tab-active`)

### `k2w3lvd2.js` (1KB)
- **Google Tag Manager** — GTM-K2W3LVD2
- Injects GTM script and noscript iframe

### `finsweet-animation.js` (11KB)
- **Finsweet CSS animation library** (standalone, no dependencies)
- Provides custom animation API similar to Web Animations API
- Key features:
  - Duration default: `0.3s` (300ms)
  - Delay default: `0`
  - End delay default: `0`
  - Repeat default: `0`
  - Default easing: `"ease"`
  - Supports keyframe-style animations
  - Cubic-bezier interpolation functions
  - Steps (stepped) easing: `steps()`
  - Animation playback control (play, pause, cancel, finish)
  - Fill modes: forwards, backwards, both
  - Supports animating: transform, opacity, color, backgroundColor, etc.
  - Uses `requestAnimationFrame` for smooth rendering

---

## 18. Specific Component Dimensions

### Logo

```css
.logo { width: 40px; height: 40px; }
.navbar-logo { width: 2.5rem; }
```

### Icons

| Class | Size |
|---|---|
| `.icon-12` | `.75rem` (12px) |
| `.icon-18` | `18px` |
| `.icon-20` | `20px` |
| `.icon-24` | `1.5rem` (24px) |
| `.icon-28` | `28px` |
| `.icon-9` | `9px` |

### Toast Message Bar

```css
.toast-msg-bar {
  background-color: var(--color--cta-primary);   /* black */
  width: 100%;
  height: 2rem;                                    /* 32px */
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}
.toast-msg { max-width: 432px; }
```

### Stats Section

```css
.section-stats {
  border-top: 1px solid var(--color--stroke-primary);
  height: 7.5rem;                                  /* 120px */
}
.section-stats-box.middle {
  border-right: 1px solid var(--color--stroke-primary);
  border-left: 1px solid var(--color--stroke-primary);
}
```

### Code Snippet Tab

```css
.tab-code-snippet {
  background-color: var(--color--bg-codesnippet);   /* black */
  height: 39.25rem;
  padding: 1.25rem;
}
```

### Logo Carousel

```css
.s-logo-carousel {
  grid-column-gap: 1.5rem;
  grid-row-gap: 1.5rem;
  justify-content: center;
  align-items: center;
  display: flex;
}
/* Scrollable on tablet */
@media (max-width: 991px) {
  .s-logo-carousel { width: 40rem; position: relative; overflow: hidden; }
}
/* Mobile */
@media (max-width: 767px) {
  .s-logo-carousel { width: 25rem; }
}
```

### Blog Detail Avatar

```css
.blog-detail-avatar { border-radius: 3rem; width: 2rem; height: 2rem; }
```

---

## 19. Footer

```css
.footer {
  flex-flow: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  padding: 5.75rem 1.25rem;              /* 92px top */
  display: flex;
}
@media (max-width: 767px) {
  .footer { padding-top: 3rem; padding-bottom: 3rem; }
}

.footer-wrap {
  grid-column-gap: 3rem;
  grid-row-gap: 3rem;
  flex-flow: column;
  width: 100%;
  max-width: 75rem;
  display: flex;
}

.footer-columns {
  grid-column-gap: 1rem;
  grid-row-gap: 1rem;
  grid-template-rows: auto;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  display: grid;
}
/* Tablet: 3 columns */
@media (max-width: 991px) {
  .footer-columns { grid-template-columns: 1fr 1fr 1fr; }
}
/* Mobile: column */
@media (max-width: 767px) {
  .footer-columns { grid-column-gap: 1.25rem; grid-row-gap: 1.25rem; flex-flow: column; display: flex; }
}
```

---

## 20. Rich Text Styles

### `.rtb-changelog`

```css
.rtb-changelog h2 { font-family: var(--font-family-sans); font-size: 1rem; line-height: 2rem; }
.rtb-changelog h1 { font-family: var(--font-family-sans); font-size: 1.25rem; line-height: 2rem; }
.rtb-changelog h3, .rtb-changelog h4 { font-family: var(--font-family-sans); font-size: 1rem; line-height: 2rem; }
.rtb-changelog h5 { font-size: .875rem; line-height: 1.5rem; }
.rtb-changelog h6 { font-family: var(--font-family-sans); font-size: .75rem; line-height: 1.25rem; }
.rtb-changelog p {
  font-family: var(--font-family-sans); color: var(--color--content-secondary);
  letter-spacing: -.01rem; font-size: 1rem; line-height: 1.5rem; margin-bottom: .5rem;
}
.rtb-changelog code {
  background-color: var(--color--bg-tertiary); font-family: var(--mono-400);
  font-size: .875rem; line-height: 1rem;
  padding: .15rem .25rem; margin: -.15rem .125rem; display: inline-flex;
}
```

### `.rtb-blog-detail`

```css
.rtb-blog-detail h1 { font-family: var(--font-family-sans); font-size: 2rem; line-height: 2.25rem; }
.rtb-blog-detail h2 { font-size: 1.75rem; line-height: 2.25rem; margin-top: 2.5rem; margin-bottom: 1rem; }
.rtb-blog-detail h3 { font-size: 1.375rem; line-height: 2rem; margin-top: 1rem; }
.rtb-blog-detail h4 { font-size: 1.125rem; line-height: 1.5rem; }
.rtb-blog-detail p {
  font-family: var(--font-family-sans); color: var(--color--content-secondary);
  letter-spacing: -.01rem; font-size: 1rem; line-height: 1.5rem; margin-bottom: .75rem; width: 98%;
}
.rtb-blog-detail a { color: var(--color--content-secondary); text-decoration-color: var(--color--content-tertiary); }
.rtb-blog-detail a:hover { color: var(--color--content-primary); }
.rtb-blog-detail code {
  background-color: var(--color--bg-secondary); font-family: var(--mono-400);
  font-size: .875rem; line-height: 1rem;
  padding: .15rem .25rem; margin: -.25rem .125rem; display: inline-flex;
}
.rtb-blog-detail blockquote {
  font-size: 1.5rem; line-height: 2rem; text-align: center;
  border: 0 solid #000; padding: 3rem 2rem 1rem;
}
.rtb-blog-detail figcaption { color: var(--color--content-tertiary); font-size: .75rem; line-height: 1rem; }
```

---

## 21. Accordion / FAQ

```css
.accordion-item {
  border-top: 1px solid var(--color--stroke-primary);
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}
.accordion-content {
  background-color: var(--color--bg-primary);
  width: 100%;
  padding-left: 3.25rem;
  padding-right: 3.25rem;
}
/* Mobile */
@media (max-width: 767px) { padding-left: 3rem; padding-right: 3rem; }
@media (max-width: 479px) { padding-left: 1rem; padding-right: 1rem; }
```

---

## 22. Dotted Background Pattern

```css
.bg-dotted {
  z-index: -1;
  background-image: url(https://cdn.prod.website-files.com/6717bb6618f6a40d53ac2929/674f1253921154edc8a2b28f_bg-dots.svg);
  background-position: 0 0;
  background-size: auto;
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0%;
  overflow: hidden;
}
```

---

## 23. Key Observations for Recreation

1. **Sharp corners everywhere** — `border-radius: 0` is the default for buttons, cards, tags, inputs. The only rounded elements are avatars (`3rem`) and LLM icons (`4rem`).

2. **Border-heavy design** — Nearly every section, card, and element uses `1px solid var(--color--stroke-primary)` (#d6d6d6) for structure. Negative margins (`-1px`) are used extensively to collapse borders between grid items.

3. **Monospace headings** — H1 and H2 use `IBM Plex Mono 700`. Body text uses `IBM Plex Sans`. Labels use `IBM Plex Mono 400/500`.

4. **Uppercase labels** — All `.label` and `.h1`/`.h2` have `text-transform: uppercase`.

5. **Minimal hover effects** — Most hovers just change opacity (`opacity: .8`), underline text, or shift border/background color slightly. No transforms or scale animations on standard elements.

6. **Grid-based layout** — Heavy use of CSS Grid with `grid-template-columns` for pricing tables, feature grids, and card layouts. Borders are created using `1px` gaps with background color instead of per-item borders in some areas (e.g., customer grid uses `background-color: var(--color--stroke-primary)` as grid gap color).

7. **Fixed header** — `position: fixed; inset: 0% 0% auto; z-index: 100; background-color: var(--color--bg-primary)`. Height determined by `.navbar` at `3.25rem` (52px).

8. **CSS custom properties for dark mode** — Dark mode tokens exist (`--dark--*`) but are not activated via `prefers-color-scheme`. They likely require a `.dark` class toggle on the body.

9. **No CSS gradients** — The gradient effect on the logo carousel uses `box-shadow: inset` instead of CSS linear-gradient.

10. **Webflow-specific** — Uses Webflow's IX2 interaction system, `@font-face` declarations for IBM Plex Mono (weights 400, 500, 700), and Webflow's built-in components (slider, tabs, forms, dropdown, lightbox).

---

## 24. Font Files

| Font | Weight | URL |
|---|---|---|
| IBM Plex Mono Bold | 700 | `https://cdn.prod.website-files.com/6717bb6618f6a40d53ac2929/672ccbde6a618d1db161a57b_IBMPlexMono-Bold.woff2` |
| IBM Plex Mono Medium | 500 | `https://cdn.prod.website-files.com/6717bb6618f6a40d53ac2929/672ccbdedee282e515dfa3b8_IBMPlexMono-Medium.woff2` |
| IBM Plex Mono Regular | 400 | `https://cdn.prod.website-files.com/6717bb6618f6a40d53ac2929/672ccbdee2483e0e0bffb407_IBMPlexMono-Regular.woff2` |

> Note: IBM Plex Sans is loaded separately (likely via Google Fonts or similar CDN). The CSS references `"IBM Plex Sans", sans-serif` but no `@font-face` is declared in this CSS file — it's likely loaded externally.

---

## 25. Finsweet Animation System

The `finsweet-animation.js` file provides a lightweight animation library with these capabilities:

### Configuration Defaults
```js
{
  duration: 0.3,        // 300ms default
  delay: 0,
  endDelay: 0,
  repeat: 0,
  easing: "ease"        // CSS-compatible easing string
}
```

### Supported Easing Functions
- Named: `ease`, `ease-in`, `ease-out`, `ease-in-out`, `linear`
- Cubic bezier arrays: `[x1, y1, x2, y2]`
- Step functions: `steps(n, "start"|"end")`

### Animatable Properties
The library can animate any numeric CSS property including:
- `opacity`, `transform` (translate, scale, rotate)
- Color values (hex, rgb, hsl)
- Dimensions (width, height)

### Key Methods
- `play()`, `pause()`, `cancel()`, `finish()` — playback control
- `reverse()` — direction control
- `commitStyles()` — persist animation state
- Supports `fill: "forwards"`, `fill: "backwards"`, `fill: "both"`

This library is NOT used for the main site animations — those are handled by Webflow's IX2 system. Finsweet is likely used for custom client-side interactions (e.g., accordion toggle animations, scroll reveal effects) that Webflow's native system doesn't handle.

---

## 26. Complete Hover/Focus/Active State Reference

| Selector | State | Property Changed |
|---|---|---|
| `a:hover, a:active` | hover/active | `outline: 0` |
| `.button.large.primary._w-fixed:hover` | hover | `background-color: var(--color--cta-primary-hover)` |
| `.button.large.secondary._w-fixed:hover` | hover | `border-color: var(--color--stroke-primary-hover)` |
| `.button.large.on-black._w-fixed:hover` | hover | `background-color: var(--color--bg-secondary)` |
| `.button.medium.primary:hover` | hover | `background-color: var(--color--cta-primary-hover)` |
| `.button.medium.secondary:hover` | hover | `border-color: var(--color--stroke-primary-hover)` |
| `.button.small.primary:hover` | hover | border + bg to `--color--cta-primary-hover` |
| `.button.small.secondary:hover` | hover | `border-color: var(--color--stroke-primary-hover)` |
| `.navbar-item:hover` | hover | color → primary, text-decoration → underline |
| `.navbar-dropdown:hover` | hover | color → primary, text-decoration → underline |
| `.navbar-dropdown-item:hover` | hover | `background-color: var(--color--bg-primary-hover)` |
| `.logo-right-click-menu-item:hover` | hover | `background-color: var(--color--bg-primary-hover)` |
| `.tab-link:hover` | hover | `text-decoration: underline` |
| `.tab-link-icon:hover` | hover | `text-decoration: underline` |
| `.p.small.link-none:hover` | hover | color → primary, text-decoration → underline |
| `.p.perex.link-underline:hover` | hover | color → tertiary |
| `.p.small.link-underline:hover` | hover | color → secondary, text-decoration → underline |
| `.label.link-underline:hover` | hover | `opacity: .8` |
| `.promo-banner-text:hover` | hover | `opacity: .8` |
| `.s-contact-cs:hover` | hover | `background-color: var(--color--bg-tertiary)` |
| `.h2-blog-featured:hover` | hover | `text-decoration: underline` |
| `.h3-blog-item:hover` | hover | `text-decoration: underline` |
| `.h4-blog-item:hover` | hover | `text-decoration: underline` |
| `.dropdown-item:hover` | hover | `background-color: var(--color--bg-secondary)` |
| `.rtb-blog-detail a:hover` | hover | `color: var(--color--content-primary)` |
| `.rtb-changelog a:hover` | hover | `color: var(--color--content-primary)` |
| `.w-input:focus, .w-select:focus` | focus | `border-color: #3898ec; outline: 0` |
| `.s-cookbook-search:focus` | focus | `border-color: var(--color--stroke-primary-hover); bg: var(--color--bg-tertiary); color: var(--color--content-primary)` |
| `.s-cookbook-search:hover` | hover | `border-color: var(--color--bg-tertiary); bg: var(--color--bg-tertiary)` |
| `.icon-18.llm-*` (non-active) | default | `opacity: .4; cursor: pointer` |
| `.w-lightbox-control:hover` | hover | `opacity: 1` |
| `.w-form-formradioinput--inputType-custom.w--redirected-focus` | focus | `box-shadow: 0 0 3px 1px #3898ec` |

---

*End of E2B Design Reference Audit*