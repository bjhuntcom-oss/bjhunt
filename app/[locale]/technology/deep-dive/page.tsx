// app/[locale]/technology/deep-dive/page.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Reusable prose block ────────────────────────────── */
function ProseBlock({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-sm text-[var(--text-muted)] leading-[1.8] max-w-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[32px] md:text-[40px] font-black tracking-[-0.03em] text-white mt-4 mb-6">
      {children}
    </h2>
  );
}

/* ================================================================
   HERO
   ================================================================ */
function HeroSection() {
  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-3xl"
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Technologie / Deep Dive</SectionLabel>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-[40px] md:text-[56px] font-black leading-[0.95] tracking-[-0.03em] text-white mt-6"
          >
            COMPRENDRE<br />
            <span className="text-[var(--text-muted)]">LA TECHNOLOGIE</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-sm text-[var(--text-muted)] leading-relaxed mt-6 max-w-xl"
          >
            Plongez dans l&apos;architecture qui propulse BJHUNT. Decouvrez
            comment nos agents IA, notre cycle vaccin et notre graphe de
            connaissances transforment la cybersecurite.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-6 flex gap-3">
            <Button asChild variant="ghost" size="md">
              <Link href="/technology">← Vue d&apos;ensemble</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 1 — MULTI-AGENT ARCHITECTURE
   ================================================================ */
function MultiAgentSection() {
  const categories = [
    {
      tag: "01",
      title: "Reconnaissance et OSINT",
      desc: "Des agents specialises dans la cartographie de votre surface d'attaque. Ils enumerent les sous-domaines, detectent les services exposes, analysent les certificats SSL, et recoltent toutes les informations publiquement accessibles sur votre organisation. Comme un eclaireur, ils construisent la carte du terrain avant toute operation.",
    },
    {
      tag: "02",
      title: "Exploitation et Tests Offensifs",
      desc: "Ces agents simulent les techniques reelles des attaquants : injections SQL, attaques sur les authentifications, exploitation de configurations erronees, escalade de privileges. Ils testent chaque point d'entree identifie par la reconnaissance, exactement comme le ferait un pentester humain experimente.",
    },
    {
      tag: "03",
      title: "Analyse et Recherche de Vulnerabilites",
      desc: "Des agents dedies a l'analyse statique de code, la detection de CVE connues, le fuzzing d'APIs et la construction de chaines d'exploitation complexes. Ils correlent les decouvertes des autres agents pour identifier les scenarios d'attaque les plus critiques.",
    },
    {
      tag: "04",
      title: "Cloud et Infrastructure",
      desc: "Des agents specialises dans l'audit des environnements cloud : permissions IAM excessives, buckets S3 mal configures, roles Kubernetes trop permissifs, secrets exposes dans les fichiers de configuration. Ils couvrent AWS, GCP, Azure et les infrastructures conteneurisees.",
    },
    {
      tag: "05",
      title: "Defense et Remediation",
      desc: "L'element unique de BJHUNT : des agents qui ne se contentent pas de trouver les failles, mais qui proposent et verifient les corrections. Ils generent des patchs, des configurations securisees, et valident que chaque remediation est effective via un re-test automatise.",
    },
  ];

  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Architecture</SectionLabel>
          </motion.div>
          <motion.div variants={fadeUp}>
            <SectionTitle>
              ARCHITECTURE<br />
              <span className="text-[var(--text-muted)]">MULTI-AGENT</span>
            </SectionTitle>
          </motion.div>
          <motion.div variants={fadeUp}>
            <ProseBlock>
              BJHUNT repose sur une architecture multi-agent ou 17 agents
              IA specialises collaborent pour realiser des audits de securite
              complets. Chaque agent est un expert dans son domaine, entraine
              sur des milliers de techniques et de scenarios reels. Un
              orchestrateur central coordonne leur travail, distribue les
              taches et synthetise les resultats.
            </ProseBlock>
          </motion.div>

          {/* SVG — layered architecture */}
          <motion.div variants={fadeUp} className="mt-12 flex justify-center">
            <svg
              viewBox="0 0 600 200"
              className="w-full max-w-2xl"
              style={{ height: 160 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* 5 stacked layers */}
              {categories.map((_, i) => {
                const y = 20 + i * 34;
                const w = 400 - i * 20;
                const x = (600 - w) / 2;
                return (
                  <g key={`layer-${i}`}>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={28}
                      fill="#111111"
                      stroke="#2a2a2a"
                      strokeWidth="0.5"
                      opacity="0"
                      className="tech-kg-node"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                    <text
                      x={300}
                      y={y + 17}
                      textAnchor="middle"
                      fill={i === 0 ? "#00cc8a" : "#666"}
                      fontSize="7"
                      fontFamily="monospace"
                      opacity="0"
                      className="tech-kg-node"
                      style={{ animationDelay: `${i * 0.2 + 0.1}s` }}
                    >
                      {["ORCHESTRATEUR", "RECONNAISSANCE", "EXPLOITATION", "ANALYSE", "DEFENSE"][i]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </motion.div>

          {/* Category details */}
          <div className="mt-12 space-y-0">
            {categories.map((cat) => (
              <motion.div
                key={cat.tag}
                variants={fadeUp}
                className="border-t border-[var(--border)] py-8 grid md:grid-cols-[80px_1fr] gap-4"
              >
                <div className="text-[11px] font-mono text-[var(--text-subtle)] font-bold">
                  {cat.tag}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight mb-2">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
                    {cat.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 2 — KILL CHAIN COVERAGE
   ================================================================ */
function KillChainSection() {
  const phases = [
    {
      phase: "Reconnaissance",
      desc: "Decouverte et enumeration de la cible. Collecte OSINT, scan de ports, detection de services et technologies.",
      coverage: "100%",
    },
    {
      phase: "Weaponization",
      desc: "Preparation des vecteurs d'attaque adaptes aux vulnerabilites identifiees.",
      coverage: "95%",
    },
    {
      phase: "Delivery",
      desc: "Simulation de livraison de charge utile via les vecteurs identifies (web, reseau, API).",
      coverage: "90%",
    },
    {
      phase: "Exploitation",
      desc: "Exploitation active des vulnerabilites : injections, RCE, deserialization, SSRF, SSTI.",
      coverage: "95%",
    },
    {
      phase: "Installation",
      desc: "Test de persistance : backdoors, web shells, scheduled tasks, modification de services.",
      coverage: "85%",
    },
    {
      phase: "Command & Control",
      desc: "Simulation de canaux C2 : reverse shells, tunnels DNS, pivoting reseau.",
      coverage: "80%",
    },
    {
      phase: "Actions on Objective",
      desc: "Exfiltration de donnees, mouvement lateral, escalade de privileges, impact metier.",
      coverage: "90%",
    },
  ];

  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Couverture</SectionLabel>
          </motion.div>
          <motion.div variants={fadeUp}>
            <SectionTitle>
              KILL CHAIN<br />
              <span className="text-[var(--text-muted)]">COVERAGE</span>
            </SectionTitle>
          </motion.div>
          <motion.div variants={fadeUp}>
            <ProseBlock>
              BJHUNT couvre l&apos;integralite de la kill chain MITRE ATT&CK.
              Chaque phase de la chaine d&apos;attaque est testee par des
              agents specialises qui simulent les techniques reelles des
              adversaires. Notre couverture depasse celle des scanners
              traditionnels qui se limitent generalement aux phases de
              reconnaissance et d&apos;exploitation basique.
            </ProseBlock>
          </motion.div>

          {/* Kill chain phases */}
          <div className="mt-12">
            {phases.map((item, i) => (
              <motion.div
                key={item.phase}
                variants={fadeUp}
                className="border-t border-[var(--border)] py-5 grid grid-cols-[1fr_auto] gap-4 items-center"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {item.phase}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 ml-7 max-w-lg">
                    {item.desc}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black font-mono text-[var(--success)]">
                    {item.coverage}
                  </div>
                  <div className="text-[8px] text-[var(--text-subtle)] uppercase tracking-widest">
                    couverture
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8">
            <ProseBlock className="text-xs">
              Les pourcentages de couverture sont bases sur les techniques
              documentees dans la matrice MITRE ATT&CK v14. La couverture
              varie selon la cible et la configuration de l&apos;audit.
            </ProseBlock>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 3 — VACCINE LOOP PROCESS
   ================================================================ */
function VaccineProcessSection() {
  const steps = [
    {
      step: "01",
      title: "Attaque",
      desc: "Les agents offensifs lancent un audit complet de la cible. Ils identifient les vulnerabilites, les classent par severite (CVSS) et documentent chaque decouverte avec des preuves d'exploitation.",
    },
    {
      step: "02",
      title: "Briefing",
      desc: "L'orchestrateur synthetise les decouvertes en un rapport structure. Il identifie les vulnerabilites critiques, les chaines d'exploitation et les risques metier associes.",
    },
    {
      step: "03",
      title: "Defense",
      desc: "Les agents defensifs generent des correctifs pour chaque vulnerabilite : patchs de code, configurations securisees, regles de firewall, politiques d'acces. Chaque correction est adaptee au contexte specifique.",
    },
    {
      step: "04",
      title: "Verification",
      desc: "Les agents offensifs retestent chaque vulnerabilite apres correction. Si la remediation echoue, le cycle recommence avec des ajustements. Seules les corrections verifiees sont validees.",
    },
  ];

  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Processus</SectionLabel>
          </motion.div>
          <motion.div variants={fadeUp}>
            <SectionTitle>
              CYCLE VACCIN<br />
              <span className="text-[var(--text-muted)]">ETAPE PAR ETAPE</span>
            </SectionTitle>
          </motion.div>
          <motion.div variants={fadeUp}>
            <ProseBlock>
              Le cycle vaccin est l&apos;innovation fondamentale de BJHUNT.
              Inspire du principe de vaccination en medecine, il expose votre
              systeme a des attaques controlees, applique les defenses
              necessaires, puis verifie leur efficacite. Ce processus iteratif
              garantit que chaque vulnerabilite decouverte est non seulement
              documentee mais effectivement corrigee.
            </ProseBlock>
          </motion.div>

          {/* Steps */}
          <div className="mt-12 grid md:grid-cols-2 gap-px bg-[var(--border)]">
            {steps.map((item) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                className="bg-[var(--bg)] p-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 border border-[var(--success)] flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-[var(--success)]">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp}>
            <ProseBlock className="mt-8">
              Ce cycle peut etre execute de maniere continue (mode
              monitoring) ou ponctuelle (mode audit). En mode monitoring,
              BJHUNT surveille en permanence votre infrastructure et
              declenche un cycle vaccin des qu&apos;une nouvelle
              vulnerabilite est detectee.
            </ProseBlock>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 4 — KNOWLEDGE GRAPH INTELLIGENCE
   ================================================================ */
function KnowledgeGraphIntelSection() {
  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Intelligence</SectionLabel>
          </motion.div>
          <motion.div variants={fadeUp}>
            <SectionTitle>
              GRAPHE DE<br />
              <span className="text-[var(--text-muted)]">CONNAISSANCES</span>
            </SectionTitle>
          </motion.div>
          <motion.div variants={fadeUp}>
            <ProseBlock>
              Au coeur de BJHUNT, un graphe de connaissances en temps reel
              modelise l&apos;ensemble de votre surface d&apos;attaque. Chaque
              decouverte — hote, service, vulnerabilite, credential, relation
              de confiance — est representee comme un noeud connecte aux
              autres par des relations semantiques.
            </ProseBlock>
          </motion.div>

          {/* Key capabilities */}
          <div className="mt-12 space-y-0">
            {[
              {
                title: "Cartographie relationnelle",
                desc: "Le graphe connecte hotes, services, comptes utilisateurs et vulnerabilites. Cette modelisation relationnelle permet d'identifier des chaines d'exploitation invisibles aux scanners lineaires.",
              },
              {
                title: "Enrichissement continu",
                desc: "Chaque agent enrichit le graphe en temps reel. Les decouvertes du module de reconnaissance alimentent les agents d'exploitation, qui a leur tour enrichissent l'analyse. Le graphe devient plus intelligent a chaque cycle.",
              },
              {
                title: "Detection de chemins critiques",
                desc: "Des algorithmes de parcours de graphe identifient les chemins d'attaque les plus courts entre un point d'entree et un actif critique. BJHUNT priorise les vulnerabilites en fonction de leur position dans la chaine d'exploitation.",
              },
              {
                title: "Memoire persistante",
                desc: "Le graphe persiste entre les audits. BJHUNT se souvient de vos audits precedents, detecte les regressions et mesure l'evolution de votre posture de securite dans le temps.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="border-t border-[var(--border)] py-8 grid md:grid-cols-[200px_1fr] gap-4"
              >
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 5 — SANDBOX SECURITY MODEL
   ================================================================ */
function SandboxModelSection() {
  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Securite</SectionLabel>
          </motion.div>
          <motion.div variants={fadeUp}>
            <SectionTitle>
              MODELE DE<br />
              <span className="text-[var(--text-muted)]">SECURITE SANDBOX</span>
            </SectionTitle>
          </motion.div>
          <motion.div variants={fadeUp}>
            <ProseBlock>
              La securite de vos systemes est notre priorite absolue. Chaque
              test s&apos;execute dans un environnement completement isole,
              garantissant zero impact sur votre infrastructure de
              production.
            </ProseBlock>
          </motion.div>

          {/* Security layers */}
          <div className="mt-12 grid md:grid-cols-3 gap-px bg-[var(--border)]">
            {[
              {
                title: "Isolation reseau",
                desc: "Chaque sandbox opere dans un reseau virtuel isole. Aucune communication directe entre le sandbox et votre infrastructure n'est possible. Les resultats sont transmis via un canal securise unidirectionnel.",
              },
              {
                title: "Conteneurisation",
                desc: "Les tests s'executent dans des conteneurs ephemeres bases sur Kali Linux. Chaque conteneur est cree pour un audit et detruit apres. Aucune donnee ne persiste dans le sandbox.",
              },
              {
                title: "Validation des commandes",
                desc: "Un middleware de securite valide chaque commande avant execution. Les operations destructives sont bloquees par defaut. Les agents operent dans un cadre strict defini par les regles d'engagement.",
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="bg-[var(--bg)] p-8"
              >
                <h3 className="text-sm font-bold text-white tracking-tight mb-3">
                  {item.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Additional details */}
          <motion.div variants={fadeUp}>
            <ProseBlock className="mt-8">
              Le modele de securite de BJHUNT est concu selon le principe du
              moindre privilege. Chaque agent ne dispose que des permissions
              strictement necessaires a sa mission. Les outils disponibles
              dans le sandbox sont pre-configures et audites regulierement.
            </ProseBlock>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 6 — COMPLIANCE & REPORTING
   ================================================================ */
function ComplianceSection() {
  const standards = [
    {
      name: "OWASP Top 10",
      desc: "Couverture complete des 10 risques de securite web les plus critiques. Tests automatises pour chaque categorie avec generation de rapport conforme.",
    },
    {
      name: "PCI-DSS",
      desc: "Validation des exigences PCI-DSS pour les organisations traitant des donnees de cartes de paiement. Scan de vulnerabilites ASV-compatible.",
    },
    {
      name: "ISO 27001",
      desc: "Evaluation des controles de securite alignes sur les annexes A de la norme ISO 27001. Rapport d'ecarts et recommandations de mise en conformite.",
    },
    {
      name: "MITRE ATT&CK",
      desc: "Mapping automatique des decouvertes sur la matrice MITRE ATT&CK. Identification des techniques utilisees et des gaps de detection.",
    },
    {
      name: "CVSS v3.1 / v4.0",
      desc: "Scoring standardise de chaque vulnerabilite avec vecteur d'attaque detaille. Integration native des bases NVD et CVE.",
    },
    {
      name: "Rapports Executifs",
      desc: "Generation automatique de rapports non-techniques pour la direction et les investisseurs. Score de securite global, tendances et KPIs.",
    },
  ];

  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Conformite</SectionLabel>
          </motion.div>
          <motion.div variants={fadeUp}>
            <SectionTitle>
              COMPLIANCE<br />
              <span className="text-[var(--text-muted)]">& REPORTING</span>
            </SectionTitle>
          </motion.div>
          <motion.div variants={fadeUp}>
            <ProseBlock>
              BJHUNT genere des rapports conformes aux standards
              internationaux de cybersecurite. Chaque vulnerabilite est
              classee selon les referentiels reconnus, avec des
              recommandations actionnables et un suivi de remediation
              integre.
            </ProseBlock>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-2 gap-px bg-[var(--border)]">
            {standards.map((item) => (
              <motion.div
                key={item.name}
                variants={fadeUp}
                className="bg-[var(--bg)] p-8"
              >
                <h3 className="text-sm font-bold text-white tracking-tight mb-2 font-mono">
                  {item.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   CTA
   ================================================================ */
function CTASection() {
  return (
    <section className="relative py-32 px-8 text-center overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 700,
          height: 700,
          background:
            "radial-gradient(circle, rgba(0,204,138,0.04) 0%, transparent 60%)",
        }}
      />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        }}
      >
        <h2 className="text-[36px] md:text-[48px] font-black tracking-[-0.03em] max-w-2xl">
          CONVAINCU ?
        </h2>
        <p className="text-sm text-[var(--text-muted)] max-w-md">
          Decouvrez comment BJHUNT peut securiser votre infrastructure des
          aujourd&apos;hui.
        </p>
        <div className="flex items-center gap-3">
          <Button asChild size="lg">
            <Link href="/login">Commencer gratuitement</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/contact">Contacter l&apos;equipe →</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

/* ================================================================
   PAGE EXPORT
   ================================================================ */
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
