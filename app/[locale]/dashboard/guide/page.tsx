"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

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

// ── Section component ─────────────────────────────────────────────────────

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] font-mono font-bold text-[var(--text-subtle)] uppercase tracking-widest w-5 flex-shrink-0">
          {number}
        </span>
        <h2 className="text-[12px] font-mono font-bold text-white uppercase tracking-[0.12em]">
          {title}
        </h2>
      </div>
      <div className="pl-8">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed mb-3">
      {children}
    </p>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-[9px] font-mono text-[var(--success)] bg-[var(--bg-input)] border border-[var(--border)] px-4 py-3 overflow-x-auto mb-3 whitespace-pre-wrap leading-relaxed">
      {children}
    </pre>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function GuidePage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-4 h-4 text-[var(--text-muted)]" />
        <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.2em] text-white">
          GUIDE D&apos;UTILISATION
        </h1>
      </div>
      <p className="text-[10px] text-[var(--text-subtle)] font-mono mb-10 pl-7">
        Documentation de reference pour la plateforme BJHUNT
      </p>

      {/* ── 1. Premiers pas ──────────────────────────────────────── */}
      <Section number="01" title="Premiers pas">
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
              <ChevronRight className="w-3 h-3 text-[var(--text-subtle)] flex-shrink-0 mt-0.5" />
              <span className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">{s}</span>
            </div>
          ))}
        </div>
        <P>
          Exemple de commande pour lancer un scan web :
        </P>
        <CodeBlock>{`Scan https://example.com for vulnerabilities.
Run port scan, web fingerprinting, and check for common CVEs.`}</CodeBlock>
      </Section>

      {/* ── 2. Les agents ────────────────────────────────────────── */}
      <Section number="02" title="Les agents">
        <P>
          BJHUNT dispose de 17 agents IA specialises. Chaque agent maitrise un domaine
          precis de la cybersecurite offensive et defensive.
        </P>
        <div className="border border-[var(--border)] overflow-x-auto mb-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                <th className="text-left px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                  Agent
                </th>
                <th className="text-left px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                  Role
                </th>
                <th className="text-left px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((agent) => (
                <tr key={agent.name} className="border-b border-[var(--border)] hover:bg-[var(--bg-card)] transition-colors">
                  <td className="px-3 py-2 text-[10px] font-mono text-white font-bold whitespace-nowrap">
                    {agent.name}
                  </td>
                  <td className="px-3 py-2 text-[9px] font-mono text-[var(--text-muted)] whitespace-nowrap">
                    {agent.role}
                  </td>
                  <td className="px-3 py-2 text-[9px] font-mono text-[var(--text-subtle)]">
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

      {/* ── 3. Findings et rapports ──────────────────────────────── */}
      <Section number="03" title="Findings et rapports">
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
              <span className="text-[9px] font-mono text-[var(--text-subtle)] flex-shrink-0 w-3 text-right">{i + 1}.</span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">{s}</span>
            </div>
          ))}
        </div>
        <P>
          Les rapports peuvent etre exportes en Markdown ou CSV (plan Pro+).
          Le format HackerOne et le resume executif sont disponibles en plan Enterprise.
        </P>
      </Section>

      {/* ── 4. OPPLAN et Vaccine Loop ────────────────────────────── */}
      <Section number="04" title="OPPLAN et Vaccine Loop">
        <P>
          L&apos;agent Soundwave genere un OPPLAN (plan operationnel) structure en objectifs,
          chacun decompose en taches. Le panneau OPPLAN dans le chat montre la progression en temps reel.
        </P>
        <P>
          Le Vaccine Loop est le cycle iteratif defense-attaque :
        </P>
        <CodeBlock>{`1. ATTAQUE  -- L'agent exploite une vulnerabilite
2. DEFENSE  -- L'agent Defender genere un patch
3. VERIFY   -- L'agent verifie que le patch bloque l'attaque
4. REPEAT   -- Boucle sur la prochaine vulnerabilite`}</CodeBlock>
        <P>
          Ce cycle garantit que chaque vulnerabilite est non seulement detectee
          mais aussi corrigee et verifiee. Disponible a partir du plan Pro.
        </P>
      </Section>

      {/* ── 5. Outils avances ────────────────────────────────────── */}
      <Section number="05" title="Outils avances">
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
              <ChevronRight className="w-3 h-3 text-[var(--text-subtle)] flex-shrink-0 mt-0.5" />
              <span className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">{s}</span>
            </div>
          ))}
        </div>
        <P>
          La page CVE Intel (plan Pro+) offre une recherche avancee avec scoring EPSS
          et donnees NVD/OSV en temps reel. Le Skill Catalog (plan Pro+) liste toutes les
          techniques offensives et defensives maitrisees par les agents.
        </P>
      </Section>

      {/* ── 6. Plans et limites ──────────────────────────────────── */}
      <Section number="06" title="Plans et limites">
        <P>
          BJHUNT propose trois plans adaptes a differents niveaux d&apos;utilisation :
        </P>
        <div className="border border-[var(--border)] overflow-x-auto mb-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                <th className="text-left px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]" />
                <th className="text-center px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">Free</th>
                <th className="text-center px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">Pro</th>
                <th className="text-center px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Chat IA", "5 min", "Illimite", "Illimite"],
                ["Scans/mois", "--", "5", "20"],
                ["Agents", "3", "10", "17"],
                ["API v1", "--", "--", "Oui"],
              ].map(([feature, free, pro, enterprise]) => (
                <tr key={feature} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 text-[9px] font-mono text-[var(--text-muted)]">{feature}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-[var(--text-subtle)] text-center">{free}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-white text-center">{pro}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-white text-center">{enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          <Link href="/pricing" className="text-[var(--success)] hover:text-white transition-colors">
            Voir la page tarifs complete &rarr;
          </Link>
        </P>
      </Section>

      {/* ── 7. API Enterprise ────────────────────────────────────── */}
      <Section number="07" title="API Enterprise">
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
  );
}
