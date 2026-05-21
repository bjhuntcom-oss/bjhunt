"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { LogoSymbol } from "@/components/ui/logo";
import {
  Home, Zap, Key, Shield, Search, Code, FileText, Settings,
  ExternalLink, Copy, Check, ArrowRight, Box, Lock, Server,
  Webhook, Clock, AlertTriangle, CheckCircle, XCircle, Info,
  ThumbsUp, ThumbsDown, Pencil, Flag, ChevronRight, Globe,
  Sun, Moon, BookOpen, Terminal,
} from "lucide-react";

type EndpointDef = {
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  path: string;
  description: string;
  auth: string;
  params?: string;
  body?: string;
  response?: string;
};

const methodColors: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: "rgba(73, 161, 71, 0.1)", text: "#49a147", border: "rgba(73, 161, 71, 0.3)" },
  POST: { bg: "rgba(255, 136, 0, 0.1)", text: "#f80", border: "rgba(255, 136, 0, 0.3)" },
  DELETE: { bg: "rgba(235, 54, 28, 0.1)", text: "#eb361c", border: "rgba(235, 54, 28, 0.3)" },
  PUT: { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  PATCH: { bg: "rgba(168, 85, 247, 0.1)", text: "#a855f7", border: "rgba(168, 85, 247, 0.3)" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--bjhunt-text-muted)", display: "flex", alignItems: "center", borderRadius: 6, transition: "all 0.15s ease" }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div style={{ background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 1rem", borderBottom: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-elevated)" }}>
        <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, color: "var(--bjhunt-text-secondary)" }}>{language}</span>
        <CopyButton text={code} />
      </div>
      <pre style={{ margin: 0, padding: "0.875rem 1rem", fontFamily: "var(--bjhunt-font-mono)", fontSize: 13, lineHeight: 1.7, overflowX: "auto", color: "var(--bjhunt-text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{code}</pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const c = methodColors[method] || methodColors.GET;
  return (
    <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 6, background: c.bg, color: c.text, border: `1px solid ${c.border}`, minWidth: 48, textAlign: "center", flexShrink: 0 }}>{method}</span>
  );
}

function EndpointCard({ ep, index = 0 }: { ep: EndpointDef; index?: number }) {
  return (
    <div style={{ border: "1px solid var(--bjhunt-border)", borderRadius: 16, background: "var(--bjhunt-bg)", marginBottom: "1rem", transition: "border-color 0.2s ease", overflow: "hidden" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--bjhunt-brand)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bjhunt-border)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface)" }}>
        <MethodBadge method={ep.method} />
        <code style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 13, color: "var(--bjhunt-text)", flex: 1 }}>{ep.path}</code>
        {ep.auth !== "None" && (
          <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-brand)", display: "flex", alignItems: "center", gap: 4 }}>
            <Lock size={10} />{ep.auth}
          </span>
        )}
      </div>
      <div style={{ padding: "1.25rem" }}>
        <p style={{ margin: 0, fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, lineHeight: 1.7, color: "var(--bjhunt-text-muted)" }}>{ep.description}</p>
        {ep.params && (
          <div style={{ marginTop: "0.75rem" }}>
            <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)" }}>Parameters</span>
            <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, color: "var(--bjhunt-text)", background: "var(--bjhunt-bg-surface)", padding: "0.5rem 0.75rem", border: "1px solid var(--bjhunt-border)", borderRadius: 6 }}>{ep.params}</code>
          </div>
        )}
      </div>
      {ep.body && (
        <div style={{ borderTop: "1px solid var(--bjhunt-border)" }}>
          <div style={{ padding: "0.75rem 1.25rem 0.5rem", background: "var(--bjhunt-bg-surface)" }}>
            <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)" }}>Request Body</span>
          </div>
          <div style={{ padding: "0 1.25rem 1.25rem" }}><CodeBlock code={ep.body} language="json" /></div>
        </div>
      )}
      {ep.response && (
        <div style={{ borderTop: "1px solid var(--bjhunt-border)" }}>
          <div style={{ padding: "0.75rem 1.25rem 0.5rem", background: "var(--bjhunt-bg-surface)" }}>
            <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)" }}>Response</span>
          </div>
          <div style={{ padding: "0 1.25rem 1.25rem" }}><CodeBlock code={ep.response} language="json" /></div>
        </div>
      )}
    </div>
  );
}

function NavLink({ href, icon: Icon, label, active, onClick }: { href: string; icon: typeof Home; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <a href={href} onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "0.625rem", padding: "6px 12px 6px 16px",
      textDecoration: "none", fontFamily: "var(--bjhunt-font-sans)", fontSize: 14,
      fontWeight: active ? 500 : 400, lineHeight: "20px",
      color: active ? "var(--bjhunt-brand)" : "var(--bjhunt-text-muted)",
      borderLeft: active ? "2px solid var(--bjhunt-brand)" : "2px solid transparent",
      transition: "all 0.15s ease", cursor: "pointer", borderRadius: 0,
    }}
      onMouseEnter={(e) => {
        if (!active) { e.currentTarget.style.color = "var(--bjhunt-text)"; }
      }}
      onMouseLeave={(e) => {
        if (!active) { e.currentTarget.style.color = "var(--bjhunt-text-muted)"; }
      }}
    >
      {Icon && <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.5 }} />}
      {label}
    </a>
  );
}

function InfoCallout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "success" }) {
  const icons = { info: <Info size={16} />, warning: <AlertTriangle size={16} />, success: <CheckCircle size={16} /> };
  const colors = {
    info: { bg: "var(--bjhunt-info-tint)", border: "var(--bjhunt-info)", icon: "var(--bjhunt-info)" },
    warning: { bg: "var(--bjhunt-warning-tint)", border: "var(--bjhunt-warning)", icon: "var(--bjhunt-warning)" },
    success: { bg: "var(--bjhunt-success-tint)", border: "var(--bjhunt-success)", icon: "var(--bjhunt-success)" },
  };
  const c = colors[type];
  return (
    <div style={{ display: "flex", gap: "0.75rem", padding: "1rem 1.25rem", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, marginBottom: "1.5rem" }}>
      <span style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>{icons[type]}</span>
      <div style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--bjhunt-text-secondary)" }}>{children}</div>
    </div>
  );
}

function FeedbackSection() {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  return (
    <div style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid var(--bjhunt-border)" }}>
      <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, fontWeight: 500, color: "var(--bjhunt-text)", margin: "0 0 1rem 0" }}>Was this page helpful?</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={() => setFeedback("yes")} style={{
          display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem",
          fontFamily: "var(--bjhunt-font-sans)", fontSize: 13, fontWeight: 500,
          border: feedback === "yes" ? "1px solid var(--bjhunt-brand)" : "1px solid var(--bjhunt-border)",
          borderRadius: 8, background: feedback === "yes" ? "var(--bjhunt-brand-soft)" : "var(--bjhunt-bg)",
          color: feedback === "yes" ? "var(--bjhunt-brand)" : "var(--bjhunt-text-muted)",
          cursor: "pointer", transition: "all 0.15s ease",
        }}>
          <ThumbsUp size={14} />Yes
        </button>
        <button onClick={() => setFeedback("no")} style={{
          display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem",
          fontFamily: "var(--bjhunt-font-sans)", fontSize: 13, fontWeight: 500,
          border: feedback === "no" ? "1px solid var(--bjhunt-brand)" : "1px solid var(--bjhunt-border)",
          borderRadius: 8, background: feedback === "no" ? "var(--bjhunt-brand-soft)" : "var(--bjhunt-bg)",
          color: feedback === "no" ? "var(--bjhunt-brand)" : "var(--bjhunt-text-muted)",
          cursor: "pointer", transition: "all 0.15s ease",
        }}>
          <ThumbsDown size={14} />No
        </button>
        <div style={{ width: 1, height: 20, background: "var(--bjhunt-border)", margin: "0 0.5rem" }} />
        <a href="https://github.com/bjhunt/bjhunt/edit/main/docs" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem",
          fontFamily: "var(--bjhunt-font-sans)", fontSize: 13, fontWeight: 500,
          border: "1px solid var(--bjhunt-border)", borderRadius: 8, background: "var(--bjhunt-bg)",
          color: "var(--bjhunt-text-muted)", textDecoration: "none", cursor: "pointer", transition: "all 0.15s ease",
        }}>
          <Pencil size={14} />Suggest edits
        </a>
        <a href="https://github.com/bjhunt/bjhunt/issues/new" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem",
          fontFamily: "var(--bjhunt-font-sans)", fontSize: 13, fontWeight: 500,
          border: "1px solid var(--bjhunt-border)", borderRadius: 8, background: "var(--bjhunt-bg)",
          color: "var(--bjhunt-text-muted)", textDecoration: "none", cursor: "pointer", transition: "all 0.15s ease",
        }}>
          <Flag size={14} />Raise issue
        </a>
      </div>
    </div>
  );
}

function NextButton({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
      padding: "1rem 1.25rem", marginTop: "2rem",
      border: "1px solid var(--bjhunt-border)", borderRadius: 16, background: "var(--bjhunt-bg)",
      textDecoration: "none", transition: "border-color 0.2s ease",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--bjhunt-brand)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bjhunt-border)"; }}
    >
      <div>
        <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, fontWeight: 600, color: "var(--bjhunt-text)", margin: "0 0 0.25rem 0" }}>{title}</p>
        <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 13, color: "var(--bjhunt-text-muted)", margin: 0 }}>{description}</p>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: "var(--bjhunt-font-sans)", fontSize: 13, fontWeight: 500, color: "var(--bjhunt-text-muted)", flexShrink: 0 }}>
        Next <ChevronRight size={16} />
      </span>
    </Link>
  );
}

function CopyPageButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(window.document.body.innerText.slice(0, 2000)); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{
      display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem",
      fontFamily: "var(--bjhunt-font-sans)", fontSize: 13, fontWeight: 500,
      border: "1px solid var(--bjhunt-border)", borderRadius: 8, background: "var(--bjhunt-bg)",
      color: "var(--bjhunt-text-muted)", cursor: "pointer", transition: "all 0.15s ease",
    }}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : "Copy page"}
    </button>
  );
}

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [darkMode, setDarkMode] = useState(false);

  const scanEndpoints: EndpointDef[] = [
    {
      method: "POST", path: "/api/v1/scans", description: "Launch a new security audit. Returns a scan ID for tracking progress.", auth: "API Key",
      body: JSON.stringify({ name: "Pre-production audit", target: "https://app.example.com", type: "full", config: { depth: "deep", max_concurrency: 10 }, webhook_url: "https://hooks.example.com/bjhunt", tags: ["pre-prod", "critical"] }, null, 2),
      response: JSON.stringify({ id: "550e8400-e29b-41d4-a716-446655440000", status: "running", agent: "bjhunt", message: "Orchestrator dispatching 17 specialist agents...", created_at: "2026-05-20T10:00:00Z", _links: { self: "/api/v1/scans/550e8400...", findings: "/api/v1/scans/550e8400.../findings", status: "/api/v1/scans/550e8400.../status", report: "/api/v1/scans/550e8400.../report" } }, null, 2),
    },
    { method: "GET", path: "/api/v1/scans", description: "List all scans for the authenticated organization.", auth: "API Key", params: "?limit=20&offset=0&status=running&sort=created_at:desc" },
    { method: "GET", path: "/api/v1/scans/:id", description: "Get detailed information about a specific scan.", auth: "API Key" },
    {
      method: "GET", path: "/api/v1/scans/:id/status", description: "Quick status check — ideal for CI/CD polling without full scan payload.", auth: "API Key",
      response: JSON.stringify({ id: "550e8400...", status: "completed", progress: 100, findings: { total: 12, critical: 2, high: 4, medium: 5, low: 1 }, started_at: "2026-05-20T10:00:00Z", completed_at: "2026-05-20T10:08:32Z", duration_seconds: 512 }, null, 2),
    },
    { method: "DELETE", path: "/api/v1/scans/:id", description: "Cancel a running scan or delete a completed scan.", auth: "API Key" },
  ];

  const findingsEndpoints: EndpointDef[] = [
    { method: "GET", path: "/api/v1/scans/:id/findings", description: "List all findings for a scan. Supports filtering by severity.", auth: "API Key", params: "?severity=critical&limit=50&offset=0" },
    {
      method: "GET", path: "/api/v1/scans/:scanId/findings/:findingId", description: "Get detailed information about a specific finding including evidence chain.", auth: "API Key",
      response: JSON.stringify({ id: "finding-abc123", title: "SQL Injection in /api/login", severity: "critical", cvss_v4: 9.8, epss: 0.94, description: "POST parameter 'username' is vulnerable to SQL injection...", evidence: { sha256: "a3f8c2d1e4b5...", timestamp: "2026-05-20T10:03:15Z", signature: "PKCS#7" }, compliance_mappings: [{ framework: "PCI-DSS v4", requirement: "6.2.4" }, { framework: "OWASP ASVS 5", requirement: "V5.2.1" }, { framework: "MITRE ATT&CK", technique: "T1190" }], remediation: "Use parameterized queries or prepared statements..." }, null, 2),
    },
  ];

  const reportsEndpoints: EndpointDef[] = [
    { method: "GET", path: "/api/v1/scans/:id/report", description: "Download the full audit report in PDF format. Includes all 14 compliance frameworks.", auth: "API Key", params: "?format=pdf&frameworks=pci-dss,iso27001,soc2" },
    { method: "GET", path: "/api/v1/scans/:id/report/executive", description: "Download the executive summary — board-level synthesis without technical details.", auth: "API Key" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)" }}>
      {/* Header - fixed top, full width */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1.5rem", height: 56,
        borderBottom: "1px solid var(--bjhunt-border)",
        background: "var(--bjhunt-bg)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          <LogoSymbol size={28} />
          <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 16, color: "var(--bjhunt-text)" }}>BJHUNT</span>
        </Link>
        <button onClick={() => { setDarkMode(!darkMode); document.documentElement.classList.toggle("dark"); }} style={{
          display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
          background: "none", border: "1px solid var(--bjhunt-border)", borderRadius: 8,
          color: "var(--bjhunt-text-muted)", cursor: "pointer", transition: "all 0.15s ease",
        }}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Main layout: sidebar + content + toc */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Left Sidebar */}
        <aside style={{
          width: 304, flexShrink: 0,
          height: "100%", overflowY: "auto",
          borderRight: "1px solid var(--bjhunt-border)",
          background: "var(--bjhunt-bg)", display: "flex", flexDirection: "column",
          padding: "1rem 0 1rem 1rem",
        }} className="hidden lg:flex">
          {/* Search */}
          <div style={{ padding: "0 1rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0 0.75rem", height: 36, border: "1px solid var(--bjhunt-border)", borderRadius: 12, background: "var(--bjhunt-bg-surface)", cursor: "pointer" }}>
              <Search size={14} style={{ color: "var(--bjhunt-text-muted)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, color: "var(--bjhunt-text-muted)", flex: 1 }}>Search...</span>
              <kbd style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, padding: "2px 6px", background: "var(--bjhunt-bg)", border: "1px solid var(--bjhunt-border)", borderRadius: 6, color: "var(--bjhunt-text-muted)" }}>K</kbd>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: "0 0 1rem", overflowY: "auto" }}>
            {/* Main nav items */}
            <NavLink href="#overview" icon={BookOpen} label="Documentation" active={activeSection === "overview"} onClick={() => setActiveSection("overview")} />
            <NavLink href="#sdk" icon={Code} label="SDK Reference" active={activeSection === "sdk"} onClick={() => setActiveSection("sdk")} />
            <NavLink href="#api-ref" icon={Terminal} label="API Reference" active={activeSection === "api-ref"} onClick={() => setActiveSection("api-ref")} />

            {/* Section: Getting started */}
            <div style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, fontWeight: 600, color: "var(--bjhunt-text)", padding: "0 1rem", margin: 0 }}>Getting started</p>
            </div>
            <NavLink href="#overview" icon={Home} label="Overview" active={activeSection === "overview"} onClick={() => setActiveSection("overview")} />
            <NavLink href="#quickstart" icon={Zap} label="Quickstart" active={activeSection === "quickstart"} onClick={() => setActiveSection("quickstart")} />
            <NavLink href="#authentication" icon={Key} label="Authentication" active={activeSection === "authentication"} onClick={() => setActiveSection("authentication")} />

            {/* Section: Endpoints */}
            <div style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, fontWeight: 600, color: "var(--bjhunt-text)", padding: "0 1rem", margin: 0 }}>Endpoints</p>
            </div>
            <NavLink href="#scans-endpoints" icon={Shield} label="Scans" active={activeSection === "scans"} onClick={() => setActiveSection("scans")} />
            <NavLink href="#findings-endpoints" icon={AlertTriangle} label="Findings" active={activeSection === "findings"} onClick={() => setActiveSection("findings")} />
            <NavLink href="#reports-endpoints" icon={FileText} label="Reports" active={activeSection === "reports"} onClick={() => setActiveSection("reports")} />
            <NavLink href="#agents" icon={Box} label="Agents" active={activeSection === "agents"} onClick={() => setActiveSection("agents")} />
            <NavLink href="#webhooks" icon={Webhook} label="Webhooks" active={activeSection === "webhooks"} onClick={() => setActiveSection("webhooks")} />

            {/* Section: Reference */}
            <div style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, fontWeight: 600, color: "var(--bjhunt-text)", padding: "0 1rem", margin: 0 }}>Reference</p>
            </div>
            <NavLink href="#streaming" icon={Webhook} label="Streaming (SSE)" active={activeSection === "streaming"} onClick={() => setActiveSection("streaming")} />
            <NavLink href="#errors" icon={XCircle} label="Error Handling" active={activeSection === "errors"} onClick={() => setActiveSection("errors")} />
            <NavLink href="#rate-limits" icon={Clock} label="Rate Limits" active={activeSection === "rate-limits"} onClick={() => setActiveSection("rate-limits")} />
          </nav>

          {/* Footer links */}
          <div style={{ padding: "1rem", borderTop: "1px solid var(--bjhunt-border)" }}>
            <a href="https://github.com/bjhunt" target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--bjhunt-font-sans)",
              fontSize: 13, color: "var(--bjhunt-text-muted)", textDecoration: "none", padding: "6px 0",
            }}>
              <ExternalLink size={14} />GitHub
            </a>
            <a href="https://status.bjhunt.com" target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--bjhunt-font-sans)",
              fontSize: 13, color: "var(--bjhunt-text-muted)", textDecoration: "none", padding: "6px 0",
            }}>
              <Server size={14} />Status Page
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100%" }}>
          <div style={{ maxWidth: 672, margin: "0 auto", padding: "2.5rem 2rem 4rem" }}>
            {/* Page header with Copy page */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
              <div>
                <p style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--bjhunt-brand)", marginBottom: "0.75rem" }}>Getting started</p>
                <h1 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 800, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.11, letterSpacing: "-0.75px", margin: 0 }}>
                  BJHUNT API Documentation
                </h1>
              </div>
              <CopyPageButton />
            </div>

            {/* Overview */}
            <section id="overview" style={{ marginBottom: "3rem" }}>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--bjhunt-text-secondary)", margin: "0 0 1.25rem 0" }}>
                Integrate BJHUNT into your CI/CD pipeline — launch autonomous security audits, retrieve findings in real time, and continuously protect your infrastructure. Our REST API gives you full programmatic control over every aspect of the platform.
              </p>
              <InfoCallout type="info">
                The BJHUNT API is currently in <strong>beta</strong>. All endpoints are documented below with sample requests and responses. The API will reach 100% operational status with the full platform launch.
              </InfoCallout>
            </section>

            {/* Quickstart */}
            <section id="quickstart" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 24, lineHeight: 1.33, letterSpacing: "-0.6px", margin: "0 0 1rem 0" }}>Quickstart</h2>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--bjhunt-text-secondary)", marginBottom: "1.25rem" }}>
                Start scanning in under 2 minutes. Create an API key, make your first request, and track results.
              </p>
              <CodeBlock code={`# 1. Create an API key in Dashboard → Settings → API Keys

# 2. Launch a scan
curl -X POST https://api.bjhunt.com/api/v1/scans \\
  -H "Authorization: Bearer bjk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Pre-production audit",
    "target": "https://app.example.com",
    "type": "full"
  }'

# 3. Check status
curl https://api.bjhunt.com/api/v1/scans/SCAN_ID/status \\
  -H "Authorization: Bearer bjk_your_api_key"

# 4. Retrieve findings
curl https://api.bjhunt.com/api/v1/scans/SCAN_ID/findings \\
  -H "Authorization: Bearer bjk_your_api_key"`} language="bash" />
            </section>

            {/* Authentication */}
            <section id="authentication" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 24, lineHeight: 1.33, letterSpacing: "-0.6px", margin: "3rem 0 1rem 0" }}>Authentication</h2>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--bjhunt-text-secondary)", marginBottom: "1rem" }}>
                All API v1 requests require an API key in the <code style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 14, fontWeight: 500, background: "rgba(245, 242, 238, 0.5)", padding: "2px 8px", borderRadius: 6, color: "var(--bjhunt-text-secondary)" }}>Authorization</code> header using Bearer token authentication.
              </p>
              <CodeBlock code="Authorization: Bearer bjk_your_api_key_here" language="http" />
              <InfoCallout type="warning">
                API keys are shown only once upon creation. Store them securely. If you lose a key, you must generate a new one — the old key cannot be recovered.
              </InfoCallout>
            </section>

            {/* Base URL */}
            <section id="base-url" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 24, lineHeight: 1.33, letterSpacing: "-0.6px", margin: "3rem 0 1rem 0" }}>Base URL</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ padding: "1rem 1.25rem", border: "1px solid var(--bjhunt-border)", borderRadius: 12, background: "var(--bjhunt-bg-surface)" }}>
                  <p style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)", margin: "0 0 0.5rem 0" }}>Production</p>
                  <code style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 14, color: "#49a147" }}>https://api.bjhunt.com</code>
                </div>
                <div style={{ padding: "1rem 1.25rem", border: "1px solid var(--bjhunt-border)", borderRadius: 12, background: "var(--bjhunt-bg-surface)" }}>
                  <p style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)", margin: "0 0 0.5rem 0" }}>Staging</p>
                  <code style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 14, color: "var(--bjhunt-warning)" }}>https://staging-api.bjhunt.com</code>
                </div>
              </div>
            </section>

            {/* Scans Endpoints */}
            <section id="scans-endpoints" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 24, lineHeight: 1.33, letterSpacing: "-0.6px", margin: "3rem 0 1rem 0" }}>Scans Endpoints</h2>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--bjhunt-text-secondary)", marginBottom: "1.25rem" }}>
                Create, list, and manage security audits. Each scan dispatches specialist AI agents to analyze your target.
              </p>
              {scanEndpoints.map((ep, i) => <EndpointCard key={`${ep.method}-${ep.path}-${i}`} ep={ep} index={i} />)}
            </section>

            {/* Findings Endpoints */}
            <section id="findings-endpoints" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 24, lineHeight: 1.33, letterSpacing: "-0.6px", margin: "3rem 0 1rem 0" }}>Findings Endpoints</h2>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--bjhunt-text-secondary)", marginBottom: "1.25rem" }}>
                Retrieve vulnerability findings with full evidence chains, CVSS scoring, and compliance mappings.
              </p>
              {findingsEndpoints.map((ep, i) => <EndpointCard key={`${ep.method}-${ep.path}-${i}`} ep={ep} index={i} />)}
            </section>

            {/* Reports Endpoints */}
            <section id="reports-endpoints" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 24, lineHeight: 1.33, letterSpacing: "-0.6px", margin: "3rem 0 1rem 0" }}>Reports Endpoints</h2>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--bjhunt-text-secondary)", marginBottom: "1.25rem" }}>
                Download PKCS#7 signed audit reports across 14 compliance frameworks.
              </p>
              {reportsEndpoints.map((ep, i) => <EndpointCard key={`${ep.method}-${ep.path}-${i}`} ep={ep} index={i} />)}
            </section>

            {/* Streaming */}
            <section id="streaming" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 24, lineHeight: 1.33, letterSpacing: "-0.6px", margin: "3rem 0 1rem 0" }}>Streaming Events (SSE)</h2>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--bjhunt-text-secondary)", marginBottom: "1.25rem" }}>
                Subscribe to real-time scan progress via Server-Sent Events. 12 typed events cover the full audit lifecycle.
              </p>
              <InfoCallout type="info">
                Streaming documentation will be available once the SSE infrastructure is fully operational. Expected events: <code style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 13 }}>run.started</code>, <code style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 13 }}>agent.thinking</code>, <code style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 13 }}>agent.finding</code>, <code style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 13 }}>run.completed</code>, and more.
              </InfoCallout>
            </section>

            {/* Error Handling */}
            <section id="errors" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: 24, lineHeight: 1.33, letterSpacing: "-0.6px", margin: "3rem 0 1rem 0" }}>Error Handling</h2>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--bjhunt-text-secondary)", marginBottom: "1.25rem" }}>
                The API uses standard HTTP status codes. All error responses include a machine-readable error code and human-readable message.
              </p>
              <div style={{ border: "1px solid var(--bjhunt-border)", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--bjhunt-font-sans)", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "var(--bjhunt-bg-surface)" }}>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid var(--bjhunt-border)", fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)" }}>Status</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid var(--bjhunt-border)", fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)" }}>Code</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid var(--bjhunt-border)", fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { status: "400", code: "INVALID_REQUEST", desc: "Malformed request body or invalid parameters" },
                      { status: "401", code: "UNAUTHORIZED", desc: "Missing or invalid API key" },
                      { status: "403", code: "FORBIDDEN", desc: "API key lacks required permissions" },
                      { status: "404", code: "NOT_FOUND", desc: "Requested resource does not exist" },
                      { status: "429", code: "RATE_LIMITED", desc: "Too many requests — see Rate Limits" },
                      { status: "500", code: "INTERNAL_ERROR", desc: "Unexpected server error" },
                    ].map((err) => (
                      <tr key={err.code} style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--bjhunt-font-mono)", fontSize: 13, color: "var(--bjhunt-text)" }}>{err.status}</td>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, color: "var(--bjhunt-brand)" }}>{err.code}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--bjhunt-text-muted)" }}>{err.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Feedback */}
            <FeedbackSection />

            {/* Next Navigation */}
            <NextButton title="Running your first scan" description="This guide will show you how to start your first BJHUNT scan and track results." href="/en/api-docs/quickstart" />

            {/* Footer */}
            <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--bjhunt-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <a href="https://github.com/bjhunt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--bjhunt-text-muted)", transition: "color 0.15s ease" }}>
                  <ExternalLink size={18} />
                </a>
                <a href="https://x.com/bjhunt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--bjhunt-text-muted)", transition: "color 0.15s ease" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://discord.gg/bjhunt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--bjhunt-text-muted)", transition: "color 0.15s ease" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
                <a href="https://linkedin.com/company/bjhunt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--bjhunt-text-muted)", transition: "color 0.15s ease" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
              <span style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 13, color: "var(--bjhunt-text-muted)" }}>
                Powered by <strong style={{ color: "var(--bjhunt-text-secondary)" }}>BJHUNT</strong>
              </span>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Table of Contents */}
        <aside style={{ width: 264, flexShrink: 0, height: "100%", overflowY: "auto", padding: "2rem 1rem", borderLeft: "1px solid var(--bjhunt-border)" }} className="hidden xl:block">
          <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, fontWeight: 500, color: "var(--bjhunt-text)", margin: "0 0 0.75rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            On this page
          </p>
          <nav style={{ display: "flex", flexDirection: "column" }}>
            {[
              { href: "#overview", label: "Overview" },
              { href: "#quickstart", label: "Quickstart" },
              { href: "#authentication", label: "Authentication" },
              { href: "#base-url", label: "Base URL" },
              { href: "#scans-endpoints", label: "Scans Endpoints" },
              { href: "#findings-endpoints", label: "Findings Endpoints" },
              { href: "#reports-endpoints", label: "Reports Endpoints" },
              { href: "#streaming", label: "Streaming (SSE)" },
              { href: "#errors", label: "Error Handling" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{ display: "block", padding: "4px 0 4px 16px", fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, lineHeight: "24px", color: "var(--bjhunt-text-muted)", textDecoration: "none", borderLeft: "2px solid transparent", transition: "all 0.15s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--bjhunt-text)"; e.currentTarget.style.borderLeftColor = "var(--bjhunt-border)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--bjhunt-text-muted)"; e.currentTarget.style.borderLeftColor = "transparent"; }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
