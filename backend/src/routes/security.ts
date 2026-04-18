import type { AppVariables } from "../types.js";
/**
 * Security telemetry sink — CSP violation reports.
 *
 * Browsers POST a CSP report here when our policy blocks a fetch/script/style.
 * The Next.js edge route at app/api/security/csp-report/route.ts forwards
 * the report to this backend. We persist into audit_logs with action
 * 'security.csp_violation' so super_admins can review patterns from
 * /dashboard/admin/logs (action filter dropdown).
 *
 * Two report formats handled:
 *   - Legacy `application/csp-report`: { "csp-report": { ... } }
 *   - Modern Reporting API: [{ "type": "csp-violation", "body": { ... } }]
 *
 * Per docs/architecture/14-SECURITY.md §5 + CSP3 reporting spec.
 *
 * Sampling: we accept up to 50 reports per minute per IP via the existing
 * rate-limit middleware. Above that, return 204 silently (do not retry-bait
 * a possibly-attack source).
 */

import { Hono } from "hono";
import { withSuperAdmin } from "../db/client.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";

export const securityRoutes = new Hono<{ Variables: AppVariables }>();

// Rate-limit CSP reports (IP-keyed) — protects audit_logs from a noisy
// extension or a deliberate flood. NOT auth-gated: browsers post reports
// without credentials.
securityRoutes.use("/csp-report", rateLimit({ ...config.rateLimit.api, max: 50 }));

interface CspReportBody {
  "blocked-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "document-uri"?: string;
  "source-file"?: string;
  "line-number"?: number;
  "column-number"?: number;
  "script-sample"?: string;
  disposition?: "enforce" | "report";
}

interface ReportingApiEnvelope {
  type?: string;
  url?: string;
  body?: CspReportBody;
  age?: number;
}

interface LegacyCspEnvelope {
  "csp-report"?: CspReportBody;
}

securityRoutes.post("/csp-report", async (c) => {
  let payload: CspReportBody | null = null;

  try {
    const raw = await c.req.json();
    if (Array.isArray(raw)) {
      // Reporting API format — array of envelopes; pick the first csp-violation.
      const csp = (raw as ReportingApiEnvelope[]).find((r) => r.type === "csp-violation" && r.body);
      payload = csp?.body ?? null;
    } else if (raw && typeof raw === "object" && "csp-report" in raw) {
      // Legacy single-envelope format.
      payload = (raw as LegacyCspEnvelope)["csp-report"] ?? null;
    } else if (raw && typeof raw === "object") {
      // Already-flat body.
      payload = raw as CspReportBody;
    }
  } catch {
    // Empty / non-JSON body — drop silently, do not 4xx (browsers are noisy).
    return new Response(null, { status: 204 });
  }

  if (!payload) return new Response(null, { status: 204 });

  const sourceIp =
    c.req.header("x-source-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  const sourceUa = c.req.header("x-source-ua") || c.req.header("user-agent") || null;

  // Sampling guard: drop reports whose blocked-uri is clearly a browser
  // extension (chrome-extension://, moz-extension://, safari-extension://) —
  // these are noise from user-installed extensions, not a real CSP problem.
  const blocked = payload["blocked-uri"] ?? "";
  if (
    blocked.startsWith("chrome-extension://") ||
    blocked.startsWith("moz-extension://") ||
    blocked.startsWith("safari-extension://") ||
    blocked.startsWith("about:")
  ) {
    return new Response(null, { status: 204 });
  }

  // Persist for super-admin review. CSP reports are PLATFORM-level (no org_id),
  // hence withSuperAdmin (BYPASSRLS).
  await withSuperAdmin(async (sql) => {
    await sql`
      INSERT INTO audit_logs (user_id, action, resource, details, ip_address)
      VALUES (NULL, 'security.csp_violation',
              ${payload["document-uri"] ?? "unknown"},
              ${JSON.stringify({
                blocked: payload["blocked-uri"],
                violated_directive: payload["violated-directive"] ?? payload["effective-directive"],
                source_file: payload["source-file"],
                line_number: payload["line-number"],
                column_number: payload["column-number"],
                script_sample: payload["script-sample"]?.slice(0, 200),
                disposition: payload.disposition,
                user_agent: sourceUa?.slice(0, 200),
              })},
              ${sourceIp})
    `;
  });

  return new Response(null, { status: 204 });
});
