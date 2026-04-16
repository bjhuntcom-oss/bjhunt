import type { AppVariables } from "../types.js";
/**
 * Report generation routes — executive summary, HackerOne, timeline, CSV.
 */

import { Hono } from "hono";
import { withOrg } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";

export const reportRoutes = new Hono<{ Variables: AppVariables }>();

reportRoutes.use("*", requireAuth);
reportRoutes.use("*", rateLimit(config.rateLimit.api));

// ── Helpers ─────────────────────────────────────────────────────────────

function severityOrder(s: string): number {
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return order[s] ?? 5;
}

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── GET /api/reports/:engagementId/executive ────────────────────────────

reportRoutes.get("/:engagementId/executive", async (c) => {
  const orgId = c.get("orgId") as string;
  const engagementId = c.req.param("engagementId");

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT * FROM engagements WHERE id = ${engagementId}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  const findings = await withOrg(orgId, (tx) =>
    tx`
      SELECT * FROM findings
      WHERE engagement_id = ${engagementId}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          WHEN 'info' THEN 4
        END,
        created_at DESC
    `,
  );

  // Severity distribution
  const dist: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    const sev = (f.severity as string) || "info";
    dist[sev] = (dist[sev] || 0) + 1;
  }

  const now = formatDate(new Date().toISOString());
  const engDate = formatDate(engagement.createdAt as string);

  let md = `# Executive Summary\n\n`;
  md += `**Engagement:** ${engagement.name}\n`;
  md += `**Target:** ${engagement.target}\n`;
  md += `**Status:** ${engagement.status}\n`;
  md += `**Date:** ${engDate}\n`;
  md += `**Report generated:** ${now}\n\n`;

  md += `## Scope\n\n`;
  md += `Target: \`${engagement.target}\`\n`;
  if (engagement.description) md += `\n${engagement.description}\n`;
  md += `\n`;

  md += `## Severity Distribution\n\n`;
  md += `| Severity | Count |\n`;
  md += `|----------|-------|\n`;
  for (const sev of ["critical", "high", "medium", "low", "info"]) {
    md += `| ${sev.charAt(0).toUpperCase() + sev.slice(1)} | ${dist[sev]} |\n`;
  }
  md += `| **Total** | **${findings.length}** |\n\n`;

  md += `## Top Findings\n\n`;
  const topFindings = findings.slice(0, 10);
  if (topFindings.length === 0) {
    md += `No findings recorded.\n\n`;
  } else {
    for (const f of topFindings) {
      md += `### ${f.title}\n\n`;
      md += `- **Severity:** ${(f.severity as string).toUpperCase()}`;
      if (f.cvssScore != null) md += ` (CVSS ${f.cvssScore})`;
      md += `\n`;
      if (f.cveIds && (f.cveIds as string[]).length > 0) {
        md += `- **CVE:** ${(f.cveIds as string[]).join(", ")}\n`;
      }
      if (f.description) md += `- **Description:** ${f.description}\n`;
      if (f.remediation) md += `- **Remediation:** ${f.remediation}\n`;
      md += `\n`;
    }
  }

  md += `## Recommendations\n\n`;
  if (dist.critical > 0) {
    md += `1. **IMMEDIATE ACTION REQUIRED** — ${dist.critical} critical finding(s) must be addressed immediately.\n`;
  }
  if (dist.high > 0) {
    md += `${dist.critical > 0 ? "2" : "1"}. **HIGH PRIORITY** — ${dist.high} high-severity finding(s) should be remediated within 7 days.\n`;
  }
  if (dist.medium > 0) {
    md += `- ${dist.medium} medium-severity finding(s) should be addressed within 30 days.\n`;
  }
  if (dist.low > 0) {
    md += `- ${dist.low} low-severity finding(s) should be tracked and addressed in the next maintenance cycle.\n`;
  }
  if (findings.length === 0) {
    md += `No findings were recorded for this engagement.\n`;
  }

  const filename = `executive-summary-${engagement.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60)}.md`;

  return c.json({ markdown: md, filename });
});

// ── GET /api/reports/:engagementId/hackerone ─────────────────────────────

reportRoutes.get("/:engagementId/hackerone", async (c) => {
  const orgId = c.get("orgId") as string;
  const engagementId = c.req.param("engagementId");

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT * FROM engagements WHERE id = ${engagementId}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  const findings = await withOrg(orgId, (tx) =>
    tx`
      SELECT * FROM findings
      WHERE engagement_id = ${engagementId}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          WHEN 'info' THEN 4
        END,
        created_at DESC
    `,
  );

  let md = `# HackerOne-Style Vulnerability Report\n\n`;
  md += `**Program:** ${engagement.name}\n`;
  md += `**Target:** ${engagement.target}\n`;
  md += `**Report Date:** ${formatDate(new Date().toISOString())}\n\n`;
  md += `---\n\n`;

  if (findings.length === 0) {
    md += `No vulnerabilities found.\n`;
  }

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];

    md += `## ${i + 1}. ${f.title}\n\n`;
    md += `**Severity:** ${(f.severity as string).toUpperCase()}`;
    if (f.cvssScore != null) md += ` | CVSS ${f.cvssScore}`;
    if (f.cvssVector) md += ` (${f.cvssVector})`;
    md += `\n`;
    if (f.cveIds && (f.cveIds as string[]).length > 0) {
      md += `**CVE:** ${(f.cveIds as string[]).join(", ")}\n`;
    }
    if (f.mitreAttack && (f.mitreAttack as string[]).length > 0) {
      md += `**MITRE ATT&CK:** ${(f.mitreAttack as string[]).join(", ")}\n`;
    }
    md += `\n`;

    md += `### Description\n\n`;
    md += `${f.description || "No description provided."}\n\n`;

    md += `### Steps to Reproduce\n\n`;
    if (f.evidence && typeof f.evidence === "object") {
      const evidence = f.evidence as Record<string, unknown>;
      if (evidence.steps && Array.isArray(evidence.steps)) {
        for (let s = 0; s < evidence.steps.length; s++) {
          md += `${s + 1}. ${evidence.steps[s]}\n`;
        }
      } else if (evidence.command) {
        md += `\`\`\`\n${evidence.command}\n\`\`\`\n`;
      } else if (evidence.output) {
        md += `\`\`\`\n${evidence.output}\n\`\`\`\n`;
      } else {
        md += `See evidence data for reproduction details.\n`;
      }
    } else {
      md += `No reproduction steps recorded.\n`;
    }
    md += `\n`;

    md += `### Impact\n\n`;
    const impactMap: Record<string, string> = {
      critical: "This vulnerability poses an immediate threat to the confidentiality, integrity, or availability of the target system. Exploitation could lead to full system compromise.",
      high: "This vulnerability could lead to significant data exposure or system compromise if exploited.",
      medium: "This vulnerability has moderate impact and could be exploited under certain conditions.",
      low: "This vulnerability has limited impact but should still be addressed.",
      info: "This is an informational finding with no direct security impact.",
    };
    md += `${impactMap[(f.severity as string)] || impactMap.info}\n\n`;

    md += `### Remediation\n\n`;
    md += `${f.remediation || "No remediation guidance provided."}\n\n`;

    if (i < findings.length - 1) md += `---\n\n`;
  }

  const filename = `hackerone-report-${engagement.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60)}.md`;

  return c.json({ markdown: md, filename });
});

// ── GET /api/reports/:engagementId/timeline ──────────────────────────────

reportRoutes.get("/:engagementId/timeline", async (c) => {
  const orgId = c.get("orgId") as string;
  const engagementId = c.req.param("engagementId");

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT * FROM engagements WHERE id = ${engagementId}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // Fetch findings and agent runs, combining them chronologically
  const [findings, runs] = await Promise.all([
    withOrg(orgId, (tx) =>
      tx`SELECT id, title, severity, created_at FROM findings WHERE engagement_id = ${engagementId} ORDER BY created_at ASC`,
    ),
    withOrg(orgId, (tx) =>
      tx`SELECT id, agent_name, status, input_summary, output_summary, started_at, completed_at, created_at
         FROM agent_runs WHERE engagement_id = ${engagementId} ORDER BY created_at ASC`,
    ),
  ]);

  // Build timeline entries
  interface TimelineEntry {
    timestamp: string;
    agent: string;
    action: string;
    finding: string;
  }

  const entries: TimelineEntry[] = [];

  for (const run of runs) {
    entries.push({
      timestamp: formatDate(run.createdAt as string),
      agent: (run.agentName as string) || "unknown",
      action: `Agent ${run.status === "completed" ? "completed" : run.status === "error" ? "failed" : "started"}: ${(run.inputSummary as string) || "run"}`,
      finding: (run.outputSummary as string) || "-",
    });
  }

  for (const f of findings) {
    entries.push({
      timestamp: formatDate(f.createdAt as string),
      agent: "-",
      action: `Finding discovered`,
      finding: `[${(f.severity as string).toUpperCase()}] ${f.title}`,
    });
  }

  // Sort by timestamp string (already formatted consistently)
  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  let md = `# Engagement Timeline\n\n`;
  md += `**Engagement:** ${engagement.name}\n`;
  md += `**Target:** ${engagement.target}\n`;
  md += `**Generated:** ${formatDate(new Date().toISOString())}\n\n`;

  md += `| Timestamp | Agent | Action | Finding |\n`;
  md += `|-----------|-------|--------|---------|\n`;

  if (entries.length === 0) {
    md += `| - | - | No activity recorded | - |\n`;
  } else {
    for (const e of entries) {
      md += `| ${e.timestamp} | ${e.agent} | ${e.action} | ${e.finding} |\n`;
    }
  }

  const filename = `timeline-${engagement.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60)}.md`;

  return c.json({ markdown: md, filename });
});

// ── GET /api/reports/:engagementId/csv ───────────────────────────────────

reportRoutes.get("/:engagementId/csv", async (c) => {
  const orgId = c.get("orgId") as string;
  const engagementId = c.req.param("engagementId");

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, name FROM engagements WHERE id = ${engagementId}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  const findings = await withOrg(orgId, (tx) =>
    tx`
      SELECT id, title, severity, cvss_score, cve_ids, agent_name, description, remediation, created_at
      FROM findings
      WHERE engagement_id = ${engagementId}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          WHEN 'info' THEN 4
        END,
        created_at DESC
    `,
  );

  const header = "ID,Title,Severity,CVSS,CVE,Agent,Description,Remediation,Date\n";
  let csv = header;

  for (const f of findings) {
    const cves = f.cveIds && Array.isArray(f.cveIds) ? (f.cveIds as string[]).join("; ") : "";
    csv += [
      escapeCSV(f.id as string),
      escapeCSV(f.title as string),
      escapeCSV(f.severity as string),
      f.cvssScore != null ? String(f.cvssScore) : "",
      escapeCSV(cves),
      escapeCSV((f.agentName as string) || ""),
      escapeCSV(f.description as string),
      escapeCSV(f.remediation as string),
      f.createdAt ? formatDate(f.createdAt as string) : "",
    ].join(",") + "\n";
  }

  const filename = `findings-${engagement.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60)}.csv`;

  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  return c.body(csv);
});
