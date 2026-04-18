import type { Metadata } from 'next'
import Link from 'next/link'

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
 *
 * Sources:
 *   https://eur-lex.europa.eu/eli/dir/2019/882/oj
 *   https://www.etsi.org/deliver/etsi_en/301500_301599/301549/
 *   https://www.w3.org/WAI/WCAG22/Understanding/
 */
export default function AccessibilityStatementPage() {
  return (
    <main className="min-h-screen bg-[var(--bjhunt-bg,#0a0a0a)] text-[var(--bjhunt-text,#fff)]">
      <article className="max-w-3xl mx-auto px-6 md:px-12 py-20 prose prose-invert">
        <header className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--bjhunt-text-muted,#888)]">
            Accessibility
          </p>
          <h1 className="text-4xl font-black tracking-[-0.02em] mt-2 mb-4">
            Accessibility Statement
          </h1>
          <p className="text-sm text-[var(--bjhunt-text-muted,#a1a1aa)]">
            Last reviewed: {LAST_REVIEWED}. This statement applies to{' '}
            <code>https://www.bjhunt.com</code> and the BJHUNT dashboard at{' '}
            <code>https://app.bjhunt.com</code>.
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">Our commitment</h2>
          <p>
            BJHUNT is committed to making its platform usable by everyone, including
            people with disabilities. We aim to conform with{' '}
            <strong>WCAG 2.2 Level AA</strong> as the reference standard
            (incorporating the new criteria added in 2.2 over 2.1, the level
            mandated by EN 301 549 v3.x).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">Conformance status</h2>
          <p>
            <strong>Status: partially conformant.</strong> Parts of the platform
            do not yet fully meet WCAG 2.2 AA. We are actively addressing the
            gaps listed below; this statement is reviewed at every release.
          </p>
          <h3 className="text-lg font-semibold mt-8 mb-2">Known limitations</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Target size (SC 2.5.8 AA):</strong> some inline navigation
              links in the marketing header are below the 24×24 CSS-pixel
              minimum. Tracked, fix scheduled in our W9 design wave.
            </li>
            <li>
              <strong>Accessible authentication (SC 3.3.8 AA, 3.3.9 AAA):</strong>
              {' '}we use hCaptcha as a bot-defence layer. We provide an audio
              alternative through hCaptcha&rsquo;s built-in challenges; we do
              not yet offer a non-cognitive fallback.
            </li>
            <li>
              <strong>Consistent help (SC 3.2.6 AA):</strong> the Contact link
              position varies between marketing and dashboard surfaces.
              Harmonising in W9.
            </li>
            <li>
              <strong>Live regions:</strong> some streaming chat events do not
              announce updates via <code>aria-live</code>. Improvement tracked.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">
            What we have implemented
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Keyboard navigation across every interactive element.</li>
            <li>
              Visible focus outlines (2 px solid + 2 px offset) on every focusable
              element (SC 2.4.7, 2.4.13).
            </li>
            <li>
              <code>prefers-reduced-motion</code> respected globally (animations
              shortened to 0.01ms when set).
            </li>
            <li>
              Cookie banner with equally prominent &laquo;Reject all&raquo; and
              &laquo;Accept all&raquo; buttons (CNIL guidance).
            </li>
            <li>
              Semantic landmarks (<code>&lt;main&gt;</code>,{' '}
              <code>&lt;nav&gt;</code>, <code>&lt;article&gt;</code>) on every
              page.
            </li>
            <li>
              Color contrast ratios verified at AAA on body text where possible,
              minimum AA elsewhere.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">Assistive technology compatibility</h2>
          <p>
            We test BJHUNT regularly on the following pairs:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>NVDA + Firefox (Windows)</li>
            <li>VoiceOver + Safari (macOS, iOS)</li>
            <li>TalkBack + Chrome (Android)</li>
          </ul>
          <p>
            If you encounter problems with another combination, please contact us
            so we can investigate.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">Feedback &amp; contact</h2>
          <p>
            If you find an accessibility barrier on BJHUNT, please tell us. We
            will respond within <strong>10 working days</strong>.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Email:{' '}
              <a
                href="mailto:accessibility@bjhunt.com"
                className="text-[var(--bjhunt-brand-primary,#6366f1)] underline"
              >
                accessibility@bjhunt.com
              </a>
            </li>
            <li>
              Form:{' '}
              <Link href="/contact" className="text-[var(--bjhunt-brand-primary,#6366f1)] underline">
                /contact
              </Link>
            </li>
          </ul>
          <p>
            Please include the URL of the page, a description of the issue,
            your assistive technology and browser, and an example of what you
            expected.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">Enforcement procedure</h2>
          <p>
            If our reply does not meet your needs, you can file a complaint
            with your national accessibility supervisory authority. In France
            this is{' '}
            <a
              href="https://www.defenseurdesdroits.fr/"
              className="text-[var(--bjhunt-brand-primary,#6366f1)] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              le Défenseur des droits
            </a>
            ; for other EU member states see your national EAA enforcement body.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-12 mb-4">Methodology</h2>
          <p>
            This statement is based on a self-assessment by the BJHUNT team
            using axe DevTools, Lighthouse, and manual NVDA/VoiceOver testing.
            We commission a third-party WCAG 2.2 AA audit at every major
            release.
          </p>
        </section>

        <footer className="mt-16 pt-8 border-t border-white/10 text-xs text-[var(--bjhunt-text-muted,#71717a)]">
          <p>
            This statement was prepared on {LAST_REVIEWED} in line with{' '}
            <a
              href="https://eur-lex.europa.eu/eli/dir/2019/882/oj"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Directive (EU) 2019/882 (European Accessibility Act)
            </a>{' '}
            and{' '}
            <a
              href="https://www.etsi.org/deliver/etsi_en/301500_301599/301549/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              EN 301 549 v3.x
            </a>
            .
          </p>
        </footer>
      </article>
    </main>
  )
}
