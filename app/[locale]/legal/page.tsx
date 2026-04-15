"use client";

import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/ui/section-label";

export default function LegalPage() {
  const t = useTranslations("legal");

  return (
    <div className="pt-14">
      <div className="max-w-3xl mx-auto px-8 py-16">
        <SectionLabel>Légal</SectionLabel>
        <h1 className="text-4xl font-black mt-4 mb-12 tracking-tight">Mentions légales</h1>
        <div className="text-sm text-[var(--text-muted)] leading-relaxed [&>h2]:text-white [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:tracking-tight [&>p]:mb-4 [&>ul]:mb-4 [&>ul]:pl-4 [&>li]:mb-1">

          {/* Section 1 - Company */}
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

          {/* Section 2 - Intellectual Property */}
          <h2>{t("ipSection")}</h2>
          <p><strong>{t("copyright")}:</strong> {t("copyrightText")}</p>
          <p><strong>{t("trademarks")}:</strong> {t("trademarksText")}</p>
          <p><strong>{t("aiTech")}:</strong> {t("aiTechText")}</p>

          {/* Section 3 - Terms */}
          <h2>{t("termsSection")}</h2>
          <p><strong>{t("acceptance")}:</strong> {t("acceptanceText")}</p>
          <p><strong>{t("usage")}:</strong> {t("usageText")}</p>
          <p><strong>{t("warning")}:</strong> {t("warningText")}</p>

          {/* Section 4 - Privacy */}
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

          {/* Section 5 - Liability */}
          <h2>{t("liabilitySection")}</h2>
          <p><strong>{t("exclusion")}:</strong> {t("exclusionText")}</p>
          <ul>
            <li>{t("indirectDamages")}</li>
            <li>{t("lostProfits")}</li>
            <li>{t("dataLoss")}</li>
            <li>{t("unauthorizedAccess")}</li>
          </ul>

          {/* Section 6 - Contact */}
          <h2>{t("contactSection")}</h2>
          <p>
            <strong>{t("general")}:</strong> contact@bjhunt.com
          </p>
          <p>
            <strong>{t("partnerships")}:</strong> partner@bjhunt.com
          </p>
          <p className="mt-8 text-xs">BJHUNT © 2026 — {t("internalDocument")} — {t("update")}: 18/01/2026</p>

        </div>
      </div>
    </div>
  );
}
