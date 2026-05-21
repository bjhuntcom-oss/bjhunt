# E2B Enterprise Page — Complete Design Analysis

## File Manifest

| File | Path |
|---|---|
| Full page | `D:\bjhunt-v2\.tmp\e2b-full.png` |
| Hero | `D:\bjhunt-v2\.tmp\e2b-hero.png` |
| Stats | `D:\bjhunt-v2\.tmp\e2b-stats.png` |
| Bento grid | `D:\bjhunt-v2\.tmp\e2b-bento1.png` |
| Features 2 | `D:\bjhunt-v2\.tmp\e2b-features2.png` |
| Architecture | `D:\bjhunt-v2\.tmp\e2b-architecture.png` |
| Customers | `D:\bjhunt-v2\.tmp\e2b-customers.png` |
| CTA | `D:\bjhunt-v2\.tmp\e2b-cta.png` |
| DOM snapshot | `D:\bjhunt-v2\.tmp\e2b-snapshot.md` |

---

## Design System / CSS Custom Properties

### Colors
| Variable | Value | Usage |
|---|---|---|
| `--color--bg-primary` | `#FAFAFA` | Page background |
| `--color--bg-secondary` | `#EBEBEB` | Tags/badges background |
| `--color--bg-tertiary` | `#E6E6E6` | Tertiary backgrounds |
| `--color--content-primary` | `#000000` | Headings, primary text |
| `--color--content-secondary` | `#333333` | Body text |
| `--color--content-tertiary` | `#666666` | Secondary labels |
| `--color--content-quad` | `#999999` | Quaternary text |
| `--color--stroke-primary` | `#D6D6D6` | Card borders, dividers |
| `--color--stroke-primary-hover` | `#B8B8B8` | Hover state borders |
| `--color--brand` | `#FF8800` | Brand accent (orange) |
| `--color--cta-primary` | `#000000` | CTA button background |
| `--color--cta-primary-hover` | `#1F1F1F` | CTA hover |
| `--color--content-positive` | `#49A147` | Green accent |
| `--color--content-negative` | `#EB361C` | Red accent |
| `--color--accent-anthropic` | `#CC7D5D` | Partner accent |
| `--color--accent-meta` | `#0467DF` | Meta blue |
| `--color--accent-mistral` | `#FFA300` | Mistral orange |
| `--color--accent-gemini` | `#8E75B2` | Gemini purple |

### Typography
| Font | Weights | Usage |
|---|---|---|
| `IBM Plex Mono` | 400, 500, 700 | H1, H2 headings, code, leetspeak decorative text |
| `IBM Plex Sans` | 300, 400, 500 | Body text, H3 headings, labels |
| Fallback | `Arial, Helvetica Neue, Helvetica, sans-serif` | System fallback |

---

## Section-by-Section Analysis

### 1. Announcement Bar (Top)
- **Background**: `#000000` (black)
- **Height**: ~46px
- **Content**: Rotating case study banners with "CASE STUDY" badge
- **Badge**: `#222222` background, white text, small pill shape
- **CTA link**: "LEARN MORE →" in white
- **Border bottom**: `#D6D6D6` separator line

### 2. Navigation Bar
- **Layout**: Flex row, `gap: 24px`
- **Max-width**: `1200px`
- **Height**: `46px`
- **Padding**: `16px 0` on nav items
- **Background**: transparent (inherits `#FAFAFA`)
- **Links**: "Product", "Pricing", "Resources" (dropdown), "ENTERPRISE" (active), "BOOK A CALL"
- **Right side**: "CAREERS" link, social icons (GitHub, Discord, LinkedIn, X), dark mode toggle, "SIGN UP" (black bg button with `1px solid #000` border), "SIGN IN"
- **Logo**: SVG/IMG left-aligned

### 3. Hero Section
- **Padding**: `100px 0` (top/bottom)
- **Layout**: Flex column, `gap: 20px`
- **Max-width**: `1200px` centered, `padding: 0 20px` on outer container
- **Border**: Full-width container has `1px solid #D6D6D6` border

#### "Book A 30-MIN CALL TODAY" Link
- **Font**: IBM Plex Sans, uppercase
- **Color**: `#000000`
- **Position**: Above H1, acts as eyebrow CTA

#### H1 Heading
- **Text**: "BUILD SECURE AI AGENTS AT SCALE WITH E2B"
- **Font**: `IBM Plex Mono 700`, `60px`, `line-height: 56px`
- **Letter-spacing**: `-0.8px`
- **Color**: `#000000`
- **Text-align**: center
- **Max-width**: `864px`
- **Height**: `112px`

#### Subtitle
- **Font**: IBM Plex Sans, `14px`, `line-height: 20px`
- **Color**: `#333333`
- **Text-align**: center
- **Content**: "Open-source cloud infrastructure purpose-built for AI agents..."

#### CTA Buttons
- **Primary**: "Book a call" — `background: #000000`, white text, no border-radius
- **Secondary**: "Get started" — text link, no background

#### Trust Logos
- **Label**: "TRUSTED BY" in small caps
- **Logos**: HuggingFace, Manus, Groq, Lindy, and others as SVG/IMG
- **Layout**: Horizontal row, evenly spaced

### 4. Stats Section
- **Layout**: Flex row, 3 columns
- **Max-width**: `1200px`
- **Margin-top**: `92px`
- **Border-top**: `1px solid #D6D6D6`

#### Stat Items (×3)
| Stat | Font | Color |
|---|---|---|
| "94%" | IBM Plex Mono 700, ~60px | `#000000` |
| "of Fortune 100 COMPANIES" | IBM Plex Sans, uppercase, ~14px | `#333333` |
| "3M+" | IBM Plex Mono 700, ~60px | `#000000` |
| "MONTHLY DOWNLOADS" | IBM Plex Sans, uppercase, ~14px | `#333333` |
| "1B+" | IBM Plex Mono 700, ~60px | `#000000` |
| "STARTED SANDBOXES" | IBM Plex Sans, uppercase, ~14px | `#333333` |

- **Dividers**: `1px solid #D6D6D6` vertical lines between stats

### 5. Features Section Header
- **Layout**: Block, flex row with header + decorative text
- **Label**: "[FEATURES]" in IBM Plex Mono
- **Eyebrow**: "ENTERPRISE-READY" with leetspeak decorative variants (ENT3R-R1SE-R3ADY, etc.)
- **H2**: "ENTERPRISE-READY, DEVELOPER-FIRST"
  - Font: `IBM Plex Mono 700`, `60px`, `line-height: 56px`
  - Letter-spacing: `-0.8px`
  - Color: `#000000`
- **Subtitle**: "Open-source architecture delivering best-in-class performance..."
  - Font: IBM Plex Sans, `14px`, `#333333`

### 6. Bento Grid (3×3 Feature Cards)
- **Layout**: CSS Grid
- **Columns**: `398.885px 398.885px 398.885px` (3 equal columns)
- **Rows**: `316px 316px 316px` (3 equal rows)
- **Gap**: `1px` (creates border effect between cards)
- **Total width**: `1198.67px`
- **Card background**: `#FAFAFA` (same as page bg, borders visible via gap)
- **Border color**: `#D6D6D6` (applied as grid gap background)
- **Border-radius**: `0px` (sharp corners)
- **Box-shadow**: none

#### Card Layout (each card)
- **Display**: Flex row, `justify-content: center`
- **Padding**: `0 0 48px` (bottom padding for content)
- **Structure**: SVG illustration + text content (heading + description + CTA link)

#### Cards (left→right, top→bottom):
1. **BYOC + On-prem** — "E2B works where you do - deploy us securely in your own cloud or on premises." + "TALK TO OUR EXPERTS" link
2. **Secure & battle-tested** — "Enterprise-grade security features to protect your data, workloads, and credentials." + "SECURITY FIRST" badge
3. **Role-based access control** — "Define granular permissions for your team & transfer them from your cloud provider." + "TALK TO OUR EXPERTS" + "SOON" badge (`#EBEBEB` bg)
4. **Built to scale** — "E2B is the only provider proven to scale to hundreds of millions of sandboxes." + "LEARN HOW GROQ SCALES WITH E2B"
5. **Leader in open-source** — "Open-source infrastructure, SDKs, and observability dashboard." + "EXPLORE GITHUB"
6. **Isolation** — "Total isolation to protect your infrastructure and data from LLM-generated, unsecured code." + "How Groq Uses E2B Securely"
7. **SLA** — "Guaranteed uptime and support levels tailored to your operational needs." + "STATUS PAGE"
8. **US & EU Regions** — "Data and compute within the EU to comply with data residency regulations and the EU AI Act." + "TALK TO OUR EXPERTS"
9. **Self-hosting** — "Not ready to commit to an enterprise plan? Self-host E2B in your cloud of choice." + "self-hosting guide" link + decorative `*·` pattern

#### Card Typography
- **H3**: `IBM Plex Sans 700`, `16px`, `line-height: 20px`, `margin-bottom: 4px`, `#000000`
- **Description**: IBM Plex Sans, `14px`, `#333333`
- **CTA links**: Uppercase, IBM Plex Sans or Mono, `#000000`
- **Badges**: `#EBEBEB` background, small text, uppercase

#### SVG Illustrations
- **Style**: Line art / wireframe style
- **Color**: `#D6D6D6` stroke on `#FAFAFA` background
- **Type**: Technical diagrams, infrastructure icons, security shields, globe icons
- **Position**: Left side of each card (flex row layout)

### 7. Customers / Testimonials Section

#### Section Header
- **Label**: "[CUSTOMERS]" in IBM Plex Mono
- **Eyebrow**: "RUN ON E2B" with leetspeak decorative variants
- **H2**: "TOP COMPANIES RUN ON E2B"
  - Font: `IBM Plex Mono 700`, `60px`
- **Subtitle**: "From running short AI-generated code snippets, up to fully autonomous AI agents."
- **Decorative**: `print("...")` code snippet with SVG illustration

#### Testimonials Grid
- **Layout**: CSS Grid
- **Columns**: `398.885px 398.885px 398.885px` (3 equal columns)
- **Rows**: `262px 262px` (2 rows)
- **Gap**: `1px`
- **Total cards**: 6
- **Card background**: `#FAFAFA`
- **Border-radius**: `0px`

#### Card Layout (each testimonial)
- **Display**: Flex column
- **Padding**: `28px 32px 40px`
- **Structure**: Company logo → Quote text → Author → CTA link + tags

#### Testimonial Cards:
1. **GenSpark** — "E2B lets us scale to **thousands of concurrent sessions**, and we couldn't have hit $250M ARR if five of our FTEs were building sandboxes instead." — Kay Zhu, Co-founder & CTO. Tags: "Agentic workspace" (`#EBEBEB` bg). CTA: "Read THE CASE STUDY →"
2. **HuggingFace** — "E2B allows us to scale-out training runs by launching hundreds of sandboxes in our experiments, which was essential in Open R1." — Lewis Tunstall, Research Engineer. Tags: "CODE TESTS", "REINFORCEMENT LEARNING"
3. **Microsoft** — "E2B has revolutionized our agents' capabilities. This advanced alternative to OpenAI's Code Interpreter helps us focus on our unique product." — Kevin J. Scott, CTO/CIO. Tag: "AI CHATBOT"
4. **Manus** — "Manus doesn't just run some pieces of code. It uses 27 different tools, and it needs E2B to have a full virtual computer to work as a real human." — Tao Zhang, Co-founder. Tag: "DEEP RESEARCH"
5. **Lindy** — "We **integrated E2B in a week**, with an engineer working on that in spare time. Building this in-house would take us a weeks with multiple people." — Luiz Scheidegger, Head of Engineering. Tag: "AI **executive assistant**"
6. **Groq** — "We needed a **fast, secure, and scalable** way for code execution. E2B's API interface made their infrastructure almost effortless to integrate." — Benjamin Klieger, Compound AI Lead. Tag: "COMPOUND AI SYSTEM"

#### Quote Typography
- **Quote text**: IBM Plex Sans, `14px`, `#333333`
- **Bold emphasis**: `font-weight: 700` within quotes
- **Author**: IBM Plex Sans, `14px`, `#666666`
- **Tags**: `#EBEBEB` background, uppercase, small text
- **CTA link**: "Read THE CASE STUDY →" uppercase

### 8. CTA Section (Book a Call)
- **Padding-top**: `128px`
- **Label**: "[BOOK A CALL]" in IBM Plex Mono
- **H2**: "Book a free GenAI Blueprint Consultation"
  - Font: `IBM Plex Mono 700`, `60px`
- **Eyebrow**: "BOOK A FREE" with leetspeak variants
- **Calendly embed**: iframe-based booking widget

### 9. Investors Section
- **Label**: "TOP INVESTORS" with leetspeak variants
- **H2**: "BACKED BY TOP INVESTORS"
- **Investor logos**: 4 SVG/IMG logos in a row
- **Layout**: Block with centered content

### 10. Community Section (3-column grid)
- **Layout**: CSS Grid, `400.219px 400.219px 400.219px`
- **Cards**: 3 cards
  1. **Github** — "(=^･^=)" cat ASCII art, "See our complete codebase, Cookbook examples, and more — all in one place." + "STAR (12.2K+) ↗"
  2. **Discord** — "(o_o)" ASCII art, "Become part of AI developers community & get support from the E2B team." + "Join Today ↗"
  3. **Docs** — "[===]" progress bar ASCII, "See the walkthrough of how E2B works, including hello world examples." + "Browse"

### 11. Footer
- **Padding**: `92px 20px`
- **Layout**: Flex column
- **Columns**: Site, Company, Social, Status
- **Background**: transparent
- **Border-top**: `1px solid #D6D6D6`
- **Trust badges**: SOC 2, other compliance badges
- **Copyright**: "©2026 ✶ FoundryLabs, Inc."

---

## Key Design Patterns

### 1. Leetspeak Decorative Text
- Every section heading has leetspeak variants (ENT3RPR1SE, RUN 0N E2B, etc.)
- Used as decorative/branding element
- Font: IBM Plex Mono
- Creates a hacker/developer aesthetic

### 2. 1px Grid Gap as Border
- Both bento and testimonial grids use `gap: 1px` with `#D6D6D6` background
- Creates clean, sharp borders between cards
- No border-radius anywhere — brutalist aesthetic

### 3. Sharp Corners Everywhere
- `border-radius: 0px` on all elements
- No rounded buttons, cards, or inputs
- Contributes to technical/brutalist feel

### 4. Monospace Headings
- All H1/H2 use IBM Plex Mono 700 at 60px
- Creates typewriter/terminal aesthetic
- Negative letter-spacing (-0.8px) for tight, dense feel

### 5. Section Bracket Labels
- "[FEATURES]", "[CUSTOMERS]", "[BOOK A CALL]" in monospace
- Acts as section anchors
- Reinforces code/terminal aesthetic

### 6. No Box Shadows
- `box-shadow: none` everywhere
- Flat design with borders as sole depth indicator
- Clean, minimal aesthetic

### 7. Consistent Spacing
- Section padding: `100px` vertical for hero, `128px` for CTA, `92px` for footer
- Card padding: `28px 32px 40px` (testimonials), `0 0 48px` (bento)
- Grid gap: `1px` consistently
- Container max-width: `1200px` with `20px` side padding

### 8. Dark Mode Support
- Full dark mode CSS variables defined (`--dark--*`)
- Toggle button in nav
- Dark bg: `#000000`, dark cards: `#141414`, dark borders: `#292929`

---

## SVG Illustration Style
- **Line art / wireframe** style
- **Stroke color**: `#D6D6D6` on light mode
- **No fills** (or transparent fills)
- **Technical diagrams**: infrastructure, servers, security shields, network topology
- **Position**: Left side of bento cards, above testimonials
- **Size**: ~100-150px width, proportional height
- **Animation**: Static (no CSS animations detected)

## Hover Effects
- **CTA buttons**: `#000000` → `#1F1F1F` background
- **Links**: Color shift to `#B8B8B8` (stroke-primary-hover)
- **Nav items**: Subtle color change
- **No transform/scale animations** detected
