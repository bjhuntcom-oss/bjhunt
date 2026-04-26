// app/[locale]/dashboard/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { serverBackendFetch } from "@/lib/backend-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow, H1, H3, Body, Caption, Code, Micro } from "@/components/ui/typography";
import { StatusDot } from "@/components/ui/status-dot";

type AuthPayload = {
  user: { role: string; displayName: string; email: string; plan?: string };
};

type Scan = {
  id: string;
  target: string;
  status: "complete" | "scanning" | "queued" | "error";
  progress?: number;
  result?: string;
  duration?: string;
  createdAt?: string;
};

type DashboardStats = {
  health: { status: 'operational' | 'degraded' | 'down'; latencyMs: number };
  tokens: { used: number; limit: number };
  scans: {
    total: number;
    perDay: number[];
    severity: { critical: number; high: number; medium: number; low: number };
  };
  plan: { slug: string; displayName: string; scansLimit: number };
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Auth guard handled by dashboard/layout.tsx — cookie guaranteed.
  const cookieHeader = (await headers()).get("cookie") ?? "";

  const meResponse = await serverBackendFetch("/api/auth/me", {}, cookieHeader);
  if (!meResponse.ok) redirect(`/${locale}/login`);

  const mePayload = (await meResponse.json()) as AuthPayload;

  // Fetch recent engagements + dashboard stats + billing in parallel
  const [engRes, statsRes, billingPlanRes, billingUsageRes, healthRes] =
    await Promise.all([
      serverBackendFetch("/api/engagements?limit=10", {}, cookieHeader),
      serverBackendFetch("/api/dashboard/stats", {}, cookieHeader),
      serverBackendFetch("/api/billing/plan", {}, cookieHeader),
      serverBackendFetch("/api/billing/usage", {}, cookieHeader),
      serverBackendFetch("/api/health/ready", {}, cookieHeader),
    ]);

  // Recent scans
  let scans: Scan[] = [];
  if (engRes.ok) {
    const body = (await engRes.json()) as { engagements?: Array<Record<string, unknown>> };
    scans = (body.engagements ?? []).map((e: any) => ({
      id: e.id,
      target: e.target || e.name,
      status:
        e.status === "running"
          ? ("scanning" as const)
          : e.status === "completed"
          ? ("complete" as const)
          : e.status === "draft"
          ? ("queued" as const)
          : ("error" as const),
      result: e.status === "completed" ? "Done" : undefined,
      duration:
        e.completedAt && e.startedAt
          ? `${Math.round(
              (new Date(e.completedAt).getTime() -
                new Date(e.startedAt).getTime()) /
                1000
            )}s`
          : undefined,
      createdAt: e.createdAt,
    }));
  }

  // Billing
  type BillingPlan = {
    plan: string;
    displayName: string;
    orgName: string;
    limits: { engagements: number; tokensPerMonth: number; agents: string[] };
  };
  type BillingUsage = {
    plan: string;
    limits: { engagements: number; tokensPerMonth: number; agents: string[] };
    usage: { engagements: number; tokensUsed: number; findings: number };
    percentages: { engagements: number; tokens: number };
  };

  let billingPlan: BillingPlan | null = null;
  let billingUsage: BillingUsage | null = null;
  if (billingPlanRes.ok) billingPlan = (await billingPlanRes.json()) as BillingPlan;
  if (billingUsageRes.ok) billingUsage = (await billingUsageRes.json()) as BillingUsage;

  const healthOk = healthRes.ok;

  // Stats
  let stats: DashboardStats;
  if (statsRes.ok) {
    const sd = (await statsRes.json()) as DashboardStats;
    stats = {
      health: sd.health ?? { status: healthOk ? "operational" : "down", latencyMs: 0 },
      tokens: sd.tokens ?? {
        used: billingUsage?.usage.tokensUsed ?? 0,
        limit: billingPlan?.limits.tokensPerMonth ?? 2_000_000,
      },
      scans: sd.scans ?? {
        total: scans.length,
        perDay: [0, 0, 0, 0, 0, 0, scans.length],
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
      },
      plan: sd.plan ?? {
        slug: billingPlan?.plan ?? "free",
        displayName: billingPlan?.displayName ?? "Free",
        scansLimit: billingPlan?.limits.engagements ?? 5,
      },
    };
  } else {
    stats = {
      health: { status: healthOk ? "operational" : "down", latencyMs: 0 },
      tokens: {
        used: billingUsage?.usage.tokensUsed ?? 0,
        limit: billingPlan?.limits.tokensPerMonth ?? 2_000_000,
      },
      scans: {
        total: scans.length,
        perDay: [0, 0, 0, 0, 0, 0, scans.length],
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
      },
      plan: {
        slug: billingPlan?.plan ?? "free",
        displayName: billingPlan?.displayName ?? "Free",
        scansLimit: billingPlan?.limits.engagements ?? 5,
      },
    };
  }

  const name =
    mePayload.user.displayName || mePayload.user.email.split("@")[0] || "vous";
  const totalScans = stats.scans.total ?? 0;
  const severity = stats.scans.severity ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const tokensUsed = stats.tokens.used ?? 0;
  const tokensLimit = stats.tokens.limit ?? 2_000_000;
  const planDisplayName = stats.plan.displayName ?? mePayload.user.plan ?? "Free";

  // Active engagements = "running" or "scanning"
  const activeEngagements = scans.filter((s) => s.status === "scanning").length;

  // KPI deltas (placeholder pending real time-series data)
  const kpis = [
    {
      label: "Engagements actifs",
      value: String(activeEngagements),
      delta: activeEngagements > 0 ? "+ live" : "—",
      deltaState: activeEngagements > 0 ? "success" : "neutral",
    },
    {
      label: "Findings critiques",
      value: String(severity.critical),
      delta: severity.critical > 0 ? `${severity.critical} à traiter` : "0 ouvert",
      deltaState: severity.critical > 0 ? "critical" : "success",
    },
    {
      label: "Scans cette semaine",
      value: String(totalScans),
      delta: `Plan ${planDisplayName}`,
      deltaState: "neutral",
    },
    {
      label: "Tokens consommés",
      value: `${(tokensUsed / 1_000_000).toFixed(1)}M`,
      delta: `/ ${(tokensLimit / 1_000_000).toFixed(0)}M`,
      deltaState: "neutral",
    },
  ] as const;

  return (
    <div className="px-6 md:px-10 py-10 md:py-16 max-w-[1280px] mx-auto">
      {/* Hero */}
      <header className="mb-12">
        <Eyebrow>OVERVIEW / DASHBOARD</Eyebrow>
        <H1 className="mt-4 mb-3">
          Bonjour,{" "}
          <span className="text-[var(--bjhunt-text-muted)]">{name}.</span>
        </H1>
        <Body className="text-[var(--bjhunt-text-muted)] leading-[1.6] max-w-2xl">
          Vue d&rsquo;ensemble de vos engagements offensifs. Lancez un scan, suivez les
          findings, exportez les rapports — la chaîne d&rsquo;agents s&rsquo;occupe du reste.
        </Body>
      </header>

      {/* KPI bento — 4 cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
        {kpis.map((kpi) => (
          <Card key={kpi.label} padding="regular">
            <Eyebrow className="block mb-4">{kpi.label}</Eyebrow>
            <div
              className="font-mono leading-none"
              style={{
                fontSize: 36,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                color: "var(--bjhunt-text)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {kpi.value}
            </div>
            <div className="mt-3" style={{ color: deltaColor(kpi.deltaState) }}>
              <Caption>{kpi.delta}</Caption>
            </div>
          </Card>
        ))}
      </section>

      {/* 2-col: activity feed + quick actions */}
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Activity feed */}
        <Card padding="regular">
          <div className="flex items-center justify-between mb-6">
            <Eyebrow>Activité récente</Eyebrow>
            <Link
              href="/dashboard/audits"
              className="font-mono text-[12px] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
            >
              Tout voir →
            </Link>
          </div>
          {scans.length === 0 ? (
            <div className="py-12 text-center">
              <Body className="text-[var(--bjhunt-text-muted)] mb-5">
                Aucune activité pour le moment.
              </Body>
              <Button asChild variant="state" state="success">
                <Link href="/dashboard/chat">Lancer votre premier scan</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-0 list-none p-0 m-0">
              {scans.map((scan, idx) => (
                <li
                  key={scan.id}
                  className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
                  style={{
                    borderTop: idx === 0 ? "none" : "1px solid var(--bjhunt-border)",
                  }}
                >
                  <div className="pt-1.5 flex-shrink-0">
                    <StatusDot
                      state={statusDotState(scan.status)}
                      pulse={scan.status === "scanning"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <Code className="text-[var(--bjhunt-text)] truncate max-w-[60%]">
                        {scan.target}
                      </Code>
                      <Micro className="text-[var(--bjhunt-text-muted)]">
                        {formatTime(scan.createdAt)}
                      </Micro>
                    </div>
                    <div className="mt-1" style={{ color: statusColor(scan.status) }}>
                      <Caption>
                        {statusLabel(scan.status)}
                        {scan.duration ? ` · ${scan.duration}` : ""}
                        {scan.result ? ` · ${scan.result}` : ""}
                      </Caption>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick actions */}
        <Card padding="regular">
          <Eyebrow className="block mb-5">Actions rapides</Eyebrow>
          <div className="flex flex-col gap-3">
            <Button asChild variant="ghost" size="lg" className="justify-start">
              <Link href="/dashboard/chat">Lancer un scan</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="justify-start">
              <Link href="/dashboard/audits">Voir les findings</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="justify-start">
              <Link href="/dashboard/admin/users">Inviter un membre</Link>
            </Button>
          </div>

          <div
            className="mt-6 pt-6"
            style={{ borderTop: "1px solid var(--bjhunt-border)" }}
          >
            <Eyebrow className="block mb-3">Plan</Eyebrow>
            <H3 className="mb-1">{planDisplayName}</H3>
            <Caption className="block text-[var(--bjhunt-text-muted)]">
              {billingPlan?.limits.agents?.length ?? 3} agents disponibles
            </Caption>
            {stats.plan.slug === "free" && (
              <Button
                asChild
                variant="state"
                state="success"
                size="sm"
                className="mt-4 w-full"
              >
                <Link href="/pricing">Passer à Pro →</Link>
              </Button>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

/* ─────────── helpers ─────────── */

function deltaColor(state: string): string {
  if (state === "success") return "var(--state-success)";
  if (state === "warning") return "var(--state-warning)";
  if (state === "critical") return "var(--state-critical)";
  return "var(--bjhunt-text-muted)";
}

function statusDotState(s: Scan["status"]): "success" | "warning" | "critical" | "neutral" {
  if (s === "complete") return "success";
  if (s === "scanning") return "warning";
  if (s === "error") return "critical";
  return "neutral";
}

function statusColor(s: Scan["status"]): string {
  if (s === "complete") return "var(--state-success)";
  if (s === "scanning") return "var(--state-warning)";
  if (s === "error") return "var(--state-critical)";
  return "var(--bjhunt-text-muted)";
}

function statusLabel(s: Scan["status"]): string {
  if (s === "complete") return "Terminé";
  if (s === "scanning") return "En cours";
  if (s === "queued") return "En attente";
  return "Erreur";
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
