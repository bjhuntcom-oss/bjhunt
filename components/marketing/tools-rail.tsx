"use client";

import { useTranslations } from "next-intl";

const TOOLS = [
  "Nmap", "Nuclei", "Burp Suite", "Nessus", "Invicti",
  "SQLMap", "Amass", "Wireshark", "Metasploit", "OWASP ZAP",
  "ffuf", "Subfinder", "Nikto", "Dirsearch", "Gobuster",
];

export function ToolsRail() {
  const t = useTranslations("toolsRail");
  const repeated = [...TOOLS, ...TOOLS];

  return (
    <section
      className="overflow-hidden py-12"
      style={{
        background: "var(--bjhunt-bg)",
        borderTop: "1px solid var(--bjhunt-border)",
        borderBottom: "1px solid var(--bjhunt-border)",
      }}
    >
      <div className="mx-auto mb-8 flex max-w-[1280px] items-center gap-4 px-6 md:px-8 lg:px-12">
        <div className="h-px flex-1 bg-bjhunt-border" />
        <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted whitespace-nowrap">
          {t("eyebrow")}
        </span>
        <div className="h-px flex-1 bg-bjhunt-border" />
      </div>

      <div className="relative overflow-hidden">
        <div className="marquee flex w-max gap-10 sm:gap-12 md:gap-14">
          {repeated.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="flex-shrink-0 text-[12px] font-mono font-medium uppercase tracking-[0.15em] text-bjhunt-text-muted transition-colors duration-200 hover:text-bjhunt-brand cursor-default"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-[720px] px-6 text-center md:px-8 lg:px-12">
        <p className="text-[15px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary">
          {t("description")}
        </p>
      </div>
    </section>
  );
}
