"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  KaliLinuxLogo,
  InvictiLogo,
  AcunetixLogo,
  MetasploitLogo,
  SandboxLogo,
  BloodHoundLogo,
  BurpSuiteLogo,
} from "@/components/ui/tool-logos";

const FLIP_TEXTS = [
  "Reconnaissance · Exploitation · Conformité",
  "Web · Cloud · Active Directory · Mobile",
  "OWASP · PCI-DSS · ISO 27001 · SOC 2 · NIS2",
  "CVSS v4 · EPSS · KEV · DREAD",
];

const TOOL_LOGOS = [
  { component: KaliLinuxLogo, label: "Kali Linux" },
  { component: InvictiLogo, label: "Invicti" },
  { component: AcunetixLogo, label: "Acunetix" },
  { component: MetasploitLogo, label: "Metasploit" },
  { component: SandboxLogo, label: "Sandbox" },
  { component: BloodHoundLogo, label: "BloodHound" },
  { component: BurpSuiteLogo, label: "Burp Suite" },
];

export function HomeHero() {
  const t = useTranslations("hero");
  const [flipIndex, setFlipIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setFlipIndex((prev) => (prev + 1) % FLIP_TEXTS.length);
        setIsFading(false);
      }, 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      style={{
        borderBottom: "1px solid var(--bjhunt-border)",
        background: "var(--bjhunt-bg)",
      }}
    >
      {/* Thin border frame */}
      <div
        style={{
          maxWidth: "75rem",
          margin: "0 auto",
          padding: "2rem 1.5rem 2.5rem",
          textAlign: "center",
          borderLeft: "1px solid var(--bjhunt-border)",
          borderRight: "1px solid var(--bjhunt-border)",
        }}
      >
        {/* Announcement pill */}
        <div style={{ marginBottom: "1.5rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.05em",
              color: "var(--bjhunt-text-secondary)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            <span
              style={{
                background: "#f80",
                color: "#000",
                padding: "2px 6px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textDecoration: "none",
              }}
            >
              NEW
            </span>
            {t("pill")}
          </span>
        </div>

        {/* Main headline */}
        <h1
          style={{
            fontFamily: "var(--bjhunt-font-mono)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 700,
            lineHeight: "1.1",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            color: "var(--bjhunt-text)",
            marginBottom: "1.25rem",
          }}
        >
          <span>{t("titleLine1")}</span>
          <br />
          <span
            style={{
              background: "#000",
              color: "#fff",
              padding: "0 0.15em",
            }}
          >
            {t("titleLine2")}
          </span>
        </h1>

        {/* Flipping text bar */}
        <div
          style={{
            height: "48px",
            background: "var(--bjhunt-text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "clamp(0.875rem, 2.5vw, 1.25rem)",
              fontWeight: 700,
              color: "var(--bjhunt-text-inverted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
              opacity: isFading ? 0 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            {FLIP_TEXTS[flipIndex]}
          </span>
        </div>

        {/* CTA Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            marginBottom: "2.5rem",
          }}
        >
          <Link
            href="/beta"
            style={{
              height: "48px",
              padding: "0 2rem",
              background: "#000",
              color: "#fff",
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "12px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderRadius: 0,
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              cursor: "pointer",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#1f1f1f")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#000")
            }
          >
            {t("ctaPrimary")}
          </Link>
          <a
            href="#demo"
            style={{
              height: "48px",
              padding: "0 2rem",
              background: "var(--bjhunt-bg)",
              color: "var(--bjhunt-text)",
              border: "1px solid var(--bjhunt-border)",
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "12px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderRadius: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--bjhunt-text)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--bjhunt-border)")
            }
          >
            {t("ctaSecondary")}
          </a>
        </div>

        {/* TOOLCHAIN section */}
        <div>
          <p
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--bjhunt-text-muted)",
              marginBottom: "1.25rem",
            }}
          >
            Toolchain
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2rem",
              flexWrap: "wrap",
            }}
          >
            {TOOL_LOGOS.map(({ component: Logo, label }) => (
              <div
                key={label}
                title={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--bjhunt-text-secondary)",
                  opacity: 0.7,
                  transition: "opacity 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
              >
                <Logo size={28} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
