import type { AppVariables } from "../types.js";
/**
 * CVE Intelligence routes — search CVEs and trending vulnerabilities.
 */

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { requireFeature } from "../middleware/plan-gate.js";
import { config } from "../config.js";

export const cveRoutes = new Hono<{ Variables: AppVariables }>();

cveRoutes.use("*", requireAuth);
cveRoutes.use("*", rateLimit(config.rateLimit.api));
cveRoutes.use("*", requireFeature("cveIntel"));

// ── Types ───────────────────────────────────────────────────────────────

interface CveResult {
  cveId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  cvss: number;
  cvssVector: string;
  epss: number;
  description: string;
  products: string[];
  references: { url: string; source: string }[];
  published: string;
  modified: string;
}

// ── Mock data ───────────────────────────────────────────────────────────

const TRENDING_CVES: CveResult[] = [
  {
    cveId: "CVE-2024-3400",
    severity: "CRITICAL",
    cvss: 10.0,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
    epss: 0.97,
    description:
      "A command injection vulnerability in the GlobalProtect feature of Palo Alto Networks PAN-OS software allows an unauthenticated attacker to execute arbitrary code with root privileges on the firewall.",
    products: ["Palo Alto Networks PAN-OS 10.2", "PAN-OS 11.0", "PAN-OS 11.1"],
    references: [
      { url: "https://nvd.nist.gov/vuln/detail/CVE-2024-3400", source: "NVD" },
      { url: "https://security.paloaltonetworks.com/CVE-2024-3400", source: "Vendor" },
    ],
    published: "2024-04-12T00:00:00Z",
    modified: "2024-04-18T00:00:00Z",
  },
  {
    cveId: "CVE-2024-21762",
    severity: "CRITICAL",
    cvss: 9.8,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    epss: 0.95,
    description:
      "A out-of-bounds write vulnerability in Fortinet FortiOS and FortiProxy allows a remote unauthenticated attacker to execute arbitrary code or commands via specially crafted HTTP requests.",
    products: ["Fortinet FortiOS 7.4.x", "FortiOS 7.2.x", "FortiProxy 7.4.x"],
    references: [
      { url: "https://nvd.nist.gov/vuln/detail/CVE-2024-21762", source: "NVD" },
      { url: "https://www.fortiguard.com/psirt/FG-IR-24-015", source: "Vendor" },
    ],
    published: "2024-02-09T00:00:00Z",
    modified: "2024-02-12T00:00:00Z",
  },
  {
    cveId: "CVE-2023-44487",
    severity: "HIGH",
    cvss: 7.5,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
    epss: 0.88,
    description:
      "The HTTP/2 protocol allows a denial of service (server resource consumption) because request cancellation can reset many streams quickly, aka Rapid Reset Attack. Exploited in the wild.",
    products: ["nginx", "Apache httpd", "Node.js", "Go net/http", "gRPC"],
    references: [
      { url: "https://nvd.nist.gov/vuln/detail/CVE-2023-44487", source: "NVD" },
      { url: "https://blog.cloudflare.com/technical-breakdown-http2-rapid-reset-ddos-attack/", source: "Cloudflare" },
    ],
    published: "2023-10-10T00:00:00Z",
    modified: "2024-01-22T00:00:00Z",
  },
  {
    cveId: "CVE-2024-6387",
    severity: "HIGH",
    cvss: 8.1,
    cvssVector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
    epss: 0.72,
    description:
      "A signal handler race condition was found in OpenSSH's server (sshd), where a client does not authenticate within LoginGraceTime seconds, allowing remote code execution as root. Known as regreSSHion.",
    products: ["OpenSSH 8.5p1 - 9.7p1", "Ubuntu", "Debian", "RHEL"],
    references: [
      { url: "https://nvd.nist.gov/vuln/detail/CVE-2024-6387", source: "NVD" },
      { url: "https://www.qualys.com/2024/07/01/cve-2024-6387/regresshion.txt", source: "Qualys" },
    ],
    published: "2024-07-01T00:00:00Z",
    modified: "2024-07-08T00:00:00Z",
  },
  {
    cveId: "CVE-2023-34362",
    severity: "CRITICAL",
    cvss: 9.8,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    epss: 0.97,
    description:
      "In Progress MOVEit Transfer, a SQL injection vulnerability has been found in the MOVEit Transfer web application that could allow an unauthenticated attacker to gain access to MOVEit Transfer's database.",
    products: ["Progress MOVEit Transfer 2023.0", "MOVEit Transfer 2022.1", "MOVEit Transfer 2021.1"],
    references: [
      { url: "https://nvd.nist.gov/vuln/detail/CVE-2023-34362", source: "NVD" },
      { url: "https://community.progress.com/s/article/MOVEit-Transfer-Critical-Vulnerability", source: "Vendor" },
    ],
    published: "2023-06-02T00:00:00Z",
    modified: "2023-07-12T00:00:00Z",
  },
  {
    cveId: "CVE-2024-47176",
    severity: "CRITICAL",
    cvss: 9.9,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:L",
    epss: 0.83,
    description:
      "CUPS cups-browsed binds to UDP INADDR_ANY:631, trusting any packet from any source to trigger a Get-Printer-Attributes IPP request to an attacker-controlled URL, leading to remote code execution.",
    products: ["CUPS 2.x", "cups-browsed", "libcupsfilters", "libppd"],
    references: [
      { url: "https://nvd.nist.gov/vuln/detail/CVE-2024-47176", source: "NVD" },
      { url: "https://www.evilsocket.net/2024/09/26/Attacking-UNIX-systems-via-CUPS-Part-I/", source: "Researcher" },
    ],
    published: "2024-09-27T00:00:00Z",
    modified: "2024-10-04T00:00:00Z",
  },
];

// ── Package vulnerability mock data ─────────────────────────────────────

const PACKAGE_VULNS: Record<string, CveResult[]> = {
  apache: [
    {
      cveId: "CVE-2021-41773",
      severity: "HIGH",
      cvss: 7.5,
      cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
      epss: 0.94,
      description:
        "A flaw was found in Apache HTTP Server 2.4.49. A path traversal attack via URL-encoded characters allows attackers to map URLs to files outside the expected document root.",
      products: ["Apache HTTP Server 2.4.49"],
      references: [
        { url: "https://nvd.nist.gov/vuln/detail/CVE-2021-41773", source: "NVD" },
      ],
      published: "2021-10-05T00:00:00Z",
      modified: "2021-10-12T00:00:00Z",
    },
    {
      cveId: "CVE-2021-42013",
      severity: "CRITICAL",
      cvss: 9.8,
      cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      epss: 0.96,
      description:
        "Apache HTTP Server 2.4.50 fix for CVE-2021-41773 was insufficient. A path traversal and RCE flaw via double-encoded URL characters.",
      products: ["Apache HTTP Server 2.4.49", "Apache HTTP Server 2.4.50"],
      references: [
        { url: "https://nvd.nist.gov/vuln/detail/CVE-2021-42013", source: "NVD" },
      ],
      published: "2021-10-07T00:00:00Z",
      modified: "2021-10-15T00:00:00Z",
    },
  ],
  openssl: [
    {
      cveId: "CVE-2024-0727",
      severity: "MEDIUM",
      cvss: 5.5,
      cvssVector: "CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:H",
      epss: 0.15,
      description:
        "Processing a maliciously formatted PKCS12 file may lead OpenSSL to crash due to a NULL pointer dereference, causing a denial of service.",
      products: ["OpenSSL 3.2.x", "OpenSSL 3.1.x", "OpenSSL 3.0.x"],
      references: [
        { url: "https://nvd.nist.gov/vuln/detail/CVE-2024-0727", source: "NVD" },
      ],
      published: "2024-01-26T00:00:00Z",
      modified: "2024-02-02T00:00:00Z",
    },
  ],
  log4j: [
    {
      cveId: "CVE-2021-44228",
      severity: "CRITICAL",
      cvss: 10.0,
      cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
      epss: 0.97,
      description:
        "Apache Log4j2 <=2.14.1 JNDI features used in configuration, log messages, and parameters do not protect against attacker controlled LDAP and other JNDI related endpoints. Log4Shell.",
      products: ["Apache Log4j 2.0-beta9 to 2.14.1"],
      references: [
        { url: "https://nvd.nist.gov/vuln/detail/CVE-2021-44228", source: "NVD" },
        { url: "https://logging.apache.org/log4j/2.x/security.html", source: "Vendor" },
      ],
      published: "2021-12-10T00:00:00Z",
      modified: "2022-01-18T00:00:00Z",
    },
  ],
  nginx: [
    {
      cveId: "CVE-2024-7347",
      severity: "MEDIUM",
      cvss: 4.7,
      cvssVector: "CVSS:3.1/AV:L/AC:H/PR:N/UI:R/S:U/C:N/I:N/A:H",
      epss: 0.08,
      description:
        "NGINX Open Source and NGINX Plus have a vulnerability in the ngx_http_mp4_module, which might allow an attacker to over-read NGINX worker memory.",
      products: ["NGINX 1.5.13+", "NGINX Plus R31"],
      references: [
        { url: "https://nvd.nist.gov/vuln/detail/CVE-2024-7347", source: "NVD" },
      ],
      published: "2024-08-14T00:00:00Z",
      modified: "2024-08-20T00:00:00Z",
    },
  ],
};

// ── Search by CVE ID ────────────────────────────────────────────────────

cveRoutes.get("/search", async (c) => {
  const q = c.req.query("q")?.trim();
  const pkg = c.req.query("package")?.trim()?.toLowerCase();
  const version = c.req.query("version")?.trim();

  // Search by package name
  if (pkg) {
    const key = Object.keys(PACKAGE_VULNS).find(
      (k) => pkg.includes(k) || k.includes(pkg),
    );
    if (key) {
      let results = PACKAGE_VULNS[key]!;
      // Optional version filter — basic substring match
      if (version) {
        const filtered = results.filter((r) =>
          r.products.some((p) => p.toLowerCase().includes(version.toLowerCase())),
        );
        if (filtered.length > 0) results = filtered;
      }
      return c.json({ results });
    }
    return c.json({ results: [] });
  }

  // Search by CVE ID
  if (q) {
    const upper = q.toUpperCase();

    // Search trending CVEs
    const trendingMatch = TRENDING_CVES.filter(
      (cve) => cve.cveId.includes(upper) || cve.description.toUpperCase().includes(upper),
    );

    // Search package vulns
    const packageMatches: CveResult[] = [];
    for (const vulns of Object.values(PACKAGE_VULNS)) {
      for (const v of vulns) {
        if (v.cveId.includes(upper) || v.description.toUpperCase().includes(upper)) {
          packageMatches.push(v);
        }
      }
    }

    // Combine and deduplicate
    const seen = new Set<string>();
    const results: CveResult[] = [];
    for (const cve of [...trendingMatch, ...packageMatches]) {
      if (!seen.has(cve.cveId)) {
        seen.add(cve.cveId);
        results.push(cve);
      }
    }

    // If exact CVE-YYYY-NNNNN format and not found, return a generated mock
    if (results.length === 0 && /^CVE-\d{4}-\d{4,}$/.test(upper)) {
      results.push({
        cveId: upper,
        severity: "MEDIUM",
        cvss: 6.5,
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
        epss: 0.12,
        description: `Vulnerability ${upper} — details not yet available in the local database. Query the NVD API for full information.`,
        products: ["Unknown"],
        references: [
          { url: `https://nvd.nist.gov/vuln/detail/${upper}`, source: "NVD" },
        ],
        published: new Date().toISOString(),
        modified: new Date().toISOString(),
      });
    }

    return c.json({ results });
  }

  return c.json({ results: [], error: "Provide ?q=CVE-ID or ?package=name" }, 400);
});

// ── Trending CVEs ───────────────────────────────────────────────────────

cveRoutes.get("/trending", async (c) => {
  return c.json({ results: TRENDING_CVES });
});

// ── Scan dependencies for known CVEs ────────────────────────────────────

// Known vulnerable package versions — mock data for common packages
const DEP_VULN_DB: Record<string, Array<{ maxVersion: string; cveId: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; cvss: number; description: string }>> = {
  "log4j-core": [
    { maxVersion: "2.17.0", cveId: "CVE-2021-44228", severity: "CRITICAL", cvss: 10.0, description: "Log4Shell — JNDI injection via crafted log messages allowing RCE" },
    { maxVersion: "2.17.0", cveId: "CVE-2021-45046", severity: "CRITICAL", cvss: 9.0, description: "Incomplete fix for CVE-2021-44228 in certain non-default configurations" },
  ],
  "django": [
    { maxVersion: "4.2.7", cveId: "CVE-2023-46695", severity: "HIGH", cvss: 7.5, description: "Denial of service via large number of uploaded files" },
    { maxVersion: "4.1.0", cveId: "CVE-2022-34265", severity: "HIGH", cvss: 9.8, description: "SQL injection in Trunc/Extract database functions" },
  ],
  "flask": [
    { maxVersion: "2.3.2", cveId: "CVE-2023-30861", severity: "HIGH", cvss: 7.5, description: "Session cookie set without Secure flag on HTTPS when proxy is misconfigured" },
  ],
  "requests": [
    { maxVersion: "2.31.0", cveId: "CVE-2023-32681", severity: "MEDIUM", cvss: 6.1, description: "Proxy-Authorization header leakage on redirect to different scheme" },
  ],
  "express": [
    { maxVersion: "4.19.2", cveId: "CVE-2024-29041", severity: "MEDIUM", cvss: 6.1, description: "Open redirect via malformed URL in res.redirect()" },
  ],
  "lodash": [
    { maxVersion: "4.17.20", cveId: "CVE-2021-23337", severity: "HIGH", cvss: 7.2, description: "Command injection via template function" },
    { maxVersion: "4.17.15", cveId: "CVE-2020-8203", severity: "HIGH", cvss: 7.4, description: "Prototype pollution via zipObjectDeep" },
  ],
  "axios": [
    { maxVersion: "1.6.0", cveId: "CVE-2023-45857", severity: "MEDIUM", cvss: 6.5, description: "CSRF token leakage via X-XSRF-TOKEN header sent to cross-origin requests" },
  ],
  "jsonwebtoken": [
    { maxVersion: "8.5.1", cveId: "CVE-2022-23529", severity: "HIGH", cvss: 7.6, description: "Arbitrary code execution when verifying with a malicious JWK" },
  ],
  "cryptography": [
    { maxVersion: "41.0.4", cveId: "CVE-2023-49083", severity: "HIGH", cvss: 7.5, description: "NULL pointer dereference when loading PKCS7 certificates" },
  ],
  "pillow": [
    { maxVersion: "10.0.1", cveId: "CVE-2023-44271", severity: "HIGH", cvss: 7.5, description: "Denial of service via uncontrolled resource consumption in textlength()" },
  ],
  "next": [
    { maxVersion: "14.1.0", cveId: "CVE-2024-34351", severity: "HIGH", cvss: 7.5, description: "SSRF via Server Actions rewrite headers in self-hosted deployments" },
  ],
  "spring-boot": [
    { maxVersion: "3.1.5", cveId: "CVE-2023-34055", severity: "MEDIUM", cvss: 5.3, description: "Denial of service with certain actuator endpoint configurations" },
  ],
  "golang.org/x/crypto": [
    { maxVersion: "0.17.0", cveId: "CVE-2023-48795", severity: "MEDIUM", cvss: 5.9, description: "Terrapin attack — prefix truncation in SSH transport protocol" },
  ],
  "golang.org/x/net": [
    { maxVersion: "0.17.0", cveId: "CVE-2023-44487", severity: "HIGH", cvss: 7.5, description: "HTTP/2 Rapid Reset attack causing denial of service" },
  ],
};

cveRoutes.post("/scan-dependencies", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  const content = await file.text();
  const fileName = file.name.toLowerCase();

  // Parse package@version pairs based on file format
  const packages: Array<{ name: string; version: string }> = [];

  if (fileName === "requirements.txt" || fileName.endsWith(".txt")) {
    // Python requirements.txt
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
      const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*[=<>~!]+\s*([0-9][^\s,;]*)/);
      if (match) {
        packages.push({ name: match[1]!.toLowerCase(), version: match[2]! });
      } else {
        // Package without version
        const nameOnly = trimmed.match(/^([a-zA-Z0-9_.-]+)/);
        if (nameOnly) packages.push({ name: nameOnly[1]!.toLowerCase(), version: "latest" });
      }
    }
  } else if (fileName === "package-lock.json" || fileName === "package.json") {
    // Node.js
    try {
      const pkg = JSON.parse(content);
      const deps = pkg.dependencies || {};
      if (fileName === "package-lock.json" && pkg.packages) {
        // lockfile v3 format
        for (const [key, val] of Object.entries(pkg.packages)) {
          if (!key || key === "") continue;
          const name = key.replace(/^node_modules\//, "");
          const version = (val as any).version || "";
          if (name && version) packages.push({ name: name.toLowerCase(), version });
        }
      } else {
        for (const [name, ver] of Object.entries(deps)) {
          const version = String(ver).replace(/^[\^~>=<]/, "").replace(/^[\^~>=<]/, "");
          packages.push({ name: name.toLowerCase(), version });
        }
        const devDeps = pkg.devDependencies || {};
        for (const [name, ver] of Object.entries(devDeps)) {
          const version = String(ver).replace(/^[\^~>=<]/, "").replace(/^[\^~>=<]/, "");
          packages.push({ name: name.toLowerCase(), version });
        }
      }
    } catch {
      return c.json({ error: "Invalid JSON in package file" }, 400);
    }
  } else if (fileName === "go.sum" || fileName === "go.mod") {
    // Go
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^(?:require\s+)?([a-zA-Z0-9./_-]+)\s+v?([0-9][^\s/]*)/);
      if (match) {
        packages.push({ name: match[1]!.toLowerCase(), version: match[2]! });
      }
    }
  } else if (fileName === "cargo.lock") {
    // Rust
    const blocks = content.split("[[package]]");
    for (const block of blocks) {
      const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
      const versionMatch = block.match(/version\s*=\s*"([^"]+)"/);
      if (nameMatch && versionMatch) {
        packages.push({ name: nameMatch[1]!.toLowerCase(), version: versionMatch[1]! });
      }
    }
  } else if (fileName === "pom.xml" || fileName.endsWith(".xml")) {
    // Maven
    const depMatches = content.matchAll(/<dependency>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?(?:<version>([^<]+)<\/version>)?[\s\S]*?<\/dependency>/gi);
    for (const m of depMatches) {
      packages.push({ name: (m[1] || "").toLowerCase(), version: m[2] || "latest" });
    }
  } else {
    return c.json({ error: "Unsupported lockfile format. Supported: requirements.txt, package-lock.json, package.json, go.sum, go.mod, Cargo.lock, pom.xml" }, 400);
  }

  // Deduplicate
  const seen = new Set<string>();
  const uniquePackages = packages.filter((p) => {
    const key = `${p.name}@${p.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Match against vulnerability database
  const results = uniquePackages.map((pkg) => {
    const vulns = DEP_VULN_DB[pkg.name];
    const cves = vulns
      ? vulns.map((v) => ({
          cveId: v.cveId,
          severity: v.severity,
          cvss: v.cvss,
          description: v.description,
        }))
      : [];

    // Calculate highest severity
    let highestSeverity: string | null = null;
    let highestCvss = 0;
    for (const cve of cves) {
      if (cve.cvss > highestCvss) {
        highestCvss = cve.cvss;
        highestSeverity = cve.severity;
      }
    }

    return {
      name: pkg.name,
      version: pkg.version,
      cves,
      highestSeverity,
      highestCvss: highestCvss || null,
    };
  });

  // Sort: packages with CVEs first, then by highest CVSS
  results.sort((a, b) => {
    if (a.cves.length === 0 && b.cves.length > 0) return 1;
    if (a.cves.length > 0 && b.cves.length === 0) return -1;
    return (b.highestCvss ?? 0) - (a.highestCvss ?? 0);
  });

  return c.json({
    packages: results,
    summary: {
      total: results.length,
      vulnerable: results.filter((r) => r.cves.length > 0).length,
      critical: results.filter((r) => r.cves.some((c) => c.severity === "CRITICAL")).length,
      high: results.filter((r) => r.cves.some((c) => c.severity === "HIGH")).length,
    },
  });
});
