"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHero, Eyebrow } from "@/components/ui/page-hero";

// ── Agent table data ──────────────────────────────────────────────────────

const AGENTS = [
  { name: "BJHUNT ALPHA 1.0", role: "Orchestrateur principal", description: "Coordonne les 9 sous-agents, gere le cycle complet de la mission" },
  { name: "Soundwave", role: "Planification", description: "Interview operateur, genere RoE, CONOPS, OPPLAN" },
  { name: "Recon", role: "Reconnaissance", description: "OSINT, enumeration sous-domaines, scan de ports, detection de services" },
  { name: "Exploit", role: "Exploitation", description: "SQLi, SSTI, Kerberoasting, ADCS, attaques credentials" },
  { name: "PostExploit", role: "Post-exploitation", description: "Escalade privileges, mouvement lateral, C2 Sliver" },
  { name: "Analyst", role: "Analyse de code", description: "Code review, analyse statique, CVE sweeps, fuzzing" },
  { name: "Reverser", role: "Reverse engineering", description: "ELF/PE/firmware triage, detection packer, ROP gadgets" },
  { name: "Contract Auditor", role: "Audit smart contracts", description: "Solidity/EVM : reentrancy, flash loans, Slither, Foundry PoC" },
  { name: "Cloud Hunter", role: "Cloud security", description: "AWS IAM privesc, S3 takeover, K8s RBAC, secrets Terraform" },
  { name: "AD Operator", role: "Active Directory", description: "BloodHound, Kerberoast, AS-REP roast, ADCS ESC1-15, DCSync" },
  { name: "VulnResearch", role: "Recherche de vulns", description: "Coordinateur du pipeline de recherche de vulnerabilites" },
  { name: "Scanner", role: "Scan", description: "Agent de scan automatise" },
  { name: "Detector", role: "Detection", description: "Detection de vulnerabilites dans les resultats de scan" },
  { name: "Verifier", role: "Verification", description: "Verification et validation des vulnerabilites detectees" },
  { name: "Patcher", role: "Patchs", description: "Generation automatique de patchs et correctifs" },
  { name: "Exploiter", role: "Exploits", description: "Generation de proof-of-concept exploits" },
  { name: "Defender", role: "Defense", description: "Agent defensif : vaccine (attaque, defense, verification)" },
];

// ── TOC items ─────────────────────────────────────────────────────────────

const TOC = [
  { id: "premiers-pas", number: "01", label: "Premiers pas" },
  { id: "agents", number: "02", label: "Les agents" },
  { id: "findings", number: "03", label: "Findings et rapports" },
  { id: "opplan", number: "04", label: "OPPLAN et Vaccine Loop" },
  { id: "outils", number: "05", label: "Outils avances" },
  { id: "plans", number: "06", label: "Plans et limites" },
  { id: "api", number: "07", label: "API Enterprise" },
];

// ── Section component ─────────────────────────────────────────────────────

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <header className="flex items-center gap-3 mb-4">
        <Eyebrow>{number}</Eyebrow>
        <h2
          className="m-0"
          style={{
            fontFamily:
              "var(--bjhunt-font-display, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)",
            fontWeight: 600,
            fontSize: 24,
            lineHeight: 1.33,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-text)",
          }}
        >
          {title}
        </h2>
      </header>
      <div>{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3"
      style={{
        fontFamily: "var(--bjhunt-font-sans)",
        fontSize: 14,
        lineHeight: 1.6,
        color: "var(--bjhunt-text-muted)",
      }}
    >
      {children}
    </p>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="mb-4 px-4 py-3 overflow-x-auto"
      style={{
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: 13,
        lineHeight: 1.6,
        color: "var(--bjhunt-status-success, #00d992)",
        background: "var(--bjhunt-bg, #050507)",
        border: "1px solid var(--bjhunt-border, #3d3a39)",
        borderRadius: "var(--bjhunt-radius, 6px)",
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </pre>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [activeId, setActiveId] = useState<string>(TOC[0]!.id);

  useEffect(() => {
    const handler = () => {
      const offset = 120;
      let current = TOC[0]!.id;
      for (const item of TOC) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top - offset <= 0) {
          current = item.id;
        }
      }
      setActiveId(current);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1280px] mx-auto">
      <PageHero
        eyebrow="04 / GUIDE"
        title="Guide"
        lede="Documentation de reference pour la plateforme BJHUNT — agents, workflows et bonnes pratiques d'engagement."
      />

      <div className="flex gap-8">
        {/* TOC sidebar (lg+) */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start">
          <div className="mb-3">
            <Eyebrow>Table</Eyebrow>
          </div>
          <ul className="space-y-1">
            {TOC.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="flex items-baseline gap-2 py-1.5 transition-colors"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color:
                      activeId === item.id
                        ? "var(--bjhunt-text)"
                        : "var(--bjhunt-text-muted)",
                    borderLeft:
                      activeId === item.id
                        ? "2px solid var(--bjhunt-status-success, #00d992)"
                        : "2px solid transparent",
                    paddingLeft: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 12,
                      color: "var(--bjhunt-text-subtle, #52525b)",
                    }}
                  >
                    {item.number}
                  </span>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Body */}
        <div className="flex-1 min-w-0 max-w-3xl">
          <Section id="premiers-pas" number="01" title="Premiers pas">
            <P>
              BJHUNT fonctionne par engagements (sessions). Chaque engagement represente un audit
              de securite sur une cible donnee. Pour demarrer :
            </P>
            <div className="space-y-2 mb-4">
              {[
                "Ouvrez le Chat AI depuis la barre laterale",
                "Envoyez directement un message ou cliquez sur une suggestion",
                "Decrivez votre cible (domaine, IP, code source, etc.)",
                "L'agent orchestre automatiquement les sous-agents necessaires",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight
                    className="w-3 h-3 shrink-0 mt-1"
                    style={{ color: "var(--bjhunt-text-muted)" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-sans)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <P>Exemple de commande pour lancer un scan web :</P>
            <CodeBlock>{`Scan https://example.com for vulnerabilities.
Run port scan, web fingerprinting, and check for common CVEs.`}</CodeBlock>
          </Section>

          <Section id="agents" number="02" title="Les agents">
            <P>
              BJHUNT dispose de 17 agents IA specialises. Chaque agent maitrise un domaine
              precis de la cybersecurite offensive et defensive.
            </P>
            <div
              className="border overflow-x-auto mb-4"
              style={{
                borderColor: "var(--bjhunt-border, #3d3a39)",
                borderRadius: "var(--bjhunt-radius-md, 8px)",
              }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--bjhunt-bg, #050507)" }}>
                    <TH>Agent</TH>
                    <TH>Role</TH>
                    <TH>Description</TH>
                  </tr>
                </thead>
                <tbody>
                  {AGENTS.map((agent) => (
                    <tr
                      key={agent.name}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderTop: "1px solid var(--bjhunt-border, #3d3a39)",
                      }}
                    >
                      <td
                        className="px-4 py-3 whitespace-nowrap"
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 13,
                          color: "var(--bjhunt-text)",
                        }}
                      >
                        {agent.name}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap"
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontSize: 13,
                          color: "var(--bjhunt-text)",
                        }}
                      >
                        {agent.role}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontSize: 13,
                          color: "var(--bjhunt-text-muted)",
                        }}
                      >
                        {agent.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              Le plan Free donne acces a 3 agents (demo), le plan Pro a 10 agents,
              et le plan Enterprise aux 17 agents complets.
            </P>
          </Section>

          <Section id="findings" number="03" title="Findings et rapports">
            <P>
              Chaque vulnerabilite detectee est enregistree comme un &quot;finding&quot; avec :
            </P>
            <div className="space-y-1 mb-4">
              {[
                "Severite CVSS (Critical, High, Medium, Low, Info)",
                "Techniques MITRE ATT&CK associees",
                "Description detaillee et preuve (evidence)",
                "Remediation recommandee",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="shrink-0 w-5"
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    {i + 1}.
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-sans)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <P>
              Les rapports peuvent etre exportes en Markdown ou CSV (plan Pro+).
              Le format HackerOne et le resume executif sont disponibles en plan Enterprise.
            </P>
          </Section>

          <Section id="opplan" number="04" title="OPPLAN et Vaccine Loop">
            <P>
              L&apos;agent Soundwave genere un OPPLAN (plan operationnel) structure en objectifs,
              chacun decompose en taches. Le panneau OPPLAN dans le chat montre la progression en temps reel.
            </P>
            <P>Le Vaccine Loop est le cycle iteratif defense-attaque :</P>
            <CodeBlock>{`1. ATTAQUE  -- L'agent exploite une vulnerabilite
2. DEFENSE  -- L'agent Defender genere un patch
3. VERIFY   -- L'agent verifie que le patch bloque l'attaque
4. REPEAT   -- Boucle sur la prochaine vulnerabilite`}</CodeBlock>
            <P>
              Ce cycle garantit que chaque vulnerabilite est non seulement detectee
              mais aussi corrigee et verifiee. Disponible a partir du plan Pro.
            </P>
          </Section>

          <Section id="outils" number="05" title="Outils avances">
            <P>
              Le Tool Playground (plan Enterprise) permet d&apos;executer directement des outils
              du moteur sans passer par le chat :
            </P>
            <div className="space-y-1 mb-4">
              {[
                "Bash -- commandes dans le sandbox Kali",
                "KG Query -- requetes Cypher sur le knowledge graph",
                "CVE Lookup -- recherche NVD/EPSS rapide",
                "JWT Parse -- decodage et analyse de tokens JWT",
                "IAM Audit -- analyse de policies AWS",
                "Network Scan -- scan nmap rapide",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight
                    className="w-3 h-3 shrink-0 mt-1"
                    style={{ color: "var(--bjhunt-text-muted)" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-sans)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <P>
              La page CVE Intel (plan Pro+) offre une recherche avancee avec scoring EPSS
              et donnees NVD/OSV en temps reel. Le Skill Catalog (plan Pro+) liste toutes les
              techniques offensives et defensives maitrisees par les agents.
            </P>
          </Section>

          <Section id="plans" number="06" title="Plans et limites">
            <P>
              BJHUNT propose trois plans adaptes a differents niveaux d&apos;utilisation :
            </P>
            <div
              className="border overflow-x-auto mb-4"
              style={{
                borderColor: "var(--bjhunt-border, #3d3a39)",
                borderRadius: "var(--bjhunt-radius-md, 8px)",
              }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--bjhunt-bg, #050507)" }}>
                    <TH />
                    <TH center>Free</TH>
                    <TH center>Pro</TH>
                    <TH center>Enterprise</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Chat IA", "5 min", "Illimite", "Illimite"],
                    ["Scans/mois", "--", "5", "20"],
                    ["Agents", "3", "10", "17"],
                    ["API v1", "--", "--", "Oui"],
                  ].map(([feature, free, pro, enterprise]) => (
                    <tr
                      key={feature}
                      style={{ borderTop: "1px solid var(--bjhunt-border, #3d3a39)" }}
                    >
                      <td
                        className="px-4 py-3"
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontSize: 13,
                          color: "var(--bjhunt-text-muted)",
                        }}
                      >
                        {feature}
                      </td>
                      <Cell>{free}</Cell>
                      <Cell strong>{pro}</Cell>
                      <Cell strong>{enterprise}</Cell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              <Link
                href="/pricing"
                className="transition-colors"
                style={{ color: "var(--bjhunt-status-success, #00d992)" }}
              >
                Voir la page tarifs complete &rarr;
              </Link>
            </P>
          </Section>

          <Section id="api" number="07" title="API Enterprise">
            <P>
              Le plan Enterprise donne acces a l&apos;API REST v1 pour l&apos;automatisation et l&apos;integration CI/CD.
              Exemple de creation d&apos;engagement programmatique :
            </P>
            <CodeBlock>{`curl -X POST https://api.bjhunt.com/api/v1/engagements \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Nightly Web Scan",
    "target": "app.example.com",
    "agentGraph": "recon",
    "config": { "depth": "full" }
  }'`}</CodeBlock>
            <P>
              L&apos;API supporte egalement les webhooks pour recevoir les findings en temps reel
              dans votre pipeline de securite.
            </P>
            <CodeBlock>{`// Webhook payload example
{
  "event": "finding.created",
  "data": {
    "id": "f_abc123",
    "severity": "critical",
    "title": "SQL Injection in /api/users",
    "cvss": 9.8,
    "engagementId": "eng_xyz789"
  }
}`}</CodeBlock>
          </Section>
        </div>
      </div>
    </div>
  );
}

function TH({ children, center = false }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th
      className={`px-4 py-3 ${center ? "text-center" : "text-left"}`}
      style={{
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--bjhunt-text-muted)",
      }}
    >
      {children}
    </th>
  );
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <td
      className="px-4 py-3 text-center"
      style={{
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: 13,
        color: strong ? "var(--bjhunt-text)" : "var(--bjhunt-text-muted)",
      }}
    >
      {children}
    </td>
  );
}
