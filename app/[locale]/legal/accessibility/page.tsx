import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow, H1, H2, H3, Body, Code } from '@/components/ui/typography'

export const metadata: Metadata = {
  title: 'Accessibility Statement — BJHUNT',
  description:
    'Accessibility statement for BJHUNT in line with the European Accessibility Act (Directive (EU) 2019/882) and EN 301 549 v3.x.',
  robots: { index: true, follow: true },
}

const LAST_REVIEWED = '2026-04-18'

/**
 * EAA 2025 (Directive 2019/882) compliance: every B2C SaaS launched in the EU
 * after 28 June 2025 must publish an accessibility statement covering scope,
 * conformance level, known limitations, feedback channel, and enforcement
 * route. Reference standard: EN 301 549 v3.x → WCAG 2.1 AA minimum (we target
 * 2.2 AA where reasonable).
 */
export default function AccessibilityStatementPage() {
  return (
    <main className="min-h-screen bg-[var(--bjhunt-bg)] text-[var(--bjhunt-text)]">
      <article className="max-w-2xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <header className="mb-12">
          <Eyebrow>Accessibility</Eyebrow>
          <H1 className="mt-4 mb-3">Accessibility Statement</H1>
          <Body className="text-[var(--bjhunt-text-muted)] leading-[1.6]">
            Last reviewed: {LAST_REVIEWED}. This statement applies to{' '}
            <Code className="text-[var(--bjhunt-text)]">https://www.bjhunt.com</Code> and the BJHUNT dashboard at{' '}
            <Code className="text-[var(--bjhunt-text)]">https://app.bjhunt.com</Code>.
          </Body>
        </header>

        <Section title="Our commitment">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6]">
            BJHUNT is committed to making its platform usable by everyone, including
            people with disabilities. We aim to conform with{' '}
            <strong className="text-[var(--bjhunt-text)] font-semibold">WCAG 2.2 Level AA</strong>{' '}
            as the reference standard (incorporating the new criteria added in 2.2
            over 2.1, the level mandated by EN 301 549 v3.x).
          </Body>
        </Section>

        <Section title="Conformance status">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6]">
            <strong className="text-[var(--bjhunt-text)] font-semibold">
              Status: partially conformant.
            </strong>{' '}
            Parts of the platform do not yet fully meet WCAG 2.2 AA. We are
            actively addressing the gaps listed below; this statement is reviewed
            at every release.
          </Body>
          <H3 className="mt-8 mb-3 text-[var(--bjhunt-text)]">Known limitations</H3>
          <DashList
            items={[
              <>
                <strong className="text-[var(--bjhunt-text)] font-semibold">Target size (SC 2.5.8 AA):</strong>{' '}
                some inline navigation links in the marketing header are below
                the 24×24 CSS-pixel minimum. Tracked, fix scheduled in our W9
                design wave.
              </>,
              <>
                <strong className="text-[var(--bjhunt-text)] font-semibold">Accessible authentication (SC 3.3.8 AA, 3.3.9 AAA):</strong>{' '}
                we use hCaptcha as a bot-defence layer. We provide an audio
                alternative through hCaptcha&rsquo;s built-in challenges; we do
                not yet offer a non-cognitive fallback.
              </>,
              <>
                <strong className="text-[var(--bjhunt-text)] font-semibold">Consistent help (SC 3.2.6 AA):</strong>{' '}
                the Contact link position varies between marketing and dashboard
                surfaces. Harmonising in W9.
              </>,
              <>
                <strong className="text-[var(--bjhunt-text)] font-semibold">Live regions:</strong>{' '}
                some streaming chat events do not announce updates via{' '}
                <Code className="text-[var(--bjhunt-text)]">aria-live</Code>. Improvement tracked.
              </>,
            ]}
          />
        </Section>

        <Section title="What we have implemented">
          <DashList
            items={[
              'Keyboard navigation across every interactive element.',
              'Visible focus outlines (2 px solid + 2 px offset) on every focusable element (SC 2.4.7, 2.4.13).',
              <>
                <Code className="text-[var(--bjhunt-text)]">prefers-reduced-motion</Code>{' '}
                respected globally (animations shortened to 0.01ms when set).
              </>,
              'Cookie banner with equally prominent « Reject all » and « Accept all » buttons (CNIL guidance).',
              <>
                Semantic landmarks (
                <Code className="text-[var(--bjhunt-text)]">&lt;main&gt;</Code>,{' '}
                <Code className="text-[var(--bjhunt-text)]">&lt;nav&gt;</Code>,{' '}
                <Code className="text-[var(--bjhunt-text)]">&lt;article&gt;</Code>) on every page.
              </>,
              'Color contrast ratios verified at AAA on body text where possible, minimum AA elsewhere.',
            ]}
          />
        </Section>

        <Section title="Assistive technology compatibility">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mb-4">
            We test BJHUNT regularly on the following pairs:
          </Body>
          <DashList
            items={[
              'NVDA + Firefox (Windows)',
              'VoiceOver + Safari (macOS, iOS)',
              'TalkBack + Chrome (Android)',
            ]}
          />
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mt-4">
            If you encounter problems with another combination, please contact us
            so we can investigate.
          </Body>
        </Section>

        <Section title="Feedback & contact">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mb-4">
            If you find an accessibility barrier on BJHUNT, please tell us. We
            will respond within{' '}
            <strong className="text-[var(--bjhunt-text)] font-semibold">10 working days</strong>.
          </Body>
          <DashList
            items={[
              <>
                Email:{' '}
                <a
                  href="mailto:accessibility@bjhunt.com"
                  className="text-[var(--state-success)] underline underline-offset-2 hover:no-underline"
                >
                  accessibility@bjhunt.com
                </a>
              </>,
              <>
                Form:{' '}
                <Link
                  href="/contact"
                  className="text-[var(--state-success)] underline underline-offset-2 hover:no-underline"
                >
                  /contact
                </Link>
              </>,
            ]}
          />
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6] mt-4">
            Please include the URL of the page, a description of the issue,
            your assistive technology and browser, and an example of what you
            expected.
          </Body>
        </Section>

        <Section title="Enforcement procedure">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6]">
            If our reply does not meet your needs, you can file a complaint
            with your national accessibility supervisory authority. In France
            this is{' '}
            <a
              href="https://www.defenseurdesdroits.fr/"
              className="text-[var(--state-success)] underline underline-offset-2 hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              le Défenseur des droits
            </a>
            ; for other EU member states see your national EAA enforcement body.
          </Body>
        </Section>

        <Section title="Methodology">
          <Body className="text-[var(--bjhunt-text-secondary)] leading-[1.6]">
            This statement is based on a self-assessment by the BJHUNT team
            using axe DevTools, Lighthouse, and manual NVDA/VoiceOver testing.
            We commission a third-party WCAG 2.2 AA audit at every major
            release.
          </Body>
        </Section>

        <footer className="mt-16 pt-6 border-t border-[var(--bjhunt-border)]">
          <Body className="text-[12px] leading-[1.6] text-[var(--bjhunt-text-muted)]">
            This statement was prepared on {LAST_REVIEWED} in line with{' '}
            <a
              href="https://eur-lex.europa.eu/eli/dir/2019/882/oj"
              className="underline underline-offset-2 hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Directive (EU) 2019/882 (European Accessibility Act)
            </a>{' '}
            and{' '}
            <a
              href="https://www.etsi.org/deliver/etsi_en/301500_301599/301549/"
              className="underline underline-offset-2 hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              EN 301 549 v3.x
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
