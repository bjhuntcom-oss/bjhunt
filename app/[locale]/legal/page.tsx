"use client";

import { useTranslations } from "next-intl";
import { Eyebrow, H1, H2, Body } from "@/components/ui/typography";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 pb-12 border-b border-bjhunt-border last:border-b-0 last:pb-0 last:mb-0">
      <H2 className="mb-6 text-bjhunt-text">{title}</H2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <Body className={`text-bjhunt-text-secondary leading-[1.6] ${className}`}>
      <strong className="text-bjhunt-text font-semibold">{label} :</strong>{" "}
      {children}
    </Body>
  );
}

function DashList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 list-none p-0 m-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-[1.6] text-bjhunt-text-secondary">
          <span aria-hidden className="font-mono text-bjhunt-text-muted select-none flex-shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LegalPage() {
  const t = useTranslations("legal");

  return (
    <main className="relative pt-14 bg-bjhunt-bg text-bjhunt-text min-h-screen">
      <article className="mx-auto max-w-2xl px-6 md:px-8 py-16 md:py-24">
        <header className="mb-12">
          <Eyebrow>Legal</Eyebrow>
          <H1 className="mt-4 mb-2">
            {t("title")}
            <span aria-hidden className="text-bjhunt-text-muted">.</span>
          </H1>
          <Body className="text-bjhunt-text-muted leading-[1.6]">
            BJHUNT — Autonomous Offensive Cybersecurity Platform.
          </Body>
        </header>

        <Section title={t("companySection")}>
          <Field label={t("entity")}>BJHUNT</Field>
          <Field label={t("type")}>{t("techStartup")}</Field>
          <Field label={t("creation")}>Dec 2023</Field>
          <Field label={t("ceo")}>ATCHAHOUE Destin</Field>
          <Field label={t("general")}>contact@bjhunt.com</Field>
          <Field label={t("partnerships")}>partner@bjhunt.com</Field>
        </Section>

        <Section title={t("ipSection")}>
          <Field label={t("copyright")}>{t("copyrightText")}</Field>
          <Field label={t("trademarks")}>{t("trademarksText")}</Field>
          <Field label={t("aiTech")}>{t("aiTechText")}</Field>
        </Section>

        <Section title={t("termsSection")}>
          <Field label={t("acceptance")}>{t("acceptanceText")}</Field>
          <Field label={t("usage")}>{t("usageText")}</Field>
          <Field label={t("warning")}>{t("warningText")}</Field>
        </Section>

        <Section title={t("privacySection")}>
          <Body className="text-bjhunt-text-secondary leading-[1.6] mb-3">
            <strong className="text-bjhunt-text font-semibold">{t("dataCollected")} :</strong>
          </Body>
          <DashList items={[t("nameAndContact"), t("companyInformation"), t("emailAddress"), t("customerRequests")]} />
          <Body className="text-bjhunt-text-secondary leading-[1.6] mt-6 mb-3">
            <strong className="text-bjhunt-text font-semibold">{t("dataUsage")} :</strong>
          </Body>
          <DashList items={[t("respondToRequests"), t("waitlistManagement"), t("productUpdates"), t("serviceImprovement")]} />
          <Field label={t("gdprRights")} className="mt-6">{t("gdprText")}</Field>
        </Section>

        <Section title={t("liabilitySection")}>
          <Field label={t("exclusion")}>{t("exclusionText")}</Field>
          <DashList items={[t("indirectDamages"), t("lostProfits"), t("dataLoss"), t("unauthorizedAccess")]} />
        </Section>

        <Section title={t("contactSection")}>
          <Field label={t("general")}>contact@bjhunt.com</Field>
          <Field label={t("partnerships")}>partner@bjhunt.com</Field>
        </Section>

        <footer className="mt-16 pt-6 border-t border-bjhunt-border">
          <Eyebrow className="text-bjhunt-text-muted">
            BJHUNT © 2026 · {t("internalDocument")} · {t("update")}: 05/2026
          </Eyebrow>
        </footer>
      </article>
    </main>
  );
}
