import { Link } from "@/i18n/routing";
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

function GlitchText({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span
      className="glitch-text"
      style={{
        position: "relative",
        display: "inline-block",
        color: highlight ? "var(--bjhunt-brand)" : "var(--bjhunt-text)",
      }}
      data-text={typeof children === "string" ? children : ""}
    >
      {children}
    </span>
  );
}

function HighlightText({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="highlight-text"
      style={{
        background: "var(--bjhunt-brand)",
        color: "var(--bjhunt-text-inverted)",
        padding: "0 4px",
        fontWeight: 700,
        animation: "highlight-cycle 4s ease-in-out infinite",
      }}
    >
      {children}
    </span>
  );
}

function DecorativeLine() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem" }}>
      <div style={{ width: "32px", height: "1px", background: "var(--bjhunt-brand)" }} />
      <div style={{ width: "8px", height: "1px", background: "var(--bjhunt-border)" }} />
      <div style={{ width: "8px", height: "1px", background: "var(--bjhunt-border)" }} />
    </div>
  );
}

function KaliLogoSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Kali Linux dragon-inspired logo */}
      <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z" stroke="var(--bjhunt-text)" strokeWidth="1.5" fill="none" />
      <path d="M16 18c0-4.42 3.58-8 8-8s8 3.58 8 8c0 2-1 4-2 5l-6 6-6-6c-1-1-2-3-2-5z" fill="var(--bjhunt-brand)" opacity="0.8" />
      <path d="M20 22c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1-0.5 2-1 2.5L24 28l-3-3.5c-0.5-0.5-1-1.5-1-2.5z" fill="var(--bjhunt-bg)" />
      <circle cx="24" cy="22" r="2" fill="var(--bjhunt-brand)" />
      {/* Dragon tail */}
      <path d="M28 30c2 2 6 4 10 2" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M38 32c1-1 2-3 1-4" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function InvictiLogoSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Invicti helix-inspired logo */}
      <rect x="4" y="4" width="40" height="40" stroke="var(--bjhunt-text)" strokeWidth="1.5" fill="none" />
      {/* Three i's representing DevSecOps */}
      <rect x="12" y="14" width="4" height="16" rx="1" fill="var(--bjhunt-brand)" />
      <rect x="22" y="10" width="4" height="20" rx="1" fill="var(--bjhunt-brand)" opacity="0.7" />
      <rect x="32" y="14" width="4" height="16" rx="1" fill="var(--bjhunt-brand)" opacity="0.5" />
      {/* Helix curve */}
      <path d="M14 34c4-4 8-4 12 0s8 4 12 0" stroke="var(--bjhunt-text)" strokeWidth="1" fill="none" />
      {/* Dots on i's */}
      <circle cx="14" cy="10" r="2" fill="var(--bjhunt-brand)" />
      <circle cx="24" cy="6" r="2" fill="var(--bjhunt-brand)" opacity="0.7" />
      <circle cx="34" cy="10" r="2" fill="var(--bjhunt-brand)" opacity="0.5" />
    </svg>
  );
}

function AcunetixLogoSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Acunetix shield-inspired logo */}
      <path d="M24 6L8 14v10c0 8.84 6.8 17.06 16 18 9.2-0.94 16-9.16 16-18V14L24 6z" stroke="var(--bjhunt-text)" strokeWidth="1.5" fill="none" />
      {/* Checkmark inside shield */}
      <path d="M16 24l5 5 11-11" stroke="var(--bjhunt-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Scan line */}
      <line x1="12" y1="20" x2="36" y2="20" stroke="var(--bjhunt-brand)" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  );
}

function ToolsIncludedSVG() {
  return (
    <div style={{ background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)", padding: "2rem" }}>
      <svg width="100%" viewBox="0 0 1000 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: "geometricPrecision" }}>
        <style>{`
          @keyframes pulse-ring { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.6; } }
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
          .pulse { animation: pulse-ring 2s ease-in-out infinite; }
          .float { animation: float 3s ease-in-out infinite; }
        `}</style>

        {/* Header bar */}
        <rect x="0" y="0" width="1000" height="36" fill="var(--bjhunt-bg)" />
        <circle cx="18" cy="18" r="5" fill="var(--bjhunt-critical)" />
        <circle cx="38" cy="18" r="5" fill="var(--bjhunt-warning)" />
        <circle cx="58" cy="18" r="5" fill="var(--bjhunt-success)" />
        <text x="500" y="24" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">PRE-INSTALLED TOOLCHAIN — LICENSED &amp; READY</text>

        {/* Sandbox container */}
        <rect x="20" y="52" width="960" height="248" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-bg)" strokeDasharray="8 4" />
        <text x="500" y="72" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="600">ISOLATED SANDBOX ENVIRONMENT</text>

        {/* Tool cards row 1 */}
        <rect x="40" y="92" width="220" height="80" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="40" y="92" width="220" height="28" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="150" y="110" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">KALI LINUX</text>
        <text x="150" y="134" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">600+ penetration testing tools</text>
        <text x="150" y="152" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">Nmap · Metasploit · Burp · SQLMap</text>
        <text x="150" y="166" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">BloodHound · Frida · Wireshark</text>

        <rect x="280" y="92" width="220" height="80" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="280" y="92" width="220" height="28" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="390" y="110" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">INVICTI</text>
        <text x="390" y="134" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Enterprise DAST scanner</text>
        <text x="390" y="152" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">Proof-Based Scanning™</text>
        <text x="390" y="166" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">99.98% accuracy · zero false positives</text>

        <rect x="520" y="92" width="220" height="80" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="520" y="92" width="220" height="28" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="630" y="110" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">ACUNETIX</text>
        <text x="630" y="134" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Web vulnerability scanner</text>
        <text x="630" y="152" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">20+ years DAST expertise</text>
        <text x="630" y="166" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">AI-powered · code-to-runtime</text>

        <rect x="760" y="92" width="200" height="80" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="760" y="92" width="200" height="28" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="860" y="110" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">+ 40 MORE</text>
        <text x="860" y="134" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Nuclei · OWASP ZAP</text>
        <text x="860" y="152" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">Subfinder · ffuf · Gobuster</text>
        <text x="860" y="166" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">Amass · Nikto · CrackMapExec</text>

        {/* Bottom bar: licensing info */}
        <rect x="40" y="192" width="920" height="88" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-brand)" opacity="0.04" />
        <text x="500" y="214" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">ALL TOOLS PRE-LICENSED · ZERO ADDITIONAL COST</text>
        <text x="500" y="236" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Every tool in the sandbox comes with an enterprise license included in your BJHUNT subscription.</text>
        <text x="500" y="256" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)">No separate licenses. No per-seat fees. No tool procurement. Just launch your audit.</text>
        <text x="500" y="272" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="7" fill="var(--bjhunt-text-muted)">Isolated execution · no credential leakage · automatic cleanup after each audit</text>
      </svg>
    </div>
  );
}

function IntelligenceModelSVG() {
  return (
    <div style={{ background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)", padding: "2rem" }}>
      <svg width="100%" viewBox="0 0 1000 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: "geometricPrecision" }}>
        <style>{`
          @keyframes scan-line { 0% { transform: translateY(-100%); } 100% { transform: translateY(400px); } }
          @keyframes pulse-bar { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
          .scan-line { animation: scan-line 4s linear infinite; }
          .pulse-bar { animation: pulse-bar 2s ease-in-out infinite; }
        `}</style>

        {/* Header bar */}
        <rect x="0" y="0" width="1000" height="36" fill="var(--bjhunt-bg)" />
        <circle cx="18" cy="18" r="5" fill="var(--bjhunt-critical)" />
        <circle cx="38" cy="18" r="5" fill="var(--bjhunt-warning)" />
        <circle cx="58" cy="18" r="5" fill="var(--bjhunt-success)" />
        <text x="500" y="24" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">BJHUNT 27B — OFFENSIVE SECURITY INTELLIGENCE MODEL</text>

        {/* Left panel: Training Data */}
        <rect x="20" y="52" width="280" height="320" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg)" />
        <rect x="20" y="52" width="280" height="32" fill="var(--bjhunt-bg-surface)" />
        <text x="160" y="72" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="700">TRAINING CORPUS</text>

        {/* Training items */}
        <rect x="36" y="96" width="248" height="36" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="none" />
        <rect x="36" y="96" width="200" height="36" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="44" y="118" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">Incident Reports</text>

        <rect x="36" y="140" width="248" height="36" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="none" />
        <rect x="36" y="140" width="180" height="36" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="44" y="162" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">Bug Bounties</text>

        <rect x="36" y="184" width="248" height="36" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="none" />
        <rect x="36" y="184" width="160" height="36" fill="var(--bjhunt-brand)" opacity="0.05" />
        <text x="44" y="206" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">Zero-Day Disclosures</text>

        <rect x="36" y="228" width="248" height="36" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="none" />
        <rect x="36" y="228" width="140" height="36" fill="var(--bjhunt-brand)" opacity="0.04" />
        <text x="44" y="250" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">Attack Patterns</text>

        <rect x="36" y="272" width="248" height="36" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="none" />
        <rect x="36" y="272" width="120" height="36" fill="var(--bjhunt-brand)" opacity="0.03" />
        <text x="44" y="294" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">Compliance Frameworks</text>

        <rect x="36" y="316" width="248" height="36" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="none" />
        <rect x="36" y="316" width="100" height="36" fill="var(--bjhunt-brand)" opacity="0.02" />
        <text x="44" y="338" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">Exploit Databases</text>

        {/* Center: Core Model */}
        <rect x="340" y="100" width="320" height="200" stroke="var(--bjhunt-brand)" strokeWidth="2" fill="var(--bjhunt-bg)" />
        <rect x="340" y="100" width="320" height="40" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="500" y="124" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="16" fill="var(--bjhunt-brand)" fontWeight="700">BJHUNT 27B</text>

        {/* Animated scanning line */}
        <rect x="340" y="140" width="320" height="2" fill="var(--bjhunt-brand)" className="pulse-bar" />

        <text x="500" y="164" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">OFFENSIVE SECURITY MODEL</text>

        {/* Model specs */}
        <rect x="360" y="184" width="280" height="28" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="var(--bjhunt-bg-surface)" />
        <text x="370" y="202" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">Parameters: 27B</text>

        <rect x="360" y="220" width="280" height="28" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="var(--bjhunt-bg-surface)" />
        <text x="370" y="238" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">Context Window: 500K</text>

        <rect x="360" y="256" width="280" height="28" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="var(--bjhunt-bg-surface)" />
        <text x="370" y="274" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">FP Rate: 3.2%</text>

        <rect x="360" y="292" width="280" height="28" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="var(--bjhunt-bg-surface)" />
        <text x="370" y="310" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">Compliance Frameworks: 14</text>

        {/* Right panel: Output Capabilities */}
        <rect x="700" y="52" width="280" height="320" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg)" />
        <rect x="700" y="52" width="280" height="32" fill="var(--bjhunt-bg-surface)" />
        <text x="840" y="72" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="700">OUTPUT CAPABILITIES</text>

        {/* Output items */}
        <rect x="716" y="96" width="248" height="36" stroke="var(--bjhunt-brand)" strokeWidth="0.5" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="724" y="118" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">Natural Language → Scope</text>

        <rect x="716" y="140" width="248" height="36" stroke="var(--bjhunt-brand)" strokeWidth="0.5" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="724" y="162" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">Attack Path Discovery</text>

        <rect x="716" y="184" width="248" height="36" stroke="var(--bjhunt-brand)" strokeWidth="0.5" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="724" y="206" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">Exploit Validation</text>

        <rect x="716" y="228" width="248" height="36" stroke="var(--bjhunt-brand)" strokeWidth="0.5" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="724" y="250" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">Compliance Reports</text>

        <rect x="716" y="272" width="248" height="36" stroke="var(--bjhunt-brand)" strokeWidth="0.5" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="724" y="294" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">Evidence Chain</text>

        <rect x="716" y="316" width="248" height="36" stroke="var(--bjhunt-brand)" strokeWidth="0.5" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="724" y="338" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">Real-time Streaming</text>

        {/* Connection arrows */}
        <path d="M300 150h40" stroke="var(--bjhunt-brand)" strokeWidth="1.5" markerEnd="url(#arrowBrand)" />
        <path d="M660 150h40" stroke="var(--bjhunt-brand)" strokeWidth="1.5" markerEnd="url(#arrowBrand)" />

        <defs>
          <marker id="arrowBrand" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0,0 6,2 0,4" fill="var(--bjhunt-brand)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function ComplianceCoverageSVG() {
  return (
    <div style={{ background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)", padding: "2rem" }}>
      <svg width="100%" viewBox="0 0 1000 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: "geometricPrecision" }}>
        <style>{`
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .fade-in { animation: fade-in 0.8s ease-out forwards; }
          .slide-up { animation: slide-up 0.6s ease-out forwards; }
        `}</style>

        {/* Header bar */}
        <rect x="0" y="0" width="1000" height="36" fill="var(--bjhunt-bg)" />
        <circle cx="18" cy="18" r="5" fill="var(--bjhunt-critical)" />
        <circle cx="38" cy="18" r="5" fill="var(--bjhunt-warning)" />
        <circle cx="58" cy="18" r="5" fill="var(--bjhunt-success)" />
        <text x="500" y="24" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">COMPLIANCE COVERAGE — ONE AUDIT, ALL STANDARDS</text>

        {/* Center: Single Audit */}
        <rect x="360" y="56" width="280" height="56" stroke="var(--bjhunt-brand)" strokeWidth="2" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="500" y="80" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="14" fill="var(--bjhunt-brand)" fontWeight="700">SINGLE AUDIT</text>
        <text x="500" y="100" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text-muted)" fontWeight="500">Natural language prompt</text>

        {/* Arrow down */}
        <path d="M500 112v20" stroke="var(--bjhunt-brand)" strokeWidth="2" markerEnd="url(#arrowBrand)" />

        {/* Framework Grid */}
        <rect x="20" y="148" width="960" height="232" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg)" />

        {/* Row 1 */}
        <rect x="36" y="164" width="220" height="48" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="146" y="186" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-brand)" fontWeight="700">PCI-DSS v4</text>
        <text x="146" y="204" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Payment Card Industry</text>

        <rect x="272" y="164" width="220" height="48" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="382" y="186" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-brand)" fontWeight="700">ISO 27001</text>
        <text x="382" y="204" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Information Security Mgmt</text>

        <rect x="508" y="164" width="220" height="48" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="618" y="186" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-brand)" fontWeight="700">SOC 2 Type II</text>
        <text x="618" y="204" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Service Organization Control</text>

        <rect x="744" y="164" width="220" height="48" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="854" y="186" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-brand)" fontWeight="700">NIST CSF 2.0</text>
        <text x="854" y="204" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Cybersecurity Framework</text>

        {/* Row 2 */}
        <rect x="36" y="220" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="146" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">NIST 800-53</text>
        <text x="146" y="260" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Security Controls</text>

        <rect x="272" y="220" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="382" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">OWASP ASVS 5</text>
        <text x="382" y="260" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">App Security Verification</text>

        <rect x="508" y="220" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="618" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">OWASP Top 10</text>
        <text x="618" y="260" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Web App Risks</text>

        <rect x="744" y="220" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="854" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">HIPAA</text>
        <text x="854" y="260" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Healthcare Data Protection</text>

        {/* Row 3 */}
        <rect x="36" y="276" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="146" y="298" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">GDPR</text>
        <text x="146" y="316" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Data Protection Regulation</text>

        <rect x="272" y="276" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="382" y="298" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">NIS2</text>
        <text x="382" y="316" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Network &amp; Info Security</text>

        <rect x="508" y="276" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="618" y="298" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">DORA</text>
        <text x="618" y="316" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Digital Operational Resilience</text>

        <rect x="744" y="276" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="854" y="298" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">CIS Controls v8</text>
        <text x="854" y="316" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Center for Internet Security</text>

        {/* Row 4 */}
        <rect x="36" y="332" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="146" y="354" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">MITRE ATT&amp;CK</text>
        <text x="146" y="372" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Adversarial Tactics</text>

        <rect x="272" y="332" width="220" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="none" />
        <text x="382" y="354" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">EXECUTIVE SUMMARY</text>
        <text x="382" y="372" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Board-level synthesis</text>

        {/* Bottom bar */}
        <rect x="508" y="332" width="456" height="48" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="736" y="354" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">PKCS#7 SIGNED · RFC 3161 TIMESTAMPED</text>
        <text x="736" y="372" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">SHA-256 evidence chain — verifiable by any auditor</text>

        <defs>
          <marker id="arrowBrand" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0,0 6,2 0,4" fill="var(--bjhunt-brand)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function RealTimeOperationsSVG() {
  return (
    <div style={{ background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)", padding: "2rem" }}>
      <svg width="100%" viewBox="0 0 1000 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: "geometricPrecision" }}>
        <style>{`
          @keyframes pulse-ring { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
          @keyframes draw-line { from { stroke-dashoffset: 800; } to { stroke-dashoffset: 0; } }
          .pulse { animation: pulse-ring 2s ease-in-out infinite; }
          .draw-line { stroke-dasharray: 800; animation: draw-line 2.5s ease-out forwards; }
        `}</style>

        {/* Header bar */}
        <rect x="0" y="0" width="1000" height="36" fill="var(--bjhunt-bg)" />
        <circle cx="18" cy="18" r="5" fill="var(--bjhunt-critical)" />
        <circle cx="38" cy="18" r="5" fill="var(--bjhunt-warning)" />
        <circle cx="58" cy="18" r="5" fill="var(--bjhunt-success)" />
        <text x="500" y="24" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">REAL-TIME OPERATIONS — FULL VISIBILITY, ZERO DELAY</text>

        {/* Left: Input */}
        <rect x="20" y="52" width="200" height="76" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="20" y="52" width="200" height="28" fill="var(--bjhunt-bg)" />
        <text x="120" y="70" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">AUDIT PROMPT</text>
        <text x="120" y="96" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">"Audit acme.com for PCI-DSS"</text>
        <text x="120" y="114" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Natural language scope</text>

        {/* Arrow */}
        <path d="M220 90h40" stroke="var(--bjhunt-brand)" strokeWidth="2" markerEnd="url(#arrowBrand)" />

        {/* Center: Processing */}
        <rect x="260" y="52" width="240" height="76" stroke="var(--bjhunt-brand)" strokeWidth="2" fill="var(--bjhunt-bg)" />
        <rect x="260" y="52" width="240" height="28" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="380" y="70" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">INTELLIGENCE ENGINE</text>
        <text x="380" y="96" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">Scope extraction · specialist dispatch</text>
        <text x="380" y="114" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Attack path discovery · validation</text>

        {/* Arrow */}
        <path d="M500 90h40" stroke="var(--bjhunt-brand)" strokeWidth="2" markerEnd="url(#arrowBrand)" />

        {/* Right: Output */}
        <rect x="540" y="52" width="200" height="76" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="540" y="52" width="200" height="28" fill="var(--bjhunt-bg)" />
        <text x="640" y="70" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">SIGNED REPORTS</text>
        <text x="640" y="96" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">PKCS#7 · RFC 3161</text>
        <text x="640" y="114" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">14 frameworks simultaneously</text>

        {/* Arrow */}
        <path d="M740 90h40" stroke="var(--bjhunt-brand)" strokeWidth="2" markerEnd="url(#arrowBrand)" />

        {/* Far Right: Client */}
        <rect x="780" y="52" width="200" height="76" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="780" y="52" width="200" height="28" fill="var(--bjhunt-bg)" />
        <text x="880" y="70" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">REAL-TIME UI</text>
        <text x="880" y="96" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">Web dashboard</text>
        <text x="880" y="114" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">VS Code extension</text>

        {/* Streaming Events Timeline */}
        <text x="20" y="164" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="700">STREAMING EVENTS TIMELINE</text>

        {/* Timeline bar */}
        <line x1="20" y1="184" x2="980" y2="184" stroke="var(--bjhunt-border)" strokeWidth="1" />
        <line x1="20" y1="184" x2="200" y2="184" stroke="var(--bjhunt-brand)" strokeWidth="2" className="pulse" />

        {/* Event markers */}
        <rect x="16" y="180" width="8" height="8" fill="var(--bjhunt-brand)" />
        <text x="20" y="206" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">run.started</text>

        <rect x="176" y="180" width="8" height="8" fill="var(--bjhunt-brand)" />
        <text x="180" y="206" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">agent.thinking</text>

        <rect x="336" y="180" width="8" height="8" fill="var(--bjhunt-brand)" />
        <text x="340" y="206" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">agent.tool_call</text>

        <rect x="496" y="178" width="12" height="12" fill="var(--bjhunt-brand)" className="pulse" />
        <text x="502" y="206" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-brand)" fontWeight="700">agent.finding</text>

        <rect x="656" y="180" width="8" height="8" fill="var(--bjhunt-brand)" />
        <text x="660" y="206" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">evidence.captured</text>

        <rect x="816" y="180" width="8" height="8" fill="var(--bjhunt-brand)" />
        <text x="820" y="206" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">dream.diary_entry</text>

        <rect x="976" y="180" width="8" height="8" fill="var(--bjhunt-brand)" />
        <text x="980" y="206" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">run.completed</text>

        {/* Finding Detail Panel */}
        <rect x="20" y="224" width="300" height="160" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="20" y="224" width="300" height="28" fill="var(--bjhunt-bg)" />
        <text x="170" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">VULNERABILITY</text>
        <text x="32" y="272" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">SQL Injection — POST /api/login</text>
        <text x="32" y="292" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Target: acme.com:443</text>
        <text x="32" y="312" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Reproducible: ✓ Evidence captured</text>
        <text x="32" y="332" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Attack path: SQLi → credential dump</text>
        <text x="32" y="352" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">→ lateral movement → data exfil</text>

        <rect x="340" y="224" width="200" height="160" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="340" y="224" width="200" height="28" fill="var(--bjhunt-bg)" />
        <text x="440" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">SCORING</text>
        <text x="352" y="272" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">CVSS v4: 9.8 (Critical)</text>
        <text x="352" y="292" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">EPSS: 0.94 (94% exploitation prob)</text>
        <text x="352" y="312" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">KEV: Active wild exploitation</text>
        <text x="352" y="332" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">DREAD: 9/10 (Business impact)</text>
        <text x="352" y="352" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">VERDICT: CRITICAL — IMMEDIATE</text>

        <rect x="560" y="224" width="200" height="160" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <rect x="560" y="224" width="200" height="28" fill="var(--bjhunt-bg)" />
        <text x="660" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">COMPLIANCE MAPPINGS</text>
        <text x="572" y="272" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">PCI-DSS v4: Req 6.2.4</text>
        <text x="572" y="292" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">OWASP ASVS 5: V5.2.1</text>
        <text x="572" y="312" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">ISO 27001: A.8.28</text>
        <text x="572" y="332" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">NIST 800-53: SI-10</text>
        <text x="572" y="352" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">MITRE ATT&amp;CK: T1190</text>

        <rect x="780" y="224" width="200" height="160" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-bg)" />
        <rect x="780" y="224" width="200" height="28" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="880" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">EVIDENCE CHAIN</text>
        <text x="792" y="272" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="600">SHA-256: a3f8c2...</text>
        <text x="792" y="292" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Timestamp: RFC 3161</text>
        <text x="792" y="312" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Signature: PKCS#7</text>
        <text x="792" y="332" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Redactions: 3 applied</text>
        <text x="792" y="352" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">VERIFIABLE ✓</text>

        <defs>
          <marker id="arrowBrand" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0,0 6,2 0,4" fill="var(--bjhunt-brand)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function SecurityPostureSVG() {
  return (
    <div style={{ background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)", padding: "2rem" }}>
      <svg width="100%" viewBox="0 0 1000 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: "geometricPrecision" }}>
        <style>{`
          @keyframes pulse-ring { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
          .pulse { animation: pulse-ring 2s ease-in-out infinite; }
        `}</style>

        {/* Header bar */}
        <rect x="0" y="0" width="1000" height="36" fill="var(--bjhunt-bg)" />
        <circle cx="18" cy="18" r="5" fill="var(--bjhunt-critical)" />
        <circle cx="38" cy="18" r="5" fill="var(--bjhunt-warning)" />
        <circle cx="58" cy="18" r="5" fill="var(--bjhunt-success)" />
        <text x="500" y="25" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="11" fill="var(--bjhunt-text)" fontWeight="700">SECURITY POSTURE — DEFENSE IN DEPTH, FAIL-CLOSED BY DEFAULT</text>

        {/* Three Layers */}
        <rect x="20" y="52" width="960" height="96" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-bg)" />
        <rect x="20" y="52" width="960" height="28" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="36" y="70" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">LAYER 1 — IDENTITY ENVELOPE</text>

        <rect x="36" y="92" width="300" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="186" y="112" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">Immutable Identity Injection</text>
        <text x="186" y="130" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Every operation carries verified identity context</text>

        <rect x="356" y="92" width="300" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="506" y="112" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">Anti-Prompt-Injection</text>
        <text x="506" y="130" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">50+ forbidden terms · 8 few-shot defenses</text>

        <rect x="676" y="92" width="284" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="818" y="112" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">Secret Redaction (Pre-Submit)</text>
        <text x="818" y="130" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">AWS keys, JWTs, Bearer tokens → REDACTED</text>

        {/* Layer 2 */}
        <rect x="20" y="164" width="960" height="96" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-bg)" />
        <rect x="20" y="164" width="960" height="28" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="36" y="182" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">LAYER 2 — SCOPE GUARD (FAIL-CLOSED)</text>

        <rect x="36" y="204" width="230" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="151" y="224" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">Pre-Execution Validation</text>
        <text x="151" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Every action checked against signed mandate</text>

        <rect x="286" y="204" width="230" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="401" y="224" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">In-Scope Enforcement</text>
        <text x="401" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Hosts, CIDRs, URLs validated before exec</text>

        <rect x="536" y="204" width="230" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="651" y="224" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text)" fontWeight="700">Fail-Closed Default</text>
        <text x="651" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text-muted)" fontWeight="500">Parse failure = block + error, no bypass</text>

        <rect x="786" y="204" width="174" height="48" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-brand)" opacity="0.08" />
        <text x="873" y="224" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">HITL Approval</text>
        <text x="873" y="242" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="500">Dangerous actions require sign-off</text>

        {/* Layer 3 */}
        <rect x="20" y="276" width="960" height="96" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-bg)" />
        <rect x="20" y="276" width="960" height="28" fill="var(--bjhunt-brand)" opacity="0.1" />
        <text x="36" y="294" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)" fontWeight="700">LAYER 3 — EVIDENCE CHAIN &amp; OUTPUT REDACTION</text>

        <rect x="36" y="316" width="230" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="151" y="336" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">SHA-256 → encrypted storage → append-only custody</text>

        <rect x="286" y="316" width="230" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="401" y="336" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">40+ regex patterns · model names · infra fingerprints</text>

        <rect x="536" y="316" width="230" height="48" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg-surface)" />
        <text x="651" y="336" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">Recursive redaction on nested payloads</text>

        <rect x="786" y="316" width="174" height="48" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-brand)" opacity="0.1" />
        <text x="873" y="336" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">ZERO TRUST OUTPUT</text>

        {/* Bottom bar */}
        <rect x="20" y="380" width="960" height="20" stroke="var(--bjhunt-border)" strokeWidth="0.5" fill="var(--bjhunt-bg)" />
        <text x="500" y="394" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="600">Every layer is fail-closed by default. A blocked action terminates the audit — no fallback, no bypass, no silent failure.</text>
      </svg>
    </div>
  );
}

export default async function TechnologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "technology" });
  const isFr = locale === "fr";

  return (
    <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)" }}>
      {/* Hero - E2B Enterprise style */}
      <section style={{ padding: "10rem 1.25rem 6.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <DecorativeLine />
          <Eyebrow>[ {t("heroEyebrow")} ]</Eyebrow>
          <h1 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 5vw, 3rem)", lineHeight: 1, letterSpacing: "-0.02rem", textTransform: "uppercase", marginTop: "1rem", marginBottom: "1.5rem" }}>
            <GlitchText>{t("heroTitle")}</GlitchText>{" "}
            <HighlightText>{t("heroHighlight")}</HighlightText>
          </h1>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 720, marginBottom: "2rem" }}>
            {t("heroDescription")}
          </p>

          {/* Tool logos row - E2B style */}
          <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", border: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface)" }}>
              <KaliLogoSVG />
              <div>
                <div style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Kali Linux</div>
                <div style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: "10px", color: "var(--bjhunt-text-muted)" }}>600+ tools</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", border: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface)" }}>
              <InvictiLogoSVG />
              <div>
                <div style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Invicti</div>
                <div style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: "10px", color: "var(--bjhunt-text-muted)" }}>Enterprise DAST</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", border: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface)" }}>
              <AcunetixLogoSVG />
              <div>
                <div style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Acunetix</div>
                <div style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: "10px", color: "var(--bjhunt-text-muted)" }}>Web Scanner</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", border: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-brand)", opacity: 0.9 }}>
              <div style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--bjhunt-text-inverted)" }}>BJHUNT 27B</div>
              <div style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: "10px", color: "var(--bjhunt-text-inverted)", opacity: 0.7 }}>Orchestrator</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              href={`/${locale}/beta`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, padding: "0 1.125rem 0 1rem",
                fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, lineHeight: "0.875rem",
                textTransform: "uppercase", border: "none", background: "var(--bjhunt-brand)", color: "var(--bjhunt-text-inverted)", textDecoration: "none",
              }}
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href={`/${locale}/contact`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, padding: "0 1.125rem 0 1rem",
                fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, lineHeight: "0.875rem",
                textTransform: "uppercase", border: "1px solid var(--bjhunt-border)", background: "transparent", color: "var(--bjhunt-text)", textDecoration: "none",
              }}
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Included */}
      <section style={{ padding: "6.25rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <DecorativeLine />
          <Eyebrow>[ {isFr ? "OUTILS INCLUS" : "TOOLS INCLUDED"} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {isFr ? "600+ outils," : "600+ tools,"}{" "}
              <HighlightText>{isFr ? "zéro coût supplémentaire." : "zero additional cost."}</HighlightText>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 720, marginTop: "1rem", marginBottom: "2rem" }}>
            {isFr
              ? "Chaque sandbox BJHUNT vient avec une suite complète d'outils de sécurité offensive pré-installés et pré-licenciés. Kali Linux avec 600+ outils, Invicti pour le scanning DAST enterprise, Acunetix pour l'analyse de vulnérabilités web — tous inclus dans votre abonnement. Pas de licences séparées. Pas de frais par siège. Pas de procurement d'outils. Lancez simplement votre audit."
              : "Every BJHUNT sandbox comes with a complete suite of pre-installed, pre-licensed offensive security tools. Kali Linux with 600+ tools, Invicti for enterprise DAST scanning, Acunetix for web vulnerability analysis — all included in your subscription. No separate licenses. No per-seat fees. No tool procurement. Just launch your audit."}
          </p>
          <ToolsIncludedSVG />
        </div>
      </section>

      {/* Intelligence Model */}
      <section style={{ padding: "6.25rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <DecorativeLine />
          <Eyebrow>[ {isFr ? "MODÈLE D'INTELLIGENCE" : "INTELLIGENCE MODEL"} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              <GlitchText>{isFr ? "Entraîné pour l'offensif," : "Trained for offensive security,"}</GlitchText>{" "}
              <span style={{ color: "var(--bjhunt-brand)" }}>{isFr ? "pas pour le généraliste." : "not for general purpose."}</span>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 720, marginTop: "1rem", marginBottom: "2rem" }}>
            {isFr
              ? "BJHUNT 27B est un modèle d'intelligence artificielle de sécurité offensive entraîné sur des millions de rapports d'incidents, de soumissions de bug bounty, de divulgations zero-day, de taxonomies de patterns d'attaque et de centaines de frameworks de conformité. Là où les modèles généralistes visent le raisonnement polyvalent, BJHUNT est construit pour une seule chose : délivrer des audits de sécurité offensive complets, de qualité juridique, à partir d'un seul prompt en langage naturel."
              : "BJHUNT 27B is an offensive security artificial intelligence model trained on millions of incident reports, bug bounty submissions, zero-day disclosures, attack pattern taxonomies, and hundreds of compliance frameworks. Where general-purpose models aim for broad reasoning, BJHUNT is built for one thing: delivering complete, court-grade offensive security audits from a single natural-language prompt."}
          </p>
          <IntelligenceModelSVG />
        </div>
      </section>

      {/* Compliance Coverage */}
      <section style={{ padding: "6.25rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <DecorativeLine />
          <Eyebrow>[ {isFr ? "COUVERTURE CONFORMITÉ" : "COMPLIANCE COVERAGE"} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {isFr ? "Un audit," : "One audit,"}{" "}
              <HighlightText>{isFr ? "tous les standards." : "every standard."}</HighlightText>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 720, marginTop: "1rem", marginBottom: "2rem" }}>
            {isFr
              ? "Chaque audit génère simultanément des rapports conformes à 14 frameworks — PCI-DSS v4, ISO 27001, SOC 2, NIST CSF 2.0, NIST 800-53, OWASP ASVS 5, OWASP Top 10, HIPAA, GDPR, NIS2, DORA, CIS Controls v8, MITRE ATT&CK, et une synthèse exécutive pour la direction. Chaque PDF est signé PKCS#7, horodaté RFC 3161, avec une chaîne de preuve SHA-256 vérifiable par tout auditeur, QSA ou tribunal."
              : "Every audit simultaneously generates compliant reports across 14 frameworks — PCI-DSS v4, ISO 27001, SOC 2, NIST CSF 2.0, NIST 800-53, OWASP ASVS 5, OWASP Top 10, HIPAA, GDPR, NIS2, DORA, CIS Controls v8, MITRE ATT&CK, and an executive synthesis. Each PDF is PKCS#7 signed, RFC 3161 timestamped, with a SHA-256 evidence chain verifiable by any auditor, QSA, or court."}
          </p>
          <ComplianceCoverageSVG />
        </div>
      </section>

      {/* Real-Time Operations */}
      <section style={{ padding: "6.25rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <DecorativeLine />
          <Eyebrow>[ {isFr ? "OPÉRATIONS TEMPS RÉEL" : "REAL-TIME OPERATIONS"} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              <GlitchText>{isFr ? "Visibilité totale," : "Full visibility,"}</GlitchText>{" "}
              <span style={{ color: "var(--bjhunt-brand)" }}>{isFr ? "zéro délai." : "zero delay."}</span>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 720, marginTop: "1rem", marginBottom: "2rem" }}>
            {isFr
              ? "Suivez chaque finding, chaque preuve, chaque décision en temps réel. 12 événements typés diffusés en streaming duplex — pas de rapport final dans 3 semaines, mais une visibilité immédiate. Le protocole de reprise utilise Last-Event-ID avec des IDs monotones pour une relecture fiable. Chaque événement finding inclut automatiquement le vecteur CVSS v4, la probabilité EPSS, la vérification KEV et les mappings de conformité."
              : "Track every finding, every proof, every decision in real time. 12 typed events streamed over duplex — no final report in 3 weeks, immediate visibility instead. The resume protocol uses Last-Event-ID with monotonic IDs for reliable replay. Every finding event automatically includes CVSS v4 vector, EPSS probability, KEV verification, and compliance mappings."}
          </p>
          <RealTimeOperationsSVG />
        </div>
      </section>

      {/* Security Posture */}
      <section style={{ padding: "6.25rem 1.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <DecorativeLine />
          <Eyebrow>[ {isFr ? "POSTURE DE SÉCURITÉ" : "SECURITY POSTURE"} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {isFr ? "Défense en profondeur," : "Defense in depth,"}{" "}
              <HighlightText>{isFr ? "fail-closed par défaut." : "fail-closed by default."}</HighlightText>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 720, marginTop: "1rem", marginBottom: "2rem" }}>
            {isFr
              ? "Trois couches de sécurité protègent chaque audit. L'enveloppe d'identité injecte un contexte vérifié dans chaque opération. Le scope guard analyse chaque action avant exécution — validation des hôtes, CIDRs et URLs contre le mandat signé. Si l'analyse échoue, le système bloque par défaut. La chaîne de preuve est append-only avec hachage SHA-256 et horodatage RFC 3161. Chaque couche est fail-closed : une action bloquée termine l'audit — pas de fallback, pas de bypass."
              : "Three security layers protect every audit. The identity envelope injects verified context into every operation. The scope guard parses every action before execution — host, CIDR, and URL validation against the signed mandate. If parsing fails, the system blocks by default. The evidence chain is append-only with SHA-256 hashing and RFC 3161 timestamping. Every layer is fail-closed: a blocked action terminates the audit — no fallback, no bypass."}
          </p>
          <SecurityPostureSVG />
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "6.25rem 1.25rem", background: "var(--bjhunt-bg-surface)", borderTop: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <DecorativeLine />
          <Eyebrow>[ <span style={{ color: "var(--bjhunt-brand)" }}>GET STARTED</span> ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {t("ctaTitle")} <span style={{ color: "var(--bjhunt-brand)" }}>{t("ctaHighlight")}</span>
            </h2>
          </div>
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              href={`/${locale}/beta`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, padding: "0 1.125rem 0 1rem",
                fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, lineHeight: "0.875rem",
                textTransform: "uppercase", border: "none", background: "var(--bjhunt-brand)", color: "var(--bjhunt-text-inverted)", textDecoration: "none",
              }}
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href={`/${locale}/contact`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, padding: "0 1.125rem 0 1rem",
                fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, lineHeight: "0.875rem",
                textTransform: "uppercase", border: "1px solid var(--bjhunt-border)", background: "transparent", color: "var(--bjhunt-text)", textDecoration: "none",
              }}
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
