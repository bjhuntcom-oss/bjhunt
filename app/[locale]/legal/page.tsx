"use client";

import { useTranslations } from "next-intl";

export default function LegalPage() {
  const t = useTranslations("legal");

  return (
    <div className="relative pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(99,102,241,0.04), transparent 55%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-3xl px-8 py-24">
        <p
          className="m-0 mb-6 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--bjhunt-text-subtle)" }}
        >
          09 / Legal
        </p>
        <h1
          className="m-0 mb-16"
          style={{
            fontSize: "clamp(40px, 6vw, 64px)",
            fontWeight: 200,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
          }}
        >
          Mentions légales<em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>.</em>
        </h1>

        <div
          className="legal-prose"
          style={{
            fontSize: 14,
            fontWeight: 300,
            lineHeight: 1.7,
            color: "var(--bjhunt-text-muted)",
          }}
        >
          <style jsx>{`
            .legal-prose :global(h2) {
              color: var(--bjhunt-text);
              font-size: 22px;
              font-weight: 300;
              letter-spacing: -0.015em;
              margin: 56px 0 18px;
              padding-bottom: 12px;
              border-bottom: 1px solid var(--bjhunt-border);
            }
            .legal-prose :global(h2:first-child) {
              margin-top: 0;
            }
            .legal-prose :global(p) {
              margin: 0 0 16px;
            }
            .legal-prose :global(strong) {
              color: var(--bjhunt-text);
              font-weight: 400;
            }
            .legal-prose :global(ul) {
              margin: 0 0 16px;
              padding-left: 20px;
            }
            .legal-prose :global(li) {
              margin-bottom: 6px;
            }
          `}</style>

          <h2>{t("companySection")}</h2>
          <p>
            <strong>{t("entity")}:</strong> BJHUNT &nbsp;|&nbsp;
            <strong>{t("type")}:</strong> {t("techStartup")} &nbsp;|&nbsp;
            <strong>{t("creation")}:</strong> Dec 2023
          </p>
          <p>
            <strong>{t("ceo")}:</strong> ATCHAHOUE Destin
          </p>
          <p>
            <strong>{t("contact")}:</strong> contact@bjhunt.com &nbsp;|&nbsp;
            <strong>{t("partners")}:</strong> partner@bjhunt.com
          </p>

          <h2>{t("ipSection")}</h2>
          <p><strong>{t("copyright")}:</strong> {t("copyrightText")}</p>
          <p><strong>{t("trademarks")}:</strong> {t("trademarksText")}</p>
          <p><strong>{t("aiTech")}:</strong> {t("aiTechText")}</p>

          <h2>{t("termsSection")}</h2>
          <p><strong>{t("acceptance")}:</strong> {t("acceptanceText")}</p>
          <p><strong>{t("usage")}:</strong> {t("usageText")}</p>
          <p><strong>{t("warning")}:</strong> {t("warningText")}</p>

          <h2>{t("privacySection")}</h2>
          <p><strong>{t("dataCollected")}:</strong></p>
          <ul>
            <li>{t("nameAndContact")}</li>
            <li>{t("companyInformation")}</li>
            <li>{t("emailAddress")}</li>
            <li>{t("customerRequests")}</li>
          </ul>
          <p><strong>{t("dataUsage")}:</strong></p>
          <ul>
            <li>{t("respondToRequests")}</li>
            <li>{t("waitlistManagement")}</li>
            <li>{t("productUpdates")}</li>
            <li>{t("serviceImprovement")}</li>
          </ul>
          <p><strong>{t("gdprRights")}:</strong> {t("gdprText")}</p>

          <h2>{t("liabilitySection")}</h2>
          <p><strong>{t("exclusion")}:</strong> {t("exclusionText")}</p>
          <ul>
            <li>{t("indirectDamages")}</li>
            <li>{t("lostProfits")}</li>
            <li>{t("dataLoss")}</li>
            <li>{t("unauthorizedAccess")}</li>
          </ul>

          <h2>{t("contactSection")}</h2>
          <p>
            <strong>{t("general")}:</strong> contact@bjhunt.com
          </p>
          <p>
            <strong>{t("partnerships")}:</strong> partner@bjhunt.com
          </p>
        </div>

        <p
          className="mt-16 font-mono uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.32em",
            color: "var(--bjhunt-text-disabled)",
            paddingTop: 24,
            borderTop: "1px solid var(--bjhunt-border)",
          }}
        >
          BJHUNT © 2026 · {t("internalDocument")} · {t("update")}: 18/01/2026
        </p>
      </div>
    </div>
  );
}
