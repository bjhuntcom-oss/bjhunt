# 17 — Design System

> Identite visuelle, composants, couleurs, typographie, animations.
> Cybersecurite = sombre, technique, precis. Pas de "friendly SaaS" generique.

## Identite visuelle

### Direction artistique

BJHUNT est une plateforme de **cybersecurite offensive**. Le design doit evoquer :
- **Precision** — interfaces de monitoring, terminaux, dashboards de controle
- **Puissance** — l'IA travaille pour toi, en temps reel
- **Confiance** — securite, chiffrement, isolation
- **Technique** — pas de emojis, pas de kawaii, pas de pastel

Inspiration : interfaces de C2 (Cobalt Strike, Sliver), Bloomberg Terminal,
dashboards de SOC (Security Operations Center), UI de CTF platforms.

### Palette de couleurs

```css
:root {
  /* Background */
  --bg-primary: #0A0A0F;        /* Noir profond (background principal) */
  --bg-secondary: #111118;      /* Noir leger (cards, panels) */
  --bg-tertiary: #1A1A24;       /* Gris tres sombre (hover, active) */
  --bg-elevated: #22222E;       /* Cards elevees */

  /* Text */
  --text-primary: #E8E8ED;      /* Blanc casse (texte principal) */
  --text-secondary: #9898A6;    /* Gris (texte secondaire) */
  --text-muted: #5A5A6E;        /* Gris sombre (hints, placeholders) */

  /* Brand */
  --brand-primary: #6366F1;     /* Indigo (accent principal) */
  --brand-hover: #818CF8;       /* Indigo clair (hover) */
  --brand-muted: #4338CA;       /* Indigo sombre (backgrounds) */

  /* Severity (findings) */
  --severity-critical: #EF4444; /* Rouge vif */
  --severity-high: #F97316;     /* Orange */
  --severity-medium: #EAB308;   /* Jaune */
  --severity-low: #22C55E;      /* Vert */
  --severity-info: #6366F1;     /* Indigo */

  /* Status */
  --status-running: #3B82F6;    /* Bleu */
  --status-success: #22C55E;    /* Vert */
  --status-error: #EF4444;      /* Rouge */
  --status-warning: #F59E0B;    /* Ambre */
  --status-queued: #8B5CF6;     /* Violet */

  /* Terminal */
  --terminal-bg: #0D0D0D;       /* Noir terminal */
  --terminal-text: #00FF41;     /* Vert matrix */
  --terminal-prompt: #6366F1;   /* Indigo pour le prompt */
  --terminal-error: #FF3333;    /* Rouge terminal */
  --terminal-command: #FFFFFF;  /* Blanc pour les commandes */

  /* Borders */
  --border-default: #2A2A36;    /* Bordure subtile */
  --border-hover: #3A3A4A;      /* Bordure hover */
  --border-focus: #6366F1;      /* Bordure focus (brand) */
}
```

### Typographie

```css
/* Texte principal */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Code et terminal */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

/* Tailles */
--text-xs: 0.75rem;     /* 12px — labels, badges */
--text-sm: 0.875rem;    /* 14px — body small, sidebar */
--text-base: 1rem;      /* 16px — body principal */
--text-lg: 1.125rem;    /* 18px — titres de section */
--text-xl: 1.25rem;     /* 20px — titres de page */
--text-2xl: 1.5rem;     /* 24px — hero sections */
--text-3xl: 1.875rem;   /* 30px — landing page */
--text-4xl: 2.25rem;    /* 36px — hero principal */

/* Line height */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Spacing

```css
/* Systeme 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

## Composants UI

### Severity Badge

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ CRITICAL │  │  HIGH    │  │  MEDIUM  │  │  LOW     │  │  INFO    │
│ #EF4444  │  │ #F97316  │  │ #EAB308  │  │ #22C55E  │  │ #6366F1  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
 Fond rouge    Fond orange   Fond jaune    Fond vert    Fond indigo
 Texte blanc   Texte blanc   Texte noir    Texte blanc  Texte blanc
 8px padding   8px padding   8px padding   8px padding  8px padding
 Rounded sm    Rounded sm    Rounded sm    Rounded sm   Rounded sm
 Font mono xs  Font mono xs  Font mono xs  Font mono xs Font mono xs
```

### Terminal Block (tool execution)

```
┌─────────────────────────────────────────────────────────┐
│ ● Recon Agent                            ⏱ 12.4s  ✓   │
│─────────────────────────────────────────────────────────│
│ $ nmap -sV -sC -p- --min-rate 1000 example.com        │
│                                                         │
│ Starting Nmap 7.95 ( https://nmap.org )                │
│ PORT    STATE SERVICE  VERSION                          │
│ 22/tcp  open  ssh      OpenSSH 9.7                     │
│ 80/tcp  open  http     nginx 1.24.0                    │
│ 443/tcp open  ssl/http nginx 1.24.0                    │
│ 3306/tcp open mysql    MySQL 8.0.35                    │
│                                                         │
│ Nmap done: 1 IP address (1 host up) scanned in 12.4s  │
└─────────────────────────────────────────────────────────┘

Specs:
- Background: var(--terminal-bg) #0D0D0D
- Border: var(--border-default) 1px solid
- Border-radius: 8px
- Header: agent name (left), duration (right), status icon
- Command line: "$ " prefix in var(--terminal-prompt), command in white
- Output: var(--terminal-text) #00FF41
- Errors: var(--terminal-error) #FF3333
- Font: JetBrains Mono 13px
- Padding: 16px
- Max height: 400px (scrollable)
- Auto-scroll to bottom during live output
```

### Finding Card

```
┌─────────────────────────────────────────────────────────┐
│ ┌──────────┐                                            │
│ │ CRITICAL │  Remote Code Execution via Log4Shell       │
│ └──────────┘  CVE-2021-44228                            │
│                                                         │
│ CVSS 9.8  │  T1190  │  Agent: Exploit  │  Verified ✓   │
│                                                         │
│ The target application uses Log4j 2.14.1 which is       │
│ vulnerable to JNDI injection via the User-Agent header. │
│                                                         │
│ [View Evidence]  [View Recommendation]                  │
└─────────────────────────────────────────────────────────┘

Specs:
- Background: var(--bg-secondary)
- Border-left: 4px solid var(--severity-critical)
- Border-radius: 8px
- Padding: 20px
- Shadow: 0 2px 8px rgba(0,0,0,0.3)
- Animate-in: slide up + fade in (300ms)
- Severity badge: top left
- CVE: monospace, clickable (link to NVD)
- MITRE: badge format (e.g., T1190)
```

### Agent Thinking Bubble

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Recon Agent                                          │
│                                                         │
│ I'll now scan the target for open ports using nmap      │
│ with service detection and default scripts. This will   │
│ help identify potential entry points for further        │
│ analysis.█                                              │
│                                                         │
└─────────────────────────────────────────────────────────┘

Specs:
- Background: var(--bg-tertiary)
- Border-radius: 12px (top-right: 4px for agent messages)
- Font: Inter 15px
- Typing cursor: blinking bar (500ms interval)
- Token-by-token rendering (typing effect)
- Agent icon: unique per agent (color-coded)
```

### Progress Bar

```
┌─────────────────────────────────────────────────────────┐
│ Planning ✅ → Recon ⏳ → Exploit → PostExploit → Report │
│ ████████████████████░░░░░░░░░░░░░░░░░░░  40%           │
│ Elapsed: 12m 34s  │  3 findings  │  Agent: Recon       │
└─────────────────────────────────────────────────────────┘

Specs:
- Phases: horizontal stepper
- Completed: var(--status-success) + checkmark
- Active: var(--status-running) + pulse animation
- Pending: var(--text-muted)
- Progress bar: gradient from brand-primary to brand-hover
- Background: var(--bg-secondary)
- Font: Inter 13px
- Height: 64px
```

## Animations

### Streaming text (typing effect)

```css
@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.typing-cursor {
  animation: cursor-blink 1s infinite;
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background: var(--brand-primary);
  margin-left: 2px;
}
```

### Finding card entrance

```css
@keyframes finding-enter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.finding-card {
  animation: finding-enter 300ms ease-out;
}
```

### Agent transition

```css
@keyframes agent-switch {
  0% { opacity: 1; transform: translateX(0); }
  40% { opacity: 0; transform: translateX(-20px); }
  60% { opacity: 0; transform: translateX(20px); }
  100% { opacity: 1; transform: translateX(0); }
}
```

### Terminal scroll

```css
.terminal-output {
  scroll-behavior: smooth;
  overflow-y: auto;
  /* Auto-scroll via JS: element.scrollTop = element.scrollHeight */
}
```

## Responsive

| Breakpoint | Largeur | Layout |
|---|---|---|
| Mobile | < 768px | Sidebar cachee, stack vertical |
| Tablet | 768-1024px | Sidebar collapsed (icons only) |
| Desktop | 1024-1440px | Sidebar ouverte, layout standard |
| Wide | > 1440px | Layout elargi, plus de padding |

### Dashboard mobile

```
┌──────────────────────┐
│ [☰] BJHUNT    [👤]  │
├──────────────────────┤
│                      │
│ Live Stream          │
│ ┌──────────────────┐ │
│ │ Agent thinking.. │ │
│ │ $ nmap -sV ...   │ │
│ │ 22/tcp open ssh  │ │
│ └──────────────────┘ │
│                      │
│ Findings (3)         │
│ ┌──────────────────┐ │
│ │ CRITICAL: RCE    │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ HIGH: SQLi       │ │
│ └──────────────────┘ │
│                      │
│ Progress: 40%        │
│ ████████░░░░░░░░░░░ │
│                      │
│ ┌──────────────────┐ │
│ │ Message agent... │ │
│ └──────────────────┘ │
└──────────────────────┘
```

Sur mobile, le stream et les findings sont dans des tabs ou en stack vertical.
Le terminal output est scrollable horizontalement pour les longues lignes.

## Dark mode only

BJHUNT est **dark mode uniquement**. Pas de light mode.
Raisons :
1. Coherence avec l'esthetique cybersecurite
2. Moins de fatigue oculaire pour les sessions longues
3. Le terminal (vert sur noir) est plus lisible en dark
4. Simplifie le developpement (un seul theme)

## Icones des agents

Chaque agent Decepticon a une couleur unique pour l'identification visuelle :

| Agent | Couleur | Hex |
|---|---|---|
| Decepticon (orchestrateur) | Blanc | #E8E8ED |
| Soundwave (planning) | Bleu ciel | #38BDF8 |
| Recon | Cyan | #22D3EE |
| Exploit | Rouge | #EF4444 |
| PostExploit | Orange | #F97316 |
| Analyst | Jaune | #EAB308 |
| Reverser | Violet | #A78BFA |
| Contract Auditor | Vert emeraude | #34D399 |
| Cloud Hunter | Bleu | #3B82F6 |
| AD Operator | Rose | #F472B6 |
| VulnResearch | Indigo | #6366F1 |
| Defender | Vert | #22C55E |
