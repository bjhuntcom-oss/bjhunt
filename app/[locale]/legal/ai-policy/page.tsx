import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow, H1, H2, Body } from '@/components/ui/typography'

export const metadata: Metadata = {
  title: 'AI Acceptable Use Policy — BJHUNT',
  description:
    'BJHUNT AI Acceptable Use Policy and EU AI Act Article 50 transparency disclosure for AI-generated outputs.',
  robots: { index: true, follow: true },
}

const LAST_REVIEWED = '2026-04-18'

/**
 * EU AI Act (Regulation 2024/1689) — Article 50 transparency obligations apply
 * from 2 August 2026. BJHUNT is both a deployer (orchestrating chat outputs)
 * and a downstream provider of generative AI (the chat surface). This page
 * publishes the disclosures required at deployment + the AUP for the
 * dual-use offensive cybersecurity context.
 */
export default function AIAcceptableUsePolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--bjhunt-bg)] text-[var(--bjhunt-text)]">
      <article className="max-w-2xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <header className="mb-12">
          <Eyebrow>AI Transparency &amp; Acceptable Use</Eyebrow>
          <H1 className="mt-4 mb-3">AI Acceptable Use Policy</H1>
          <Body className="text-[var(--bjhunt-text-muted)] leading-[1.6]">
            Last reviewed: {LAST_REVIEWED}. Applies to every BJHUNT product
            surface that returns model-generated content to a human user
            (chat, audit reports, suggested findings, remediation drafts).
          </Body>
        </header>

        <Section title="1. AI Act Article 50 disclosure">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mb-4">
            BJHUNT relies on large language models (LLMs) to generate text and
            code throughout the platform. In line with Regulation (EU)
            2024/1689 (the EU AI Act), Article 50, we declare:
          </Body>
          <DashList
            items={[
              <>
                <strong className="text-[var(--bjhunt-text)] font-semibold">
                  You are interacting with an AI system.
                </strong>{' '}
                Every chat response, agent thought, finding suggestion, and
                report draft is produced by a model — not by a human reviewer.
              </>,
              <>
                <strong className="text-[var(--bjhunt-text)] font-semibold">
                  Outputs may be inaccurate or hallucinated.
                </strong>{' '}
                Always verify findings against ground-truth scans, source code,
                and authoritative references (CVE, MITRE ATT&amp;CK, vendor
                advisories) before acting on them.
              </>,
              <>
                <strong className="text-[var(--bjhunt-text)] font-semibold">
                  Synthetic content marker.
                </strong>{' '}
                The chat surface displays a persistent <em>AI-generated</em>{' '}
                badge (see header). Exported reports include a metadata block
                stating that the content is AI-generated.
              </>,
            ]}
          />
        </Section>

        <Section title="2. Models we use">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mb-4">
            BJHUNT routes prompts through a self-hosted{' '}
            <a
              href="https://github.com/BerriAI/litellm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--state-success)] underline underline-offset-2 hover:no-underline"
            >
              LiteLLM
            </a>{' '}
            proxy that supports the following providers:
          </Body>
          <DashList
            items={[
              <><strong className="text-[var(--bjhunt-text)] font-semibold">Anthropic</strong> — Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5</>,
              <><strong className="text-[var(--bjhunt-text)] font-semibold">OpenAI</strong> — GPT-5.4 / GPT-4.1</>,
              <><strong className="text-[var(--bjhunt-text)] font-semibold">Google</strong> — Gemini 2.5 Flash</>,
              <><strong className="text-[var(--bjhunt-text)] font-semibold">Ollama Cloud</strong> — GLM-5.1, DeepSeek-V3.2, Kimi-k2.5</>,
            ]}
          />
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mt-4">
            Choice of model per request is driven by the agent role and the
            user&rsquo;s plan tier. We do not store model outputs beyond the
            duration of the engagement (see retention below).
          </Body>
        </Section>

        <Section title="3. Acceptable use — offensive cybersecurity dual-use">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mb-4">
            BJHUNT is a tool for{' '}
            <strong className="text-[var(--bjhunt-text)] font-semibold">authorised security testing</strong>.
            You may use it on:
          </Body>
          <DashList
            items={[
              'Systems you own and control (your production environment, lab, CTF infrastructure).',
              <>
                Systems for which you have{' '}
                <strong className="text-[var(--bjhunt-text)] font-semibold">
                  explicit written authorisation
                </strong>{' '}
                from the owner (a signed engagement letter, a Rules of
                Engagement document, or an equivalent legal instrument). Bug
                bounty scope counts.
              </>,
              "Open-source code and public infrastructure within the limits set by the project's responsible disclosure policy.",
            ]}
          />
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mt-6 mb-4">
            <strong className="text-[var(--state-critical)] font-semibold">
              You may not use BJHUNT to:
            </strong>
          </Body>
          <DashList
            items={[
              'Attack systems you do not own or are not authorised to test. This is a crime under most jurisdictions (CFAA in the US, Article 323-1 du Code pénal in France, the Computer Misuse Act in the UK, and equivalents).',
              'Generate malware for distribution outside an authorised test context.',
              'Develop offensive AI capabilities prohibited under the AI Act (Annex III & Article 5: social scoring, real-time biometric identification in public spaces, etc.).',
              'Circumvent third-party authentication or access controls outside an authorised engagement.',
              "Bypass the platform's safety guardrails (sandbox isolation, command whitelisting, target-scope enforcement).",
            ]}
          />
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mt-4">
            Violation of this AUP results in immediate account suspension and,
            when applicable, referral to the competent authorities.
          </Body>
        </Section>

        <Section title="4. Data handling & retention">
          <DashList
            items={[
              'Chat messages and findings are stored in our EU-hosted PostgreSQL database (Hostinger Paris) with row-level security per tenant.',
              <>
                Default retention:{' '}
                <strong className="text-[var(--bjhunt-text)] font-semibold">30 days</strong>{' '}
                for chat history,{' '}
                <strong className="text-[var(--bjhunt-text)] font-semibold">90 days</strong>{' '}
                for findings,{' '}
                <strong className="text-[var(--bjhunt-text)] font-semibold">1 year</strong>{' '}
                for engagement reports. See{' '}
                <Link
                  href="/legal"
                  className="text-[var(--state-success)] underline underline-offset-2 hover:no-underline"
                >
                  our privacy policy
                </Link>{' '}
                for the full schedule.
              </>,
              <>
                You can request export or deletion of your data at any time
                (GDPR Articles 15, 17). Email{' '}
                <a
                  href="mailto:privacy@bjhunt.com"
                  className="text-[var(--state-success)] underline underline-offset-2 hover:no-underline"
                >
                  privacy@bjhunt.com
                </a>
                . We respond within 30 days.
              </>,
              <>
                We do{' '}
                <strong className="text-[var(--bjhunt-text)] font-semibold">not</strong>{' '}
                use your prompts or outputs to train third-party models. The
                LiteLLM proxy is configured with opt-out flags where the
                provider supports them; for providers without an explicit
                opt-out we route via Ollama Cloud where training opt-out is the
                default.
              </>,
            ]}
          />
        </Section>

        <Section title="5. Reporting concerns">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6]">
            If you believe an AI output is harmful, biased, or has been used in
            violation of this policy, please report it to{' '}
            <a
              href="mailto:trust@bjhunt.com"
              className="text-[var(--state-success)] underline underline-offset-2 hover:no-underline"
            >
              trust@bjhunt.com
            </a>
            . We acknowledge within 48 hours and triage within 5 working days.
          </Body>
        </Section>

        <footer className="mt-16 pt-6 border-t border-[var(--bjhunt-border)]">
          <Body className="text-[12px] leading-[1.6] text-[var(--bjhunt-text-muted)]">
            Prepared {LAST_REVIEWED} pursuant to{' '}
            <a
              href="https://artificialintelligenceact.eu/article/50/"
              className="underline underline-offset-2 hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              EU AI Act Article 50
            </a>{' '}
            (applicable from 2 August 2026) and the{' '}
            <a
              href="https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content"
              className="underline underline-offset-2 hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              EU Code of Practice on AI-generated content
            </a>
            .
          </Body>
        </footer>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 pb-12 border-b border-[var(--bjhunt-border)] last:border-b-0 last:pb-0 last:mb-0">
      <H2 className="mb-6 text-[var(--bjhunt-text)]">{title}</H2>
      {children}
    </section>
  )
}

function DashList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 list-none p-0 m-0">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-3 text-[14px] leading-[1.6] text-[var(--bjhunt-text-secondary)]"
        >
          <span
            aria-hidden
            className="font-mono text-[var(--bjhunt-text-muted)] select-none flex-shrink-0"
          >
            —
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
