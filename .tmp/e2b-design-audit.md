# E2B Docs Design System Audit

> Source: https://e2b.dev/docs
> Date: 2026-05-20
> Framework: Mintlify (Next.js + Tailwind CSS v3.4.19)

---

## 1. CSS Files

| # | File | Purpose |
|---|------|---------|
| 1 | `9e8832c8599d2dba.css` | Font faces (Inter, JetBrains Mono) |
| 2 | `1accfb39600dfcdc.css` | Tailwind CSS v3.4.19 base + utilities + prose |
| 3 | `05d6d8fcb903870d.css` | App-specific styles (Twoslash, code blocks, components) |

### Inline Style Tags
- **Tag 0**: `--banner-height: 0px` (banner override)
- **Tag 1**: Core design tokens (primary, gray scale, backgrounds)
- **Tag 2**: Custom overrides (IBM Plex Mono, callout colors, version switcher, scrollbar hiding)

---

## 2. Typography

### Font Families

```css
/* Body & UI */
--font-inter: "Inter", "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif

/* Code */
--font-jetbrains-mono: "JetBrains Mono", "JetBrains Mono Fallback", SF Mono, SFMono-Regular, Menlo, Monaco, Cascadia Mono, Segoe UI Mono, Roboto Mono, Oxygen Mono, Ubuntu Monospace, Source Code Pro, Fira Mono, Droid Sans Mono, Consolas, Courier New, monospace

/* Custom override (inline) */
code { font-family: "IBM Plex Mono"; }
```

### Font Feature Settings
```css
html { font-feature-settings: "cv02", "cv03", "cv04", "cv11"; }
```

### Typography Scale

| Element | Font Size | Font Weight | Line Height | Letter Spacing | Margin Top | Margin Bottom |
|---------|-----------|-------------|-------------|----------------|------------|---------------|
| H1 | 2.25em (36px) | 800 | 1.111 | -0.75px | 0 | 0.889em |
| H2 | 1.5em (24px) | 700 | 1.333 | -0.6px | 2em (48px) | 0.667em (16px) |
| H3 | 1.25em (20px) | 600 | 1.4 | - | 2.4em | 0.6em |
| H4 | 1.125em (18px) | 600 | 1.5 | - | 2em | 0.5em |
| Body (p) | 16px (1rem) | 400 | 28px (1.75) | - | - | 1.25em (20px) |
| Small text | 14px (0.875rem) | 400 | 20px (1.429) | - | - | - |
| Inline code | 0.875em (14px) | 500 | - | - | - | - |
| Code block | 14px | 400 | 24px | - | - | - |
| Lead | 1.25em (20px) | - | 1.6 | - | 1.2em | 1.2em |

### Prose (Content) Colors
```css
.prose { color: rgb(var(--gray-700)); }           /* rgb(70, 66, 62) */
.prose strong { color: rgb(var(--gray-900)); }     /* rgb(30, 26, 22) */
.prose a { 
  color: var(--tw-prose-links);
  font-weight: 600;
  border-bottom: 1px solid rgb(var(--primary));    /* orange underline */
}
.prose code { 
  color: var(--tw-prose-code);
  font-weight: 500;
  font-size: 0.875em;
  font-variant-ligatures: none;
}
.prose blockquote {
  font-weight: 400;
  font-style: normal;
  color: rgb(var(--gray-700));
  border-left-width: 4px;
  border-color: rgb(var(--gray-200));              /* rgb(230, 226, 222) */
  padding-left: 1.5rem;
}
.prose hr {
  border-color: rgb(var(--gray-100));              /* rgb(245, 242, 238) */
  border-top-width: 1px;
  margin-top: 3em;
  margin-bottom: 3em;
}
```

---

## 3. Color Palette

### Primary Colors (RGB values for Tailwind `rgb(var(--xxx)/opacity)`)

| Variable | RGB Values | Hex Equivalent | Usage |
|----------|------------|----------------|-------|
| `--primary` | `255 136 0` | `#FF8800` | Active links, accents, hover borders |
| `--primary-light` | `255 136 0` | `#FF8800` | Dark mode primary |
| `--primary-dark` | `229 123 0` | `#E57B00` | Darker accent |
| `--tooltip-foreground` | `255 255 255` | `#FFFFFF` | Tooltip text |

### Background Colors

| Variable | RGB Values | Hex | Usage |
|----------|------------|-----|-------|
| `--background-light` | `255 255 255` | `#FFFFFF` | Light mode page bg |
| `--background-dark` | `0 0 0` | `#000000` | Dark mode page bg |

### Gray Scale (Warm gray with beige tint)

| Variable | RGB Values | Hex | Usage |
|----------|------------|-----|-------|
| `--gray-50` | `250 247 242` | `#FAF7F2` | Lightest bg |
| `--gray-100` | `245 242 238` | `#F5F2EE` | Borders, dividers, code bg |
| `--gray-200` | `230 226 222` | `#E6E2DE` | Blockquote borders, subtle borders |
| `--gray-300` | `213 210 206` | `#D5D2CE` | Focus borders |
| `--gray-400` | `166 162 158` | `#A6A29E` | Placeholder text, muted text, TOC |
| `--gray-500` | `119 116 111` | `#77746F` | Body text, sidebar labels |
| `--gray-600` | `87 84 79` | `#57544F` | Inline code, secondary text |
| `--gray-700` | `70 66 62` | `#46423E` | Prose text, nav links |
| `--gray-800` | `45 41 37` | `#2D2925` | Headings, strong text |
| `--gray-900` | `30 26 22` | `#1E1A16` | H1 color, bold text |
| `--gray-950` | `17 14 10` | `#110E0A` | Darkest text |

### Prose Invert (Dark Mode) Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--tw-prose-invert-body` | `#D6D3D1` | Body text |
| `--tw-prose-invert-headings` | `#FFFFFF` | Headings |
| `--tw-prose-invert-lead` | `#A8A29E` | Lead text |
| `--tw-prose-invert-links` | `#FFFFFF` | Links |
| `--tw-prose-invert-bold` | `#FFFFFF` | Bold text |
| `--tw-prose-invert-counters` | `#A8A29E` | List counters |
| `--tw-prose-invert-bullets` | `#57534E` | Bullet points |
| `--tw-prose-invert-hr` | `#44403C` | Horizontal rules |
| `--tw-prose-invert-quotes` | `#F5F5F4` | Quote text |
| `--tw-prose-invert-quote-borders` | `#44403C` | Quote borders |
| `--tw-prose-invert-code` | `#FFFFFF` | Code text |
| `--tw-prose-invert-pre-bg` | `rgb(0 0 0/50%)` | Code block bg |

---

## 4. Border Radius System

| Token | Value | Usage |
|-------|-------|-------|
| `--rounded-sm` | `0.125rem` (2px) | Small elements |
| `--rounded` | `0.25rem` (4px) | Default, scrollbar thumb |
| `--rounded-md` | `0.375rem` (6px) | Inline code, copy button |
| `--rounded-lg` | `0.5rem` (8px) | Medium elements |
| `--rounded-xl` | `0.75rem` (12px) | Code block bottom-right |
| `--rounded-xt` | `14px` | Code block wrapper |
| `--rounded-2xl` | `1rem` (16px) | Cards, code block top-right |
| `--rounded-3xl` | `1.5rem` (24px) | Large elements |
| `--rounded-search` | `1.25rem` (20px) | Search bar |
| `--rounded-full` | `9999px` | Pills, avatars |

### Hardcoded Border Radius Values Found
- `4px` - Sign In button
- `6px` - Copy button, TOC link hover, twoslash highlighted
- `8px` - General small elements
- `10px` - Twoslash popover
- `12px` - Search bar, theme toggle button
- `14px` - Code block wrapper
- `16px` - Cards (rounded-2xl)

---

## 5. Spacing System

### Key Spacing Values
```css
--spacing-16-14: 1.142857142857143em   /* 16px at 14px base */
--spacing-8-14: 0.571428571428571em    /* 8px at 14px base */
--scroll-mt: 9.5rem (desktop) / 6.3rem (mobile)  /* Scroll margin top */
--page-padding: 0px
--banner-height: 0px
```

### Common Spacing Patterns
- Card inner padding: `20px 24px` (py-5 px-6)
- Code block padding: `14px 16px`
- Sidebar link padding: `6px 12px 6px 16px` (py-2 pl-4 pr-3)
- Sidebar section gap: `12px` (mb-3)
- Prose paragraph margin: `1.25em` top/bottom (20px)
- Prose list item margin: `0.5em` top/bottom
- H2 margin: `48px 0 16px`
- Footer padding: `40px 0 112px`
- Footer gap: `48px`

---

## 6. Component Styles

### 6.1 Sidebar (`#sidebar`)

```css
/* Container */
width: 304px;
position: fixed;
display: flex;
flex-direction: column;
border-right: 0.667px solid rgba(230, 226, 222, 0.7);  /* gray-200 at 70% */

/* Section headers (Documentation, SDK Reference, API reference) */
padding: 0 0 0 16px;
margin: 0 0 12px;
font-size: 14px;
font-weight: 600;
line-height: 24px;
color: rgb(255, 136, 0);  /* primary for active section */
display: flex;
align-items: center;
gap: 14px;

/* Active nav link */
padding: 6px 12px 6px 16px;
margin: 0 0 0 16px;
font-size: 14px;
font-weight: 400;
line-height: 20px;
color: rgb(255, 136, 0);  /* primary */
border-left: 0.667px solid rgb(255, 136, 0);  /* primary */
width: calc(100% - 1rem);
text-shadow: -0.2px 0 0 currentColor, 0.2px 0 0 currentColor;

/* Inactive nav link */
padding: 6px 12px 6px 16px;
margin: 0 0 0 16px;
font-size: 14px;
font-weight: 400;
line-height: 20px;
color: rgb(70, 66, 62);  /* gray-700 */
border-left: 0.667px solid rgba(17, 14, 10, 0.05);  /* gray-950/5 */
width: calc(100% - 1rem);

/* Inactive nav link HOVER */
color: rgb(30, 26, 22);  /* gray-900 */
border-left-color: rgba(17, 14, 10, 0.2);  /* gray-950/20 */

/* Dark mode inactive */
color: rgb(166, 162, 158);  /* gray-400 */
border-left-color: rgba(255, 255, 255, 0.1);  /* white/10 */

/* Dark mode inactive HOVER */
color: rgb(213, 210, 206);  /* gray-300 */
border-left-color: rgba(255, 255, 255, 0.2);  /* white/20 */

/* TOC link ("On this page" items) */
padding: 4px 0 4px 16px;
font-size: 14px;
line-height: 24px;

/* TOC active */
font-weight: 500;
color: rgb(255, 136, 0);  /* primary */
border-left: 0.667px solid rgb(255, 136, 0);

/* TOC inactive */
font-weight: 400;
color: rgb(166, 162, 158);  /* gray-400 */
border-left: 0.667px solid rgba(255, 255, 255, 0.1);

/* TOC inactive HOVER */
color: rgb(30, 26, 22);  /* gray-900 */
border-left-color: rgba(17, 14, 10, 0.2);
```

### 6.2 Search Bar

```css
width: 186px;
height: 36px;
padding: 0 12px 0 14px;
font-size: 14px;
background-color: rgb(255, 255, 255);  /* white */
color: rgb(119, 116, 111);  /* gray-500 */
border-radius: 12px;
gap: 8px;
display: flex;
align-items: center;
justify-content: space-between;
box-shadow: 
  rgb(255, 255, 255) 0 0 0 0px,
  rgba(166, 162, 158, 0.3) 0 0 0 1px,  /* gray-400 at 30% */
  rgba(0, 0, 0, 0) 0 0 0 0px;
overflow: hidden;
```

### 6.3 Cards

```css
/* Card wrapper */
display: block;
position: relative;
margin: 8px 0;
width: 100%;
cursor: pointer;
border-radius: 16px;  /* rounded-2xl */
background-color: rgb(255, 255, 255);  /* white */
border: 0.667px solid rgba(17, 14, 10, 0.1);  /* gray-950/10 */
overflow: hidden;
ring: 2px ring-transparent;

/* Card HOVER */
border-color: rgb(255, 136, 0) !important;  /* primary */

/* Card inner */
padding: 20px 24px;  /* py-5 px-6 */

/* Card title (first p) */
color: rgb(70, 66, 62);  /* gray-700 */
font-size: 16px;
font-weight: 600;

/* Card description (second p) */
color: rgb(166, 162, 158);  /* gray-400 */
font-size: 14px;
font-weight: 400;

/* Dark mode card */
background-color: rgb(0, 0, 0);  /* background-dark */
border-color: rgba(255, 255, 255, 0.1);  /* white/10 */

/* Dark mode card HOVER */
border-color: rgb(255, 136, 0) !important;  /* primary-light */

/* Card group (grid) */
display: grid;
gap: 16px;  /* gap-4 */
```

### 6.4 Code Blocks

```css
/* Code block wrapper */
width: 666.667px;  /* fits in 672px content area */
min-height: 52px;
padding: 14px 16px;
background-color: rgb(255, 255, 255);  /* white */
color: rgb(17, 14, 10);  /* gray-950 */
font-size: 14px;
line-height: 24px;
border-radius: 14px;
border: 0.667px solid rgb(245, 242, 238);  /* gray-100 */
overflow: auto;
position: relative;

/* Code block header variables */
--code-padding-right: 48px;
--fade-width: 0px;

/* Code block with 1 floating button */
--fade-width: 99px;
--code-padding-right: 99px;

/* Code block with 2 floating buttons */
--fade-width: 131px;
--code-padding-right: 131px;

/* Code block with 3 floating buttons */
--fade-width: 163px;
--code-padding-right: 163px;

/* Fade overlay (right side gradient) */
position: absolute;
top: 0;
right: 0;
z-index: 1;
height: 44px;
border-top-right-radius: 16px;  /* rounded-2xl */
border-bottom-right-radius: 12px;  /* rounded-xl */
background: linear-gradient(to right,
  transparent 0,
  color-mix(in srgb, var(--background-light) 20%, transparent) 10px,
  color-mix(in srgb, var(--background-light) 50%, transparent) 25px,
  color-mix(in srgb, var(--background-light) 80%, transparent) 35px,
  var(--background-light) 45px
);

/* Pre element */
font-size: 14px;
line-height: 24px;
color: rgb(36, 41, 46);

/* Code element inside pre */
padding: 0 48px 0 0;

/* Inline code (not in pre) */
border-radius: 6px;  /* rounded-md */
background-color: rgb(var(--gray-100)/0.5);  /* gray-100 at 50% */
padding: 0.125rem 0.5rem;
line-height: 1.5;
color: rgb(var(--gray-600));
overflow-wrap: break-word;
box-decoration-break: clone;

/* Inline code dark mode */
border-color: rgb(var(--gray-800));
background-color: rgb(255 255 255/0.05);
color: rgb(var(--gray-200));

/* Line highlight */
background: rgb(var(--primary-light)/0.2) !important;
border-left: 1px solid rgb(var(--primary-light)/1);

/* Line diff - add */
background: rgb(34 197 94/0.15) !important;  /* green-500 at 15% */
border-left: 1px solid rgb(34 197 94/0.8);

/* Line diff - remove */
background: rgb(239 68 68/0.15) !important;  /* red-500 at 15% */
border-left: 1px solid rgb(239 68 68/0.8);

/* Focused lines */
filter: blur(0.1rem);
transition: filter 0.35s, opacity 0.35s;
```

### 6.5 Copy Button

```css
width: 26px;
height: 26px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 6px;  /* rounded-md */
background-color: transparent;
backdrop-filter: blur();
```

### 6.6 Callout / Info Boxes

From inline styles (custom overrides):

```css
/* Note callout - light mode */
.callout[data-callout-type="note"] {
  border-color: rgb(249 115 22 / 0.2) !important;  /* orange-500 at 20% */
  background-color: rgb(255 247 237 / 0.5) !important;  /* orange-50 at 50% */
}
.callout[data-callout-type="note"],
.callout[data-callout-type="note"] *:not(a) {
  color: rgb(124 45 18) !important;  /* orange-900-ish */
}

/* Note callout - dark mode */
.dark .callout[data-callout-type="note"] {
  border-color: rgb(249 115 22 / 0.3) !important;  /* orange-500 at 30% */
  background-color: rgb(249 115 22 / 0.1) !important;  /* orange-500 at 10% */
}
.dark .callout[data-callout-type="note"],
.dark .callout[data-callout-type="note"] *:not(a) {
  color: rgb(255, 183, 102) !important;  /* light orange */
}

/* Print: avoid page breaks */
[data-callout-type] {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

### 6.7 Table of Contents (Right Sidebar)

```css
width: 264px;
font-size: 14px;
color: rgb(87, 84, 79);  /* gray-600 */

/* TOC heading ("On this page") */
font-size: 14px;
font-weight: 500;

/* TOC link */
padding: 4px 0 4px 16px;
font-size: 14px;
line-height: 24px;
border-left: 0.667px solid transparent;

/* TOC link HOVER */
border-left-color: rgba(17, 14, 10, 0.2);
color: rgb(30, 26, 22);  /* gray-900 */
```

### 6.8 Footer / Pagination Area

```css
/* Footer container */
padding: 40px 0 112px;
border-top: 0.667px solid rgb(245, 242, 238);  /* gray-100 */
display: flex;
gap: 48px;

/* Social links */
font-size: 16px;
color: rgb(119, 116, 111);  /* gray-500 */

/* "Powered by Mintlify" */
font-size: 14px;
line-height: 20px;
color: rgb(166, 162, 158);  /* gray-400 */
display: flex;
align-items: baseline;
gap: 4px;

/* "Powered by Mintlify" HOVER */
color: rgb(87, 84, 79);  /* gray-600 */
```

### 6.9 Top Header Bar

```css
height: 68px;
background-color: transparent;
```

### 6.10 Main Content Area

```css
width: 672px;
margin: 0 84.333px;  /* centered between sidebar and TOC */
display: flex;
flex-direction: column;
```

### 6.11 Version Switcher (Custom)

From inline styles:

```css
/* Light mode */
background-color: rgba(255, 136, 0, 0.1);   /* 10% orange tint */
color: #ff8800;                               /* Orange text */
border: 1px solid rgba(255, 136, 0, 0.3);   /* 30% orange border */
border-radius: 6px;
padding: 0.5rem 1rem;
font-weight: 500;
transition: all 0.2s ease;

/* Light mode HOVER */
background-color: rgba(255, 136, 0, 0.15);
border-color: rgba(255, 136, 0, 0.5);

/* Dark mode */
background-color: rgba(255, 136, 0, 0.15);
color: #ffaa44;
border-color: rgba(255, 136, 0, 0.4);

/* Dark mode HOVER */
background-color: rgba(255, 136, 0, 0.25);
border-color: rgba(255, 136, 0, 0.6);
```

### 6.12 Sign In Button (Custom)

From inline styles:

```css
/* Light mode */
background-color: black;
color: white !important;
padding: 0.5rem 1rem;
border-radius: 4px;
transition: background-color 0.2s ease;

/* Light mode HOVER */
background-color: #333;

/* Dark mode */
background-color: white;
color: black !important;

/* Dark mode HOVER */
background-color: #f3f3f3;
```

---

## 7. Scrollbar Styling

```css
/* Light mode */
--scrollbar-track: transparent;
--scrollbar-thumb: rgba(0, 0, 0, 0.15);  /* black/15 */
--scrollbar-thumb-hover: rgba(0, 0, 0, 0.2);  /* black/20 */
--scrollbar-thumb-active: rgba(0, 0, 0, 0.2);  /* black/20 */
--scrollbar-thumb-radius: var(--rounded, 0.25rem);  /* 4px */

/* Dark mode */
--scrollbar-thumb: rgba(255, 255, 255, 0.2);  /* white/20 */
--scrollbar-thumb-hover: rgba(255, 255, 255, 0.25);  /* white/25 */
--scrollbar-thumb-active: rgba(255, 255, 255, 0.25);  /* white/25 */

/* Scrollbar dimensions */
--scrollbar-width: 16px;
--scrollbar-height: 16px;
```

---

## 8. Twoslash (TypeScript Hover Types)

```css
/* Light mode */
--twoslash-border-color: #dbdfde;
--twoslash-popup-bg: #f3f7f6;
--twoslash-popup-shadow: rgba(0, 0, 0, 0.08) 0px 1px 4px;
--twoslash-text-size: 0.8rem;
--twoslash-error-color: #d45656;
--twoslash-error-bg: #d4565620;
--twoslash-warn-color: #c37d0d;
--twoslash-warn-bg: #c37d0d20;
--twoslash-tag-color: #3772cf;
--twoslash-tag-bg: #3772cf20;
--twoslash-tag-annotate-color: #1ba673;
--twoslash-tag-annotate-bg: #1ba67320;

/* Dark mode */
--twoslash-border-color: #222526;
--twoslash-popup-bg: #151819;
--twoslash-error-color: #ff6b6b;
--twoslash-error-bg: #ff6b6b30;
--twoslash-warn-color: #ffa500;
--twoslash-warn-bg: #ffa50030;
--twoslash-tag-color: #6bb6ff;
--twoslash-tag-bg: #6bb6ff30;
--twoslash-tag-annotate-color: #4ade80;
--twoslash-tag-annotate-bg: #4ade8030;

/* Popover */
border-radius: 10px;
padding: 6px;
max-width: 50vw;
border: 1px solid var(--twoslash-border-color);
box-shadow: var(--twoslash-popup-shadow);
```

---

## 9. Link Styles

```css
/* Prose links */
color: var(--tw-prose-links);
font-weight: 600;
text-decoration: none;
border-bottom: 1px solid rgb(var(--primary));  /* orange underline */
word-wrap: break-word;

/* Link HOVER (prose) */
border-bottom-width: 2px;
text-decoration-color: rgb(var(--primary-light));

/* Sidebar link HOVER */
color: rgb(30, 26, 22);  /* gray-900 */
border-left-color: rgba(17, 14, 10, 0.2);  /* gray-950/20 */
```

---

## 10. List Styles

```css
/* Unordered lists */
list-style-type: none;
margin-top: 1.25em;
margin-bottom: 1.25em;
padding-inline-start: 1.625em;
padding-left: 0;

/* List item */
margin-top: 0.5em;
margin-bottom: 0.5em;

/* Bullet marker */
color: var(--tw-prose-bullets);  /* rgb(87, 83, 78) */

/* Ordered lists */
list-style-type: decimal;
margin-top: 1.25em;
margin-bottom: 1.25em;
padding-inline-start: 2.125em;

/* Ordered list marker */
font-weight: 400;
color: var(--tw-prose-counters);  /* rgb(168, 162, 158) */
```

---

## 11. Table Styles

```css
.prose table {
  width: 100%;
  table-layout: auto;
  text-align: start;
  margin-top: 2em;
  margin-bottom: 2em;
  font-size: 0.875rem;
  line-height: 1.25rem;
  display: block;
  overflow: auto;
}
```

---

## 12. Focus States

```css
:focus {
  outline-color: rgb(var(--primary)/1);  /* orange */
}

html.dark :focus {
  outline-color: rgb(var(--primary-light)/1);  /* orange */
}

/* Ring */
--tw-ring-offset-width: 2px;
--tw-ring-offset-color: #fff;
--tw-ring-color: rgb(var(--primary-light)/var(--tw-ring-opacity, 1));
--tw-ring-opacity: 1;
```

---

## 13. Transitions & Animations

```css
/* General transition */
transition: all 0.2s ease;  /* buttons, links */
transition: border-color 0.3s;  /* twoslash hover */
transition: filter 0.35s, opacity 0.35s;  /* code focus */

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}

/* Enter/Exit animations (Radix) */
--tw-enter-opacity: 0;
--tw-enter-scale: .95;
--tw-enter-translate-x: -0.5rem;
--tw-enter-translate-y: 0.5rem;
--tw-exit-opacity: 0;
--tw-exit-scale: .95;
```

---

## 14. Layout Dimensions Summary

| Element | Width | Height | Position |
|---------|-------|--------|----------|
| Sidebar | 304px | 100vh | Fixed left |
| Main content | 672px | Auto | Centered (margin: 0 84px) |
| TOC | 264px | Auto | Right side |
| Search bar | 186px | 36px | In sidebar |
| Card | 328px (in 2-col grid) | 181px | In content |
| Code block | 667px | Auto | In content |
| Header bar | Full width | 68px | Fixed top |
| Footer | 672px | Auto | Bottom of content |

---

## 15. Complete CSS Variable Reference

```css
:root {
  /* Primary */
  --primary: 255 136 0;
  --primary-light: 255 136 0;
  --primary-dark: 229 123 0;
  
  /* Backgrounds */
  --tooltip-foreground: 255 255 255;
  --background-light: 255 255 255;
  --background-dark: 0 0 0;
  
  /* Gray scale */
  --gray-50: 250 247 242;
  --gray-100: 245 242 238;
  --gray-200: 230 226 222;
  --gray-300: 213 210 206;
  --gray-400: 166 162 158;
  --gray-500: 119 116 111;
  --gray-600: 87 84 79;
  --gray-700: 70 66 62;
  --gray-800: 45 41 37;
  --gray-900: 30 26 22;
  --gray-950: 17 14 10;
  
  /* Fonts */
  --font-inter: "Inter", ...;
  --font-jetbrains-mono: "JetBrains Mono", ...;
  
  /* Borders */
  --default-border-color: var(--gray-100);  /* light */
  /* .dark */
  --default-border-color: var(--gray-800);  /* dark */
  
  /* Spacing */
  --spacing-16-14: 1.142857142857143em;
  --spacing-8-14: 0.571428571428571em;
  --scroll-mt: 9.5rem;  /* desktop */
  --scroll-mt: 6.3rem;  /* <1024px */
  
  /* Scrollbar */
  --scrollbar-track: transparent;
  --scrollbar-thumb: rgb(255 255 255/0.2);  /* dark */
  --scrollbar-thumb-hover: rgb(255 255 255/0.25);
  --scrollbar-thumb-active: rgb(255 255 255/0.25);
  --scrollbar-thumb-radius: var(--rounded, 0.25rem);
  
  /* Banner */
  --banner-height: 0px;
  --page-padding: 0px;
}
```

---

## 16. Key Design Decisions

1. **Warm gray palette** - Not neutral gray; has a warm beige undertone (F5F2EE vs F5F5F5)
2. **Orange primary** - `#FF8800` used consistently for active states, links, accents
3. **Subtle borders** - 0.667px (2/3px) borders with low opacity (5%-10%) for inactive states
4. **Left border indicators** - Sidebar uses left border (not background) for active state
5. **Rounded cards** - 16px border-radius for cards, 14px for code blocks
6. **No shadows on cards** - Cards use borders only, no box-shadow
7. **Prose max-width** - 672px content width (optimal reading width)
8. **Overlay scrollbars** - `overflow-y: overlay` for non-intrusive scrollbars
9. **Font features** - cv02, cv03, cv04, cv11 enabled for Inter (alternate glyphs)
10. **Mintlify platform** - Built on Mintlify docs platform with custom overrides

---

## 17. JavaScript Files (Critical for Layout)

| Chunk | Purpose |
|-------|---------|
| `webpack-*.js` | Webpack runtime |
| `87c73c54-*.js` | React/Next.js core |
| `90018-*.js` | Layout components |
| `main-app-*.js` | Main app entry |
| `891cff7f-*.js` | MDX content rendering |
| `78238-*.js` | Sidebar/TOC components |
| `51288-*.js` | Search functionality |
| `95115-*.js` | Code block/shiki rendering |
| `14079-*.js` | Callout components |
| `31267-*.js` | Card components |
| `98816-*.js` | Navigation/pagination |
| `80239-*.js` | Feedback component |
| `19664-*.js` | Tabs component |
| `8685-*.js` | Table components |
| `55016-*.js` | Twoslash integration |
| `39408-*.js` | Theme toggle |
| `71251-*.js` | Scroll/anchor handling |
| `layout-*.js` | Layout wrapper |
| `page-*.js` | Page rendering |
| `posthog-recorder.js` | Analytics |

---

*Audit complete. All CSS files saved to `.tmp/e2b-css/`. Screenshots captured for sidebar, search, code blocks, and full page.*
