// app/[locale]/technology/deep-dive/page.tsx
//
// BJHUNT 2026 refonte — replaces inline SVG architecture stack with
// <MonoDiagram>; ghost buttons; token-pinned colors; <500 LOC.

"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { MonoDiagram } from "@/components/ui/mono-diagram";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: "var(--bjhunt-2026-bg)",
        borderBottom: "1px solid var(--bjhunt-2026-border)",
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">{children}</div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  highlight,
  description,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: string;
}) {
  return (
    <motion.header className="max-w-2xl" variants={fadeUp}>
      <p
        className="m-0 mb-4 font-mono uppercase"
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "var(--bjhunt-2026-text-muted)",
        }}
      >
        {eyebrow}
      </p>
      <h2
        className="m-0"
        style={{
          fontFamily: "var(--bjhunt-2026-font-display)",
          fontSize: "clamp(28px, 3vw, 36px)",
          fontWeight: 400,
          lineHeight: 1.11,
          letterSpacing: "-0.025em",
          color: "var(--bjhunt-2026-text)",
        }}
      >
        {title}
        {highlight ? (
          <>
            <br />
            <em className="not-italic" style={{ color: "var(--bjhunt-2026-text-secondary)" }}>
              {highlight}
            </em>
          </>
        ) : null}
      </h2>
      {description ? (
        <p
          className="mt-4"
          style={{
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.6,
            color: "var(--bjhunt-2026-text-secondary)",
          }}
        >
          {description}
        </p>
      ) : null}
    </motion.header>
  );
}

/* HERO ───────────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: "var(--bjhunt-2026-bg)",
        borderBottom: "1px solid var(--bjhunt-2026-border)",
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
          <motion.p
            variants={fadeUp}
            className="m-0 mb-4 font-mono uppercase"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text-muted)",
            }}
          >
            01 / Technology · Deep Dive
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="m-0 mb-6"
            style={{
              fontFamily: "var(--bjhunt-2026-font-display)",
              fontSize: "clamp(40px, 5vw, 60px)",
              fontWeight: 400,
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              color: "var(--bjhunt-2026-text)",
            }}
          >
            Comprendre
            <br />
            <em className="not-italic" style={{ color: "var(--bjhunt-2026-text-secondary)" }}>
              la technologie.
            </em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="m-0 mb-8 max-w-xl"
            style={{
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "var(--bjhunt-2026-text-secondary)",
            }}
          >
            Plongez dans l&apos;architecture qui propulse BJHUNT. Decouvrez comment nos agents IA, notre cycle vaccin et notre graphe de connaissances transforment la cybersecurite.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Button asChild variant="ghost" size="md">
              <Link href="/technology">← Vue d&apos;ensemble</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* MULTI-AGENT ARCHITECTURE ───────────────────────────────────────── */
function MultiAgentSection() {
  const categories = [
    {
      tag: "01",
      title: "Reconnaissance et OSINT",
      desc: "Des agents specialises dans la cartographie de votre surface d'attaque. Ils enumerent les sous-domaines, detectent les services exposes, analysent les certificats SSL, et recoltent toutes les informations publiquement accessibles sur votre organisation.",
    },
    {
      tag: "02",
      title: "Exploitation et Tests Offensifs",
      desc: "Ces agents simulent les techniques reelles des attaquants : injections SQL, attaques sur les authentifications, exploitation de configurations erronees, escalade de privileges. Ils testent chaque point d'entree identifie par la reconnaissance.",
    },
    {
      tag: "03",
      title: "Analyse et Recherche de Vulnerabilites",
      desc: "Des agents dedies a l'analyse statique de code, la detection de CVE connues, le fuzzing d'APIs et la construction de chaines d'exploitation complexes. Ils correlent les decouvertes des autres agents pour identifier les scenarios critiques.",
    },
    {
      tag: "04",
      title: "Cloud et Infrastructure",
      desc: "Des agents specialises dans l'audit des environnements cloud : permissions IAM excessives, buckets S3 mal configures, roles Kubernetes trop permissifs, secrets exposes. Ils couvrent AWS, GCP, Azure et les conteneurs.",
    },
    {
      tag: "05",
      title: "Defense et Remediation",
      desc: "L'element unique de BJHUNT : des agents qui ne se contentent pas de trouver les failles, mais qui proposent et verifient les corrections. Ils generent des patchs, des configurations securisees, et valident chaque remediation via re-test automatise.",
    },
  ];

  const ascii = `
   ┌────────────────────────────────────────────────────────┐
   │                    ORCHESTRATEUR                       │
   ├────────────────────────────────────────────────────────┤
   │                  RECONNAISSANCE                        │
   ├────────────────────────────────────────────────────────┤
   │                   EXPLOITATION                         │
   ├────────────────────────────────────────────────────────┤
   │                     ANALYSE                            │
   ├────────────────────────────────────────────────────────┤
   │                     DEFENSE                            │
   └────────────────────────────────────────────────────────┘
`;

  return (
    <Section>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <SectionHeader
          eyebrow="02 / Architecture"
          title="Architecture"
          highlight="Multi-agent."
          description="BJHUNT repose sur une architecture multi-agent ou 17 agents IA specialises collaborent pour realiser des audits de securite complets. Chaque agent est un expert dans son domaine, entraine sur des milliers de techniques et de scenarios reels."
        />

        <motion.div variants={fadeUp} className="mt-10 md:mt-12">
          <MonoDiagram
            ascii={ascii}
            highlight={/ORCHESTRATEUR/g}
            caption="STACK 5-COUCHES · ORCHESTRATEUR EN HAUT"
          />
        </motion.div>

        <div className="mt-10 md:mt-12">
          {categories.map((cat) => (
            <motion.div
              key={cat.tag}
              variants={fadeUp}
              className="grid gap-4 py-6 md:grid-cols-[80px_1fr] md:gap-6 md:py-8"
              style={{ borderTop: "1px solid var(--bjhunt-2026-border)" }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  color: "var(--bjhunt-2026-text-muted)",
                }}
              >
                {cat.tag}
              </div>
              <div>
                <h3
                  className="m-0 mb-2"
                  style={{ fontSize: 16, fontWeight: 600, color: "var(--bjhunt-2026-text)", letterSpacing: "-0.01em" }}
                >
                  {cat.title}
                </h3>
                <p
                  className="m-0 max-w-xl"
                  style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: "var(--bjhunt-2026-text-secondary)" }}
                >
                  {cat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* KILL CHAIN COVERAGE ────────────────────────────────────────────── */
function KillChainSection() {
  const phases = [
    { phase: "Reconnaissance",      desc: "Decouverte et enumeration de la cible. Collecte OSINT, scan de ports, detection de services et technologies.",        coverage: "100%" },
    { phase: "Weaponization",       desc: "Preparation des vecteurs d'attaque adaptes aux vulnerabilites identifiees.",                                            coverage: "95%"  },
    { phase: "Delivery",            desc: "Simulation de livraison de charge utile via les vecteurs identifies (web, reseau, API).",                              coverage: "90%"  },
    { phase: "Exploitation",        desc: "Exploitation active des vulnerabilites : injections, RCE, deserialization, SSRF, SSTI.",                               coverage: "95%"  },
    { phase: "Installation",        desc: "Test de persistance : backdoors, web shells, scheduled tasks, modification de services.",                              coverage: "85%"  },
    { phase: "Command & Control",   desc: "Simulation de canaux C2 : reverse shells, tunnels DNS, pivoting reseau.",                                              coverage: "80%"  },
    { phase: "Actions on Objective", desc: "Exfiltration de donnees, mouvement lateral, escalade de privileges, impact metier.",                                  coverage: "90%"  },
  ];

  return (
    <Section>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <SectionHeader
          eyebrow="03 / Couverture"
          title="Kill chain"
          highlight="Coverage."
          description="BJHUNT couvre l'integralite de la kill chain MITRE ATT&CK. Chaque phase est testee par des agents specialises qui simulent les techniques reelles des adversaires."
        />

        <div className="mt-10 md:mt-12">
          {phases.map((item, i) => (
            <motion.div
              key={item.phase}
              variants={fadeUp}
              className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 md:py-5"
              style={{ borderTop: "1px solid var(--bjhunt-2026-border)" }}
            >
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.18em",
                      color: "var(--bjhunt-2026-text-muted)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="m-0" style={{ fontSize: 14, fontWeight: 600, color: "var(--bjhunt-2026-text)" }}>
                    {item.phase}
                  </h3>
                </div>
                <p
                  className="m-0 ml-7 mt-1 max-w-lg"
                  style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.55, color: "var(--bjhunt-2026-text-secondary)" }}
                >
                  {item.desc}
                </p>
              </div>
              <div className="text-right">
                <div
                  style={{
                    fontFamily: "var(--bjhunt-2026-font-mono)",
                    fontSize: 18,
                    fontWeight: 500,
                    color: "var(--state-success)",
                  }}
                >
                  {item.coverage}
                </div>
                <div
                  className="font-mono uppercase"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.18em",
                    color: "var(--bjhunt-2026-text-muted)",
                    marginTop: 2,
                  }}
                >
                  COUVERTURE
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* VACCINE LOOP STEPS ─────────────────────────────────────────────── */
function VaccineProcessSection() {
  const steps = [
    { step: "01", title: "Attaque",       desc: "Les agents offensifs lancent un audit complet de la cible. Ils identifient les vulnerabilites, les classent par severite (CVSS) et documentent chaque decouverte avec des preuves d'exploitation." },
    { step: "02", title: "Briefing",      desc: "L'orchestrateur synthetise les decouvertes en un rapport structure. Il identifie les vulnerabilites critiques, les chaines d'exploitation et les risques metier associes." },
    { step: "03", title: "Defense",       desc: "Les agents defensifs generent des correctifs pour chaque vulnerabilite : patchs de code, configurations securisees, regles de firewall, politiques d'acces." },
    { step: "04", title: "Verification",  desc: "Les agents offensifs retestent chaque vulnerabilite apres correction. Si la remediation echoue, le cycle recommence avec des ajustements." },
  ];

  return (
    <Section>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <SectionHeader
          eyebrow="04 / Processus"
          title="Cycle vaccin"
          highlight="Etape par etape."
          description="Le cycle vaccin est l'innovation fondamentale de BJHUNT. Inspire du principe de vaccination en medecine, il expose votre systeme a des attaques controlees, applique les defenses necessaires, puis verifie leur efficacite."
        />

        <div
          className="mt-10 grid grid-cols-1 gap-px md:mt-12 md:grid-cols-2"
          style={{ background: "var(--bjhunt-2026-border)" }}
        >
          {steps.map((item) => (
            <motion.div
              key={item.step}
              variants={fadeUp}
              className="p-6 md:p-8"
              style={{ background: "var(--bjhunt-2026-bg-surface)" }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ border: "1px solid var(--state-success)" }}
                >
                  <span
                    className="font-mono"
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--state-success)" }}
                  >
                    {item.step}
                  </span>
                </div>
                <h3 className="m-0" style={{ fontSize: 16, fontWeight: 600, color: "var(--bjhunt-2026-text)" }}>
                  {item.title}
                </h3>
              </div>
              <p className="m-0" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.6, color: "var(--bjhunt-2026-text-secondary)" }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* KNOWLEDGE GRAPH ────────────────────────────────────────────────── */
function KnowledgeGraphIntelSection() {
  const items = [
    { title: "Cartographie relationnelle", desc: "Le graphe connecte hotes, services, comptes utilisateurs et vulnerabilites. Cette modelisation relationnelle permet d'identifier des chaines d'exploitation invisibles aux scanners lineaires." },
    { title: "Enrichissement continu",     desc: "Chaque agent enrichit le graphe en temps reel. Les decouvertes du module de reconnaissance alimentent les agents d'exploitation, qui a leur tour enrichissent l'analyse." },
    { title: "Detection de chemins",       desc: "Des algorithmes de parcours de graphe identifient les chemins d'attaque les plus courts entre un point d'entree et un actif critique." },
    { title: "Memoire persistante",        desc: "Le graphe persiste entre les audits. BJHUNT se souvient de vos audits precedents, detecte les regressions et mesure l'evolution de votre posture." },
  ];

  return (
    <Section>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <SectionHeader
          eyebrow="05 / Intelligence"
          title="Graphe de"
          highlight="Connaissances."
          description="Au coeur de BJHUNT, un graphe de connaissances en temps reel modelise l'ensemble de votre surface d'attaque. Chaque decouverte est representee comme un noeud connecte aux autres par des relations semantiques."
        />

        <div className="mt-10 md:mt-12">
          {items.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              className="grid gap-4 py-6 md:grid-cols-[200px_1fr] md:gap-6 md:py-8"
              style={{ borderTop: "1px solid var(--bjhunt-2026-border)" }}
            >
              <h3
                className="m-0"
                style={{ fontSize: 14, fontWeight: 600, color: "var(--bjhunt-2026-text)", letterSpacing: "-0.01em" }}
              >
                {item.title}
              </h3>
              <p
                className="m-0 max-w-xl"
                style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: "var(--bjhunt-2026-text-secondary)" }}
              >
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* SANDBOX SECURITY MODEL ─────────────────────────────────────────── */
function SandboxModelSection() {
  const layers = [
    { title: "Isolation reseau",       desc: "Chaque sandbox opere dans un reseau virtuel isole. Aucune communication directe entre le sandbox et votre infrastructure n'est possible. Les resultats sont transmis via un canal securise unidirectionnel." },
    { title: "Conteneurisation",       desc: "Les tests s'executent dans des conteneurs ephemeres bases sur Kali Linux. Chaque conteneur est cree pour un audit et detruit apres. Aucune donnee ne persiste dans le sandbox." },
    { title: "Validation des commandes", desc: "Un middleware de securite valide chaque commande avant execution. Les operations destructives sont bloquees par defaut. Les agents operent dans un cadre strict defini par les regles d'engagement." },
  ];

  return (
    <Section>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <SectionHeader
          eyebrow="06 / Securite"
          title="Modele de securite"
          highlight="Sandbox."
          description="La securite de vos systemes est notre priorite absolue. Chaque test s'execute dans un environnement completement isole, garantissant zero impact sur votre infrastructure de production."
        />

        <div
          className="mt-10 grid grid-cols-1 gap-px md:mt-12 md:grid-cols-3"
          style={{ background: "var(--bjhunt-2026-border)" }}
        >
          {layers.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              className="p-6 md:p-8"
              style={{ background: "var(--bjhunt-2026-bg-surface)" }}
            >
              <h3
                className="m-0 mb-3"
                style={{ fontSize: 14, fontWeight: 600, color: "var(--bjhunt-2026-text)", letterSpacing: "-0.01em" }}
              >
                {item.title}
              </h3>
              <p className="m-0" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.6, color: "var(--bjhunt-2026-text-secondary)" }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* COMPLIANCE & REPORTING ─────────────────────────────────────────── */
function ComplianceSection() {
  const standards = [
    { name: "OWASP Top 10",    desc: "Couverture complete des 10 risques de securite web les plus critiques. Tests automatises pour chaque categorie avec generation de rapport conforme." },
    { name: "PCI-DSS",         desc: "Validation des exigences PCI-DSS pour les organisations traitant des donnees de cartes de paiement. Scan de vulnerabilites ASV-compatible." },
    { name: "ISO 27001",       desc: "Evaluation des controles de securite alignes sur les annexes A de la norme ISO 27001. Rapport d'ecarts et recommandations." },
    { name: "MITRE ATT&CK",    desc: "Mapping automatique des decouvertes sur la matrice MITRE ATT&CK. Identification des techniques utilisees et des gaps de detection." },
    { name: "CVSS v3.1 / v4.0",desc: "Scoring standardise de chaque vulnerabilite avec vecteur d'attaque detaille. Integration native des bases NVD et CVE." },
    { name: "Rapports Executifs", desc: "Generation automatique de rapports non-techniques pour la direction. Score de securite global, tendances et KPIs." },
  ];

  return (
    <Section>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <SectionHeader
          eyebrow="07 / Conformite"
          title="Compliance"
          highlight="& reporting."
          description="BJHUNT genere des rapports conformes aux standards internationaux de cybersecurite. Chaque vulnerabilite est classee selon les referentiels reconnus, avec des recommandations actionnables."
        />

        <div
          className="mt-10 grid grid-cols-1 gap-px md:mt-12 md:grid-cols-2"
          style={{ background: "var(--bjhunt-2026-border)" }}
        >
          {standards.map((item) => (
            <motion.div
              key={item.name}
              variants={fadeUp}
              className="p-6 md:p-8"
              style={{ background: "var(--bjhunt-2026-bg-surface)" }}
            >
              <h3
                className="m-0 mb-2 font-mono"
                style={{ fontSize: 14, fontWeight: 600, color: "var(--bjhunt-2026-text)" }}
              >
                {item.name}
              </h3>
              <p className="m-0" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.6, color: "var(--bjhunt-2026-text-secondary)" }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* CTA ────────────────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section
      className="py-20 text-center md:py-24"
      style={{ background: "var(--bjhunt-2026-bg)" }}
    >
      <motion.div
        className="mx-auto flex w-full max-w-[860px] flex-col items-center gap-6 px-6 md:px-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2
          className="m-0"
          style={{
            fontFamily: "var(--bjhunt-2026-font-display)",
            fontSize: "clamp(28px, 3vw, 36px)",
            fontWeight: 400,
            lineHeight: 1.11,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-2026-text)",
          }}
        >
          Convaincu ?
        </h2>
        <p
          className="m-0 max-w-md"
          style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: "var(--bjhunt-2026-text-secondary)" }}
        >
          Decouvrez comment BJHUNT peut securiser votre infrastructure des aujourd&apos;hui.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="ghost" size="md">
            <Link href="/login">Commencer gratuitement</Link>
          </Button>
          <Button asChild variant="ghost" size="md">
            <Link href="/contact">Contacter l&apos;equipe →</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

export default function DeepDivePage() {
  return (
    <>
      <HeroSection />
      <MultiAgentSection />
      <KillChainSection />
      <VaccineProcessSection />
      <KnowledgeGraphIntelSection />
      <SandboxModelSection />
      <ComplianceSection />
      <CTASection />
    </>
  );
}
