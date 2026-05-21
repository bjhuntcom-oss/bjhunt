import { getTranslations } from "next-intl/server";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: "var(--bjhunt-text-muted)",
        fontSize: 11,
        fontFamily: "var(--bjhunt-font-mono)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ borderBottom: "1px solid var(--bjhunt-border)", marginBottom: 0 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 1.25rem" }}>
        <h2
          style={{
            fontFamily: "var(--bjhunt-font-mono)",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02rem",
            textTransform: "uppercase",
            margin: "0 0 1.5rem 0",
          }}
        >
          {title}
        </h2>
        <div>{children}</div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--bjhunt-text-secondary)", fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)" }}>
      <strong style={{ color: "var(--bjhunt-text)", fontWeight: 600 }}>{label} :</strong>{" "}
      {children}
    </p>
  );
}

function DashList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: "0.75rem", fontSize: 14, lineHeight: 1.6, color: "var(--bjhunt-text-secondary)", fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)" }}>
          <span style={{ fontFamily: "var(--bjhunt-font-mono)", color: "var(--bjhunt-text-muted)", flexShrink: 0 }}>—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <main style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)", minHeight: "100vh" }}>
      <section
        style={{
          borderBottom: "1px solid var(--bjhunt-border)",
          padding: "10rem 1.25rem",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>[LEGAL]</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 5vw, 3rem)",
              lineHeight: 1,
              letterSpacing: "-0.02rem",
              textTransform: "uppercase",
              marginTop: "1rem",
              marginBottom: 0,
            }}
          >
            {t("title")}
            <span aria-hidden style={{ color: "var(--bjhunt-text-muted)" }}>.</span>
          </h1>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", marginTop: "1rem", marginBottom: 0 }}>
            BJHUNT — Autonomous Offensive Cybersecurity Platform.
          </p>
        </div>
      </section>

      <Section title={t("companySection")}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Field label={t("entity")}>BJHUNT</Field>
          <Field label={t("type")}>{t("techStartup")}</Field>
          <Field label={t("creation")}>Dec 2023</Field>
          <Field label={t("ceo")}>ATCHAHOUE Destin</Field>
          <Field label={t("general")}>contact@bjhunt.com</Field>
          <Field label={t("partnerships")}>partner@bjhunt.com</Field>
        </div>
      </Section>

      <Section title={t("ipSection")}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Field label={t("copyright")}>{t("copyrightText")}</Field>
          <Field label={t("trademarks")}>{t("trademarksText")}</Field>
          <Field label={t("aiTech")}>{t("aiTechText")}</Field>
        </div>
      </Section>

      <Section title={t("termsSection")}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Field label={t("acceptance")}>{t("acceptanceText")}</Field>
          <Field label={t("usage")}>{t("usageText")}</Field>
          <Field label={t("warning")}>{t("warningText")}</Field>
        </div>
      </Section>

      <Section title={t("privacySection")}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--bjhunt-text-secondary)", fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", marginBottom: "0.75rem" }}>
          <strong style={{ color: "var(--bjhunt-text)", fontWeight: 600 }}>{t("dataCollected")} :</strong>
        </p>
        <DashList items={[t("nameAndContact"), t("companyInformation"), t("emailAddress"), t("customerRequests")]} />
        <p style={{ margin: "1.5rem 0 0.75rem 0", fontSize: 14, lineHeight: 1.6, color: "var(--bjhunt-text-secondary)", fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)" }}>
          <strong style={{ color: "var(--bjhunt-text)", fontWeight: 600 }}>{t("dataUsage")} :</strong>
        </p>
        <DashList items={[t("respondToRequests"), t("waitlistManagement"), t("productUpdates"), t("serviceImprovement")]} />
        <div style={{ marginTop: "1.5rem" }}>
          <Field label={t("gdprRights")}>{t("gdprText")}</Field>
        </div>
      </Section>

      <Section title={t("liabilitySection")}>
        <Field label={t("exclusion")}>{t("exclusionText")}</Field>
        <div style={{ marginTop: "0.75rem" }}>
          <DashList items={[t("indirectDamages"), t("lostProfits"), t("dataLoss"), t("unauthorizedAccess")]} />
        </div>
      </Section>

      <Section title={t("contactSection")}>
        <Field label={t("general")}>contact@bjhunt.com</Field>
        <Field label={t("partnerships")}>partner@bjhunt.com</Field>
      </Section>

      <footer style={{ borderTop: "1px solid var(--bjhunt-border)", padding: "3rem 1.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--bjhunt-text-muted)",
              margin: 0,
            }}
          >
            BJHUNT © 2026 · {t("internalDocument")} · {t("update")}: 05/2026
          </p>
        </div>
      </footer>
    </main>
  );
}