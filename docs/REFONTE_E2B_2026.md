# REFONTE E2B.DEV — BJHUNT 2026

> **Objectif** : Refonte complète du design marketing + dashboard au style E2B.dev avec contenu pro cybersécurité révolutionnaire.

## 🎯 Vision Stratégique

### Positionnement Marketing

**Message clé** : BJHUNT 4 MAX = La révolution de l'audit offensif automatisé

**Proposition de valeur** :
- ❌ **Fini** : Outils payants très chers (Invicti, Nessus, Burp Suite Pro)
- ❌ **Fini** : Machines lourdes, configs complexes
- ❌ **Fini** : Faux positifs massifs (>40% industrie)
- ❌ **Fini** : Expertise rare et chère
- ✅ **Nouveau** : Orchestrateur IA haute performance
- ✅ **Nouveau** : BJHUNT 27B — modèle entraîné sur milliards de données cyber
- ✅ **Nouveau** : 15+ outils intégrés (Nmap, Nuclei, SQLMap, Metasploit, etc.)
- ✅ **Nouveau** : <5% faux positifs
- ✅ **Nouveau** : Cloud-native, zéro config

### Statistiques Réelles Cybersécurité (à intégrer)

**Marché** :
- Marché mondial cybersécurité : **$345.4B en 2026** (Gartner)
- Croissance CAGR : **12.3%** (2026-2031)
- Pénurie talents : **3.5M postes vacants** mondialement
- Coût moyen breach : **$4.88M** (IBM 2026)

**Problèmes outils traditionnels** :
- Taux faux positifs : **40-60%** (OWASP)
- Temps config initial : **2-4 semaines** (moyenne industrie)
- Coût licences annuelles : **$15K-$50K** par outil
- Expertise requise : **5-10 ans** expérience

**Performance BJHUNT** :
- Taux faux positifs : **<5%**
- Temps déploiement : **<5 minutes**
- Coût : **90% moins cher** que stack traditionnel
- Expertise : **Zéro prérequis** (IA autonome)

## 🎨 Design System E2B.dev

### Observations Clés E2B

**Palette** :
- Background : `#0A0B0F` (plus foncé que BJHUNT `#08090D`)
- Surface : `#13141A`
- Border : `rgba(255,255,255,0.06)` (plus subtil)
- Brand : `#00D4FF` (cyan électrique)
- Accent : `#7C3AED` (violet)

**Typography** :
- Body : 15px (vs 13-14px BJHUNT)
- Headings : System-ui, -apple-system (instant render)
- Mono : SF Mono, Menlo (pas JetBrains)
- Line-height : 1.6 (vs 1.5 BJHUNT)

**Spacing** :
- Base : 8px (vs 4px BJHUNT)
- Sections : 120px vertical (vs 80px BJHUNT)
- Container : 1280px max-width (identique)

**Components** :
- Buttons : 40px height (vs 36-40px BJHUNT)
- Cards : 24px padding (vs 16-24px BJHUNT)
- Borders : 1px hairline (identique)
- Radius : 12px (vs 8px BJHUNT)
- No shadows : depth via borders (identique)

**Animations** :
- Très subtiles (pas de framer-motion lourdes)
- CSS transitions : 200ms ease-out
- Hover states : border-color + slight bg shift
- No parallax, no complex transforms

**Grid** :
- 12 colonnes strict
- Gap : 24px (vs 16px BJHUNT)
- Responsive : 1280 / 1024 / 768 / 390

### Logos Outils Intégrés (Marquee)

**15 outils à afficher** :
1. **Nmap** — Network scanner
2. **Nuclei** — Vulnerability scanner
3. **SQLMap** — SQL injection
4. **Metasploit** — Exploitation framework
5. **Burp Suite** — Web proxy
6. **OWASP ZAP** — Security testing
7. **Nikto** — Web server scanner
8. **Gobuster** — Directory brute-force
9. **Hydra** — Password cracker
10. **John the Ripper** — Password recovery
11. **Wireshark** — Network analyzer
12. **Aircrack-ng** — WiFi security
13. **Hashcat** — Password recovery
14. **Nessus** — Vulnerability scanner
15. **Invicti** — Web app scanner

**Design marquee** :
- Défilement horizontal infini
- Logos SVG monochromes (white 40% opacity)
- Hover : 100% opacity + scale 1.05
- Speed : 30s loop
- Gap : 48px entre logos

## 📄 Pages Marketing à Refondre

### 1. Homepage (`/`)

**Sections** :
1. **Hero** (viewport height)
   - H1 : "L'Intelligence Artificielle qui Révolutionne l'Audit Offensif"
   - Sous-titre : "BJHUNT 27B — Orchestrateur haute performance entraîné sur milliards de données cybersécurité"
   - 3 KPIs : 15+ outils intégrés | <5% faux positifs | 27B paramètres
   - CTA : "Démarrer l'Audit Gratuit" + "Voir la Démo"
   - Visual : Terminal live avec output scan (animation subtile)

2. **Marquee Outils** (120px height)
   - 15 logos défilant
   - Texte : "Tous vos outils préférés, intégrés et orchestrés"

3. **Problème / Solution** (2 colonnes)
   - Gauche : "L'Ancien Monde" (rouge, liste problèmes)
   - Droite : "BJHUNT 4 MAX" (vert, liste solutions)
   - Stats réelles en overlay

4. **Features Grid** (3x2)
   - Orchestration IA
   - Toolchain Intégré
   - Zéro Configuration
   - Reporting Automatique
   - Cloud-Native
   - Conformité (OWASP, NIST, ISO 27001)

5. **Stats Section** (4 colonnes)
   - $345.4B marché
   - 3.5M postes vacants
   - $4.88M coût moyen breach
   - 90% économies vs stack traditionnel

6. **Architecture Diagram** (full-width)
   - Schéma : Input (cible) → BJHUNT 27B → 15 outils → Output (rapport)
   - Style : Mono ASCII-art + hairline connections

7. **Pricing Teaser** (3 cards)
   - Free : POC / Hobby
   - Pro : Équipes
   - Enterprise : Sur-mesure
   - CTA : "Voir Tarifs Complets"

8. **Trust Section**
   - "Utilisé par les leaders de la cybersécurité"
   - Logos clients (anonymisés si nécessaire)

9. **CTA Final**
   - "Prêt à Révolutionner Votre Audit Offensif ?"
   - CTA : "Démarrer Maintenant" + "Parler à un Expert"

### 2. Technology (`/technology`)

**Sections** :
1. **Hero**
   - "La Technologie Derrière la Révolution"
   - Sous-titre : "BJHUNT 27B + Orchestration Multi-Agents + Sandbox Isolé"

2. **BJHUNT 27B Model**
   - Architecture : Transformer custom
   - Training : Milliards de CVEs, exploits, workflows humains
   - Performance : <5% FP, 98% recall
   - Benchmarks vs GPT-4, Claude 3.5

3. **Orchestration Engine**
   - 38 personas spécialisés
   - Workflow adaptatif
   - Handoff intelligent
   - Evidence capture automatique

4. **Toolchain Intégré**
   - 15 outils (liste + descriptions)
   - Sandbox E2B Kali
   - Isolation complète
   - Logs temps réel

5. **Security & Compliance**
   - Scope guard (fail-closed)
   - Evidence redaction
   - Secrets management
   - Conformité OWASP, NIST, ISO 27001

### 3. Pricing (`/pricing`)

**Grille 3 tiers** :
1. **Free** (POC)
   - 1 scan/mois
   - 5 cibles max
   - Rapport PDF
   - Support communauté

2. **Pro** ($299/mois)
   - Scans illimités
   - 50 cibles
   - API access
   - Support prioritaire
   - Intégrations CI/CD

3. **Enterprise** (Sur-mesure)
   - Scans illimités
   - Cibles illimitées
   - On-premise / BYOC
   - SLA 99.9%
   - Support dédié
   - Custom training

**FAQ** : 10 questions fréquentes

### 4. About (`/about`)

**Sections** :
1. **Mission**
   - "Démocratiser l'audit offensif de classe mondiale"

2. **Team** (si applicable)
   - Fondateurs / Key people
   - Expertise collective

3. **Timeline**
   - Milestones clés
   - Roadmap publique

4. **Values**
   - Innovation
   - Sécurité
   - Transparence
   - Excellence

### 5. Contact (`/contact`)

**Formulaire** :
- Nom / Email / Entreprise / Message
- Use case dropdown
- hCaptcha
- CTA : "Envoyer"

**Infos** :
- Email : hello@bjhunt.com
- Discord : lien communauté
- GitHub : lien repo public

## 🎛️ Dashboard App à Refondre

### Layout Principal

**Sidebar** (240px, collapsible) :
- Logo BJHUNT
- Navigation :
  - Chats
  - Scans
  - Findings
  - Reports
  - Settings
- User menu (bottom)

**Topbar** (64px) :
- Breadcrumb
- Search global
- Notifications
- User avatar + dropdown

**Content** (flex-1) :
- Page content
- No max-width (full bleed)

### Pages Dashboard

#### 1. Chats (`/chats`)

**Liste conversations** :
- Card par chat
- Titre + preview dernier message
- Timestamp
- Status badge (active, completed, error)
- Actions : Rename, Delete, Archive

**Empty state** :
- "Aucune conversation"
- CTA : "Nouvelle Conversation"

#### 2. Chat Interface (`/chats/[chatId]`)

**Layout 3 colonnes** :
1. **Sidebar gauche** (280px, collapsible)
   - Scope (cibles)
   - Agents actifs
   - Progress bars

2. **Thread central** (flex-1)
   - Messages user/assistant
   - Tool calls expandable
   - Thinking indicators
   - Findings inline
   - Composer (bottom, sticky)

3. **Sidebar droite** (320px, collapsible)
   - Findings list
   - Evidence gallery
   - Dream diary
   - Scope violations

**Composer** :
- Input multiline
- Attachments (files, images)
- Slash commands
- @ mentions (agents)
- Send button

**Message Bubbles** :
- User : right-aligned, brand bg
- Assistant : left-aligned, surface bg
- Markdown rendering
- Code syntax highlight
- Copy button

**Tool Call Cards** :
- Tool name + icon
- Input params (collapsible)
- Output (collapsible)
- Status badge (running, success, error)
- Timestamp

#### 3. Settings (`/settings`)

**5 onglets** (inspiré E2B dashboard) :

1. **Général**
   - Langue (FR/EN)
   - Timezone
   - Date format
   - Notifications preferences

2. **Personnalisation**
   - Thème (dark/light) — dark only pour MVP
   - Densité UI (compact/regular/comfortable)
   - Raccourcis clavier
   - Sidebar position

3. **Compte**
   - Avatar upload
   - Nom / Email
   - Organisation
   - Rôle
   - Billing (si applicable)

4. **Sécurité**
   - Changer mot de passe
   - 2FA TOTP (enable/disable)
   - Passkeys (add/remove)
   - Sessions actives (list + revoke)
   - Logs d'activité

5. **Données**
   - Export données (JSON)
   - Supprimer compte
   - GDPR compliance
   - Data retention policy

## 🚀 Plan d'Implémentation

### Phase 1 : Design Tokens & Components (2-3h)

1. **Update design-tokens.css**
   - Aligner palette E2B
   - Spacing 8px base
   - Typography scale
   - Radius 12px

2. **Rebuild UI Components**
   - Button (E2B style)
   - Card (E2B style)
   - Badge (E2B style)
   - Input (nouveau)
   - Select (nouveau)
   - Tabs (nouveau)

3. **New Components**
   - ToolLogo (SVG library)
   - ToolsMarquee (infinite scroll)
   - StatCard (KPI display)
   - FeatureCard (grid item)

### Phase 2 : Marketing Pages (4-6h)

1. **Homepage**
   - Hero refonte
   - Marquee outils
   - Problème/Solution
   - Features grid
   - Stats section
   - Pricing teaser
   - CTA final

2. **Technology**
   - Hero
   - Model section
   - Orchestration
   - Toolchain
   - Security

3. **Pricing**
   - Grille 3 tiers
   - FAQ

4. **About**
   - Mission
   - Timeline
   - Values

5. **Contact**
   - Formulaire (keep existing)

### Phase 3 : Dashboard App (6-8h)

1. **Layout**
   - Sidebar navigation
   - Topbar
   - Responsive

2. **Chats List**
   - Card grid
   - Empty state

3. **Chat Interface**
   - 3-column layout
   - Thread refonte (assistant-ui custom)
   - Composer refonte
   - Tool cards refonte

4. **Settings**
   - 5 onglets
   - Forms
   - Security features

### Phase 4 : Content & Copy (2-3h)

1. **Rewrite all copy**
   - Marketing pages (FR/EN)
   - Dashboard UI strings
   - Error messages
   - Empty states

2. **Add stats & data**
   - Real cybersecurity stats
   - Benchmarks
   - Case studies (if applicable)

### Phase 5 : QA & Polish (2-3h)

1. **Cross-browser testing**
2. **Responsive testing** (1920 / 1440 / 1024 / 768 / 390)
3. **Accessibility audit** (WCAG 2.1 AA)
4. **Performance** (Lighthouse 90+)
5. **SEO** (meta tags, structured data)

## 📊 Success Metrics

**Design** :
- ✅ Visual alignment E2B.dev (90%+ similarity)
- ✅ No code mort (all components used)
- ✅ Responsive 5 breakpoints
- ✅ Accessibility WCAG 2.1 AA

**Content** :
- ✅ Professional, impactful copy
- ✅ No internal architecture exposed
- ✅ Real cybersecurity stats integrated
- ✅ 15 tool logos marquee

**Performance** :
- ✅ Lighthouse 90+ (all metrics)
- ✅ FCP <1.5s
- ✅ LCP <2.5s
- ✅ CLS <0.1

**Functionality** :
- ✅ All pages functional
- ✅ Forms working (beta, contact)
- ✅ Dashboard auth flow
- ✅ Chat interface SSE live

## 🔧 Technical Notes

**No Breaking Changes** :
- Keep existing API contracts
- Keep existing database schema
- Keep existing auth flow
- Keep existing SSE events

**Incremental Deployment** :
- Deploy marketing first (low risk)
- Deploy dashboard after (higher risk)
- Feature flags for gradual rollout

**Rollback Plan** :
- Git tags before each phase
- Vercel instant rollback
- Database migrations reversible

---

**Début refonte** : 2026-05-20
**Deadline** : 2026-05-22 (48h)
**Owner** : Claude Sonnet 4.5 + Sub-agents
