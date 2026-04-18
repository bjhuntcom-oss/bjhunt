import type { Metadata } from 'next'
import Link from 'next/link'

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
 *
 * Sources:
 *   https://artificialintelligenceact.eu/article/50/
 *   https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689
 *   https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
 */
export default function AIAcceptableUsePolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--bjhunt-bg,#0a0a0a)] text-[var(--bjhunt-text,#fff)]">
      <article className="max-w-3xl mx-auto px-6 md:px-12 py-20 prose prose-invert">
        <header className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--bjhunt-text-muted,#888)]">
            AI Transparency &amp; Acceptable Use
          </p>
          <h1 className="text-4xl font-black tracking-[-0.02em] mt-2 mb-4">
            AI Acceptable Use Policy
          </h1>
          <p className="text-sm text-[var(--bjhunt-text-muted,#a1a1aa)]">
            Last reviewed: {LAST_REVIEWED}. Applies to every BJHUNT product
            surface that returns model-generated content to a human user
            (chat, audit reports, suggested findings, remediation drafts).
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">
            1. AI Act Article 50 disclosure
          </h2>
          <p>
            BJHUNT relies on large language models (LLMs) to generate text and
            code throughout the platform. In line with Regulation (EU)
            2024/1689 (the EU AI Act), Article 50, we declare:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>You are interacting with an AI system.</strong> Every
              chat response, agent thought, finding suggestion, and report
              draft is produced by a model — not by a human reviewer.
            </li>
            <li>
              <strong>Outputs may be inaccurate or hallucinated.</strong> Always
              verify findings against ground-truth scans, source code, and
              authoritative references (CVE, MITRE ATT&amp;CK, vendor advisories)
              before acting on them.
            </li>
            <li>
              <strong>Synthetic content marker.</strong> The chat surface
              displays a persistent <em>AI-generated</em> badge (see header).
              Exported reports include a metadata block stating that the
              content is AI-generated.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">
            2. Models we use
          </h2>
          <p>
            BJHUNT routes prompts through a self-hosted{' '}
            <a
              href="https://github.com/BerriAI/litellm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              LiteLLM
            </a>{' '}
            proxy that supports the following providers:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Anthropic</strong> — Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5
            </li>
            <li>
              <strong>OpenAI</strong> — GPT-5.4 / GPT-4.1
            </li>
            <li>
              <strong>Google</strong> — Gemini 2.5 Flash
            </li>
            <li>
              <strong>Ollama Cloud</strong> — GLM-5.1, DeepSeek-V3.2, Kimi-k2.5
            </li>
          </ul>
          <p>
            Choice of model per request is driven by the agent role and the
            user&rsquo;s plan tier. We do not store model outputs beyond the
            duration of the engagement (see retention below).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">
            3. Acceptable use — offensive cybersecurity dual-use
          </h2>
          <p>
            BJHUNT is a tool for{' '}
            <strong>authorised security testing</strong>. You may use it on:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Systems you own and control (your production environment, lab,
              CTF infrastructure).
            </li>
            <li>
              Systems for which you have <strong>explicit written
              authorisation</strong> from the owner (a signed engagement letter,
              a Rules of Engagement document, or an equivalent legal
              instrument). Bug bounty scope counts.
            </li>
            <li>
              Open-source code and public infrastructure within the limits set
              by the project&rsquo;s responsible disclosure policy.
            </li>
          </ul>
          <p>
            <strong>You may not use BJHUNT to:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Attack systems you do not own or are not authorised to test.
              This is a crime under most jurisdictions (CFAA in the US,
              Article 323-1 du Code pénal in France, the Computer Misuse Act
              in the UK, and equivalents).
            </li>
            <li>
              Generate malware for distribution outside an authorised test
              context.
            </li>
            <li>
              Develop offensive AI capabilities prohibited under the AI Act
              (Annex III &amp; Article 5: social scoring, real-time biometric
              identification in public spaces, etc.).
            </li>
            <li>
              Circumvent third-party authentication or access controls outside
              an authorised engagement.
            </li>
            <li>
              Bypass the platform&rsquo;s safety guardrails (sandbox isolation,
              command whitelisting, target-scope enforcement).
            </li>
          </ul>
          <p>
            Violation of this AUP results in immediate account suspension and,
            when applicable, referral to the competent authorities.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">
            4. Data handling &amp; retention
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Chat messages and findings are stored in our EU-hosted PostgreSQL
              database (Hostinger Paris) with row-level security per tenant.
            </li>
            <li>
              Default retention: <strong>30 days</strong> for chat history,{' '}
              <strong>90 days</strong> for findings, <strong>1 year</strong>{' '}
              for engagement reports. See <Link href="/legal" className="underline">our privacy policy</Link>{' '}
              for the full schedule.
            </li>
            <li>
              You can request export or deletion of your data at any time
              (GDPR Articles 15, 17). Email{' '}
              <a href="mailto:privacy@bjhunt.com" className="underline">
                privacy@bjhunt.com
              </a>
              . We respond within 30 days.
            </li>
            <li>
              We do <strong>not</strong> use your prompts or outputs to train
              third-party models. The LiteLLM proxy is configured with
              opt-out flags where the provider supports them; for providers
              without an explicit opt-out we route via Ollama Cloud where
              training opt-out is the default.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">
            5. Reporting concerns
          </h2>
          <p>
            If you believe an AI output is harmful, biased, or has been used in
            violation of this policy, please report it to{' '}
            <a href="mailto:trust@bjhunt.com" className="underline">
              trust@bjhunt.com
            </a>
            . We acknowledge within 48 hours and triage within 5 working days.
          </p>
        </section>

        <footer className="mt-16 pt-8 border-t border-white/10 text-xs text-[var(--bjhunt-text-muted,#71717a)]">
          <p>
            Prepared {LAST_REVIEWED} pursuant to{' '}
            <a
              href="https://artificialintelligenceact.eu/article/50/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              EU AI Act Article 50
            </a>{' '}
            (applicable from 2 August 2026) and the{' '}
            <a
              href="https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              EU Code of Practice on AI-generated content
            </a>
            .
          </p>
        </footer>
      </article>
    </main>
  )
}
