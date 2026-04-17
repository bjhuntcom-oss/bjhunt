import type { AppVariables } from "../types.js";
/**
 * Tool Playground routes -- execute sandbox tools with mock or real backends.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { requireFeature } from "../middleware/plan-gate.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";
import { withOrg } from "../db/client.js";

export const toolRoutes = new Hono<{ Variables: AppVariables }>();

toolRoutes.use("*", requireAuth);
toolRoutes.use("*", rateLimit(config.rateLimit.api));
toolRoutes.use("*", requireFeature("toolPlayground"));

// ── Schema ──────────────────────────────────────────────────────────────

const executeSchema = z.object({
  tool: z.enum(["bash", "kg_query", "cve_lookup", "jwt_parse", "iam_audit", "network_scan"]),
  input: z.record(z.unknown()),
  engagementId: z.string().uuid().optional(),
});

// ── Tool descriptions (returned to frontend) ────────────────────────────

const TOOL_CATALOG = [
  {
    id: "bash",
    name: "Bash",
    description: "Execute commands in the Kali sandbox environment",
    category: "execution",
    inputType: "textarea",
    inputLabel: "Command",
    inputPlaceholder: "nmap -sV 192.168.1.1",
  },
  {
    id: "kg_query",
    name: "KG Query",
    description: "Run Cypher queries on the Neo4j knowledge graph",
    category: "query",
    inputType: "textarea",
    inputLabel: "Cypher Query",
    inputPlaceholder: "MATCH (n:Host)-[:HAS_PORT]->(p:Port) RETURN n, p LIMIT 10",
  },
  {
    id: "cve_lookup",
    name: "CVE Lookup",
    description: "Quick NVD + EPSS vulnerability lookup by CVE ID",
    category: "intel",
    inputType: "input",
    inputLabel: "CVE ID",
    inputPlaceholder: "CVE-2024-3400",
  },
  {
    id: "jwt_parse",
    name: "JWT Parse",
    description: "Decode and analyze JWT token structure and claims",
    category: "utility",
    inputType: "textarea",
    inputLabel: "JWT Token",
    inputPlaceholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  },
  {
    id: "iam_audit",
    name: "IAM Audit",
    description: "Analyze AWS IAM policy JSON for dangerous permissions",
    category: "cloud",
    inputType: "textarea",
    inputLabel: "IAM Policy JSON",
    inputPlaceholder: '{"Version":"2012-10-17","Statement":[...]}',
  },
  {
    id: "network_scan",
    name: "Network Scan",
    description: "Quick nmap-style scan summary for a target host",
    category: "recon",
    inputType: "input",
    inputLabel: "Target",
    inputPlaceholder: "192.168.1.1",
  },
];

// ── GET /api/tools — list available tools ───────────────────────────────

toolRoutes.get("/", async (c) => {
  return c.json({ tools: TOOL_CATALOG });
});

// ── POST /api/tools/execute — run a tool ────────────────────────────────

toolRoutes.post("/execute", zValidator("json", executeSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const { tool, input, engagementId } = c.req.valid("json");

  const startTime = Date.now();

  let result: { output: string; status: "success" | "error"; meta?: Record<string, unknown> };

  try {
    switch (tool) {
      case "bash":
        result = executeBash(input);
        break;
      case "kg_query":
        result = executeKgQuery(input);
        break;
      case "cve_lookup":
        result = executeCveLookup(input);
        break;
      case "jwt_parse":
        result = executeJwtParse(input);
        break;
      case "iam_audit":
        result = executeIamAudit(input);
        break;
      case "network_scan":
        result = executeNetworkScan(input);
        break;
      default:
        result = { output: `Unknown tool: ${tool}`, status: "error" };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result = { output: `Tool execution error: ${message}`, status: "error" };
  }

  const durationMs = Date.now() - startTime;

  // Audit log
  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource, details)
      VALUES (${orgId}, ${user.id}, 'tool.execute',
              ${engagementId ? "engagement:" + engagementId : "playground"},
              ${JSON.stringify({ tool, durationMs, status: result.status })})
    `,
  ).catch(() => {});

  return c.json({
    tool,
    mock: true,
    output: "[MOCK] " + result.output,
    status: result.status,
    meta: result.meta || {},
    durationMs,
    timestamp: new Date().toISOString(),
  });
});

// ── Tool implementations (mock) ─────────────────────────────────────────

function executeBash(input: Record<string, unknown>): { output: string; status: "success" | "error" } {
  const command = String(input.command || "").trim();
  if (!command) {
    return { output: "Error: No command provided", status: "error" };
  }

  // Mock responses based on command patterns
  if (command.startsWith("nmap")) {
    const target = command.match(/[\d.]+/)?.[0] || "192.168.1.1";
    return {
      output: `$ ${command}
Starting Nmap 7.94SVN ( https://nmap.org ) at ${new Date().toISOString().replace("T", " ").slice(0, 19)}
Nmap scan report for ${target}
Host is up (0.0023s latency).
Not shown: 995 filtered tcp ports (no-response)
PORT     STATE SERVICE     VERSION
22/tcp   open  ssh         OpenSSH 8.9p1 Ubuntu 3ubuntu0.6
80/tcp   open  http        Apache httpd 2.4.52 ((Ubuntu))
443/tcp  open  ssl/http    Apache httpd 2.4.52
3306/tcp open  mysql       MySQL 8.0.35-0ubuntu0.22.04.1
8080/tcp open  http-proxy  Nginx 1.24.0

Service detection performed. Please provide correct usage info.
Nmap done: 1 IP address (1 host up) scanned in 12.34 seconds`,
      status: "success",
    };
  }

  if (command.startsWith("whoami")) {
    return { output: `$ whoami\nroot`, status: "success" };
  }

  if (command.startsWith("id")) {
    return { output: `$ id\nuid=0(root) gid=0(root) groups=0(root)`, status: "success" };
  }

  if (command.includes("nuclei")) {
    return {
      output: `$ ${command}

                     __     _
   ____  __  _______/ /__  (_)
  / __ \\/ / / / ___/ / _ \\/ /
 / / / / /_/ / /__/ /  __/ /
/_/ /_/\\__,_/\\___/_/\\___/_/   v3.2.0

[INF] Running nuclei with 7842 templates
[CVE-2024-3400] [critical] http://target:443/global-protect/login.esp
[CVE-2021-41773] [high] http://target:80/.%2e/.%2e/.%2e/etc/passwd
[tech-detect:apache] [info] http://target:80
[tech-detect:nginx] [info] http://target:8080

[INF] Found 2 vulnerabilities, 2 info results in 45.2s`,
      status: "success",
    };
  }

  if (command.includes("sqlmap")) {
    return {
      output: `$ ${command}
        ___
       __H__
 ___ ___[.]_____ ___ ___  {1.8.4#stable}
|_ -| . [']     | .'| . |
|___|_  [']_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org

[*] starting at ${new Date().toLocaleTimeString()}
[INFO] testing connection to the target URL
[INFO] testing if the target URL content is stable
[INFO] target URL content is stable
[INFO] testing if GET parameter 'id' is dynamic
[INFO] GET parameter 'id' appears to be dynamic
[INFO] heuristic (basic) test shows that GET parameter 'id' might be injectable (possible DBMS: 'MySQL')
[INFO] testing for SQL injection on GET parameter 'id'
[INFO] GET parameter 'id' is 'AND boolean-based blind - WHERE or HAVING clause' injectable
[INFO] GET parameter 'id' is vulnerable. Do you want to keep testing the others (if any)? [y/N]

sqlmap identified the following injection point(s):
Parameter: id (GET)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause`,
      status: "success",
    };
  }

  // Generic mock for unrecognized commands
  return {
    output: `$ ${command}\n[sandbox] Command queued for execution in Kali container.\n[mock] Real execution requires active sandbox connection.`,
    status: "success",
  };
}

function executeKgQuery(input: Record<string, unknown>): { output: string; status: "success" | "error" } {
  const query = String(input.query || "").trim();
  if (!query) {
    return { output: "Error: No Cypher query provided", status: "error" };
  }

  // Validate basic Cypher syntax
  const upper = query.toUpperCase();
  if (!upper.includes("MATCH") && !upper.includes("RETURN") && !upper.includes("CREATE")) {
    return { output: "Error: Invalid Cypher query. Must contain MATCH, RETURN, or CREATE.", status: "error" };
  }

  // Mock response
  const mockResult = {
    columns: ["n.address", "n.type", "p.number", "p.service"],
    rows: [
      ["192.168.1.1", "host", 22, "ssh"],
      ["192.168.1.1", "host", 80, "http"],
      ["192.168.1.1", "host", 443, "https"],
      ["192.168.1.10", "host", 3306, "mysql"],
      ["192.168.1.10", "host", 8080, "http-proxy"],
    ],
    stats: {
      nodesCreated: 0,
      relationshipsCreated: 0,
      propertiesSet: 0,
      queryTime: "12ms",
    },
  };

  return {
    output: JSON.stringify(mockResult, null, 2),
    status: "success",
  };
}

function executeCveLookup(input: Record<string, unknown>): {
  output: string;
  status: "success" | "error";
  meta?: Record<string, unknown>;
} {
  const cveId = String(input.cveId || input.query || "").trim().toUpperCase();
  if (!cveId || !/^CVE-\d{4}-\d{4,}$/.test(cveId)) {
    return { output: "Error: Invalid CVE ID format. Expected CVE-YYYY-NNNNN.", status: "error" };
  }

  // Known CVEs (reuse from cve.ts mock data)
  const knownCves: Record<string, Record<string, unknown>> = {
    "CVE-2024-3400": {
      severity: "CRITICAL",
      cvss: 10.0,
      epss: 0.97,
      description: "Command injection in Palo Alto Networks PAN-OS GlobalProtect. Unauthenticated RCE as root.",
      products: ["PAN-OS 10.2", "PAN-OS 11.0", "PAN-OS 11.1"],
      exploitedInWild: true,
      cisaKev: true,
    },
    "CVE-2024-21762": {
      severity: "CRITICAL",
      cvss: 9.8,
      epss: 0.95,
      description: "Out-of-bounds write in Fortinet FortiOS/FortiProxy. Remote unauthenticated RCE.",
      products: ["FortiOS 7.4.x", "FortiOS 7.2.x", "FortiProxy 7.4.x"],
      exploitedInWild: true,
      cisaKev: true,
    },
    "CVE-2021-44228": {
      severity: "CRITICAL",
      cvss: 10.0,
      epss: 0.97,
      description: "Apache Log4j2 JNDI injection (Log4Shell). Remote code execution via crafted log messages.",
      products: ["Apache Log4j 2.0-beta9 to 2.14.1"],
      exploitedInWild: true,
      cisaKev: true,
    },
    "CVE-2024-6387": {
      severity: "HIGH",
      cvss: 8.1,
      epss: 0.72,
      description: "OpenSSH signal handler race condition (regreSSHion). Remote RCE as root on glibc-based Linux.",
      products: ["OpenSSH 8.5p1 - 9.7p1"],
      exploitedInWild: false,
      cisaKev: false,
    },
  };

  const cve = knownCves[cveId];
  if (cve) {
    return {
      output: JSON.stringify({ cveId, ...cve }, null, 2),
      status: "success",
      meta: { source: "local_db", cached: true },
    };
  }

  // Generate placeholder for unknown CVEs
  return {
    output: JSON.stringify(
      {
        cveId,
        severity: "UNKNOWN",
        cvss: null,
        epss: null,
        description: `Vulnerability ${cveId} not found in local database. Query NVD API for full details.`,
        products: [],
        exploitedInWild: false,
        cisaKev: false,
        nvdUrl: `https://nvd.nist.gov/vuln/detail/${cveId}`,
      },
      null,
      2,
    ),
    status: "success",
    meta: { source: "generated", cached: false },
  };
}

function executeJwtParse(input: Record<string, unknown>): { output: string; status: "success" | "error" } {
  const token = String(input.token || input.jwt || "").trim();
  if (!token) {
    return { output: "Error: No JWT token provided", status: "error" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      output: `Error: Invalid JWT format. Expected 3 dot-separated parts, got ${parts.length}.`,
      status: "error",
    };
  }

  try {
    // Base64url decode helper
    const b64Decode = (str: string): string => {
      // Convert base64url to base64
      let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      // Add padding
      while (base64.length % 4 !== 0) base64 += "=";
      return atob(base64);
    };

    const header = JSON.parse(b64Decode(parts[0]!));
    const payload = JSON.parse(b64Decode(parts[1]!));

    // Security analysis
    const warnings: string[] = [];

    if (header.alg === "none") {
      warnings.push("[CRITICAL] Algorithm is 'none' -- signature not verified, token can be forged");
    }
    if (header.alg === "HS256" && header.typ === "JWT") {
      warnings.push("[INFO] Using HS256 -- ensure secret key is sufficiently long (>= 256 bits)");
    }
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      if (expDate < new Date()) {
        warnings.push(`[WARNING] Token expired at ${expDate.toISOString()}`);
      } else {
        const hoursLeft = (expDate.getTime() - Date.now()) / 3600000;
        if (hoursLeft > 720) {
          warnings.push(`[WARNING] Token expires in ${Math.round(hoursLeft / 24)} days -- consider shorter expiry`);
        }
      }
    } else {
      warnings.push("[WARNING] No 'exp' claim -- token never expires");
    }

    if (payload.admin === true || payload.role === "admin" || payload.is_admin === true) {
      warnings.push("[INFO] Token contains admin/elevated privileges");
    }

    if (!payload.iat) {
      warnings.push("[INFO] No 'iat' (issued at) claim");
    }
    if (!payload.iss) {
      warnings.push("[INFO] No 'iss' (issuer) claim");
    }

    const result = {
      header,
      payload,
      signature: parts[2]!.slice(0, 20) + "...",
      analysis: {
        algorithm: header.alg || "unknown",
        type: header.typ || "unknown",
        issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        subject: payload.sub || null,
        issuer: payload.iss || null,
        audience: payload.aud || null,
      },
      warnings,
    };

    return { output: JSON.stringify(result, null, 2), status: "success" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: `Error decoding JWT: ${message}`, status: "error" };
  }
}

function executeIamAudit(input: Record<string, unknown>): { output: string; status: "success" | "error" } {
  const policyStr = String(input.policy || input.json || "").trim();
  if (!policyStr) {
    return { output: "Error: No IAM policy JSON provided", status: "error" };
  }

  let policy: { Version?: string; Statement?: Array<Record<string, unknown>> };
  try {
    policy = JSON.parse(policyStr);
  } catch {
    return { output: "Error: Invalid JSON. Could not parse IAM policy.", status: "error" };
  }

  if (!policy.Statement || !Array.isArray(policy.Statement)) {
    return { output: "Error: IAM policy must contain a 'Statement' array.", status: "error" };
  }

  // Dangerous action patterns
  const DANGEROUS_ACTIONS = [
    { pattern: /^iam:\*$/i, severity: "CRITICAL", reason: "Full IAM control -- can create users, roles, attach any policy" },
    { pattern: /^s3:\*$/i, severity: "HIGH", reason: "Full S3 access -- can read/write/delete all buckets and objects" },
    { pattern: /^\*$/i, severity: "CRITICAL", reason: "Wildcard action on all services -- effectively admin access" },
    { pattern: /^sts:AssumeRole$/i, severity: "HIGH", reason: "Can assume other roles -- potential privilege escalation" },
    { pattern: /^iam:CreateUser$/i, severity: "HIGH", reason: "Can create new IAM users -- persistence mechanism" },
    { pattern: /^iam:AttachUserPolicy$/i, severity: "HIGH", reason: "Can attach policies to users -- privilege escalation" },
    { pattern: /^iam:AttachRolePolicy$/i, severity: "HIGH", reason: "Can attach policies to roles -- privilege escalation" },
    { pattern: /^iam:CreateAccessKey$/i, severity: "HIGH", reason: "Can create access keys for any user" },
    { pattern: /^iam:PassRole$/i, severity: "MEDIUM", reason: "Can pass roles to services -- potential escalation" },
    { pattern: /^lambda:CreateFunction$/i, severity: "MEDIUM", reason: "Can create Lambda functions -- code execution" },
    { pattern: /^ec2:RunInstances$/i, severity: "MEDIUM", reason: "Can launch EC2 instances -- cost and compute abuse" },
    { pattern: /^kms:Decrypt$/i, severity: "MEDIUM", reason: "Can decrypt KMS-encrypted data" },
    { pattern: /^secretsmanager:GetSecretValue$/i, severity: "MEDIUM", reason: "Can read secrets from Secrets Manager" },
  ];

  const findings: Array<{
    severity: string;
    action: string;
    resource: string;
    reason: string;
    statementIdx: number;
  }> = [];

  for (let i = 0; i < policy.Statement.length; i++) {
    const stmt = policy.Statement[i]!;
    if (String(stmt.Effect).toLowerCase() !== "allow") continue;

    const actions = Array.isArray(stmt.Action)
      ? stmt.Action.map(String)
      : [String(stmt.Action || "")];
    const resource = Array.isArray(stmt.Resource)
      ? stmt.Resource.join(", ")
      : String(stmt.Resource || "*");

    for (const action of actions) {
      for (const dangerous of DANGEROUS_ACTIONS) {
        if (dangerous.pattern.test(action)) {
          findings.push({
            severity: dangerous.severity,
            action,
            resource,
            reason: dangerous.reason,
            statementIdx: i,
          });
        }
      }

      // Check for wildcard in resource with sensitive actions
      if (resource === "*" && !action.includes("*")) {
        const sensitiveServices = ["iam", "sts", "s3", "kms", "secretsmanager", "lambda"];
        const service = action.split(":")[0]?.toLowerCase();
        if (service && sensitiveServices.includes(service)) {
          // Only add if not already flagged
          if (!findings.some((f) => f.action === action && f.statementIdx === i)) {
            findings.push({
              severity: "MEDIUM",
              action,
              resource: "*",
              reason: `${action} with wildcard resource -- overly permissive`,
              statementIdx: i,
            });
          }
        }
      }
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  findings.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  const summary = {
    policyVersion: policy.Version || "unknown",
    statementCount: policy.Statement.length,
    findingsCount: findings.length,
    critical: findings.filter((f) => f.severity === "CRITICAL").length,
    high: findings.filter((f) => f.severity === "HIGH").length,
    medium: findings.filter((f) => f.severity === "MEDIUM").length,
    riskLevel:
      findings.some((f) => f.severity === "CRITICAL")
        ? "CRITICAL"
        : findings.some((f) => f.severity === "HIGH")
          ? "HIGH"
          : findings.length > 0
            ? "MEDIUM"
            : "LOW",
    findings,
  };

  return { output: JSON.stringify(summary, null, 2), status: "success" };
}

function executeNetworkScan(input: Record<string, unknown>): { output: string; status: "success" | "error" } {
  const target = String(input.target || input.host || "").trim();
  if (!target) {
    return { output: "Error: No target specified", status: "error" };
  }

  // Validate target format (IP or hostname)
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostPattern = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

  if (!ipPattern.test(target) && !hostPattern.test(target) && !cidrPattern.test(target)) {
    return { output: "Error: Invalid target format. Expected IP address, hostname, or CIDR.", status: "error" };
  }

  // Generate mock scan results
  const ports = [
    { port: 22, state: "open", service: "ssh", version: "OpenSSH 8.9p1 Ubuntu" },
    { port: 80, state: "open", service: "http", version: "Apache httpd 2.4.52" },
    { port: 443, state: "open", service: "ssl/http", version: "Apache httpd 2.4.52" },
    { port: 3306, state: "filtered", service: "mysql", version: "" },
    { port: 8080, state: "open", service: "http-proxy", version: "Nginx 1.24.0" },
    { port: 8443, state: "closed", service: "https-alt", version: "" },
    { port: 9090, state: "filtered", service: "zeus-admin", version: "" },
  ];

  const openPorts = ports.filter((p) => p.state === "open");
  const filteredPorts = ports.filter((p) => p.state === "filtered");

  const scanResult = {
    target,
    hostStatus: "up",
    latency: "2.3ms",
    scanTime: "14.82s",
    ports,
    summary: {
      total: ports.length,
      open: openPorts.length,
      filtered: filteredPorts.length,
      closed: ports.filter((p) => p.state === "closed").length,
    },
    os: {
      name: "Ubuntu 22.04 (Jammy Jellyfish)",
      accuracy: 95,
      type: "Linux",
      kernel: "5.15.x",
    },
    warnings: openPorts.length > 3
      ? ["Multiple services exposed -- consider reducing attack surface"]
      : [],
  };

  return { output: JSON.stringify(scanResult, null, 2), status: "success" };
}
