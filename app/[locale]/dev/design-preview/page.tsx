/**
 * dev/design-preview — SOURCE OF TRUTH for visual QA (refonte 2026 §B9).
 *
 * Showcases every locked design-system primitive with live render + code
 * label. Anchor links per primitive. Color swatches with hex labels mono.
 * Type scale ladder showing each role at its size.
 *
 * Gated in production (returns notFound) — never ships to end users.
 */
'use client'

import { notFound } from 'next/navigation'
import { Display, H1, H2, H3, H4, BodyL, Body, Caption, Eyebrow, Code, Micro } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StatusDot } from '@/components/ui/status-dot'
import { FindingCard } from '@/components/ui/finding-card'
import { SeverityBadge, type Severity } from '@/components/ui/severity-badge'
import { AgentTransition } from '@/components/ui/agent-transition'
import { EvidenceBlock } from '@/components/ui/evidence-block'
import { ProgressBarPhases } from '@/components/ui/progress-bar-phases'
import { allAgents, type AgentId } from '@/lib/agent-labels'

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

const COLOR_TOKENS: Array<{ token: string; hex: string; group: string }> = [
  { group: 'Surfaces', token: '--bjhunt-bg', hex: '#050507' },
  { group: 'Surfaces', token: '--bjhunt-bg-surface', hex: '#101010' },
  { group: 'Surfaces', token: '--bjhunt-bg-elevated', hex: '#16161a' },
  { group: 'Borders', token: '--bjhunt-border', hex: '#3d3a39' },
  { group: 'Borders', token: '--bjhunt-border-strong', hex: '#5a5654' },
  { group: 'Text', token: '--bjhunt-text', hex: '#f2f2f2' },
  { group: 'Text', token: '--bjhunt-text-secondary', hex: '#b8b3b0' },
  { group: 'Text', token: '--bjhunt-text-muted', hex: '#8b949e' },
  { group: 'States', token: '--state-success', hex: '#00d992' },
  { group: 'States', token: '--state-warning', hex: '#ffba00' },
  { group: 'States', token: '--state-critical', hex: '#fb565b' },
]

const TYPE_LADDER: Array<{ role: string; component: React.ReactNode; spec: string }> = [
  { role: 'Display', component: <Display>BJHUNT</Display>, spec: 'clamp(40,5vw,60) · 1.0 · -0.011em · 400' },
  { role: 'H1',      component: <H1>Findings overview</H1>, spec: 'clamp(28,3vw,36) · 1.11 · -0.025em · 400' },
  { role: 'H2',      component: <H2>Section heading</H2>, spec: 'clamp(22,2.4vw,24) · 1.33 · -0.025em · 600' },
  { role: 'H3',      component: <H3>Subsection</H3>, spec: '20 · 1.4 · -0.01em · 600' },
  { role: 'H4',      component: <H4>Card title</H4>, spec: '16 · 1.5 · 0 · 600' },
  { role: 'Body L',  component: <BodyL>Body large — used for hero lede paragraphs to anchor a section.</BodyL>, spec: '16 · 1.6 · 400' },
  { role: 'Body',    component: <Body>Body — default paragraph density across the platform.</Body>, spec: '14 · 1.5 · 400' },
  { role: 'Caption', component: <Caption>Caption — metadata, helper text, table footnotes.</Caption>, spec: '13 · 1.4 · 400' },
  { role: 'Eyebrow', component: <Eyebrow>Section label</Eyebrow>, spec: '12 · 1.4 · +0.18em · 600 · mono UPPER' },
  { role: 'Code',    component: <Code>const target = "192.168.1.1"</Code>, spec: '13 · 1.45 · 400 · mono' },
  { role: 'Micro',   component: <Micro>v0.9.0 · 2026-04-26</Micro>, spec: '11 · 1.3 · 500 · mono' },
]

const PRIMITIVES = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'cards', label: 'Cards' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'badges', label: 'Badges' },
  { id: 'status-dots', label: 'Status dots' },
  { id: 'severity-badges', label: 'Severity badges' },
  { id: 'finding-cards', label: 'Finding cards' },
  { id: 'agent-transition', label: 'Agent transition' },
  { id: 'evidence-block', label: 'Evidence block' },
  { id: 'progress-phases', label: 'Progress phases' },
]

const FIXTURES = [
  {
    severity: 'critical' as Severity,
    title: 'Remote Code Execution via Log4Shell (JNDI injection)',
    cve: 'CVE-2021-44228',
    cvss: 9.8,
    mitre: 'T1190',
    agent: 'exploit' as AgentId,
    verified: true,
    description:
      'The target application uses Log4j 2.14.1 which is vulnerable to JNDI injection via the User-Agent header.',
  },
  {
    severity: 'medium' as Severity,
    title: 'Stored XSS in admin audit log viewer',
    cvss: 6.1,
    mitre: 'T1059.007',
    agent: 'analyst' as AgentId,
    verified: false,
    description:
      'User-controlled fields in the audit log are rendered without escaping.',
  },
]

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="min-h-screen bg-[var(--bjhunt-bg)] text-[var(--bjhunt-text)]">
      <div className="flex">
        {/* TOC sidebar */}
        <aside
          className="hidden lg:block w-56 sticky top-0 h-screen overflow-y-auto p-6"
          style={{ borderRight: '1px solid var(--bjhunt-border)' }}
        >
          <Eyebrow>Spec preview</Eyebrow>
          <nav className="mt-4 flex flex-col gap-2">
            {PRIMITIVES.map((p) => (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="font-mono text-[12px] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
              >
                {p.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 px-6 md:px-12 py-12 max-w-5xl">
          {/* Hero */}
          <header className="mb-16">
            <Eyebrow>_dev / design-preview</Eyebrow>
            <Display className="mt-4 mb-4">Design system 2026</Display>
            <BodyL className="text-[var(--bjhunt-text-muted)] max-w-2xl">
              Source of truth for visual QA. Every primitive locked in{' '}
              <Code className="text-[var(--bjhunt-text)]">DESIGN-SYSTEM-2026.md</Code> rendered with code label.
              Border-weight depth, warm-charcoal hairlines, three-state palette.
            </BodyL>
          </header>

          {/* ─── COLORS ─── */}
          <Anchor id="colors" title="01 / Colors">
            <Body className="text-[var(--bjhunt-text-muted)] mb-6 max-w-2xl">
              Single source of truth. Hex outside this list = build break.
            </Body>
            {(['Surfaces', 'Borders', 'Text', 'States'] as const).map((group) => (
              <div key={group} className="mb-8">
                <Eyebrow className="block mb-3">{group}</Eyebrow>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {COLOR_TOKENS.filter((t) => t.group === group).map((t) => (
                    <Card key={t.token} padding="compact" className="flex items-center gap-3">
                      <span
                        className="w-10 h-10 rounded-[var(--bjhunt-radius-sm)] flex-shrink-0"
                        style={{
                          backgroundColor: `var(${t.token})`,
                          border: '1px solid var(--bjhunt-border)',
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <Code className="text-[var(--bjhunt-text)] truncate">{t.token}</Code>
                        <Micro className="text-[var(--bjhunt-text-muted)]">{t.hex}</Micro>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </Anchor>

          {/* ─── TYPOGRAPHY ─── */}
          <Anchor id="typography" title="02 / Typography">
            <div className="space-y-8">
              {TYPE_LADDER.map((row) => (
                <div
                  key={row.role}
                  className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-8 pb-6"
                  style={{ borderBottom: '1px solid var(--bjhunt-border)' }}
                >
                  <div>
                    <Code className="text-[var(--bjhunt-text)]">&lt;{row.role}&gt;</Code>
                    <Micro className="block mt-1 text-[var(--bjhunt-text-muted)]">{row.spec}</Micro>
                  </div>
                  <div>{row.component}</div>
                </div>
              ))}
            </div>
          </Anchor>

          {/* ─── BUTTONS ─── */}
          <Anchor id="buttons" title="03 / Buttons">
            <SubSection label='variant="ghost" (default)'>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Disabled</Button>
              </div>
            </SubSection>
            <SubSection label='variant="state" — success / warning / critical'>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="state" state="success">Approve</Button>
                <Button variant="state" state="warning">Review</Button>
                <Button variant="state" state="critical">Delete</Button>
              </div>
            </SubSection>
            <SubSection label='variant="bare" — inline action'>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="bare">View details →</Button>
                <Button variant="bare" size="sm">Cancel</Button>
              </div>
            </SubSection>
          </Anchor>

          {/* ─── CARDS ─── */}
          <Anchor id="cards" title="04 / Cards">
            <SubSection label='variant="default" / padding="regular"'>
              <Card>
                <CardHeader>
                  <CardTitle>Default card</CardTitle>
                  <CardDescription>1px hairline border. No hover.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Body className="text-[var(--bjhunt-text-secondary)]">
                    Cards are the depth-2 surface for grouping content. No shadow — border weight is the depth system.
                  </Body>
                </CardContent>
              </Card>
            </SubSection>
            <SubSection label='variant="interactive"'>
              <Card variant="interactive">
                <CardTitle>Interactive card</CardTitle>
                <CardDescription>Hover lifts the border to border-strong.</CardDescription>
              </Card>
            </SubSection>
            <SubSection label='variant="selected" — success / warning / critical'>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="selected" state="success">
                  <CardTitle>Selected · success</CardTitle>
                  <CardDescription>2px state border</CardDescription>
                </Card>
                <Card variant="selected" state="warning">
                  <CardTitle>Selected · warning</CardTitle>
                  <CardDescription>2px state border</CardDescription>
                </Card>
                <Card variant="selected" state="critical">
                  <CardTitle>Selected · critical</CardTitle>
                  <CardDescription>2px state border</CardDescription>
                </Card>
              </div>
            </SubSection>
            <SubSection label='padding="compact" / "regular" / "loose"'>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="compact"><Caption>compact · 16</Caption></Card>
                <Card padding="regular"><Caption>regular · 24</Caption></Card>
                <Card padding="loose"><Caption>loose · 32</Caption></Card>
              </div>
            </SubSection>
          </Anchor>

          {/* ─── INPUTS ─── */}
          <Anchor id="inputs" title="05 / Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <Eyebrow className="block mb-2">Default</Eyebrow>
                <Input placeholder="target.example.com" />
              </div>
              <div>
                <Eyebrow className="block mb-2">Focused (interact to see)</Eyebrow>
                <Input placeholder="Type to focus" />
              </div>
              <div>
                <Eyebrow className="block mb-2">Error</Eyebrow>
                <Input placeholder="Invalid input" error defaultValue="not-an-email" />
              </div>
              <div>
                <Eyebrow className="block mb-2">Disabled</Eyebrow>
                <Input placeholder="Disabled" disabled />
              </div>
            </div>
          </Anchor>

          {/* ─── BADGES ─── */}
          <Anchor id="badges" title="06 / Badges">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">DEFAULT</Badge>
              <Badge variant="success">SUCCESS</Badge>
              <Badge variant="warning">WARNING</Badge>
              <Badge variant="critical">CRITICAL</Badge>
              <Badge variant="info">INFO</Badge>
            </div>
          </Anchor>

          {/* ─── STATUS DOTS ─── */}
          <Anchor id="status-dots" title="07 / Status dots">
            <div className="flex flex-col gap-3">
              <StatusDot state="success" label="Operational" />
              <StatusDot state="success" label="Running (pulsing)" pulse />
              <StatusDot state="warning" label="Degraded" />
              <StatusDot state="critical" label="Failed" />
              <StatusDot state="neutral" label="Unknown" />
            </div>
          </Anchor>

          {/* ─── SEVERITY BADGES ─── */}
          <Anchor id="severity-badges" title="08 / Severity badges">
            <SubSection label='variant="solid" — sm / md / lg'>
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <div key={sz} className="flex flex-wrap items-center gap-3 mb-3">
                  <Eyebrow className="w-12">{sz}</Eyebrow>
                  {SEVERITIES.map((s) => (
                    <SeverityBadge
                      key={`${sz}-${s}`}
                      severity={s}
                      size={sz}
                      variant="solid"
                      pulse={s === 'critical'}
                    />
                  ))}
                </div>
              ))}
            </SubSection>
            <SubSection label='variant="outline"'>
              <div className="flex flex-wrap items-center gap-3">
                {SEVERITIES.map((s) => (
                  <SeverityBadge key={`out-${s}`} severity={s} variant="outline" />
                ))}
              </div>
            </SubSection>
            <SubSection label='variant="minimal"'>
              <div className="flex flex-wrap items-center gap-3">
                {SEVERITIES.map((s) => (
                  <SeverityBadge key={`min-${s}`} severity={s} variant="minimal" />
                ))}
              </div>
            </SubSection>
          </Anchor>

          {/* ─── FINDING CARDS ─── */}
          <Anchor id="finding-cards" title="09 / Finding cards">
            <SubSection label='full density'>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {FIXTURES.map((f) => (
                  <FindingCard
                    key={`full-${f.severity}`}
                    {...f}
                    onViewEvidence={() => {}}
                    onViewRecommendation={() => {}}
                  />
                ))}
              </div>
            </SubSection>
            <SubSection label='compact density (SOC list)'>
              <div className="flex flex-col gap-2 max-w-md">
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
            </SubSection>
          </Anchor>

          {/* ─── AGENT TRANSITION ─── */}
          <Anchor id="agent-transition" title="10 / Agent transition">
            <SubSection label='variant="full" — banner'>
              <AgentTransition agentId="recon" />
            </SubSection>
            <SubSection label='variant="pill" — chat headers'>
              <div className="flex flex-col gap-2">
                {(['decepticon', 'recon', 'exploit', 'analyst', 'defender'] as AgentId[]).map((id) => (
                  <AgentTransition key={id} agentId={id} variant="pill" />
                ))}
              </div>
            </SubSection>
            <SubSection label='variant="mini" — all 17 agents'>
              <div className="flex flex-wrap gap-2">
                {allAgents().map((a) => (
                  <AgentTransition key={a.id} agentId={a.id} variant="mini" />
                ))}
              </div>
            </SubSection>
          </Anchor>

          {/* ─── EVIDENCE BLOCK ─── */}
          <Anchor id="evidence-block" title="11 / Evidence block">
            <div className="flex flex-col gap-5">
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
                  { text: '' },
                  { text: `q=widgets' AND (SELECT pg_sleep(8))--`, highlight: true },
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
          </Anchor>

          {/* ─── PROGRESS PHASES ─── */}
          <Anchor id="progress-phases" title="12 / Progress bar phases">
            <SubSection label="Vuln Research Pipeline (active: Verifier)">
              <ProgressBarPhases
                phases={[
                  { id: 'scan', label: 'Scanner',   state: 'complete', detail: '47 candidates' },
                  { id: 'det',  label: 'Detector',  state: 'complete', detail: '12 confirmed' },
                  { id: 'ver',  label: 'Verifier',  state: 'active',   detail: '7 / 12 PoCs', progress: 0.58 },
                  { id: 'pat',  label: 'Patcher',   state: 'pending',  detail: '—' },
                  { id: 'exp',  label: 'Exploiter', state: 'pending',  detail: '—' },
                ]}
              />
            </SubSection>
            <SubSection label="Error state on Verifier">
              <ProgressBarPhases
                phases={[
                  { id: 'scan', label: 'Scanner',   state: 'complete', detail: '47' },
                  { id: 'det',  label: 'Detector',  state: 'complete', detail: '12' },
                  { id: 'ver',  label: 'Verifier',  state: 'error',    detail: 'Sandbox timeout' },
                  { id: 'pat',  label: 'Patcher',   state: 'pending' },
                  { id: 'exp',  label: 'Exploiter', state: 'pending' },
                ]}
              />
            </SubSection>
          </Anchor>
        </main>
      </div>
    </div>
  )
}

/* ─────────── helpers ─────────── */

function Anchor({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="mb-20 pb-12 scroll-mt-12"
      style={{ borderBottom: '1px solid var(--bjhunt-border)' }}
    >
      <H2 className="mb-6">{title}</H2>
      {children}
    </section>
  )
}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <Eyebrow className="block mb-4 text-[var(--bjhunt-text-muted)]">{label}</Eyebrow>
      {children}
    </div>
  )
}
