// app/[locale]/dashboard/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { serverBackendFetch } from "@/lib/backend-client";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/dashboard/bar-chart";

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

const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Auth guard is handled by dashboard/layout.tsx — cookie is guaranteed here.
  const cookieHeader = (await headers()).get("cookie") ?? "";

  const meResponse = await serverBackendFetch("/api/auth/me", {}, cookieHeader);
  if (!meResponse.ok) redirect(`/${locale}/login`);

  const mePayload = (await meResponse.json()) as AuthPayload;

  const isAdmin = mePayload.user.role === "platform_admin";

  // Admin-only: fetch overview + health in parallel
  let cpData: Record<string, unknown> = {}
  let healthData: { ready?: boolean; checks?: Record<string, boolean> } = {}
  if (isAdmin) {
    const [usersRes, logsRes, healthRes, adminStatsRes] = await Promise.all([
      serverBackendFetch('/api/admin/users?limit=1', {}, cookieHeader),
      serverBackendFetch('/api/admin/settings/audit-logs?limit=5', {}, cookieHeader),
      serverBackendFetch('/api/health/ready', {}, cookieHeader),
      serverBackendFetch('/api/admin/settings/stats', {}, cookieHeader),
    ])

    // Admin stats (plan distribution, revenue, scans, findings)
    let adminStats: Record<string, any> = {}
    if (adminStatsRes.ok) {
      adminStats = await adminStatsRes.json()
    }

    if (usersRes.ok) {
      const ud = await usersRes.json() as { total?: number }
      cpData.counts = {
        users: ud.total ?? 0,
        activeSessions: adminStats.activeAgentRuns ?? 0,
        usersOnline: 0,
        auditLogs24h: adminStats.totalFindings ?? 0,
        totalScans: adminStats.totalScans ?? 0,
        totalRevenue: adminStats.totalRevenue ?? 0,
      }
      cpData.planDistribution = adminStats.planDistribution ?? {}
    }
    if (logsRes.ok) {
      const ld = await logsRes.json() as { logs?: Array<Record<string, unknown>>; total?: number }
      cpData.recentLogs = ld.logs ?? []
    }
    if (healthRes.ok) {
      const hd = await healthRes.json() as { status?: string; checks?: Record<string, any> }
      healthData = {
        ready: hd.status === 'ready',
        checks: Object.fromEntries(
          Object.entries(hd.checks ?? {}).map(([k, v]: [string, any]) => [k, v?.status === 'connected'])
        ),
      }
    }
  }

  // Fetch recent engagements (replaces /api/scans)
  // Also fetch health in parallel (reuse admin healthRes if available)
  let scans: Scan[] = [];
  const engRes = await serverBackendFetch("/api/engagements?limit=10", {}, cookieHeader);
  if (engRes.ok) {
    const body = (await engRes.json()) as { engagements?: Array<Record<string, unknown>> };
    scans = (body.engagements ?? []).map((e: any) => ({
      id: e.id,
      target: e.target || e.name,
      status: e.status === "running" ? "scanning" as const : e.status === "completed" ? "complete" as const : e.status === "draft" ? "queued" as const : "error" as const,
      result: e.status === "completed" ? "Done" : undefined,
      duration: e.completedAt && e.startedAt ? `${Math.round((new Date(e.completedAt).getTime() - new Date(e.startedAt).getTime()) / 1000)}s` : undefined,
      createdAt: e.createdAt,
    }));
  }

  const hasScans = scans.length > 0;

  // Reuse admin health fetch if already done; otherwise fetch once
  const healthOk = isAdmin ? healthData.ready === true : (await serverBackendFetch("/api/health/ready", {}, cookieHeader)).ok;

  // Fetch billing plan + usage from dedicated billing endpoints, plus dashboard stats
  const [statsRes, billingPlanRes, billingUsageRes] = await Promise.all([
    serverBackendFetch('/api/dashboard/stats', {}, cookieHeader),
    serverBackendFetch('/api/billing/plan', {}, cookieHeader),
    serverBackendFetch('/api/billing/usage', {}, cookieHeader),
  ]);

  // Parse billing data
  type BillingPlan = { plan: string; displayName: string; orgName: string; limits: { engagements: number; tokensPerMonth: number; agents: string[] } };
  type BillingUsage = { plan: string; limits: { engagements: number; tokensPerMonth: number; agents: string[] }; usage: { engagements: number; tokensUsed: number; findings: number }; percentages: { engagements: number; tokens: number } };

  let billingPlan: BillingPlan | null = null;
  let billingUsage: BillingUsage | null = null;
  if (billingPlanRes.ok) billingPlan = await billingPlanRes.json() as BillingPlan;
  if (billingUsageRes.ok) billingUsage = await billingUsageRes.json() as BillingUsage;

  // Dashboard stats — fetch from backend, fallback to local computation
  let stats: DashboardStats;
  if (statsRes.ok) {
    const sd = await statsRes.json() as DashboardStats;
    stats = {
      health: sd.health ?? { status: healthOk ? 'operational' : 'down', latencyMs: 0 },
      tokens: sd.tokens ?? {
        used: billingUsage?.usage.tokensUsed ?? 0,
        limit: billingPlan?.limits.tokensPerMonth ?? 2_000_000,
      },
      scans: sd.scans ?? { total: scans.length, perDay: [0, 0, 0, 0, 0, 0, scans.length], severity: { critical: 0, high: 0, medium: 0, low: 0 } },
      plan: sd.plan ?? {
        slug: billingPlan?.plan ?? 'free',
        displayName: billingPlan?.displayName ?? 'Free',
        scansLimit: billingPlan?.limits.engagements ?? 5,
      },
    };
  } else {
    stats = {
      health: { status: healthOk ? 'operational' : 'down', latencyMs: 0 },
      tokens: {
        used: billingUsage?.usage.tokensUsed ?? 0,
        limit: billingPlan?.limits.tokensPerMonth ?? 2_000_000,
      },
      scans: { total: scans.length, perDay: [0, 0, 0, 0, 0, 0, scans.length], severity: { critical: 0, high: 0, medium: 0, low: 0 } },
      plan: {
        slug: billingPlan?.plan ?? 'free',
        displayName: billingPlan?.displayName ?? 'Free',
        scansLimit: billingPlan?.limits.engagements ?? 5,
      },
    };
  }

  const name = mePayload.user.displayName || mePayload.user.email.split("@")[0] || "vous";
  const healthStatus = stats?.health.status ?? 'operational';
  const latencyMs = stats?.health.latencyMs ?? 0;
  const tokensUsed = stats?.tokens.used ?? 0;
  const tokensLimit = stats?.tokens.limit ?? 2_000_000;
  const tokensUsedPct = tokensLimit > 0 ? Math.round((tokensUsed / tokensLimit) * 100) : 0;
  const totalScans = stats?.scans.total ?? 0;
  const scansPerDay = stats?.scans.perDay ?? [0, 0, 0, 0, 0, 0, 0];
  const severity = stats?.scans.severity ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const planDisplayName = stats?.plan.displayName ?? mePayload.user.plan ?? "Free";
  const planScansLimit = stats?.plan.scansLimit ?? 5;
  const planSlug = stats?.plan.slug ?? "free";

  const adminCounts = (cpData.counts ?? {}) as Record<string, number>
  const recentLogs = (cpData.recentLogs ?? []) as Array<{ id: string; action: string; createdAt: string; actorUserId: string | null }>
  const healthChecks = healthData.checks ?? {}

  const STATUS_ICONS: Record<string, string> = {
    complete: "✓",
    scanning: "⟳",
    queued:   "◷",
    error:    "✗",
  };
  const STATUS_COLORS: Record<string, string> = {
    complete: "text-[var(--success)]",
    scanning: "text-[var(--warning)]",
    queued:   "text-[var(--text-muted)]",
    error:    "text-[var(--danger)]",
  };

  const severityBars = [
    { label: "CRITIQUE", count: severity.critical, color: "var(--bjhunt-severity-critical)" },
    { label: "HAUTE",    count: severity.high,     color: "var(--bjhunt-severity-high)" },
    { label: "MOYENNE",  count: severity.medium,   color: "var(--bjhunt-severity-medium)" },
    { label: "FAIBLE",   count: severity.low,      color: "var(--bjhunt-severity-low)" },
  ];
  const maxSeverity = Math.max(...severityBars.map((s) => s.count), 1);

  return (
    <div className="px-8 py-12 md:px-16 md:py-20 max-w-[1400px] mx-auto">
      {/* Admin overview — only shown for platform_admin. W8 glass surfaces. */}
      {isAdmin && (
        <div className="mb-20">
          <div
            className="mb-6"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 10,
              color: "var(--bjhunt-text-subtle)",
              textTransform: "uppercase",
              letterSpacing: "0.32em",
            }}
          >
            Platform · Overview
          </div>
          {/* Stat cards — glass surface, hairline grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-8" style={{ background: "var(--bjhunt-border)" }}>
            {[
              { label: 'Utilisateurs',     value: adminCounts.users ?? 0 },
              { label: 'Scans ce mois',    value: adminCounts.totalScans ?? 0 },
              { label: 'Findings',         value: adminCounts.auditLogs24h ?? 0 },
              { label: 'Revenue',          value: `$${adminCounts.totalRevenue ?? 0}` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-7"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.003))",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 200,
                    letterSpacing: "-0.02em",
                    color: "var(--bjhunt-text)",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  className="mt-3"
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 9,
                    color: "var(--bjhunt-text-subtle)",
                    textTransform: "uppercase",
                    letterSpacing: "0.24em",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Service health mini-badges */}
          {Object.keys(healthChecks).length > 0 && (
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4 mb-6">
              <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">Services</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(healthChecks) as [string, boolean][]).map(([svc, ok]) => (
                  <span
                    key={svc}
                    className="flex items-center gap-1.5 px-2 py-1 text-[8px] font-mono uppercase"
                    style={{ border: `1px solid ${ok ? 'var(--success)' : 'var(--danger)'}`, color: ok ? 'var(--success)' : 'var(--danger)' }}
                  >
                    <span className="w-1.5 h-1.5 inline-block" style={{ background: ok ? 'var(--success)' : 'var(--danger)' }} />
                    {svc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Last 5 audit logs */}
          {recentLogs.length > 0 && (
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">Dernières activités</p>
                <Link href={`/${locale}/dashboard/admin/logs`} className="text-[8px] font-mono text-[var(--text-muted)] hover:text-white transition-colors">
                  Voir tous →
                </Link>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {recentLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex justify-between py-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{log.action}</span>
                    <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hero — W8 pattern: eyebrow + h1 weight 200 + lede + meta panel */}
      <header className="mb-20 grid lg:grid-cols-[1fr_360px] gap-16 items-end">
        <div>
          <p
            className="mb-8"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 10,
              color: "var(--bjhunt-text-subtle)",
              textTransform: "uppercase",
              letterSpacing: "0.32em",
              fontWeight: 400,
            }}
          >
            Dashboard · BJHUNT ALPHA 1.0
          </p>
          <h1
            style={{
              fontSize: "clamp(56px, 8vw, 96px)",
              fontWeight: 200,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              margin: 0,
              color: "var(--bjhunt-text)",
            }}
          >
            Bonjour,{" "}
            <em
              style={{
                fontStyle: "normal",
                color: "var(--bjhunt-text-muted)",
                fontWeight: 200,
              }}
            >
              {name}.
            </em>
          </h1>
          <p
            className="mt-8"
            style={{
              color: "var(--bjhunt-text-muted)",
              fontSize: 17,
              lineHeight: 1.6,
              maxWidth: 640,
              fontWeight: 300,
              margin: "32px 0 0",
            }}
          >
            Vue d'ensemble de vos engagements offensifs. Lancez un scan, suivez les findings, exportez les rapports — la chaîne d'agents s'occupe du reste.
          </p>
          <div className="mt-10 flex items-center gap-4 flex-wrap">
            <Button asChild>
              <Link href="/dashboard/chat">Nouveau scan →</Link>
            </Button>
            <Link
              href="/dashboard/audits"
              className="transition-colors"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--bjhunt-text-muted)",
                padding: "10px 16px",
                border: "1px solid var(--bjhunt-border-strong)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              Voir les scans →
            </Link>
          </div>
        </div>
        {/* Meta panel — glass surface mirrors W8 hero-meta */}
        <div
          className="flex flex-col gap-4 px-7 py-6"
          style={{
            border: "1px solid var(--bjhunt-border)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.003))",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {[
            { lbl: "Status", val: (
              <span style={{
                color:
                  healthStatus === "operational" ? "var(--bjhunt-severity-low)"
                  : healthStatus === "degraded" ? "var(--bjhunt-severity-medium)"
                  : "var(--bjhunt-severity-critical)"
              }}>
                {healthStatus === "operational" ? "● Operational" : healthStatus === "degraded" ? "● Degraded" : "● Offline"}
              </span>
            ) },
            { lbl: "Plan", val: planDisplayName },
            { lbl: "Latency", val: latencyMs > 0 ? `${latencyMs}ms` : "—" },
            { lbl: "Scans", val: String(totalScans) },
            { lbl: "Tokens", val: `${(tokensUsed / 1_000_000).toFixed(1)}M / ${(tokensLimit / 1_000_000).toFixed(0)}M` },
            { lbl: "Engine", val: "GLM-5.1" },
          ].map((row, idx, arr) => (
            <div
              key={row.lbl}
              className="flex justify-between items-baseline"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 10,
                letterSpacing: "0.15em",
                paddingBottom: idx === arr.length - 1 ? 0 : 14,
                borderBottom: idx === arr.length - 1 ? "none" : "1px solid var(--bjhunt-border)",
              }}
            >
              <span style={{
                color: "var(--bjhunt-text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.24em",
                fontSize: 9,
              }}>{row.lbl}</span>
              <span style={{ color: "var(--bjhunt-text)", fontVariantNumeric: "tabular-nums" }}>
                {row.val}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Métriques clés — KPI glass cards (W8) */}
      <p
        className="mb-5"
        style={{
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: 10,
          color: "var(--bjhunt-text-subtle)",
          textTransform: "uppercase",
          letterSpacing: "0.32em",
        }}
      >
        Métriques · Ce mois
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-12" style={{ background: "var(--bjhunt-border)" }}>
        {[
          { label: "Scans ce mois",      value: String(totalScans),                                  color: "var(--bjhunt-text)" },
          { label: "Critiques detectes", value: String(severity.critical),                           color: severity.critical > 0 ? "var(--bjhunt-severity-critical)" : "var(--bjhunt-severity-low)" },
          { label: "Haute severite",     value: String(severity.high),                               color: severity.high > 0 ? "var(--bjhunt-severity-high)" : "var(--bjhunt-severity-low)" },
          { label: "Temps moyen",        value: latencyMs > 0 ? `${(latencyMs / 1000).toFixed(1)}s` : "—", color: "var(--bjhunt-text)" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="p-7"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.003))",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 200,
                letterSpacing: "-0.02em",
                color,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {value}
            </div>
            <div
              className="mt-3"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 9,
                color: "var(--bjhunt-text-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.24em",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Statut IA */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">BJHUNT AI</p>
            <div className="flex items-center gap-4 text-[11px] font-mono text-white">
              <span>Latence : {latencyMs}ms</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span>Tokens : {(tokensUsed / 1_000_000).toFixed(1)}M / {(tokensLimit / 1_000_000).toFixed(0)}M</span>
            </div>
          </div>
        </div>
        {/* Token progress */}
        <div className="mb-4">
          <div className="flex justify-between text-[9px] font-mono text-[var(--text-muted)] mb-1">
            <span>Quota tokens</span>
            <span>{tokensUsedPct}%</span>
          </div>
          <div className="h-1 bg-[var(--border)] w-full">
            <div
              className="h-full bg-[var(--success)] transition-all"
              style={{ width: `${tokensUsedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Usage charts */}
      <div className="grid md:grid-cols-2 gap-px bg-[var(--border)] mb-6">
        {/* Scans par jour */}
        <div className="bg-[var(--bg-card)] p-6">
          <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">
            Scans / jour (7 derniers jours)
          </p>
          <BarChart data={scansPerDay} labels={[...WEEK_LABELS]} height={56} />
          <div className="flex justify-between mt-2">
            {WEEK_LABELS.map((d, i) => (
              <span key={i} className="text-[8px] font-mono text-[var(--text-subtle)] flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>
        {/* Répartition sévérités */}
        <div className="bg-[var(--bg-card)] p-6">
          <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">
            Répartition sévérités
          </p>
          <div className="space-y-3">
            {severityBars.map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[8px] font-mono text-[var(--text-subtle)] w-16 uppercase tracking-widest">{label}</span>
                <div className="flex-1 h-1.5 bg-[var(--border)]">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(count / maxSeverity) * 100}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono w-4 text-right" style={{ color }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Abonnement</p>
            <div className="text-xl font-black">{planDisplayName}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
              {billingPlan?.limits.agents?.length ?? 3} agents disponibles
            </div>

            {/* Engagements usage */}
            {(() => {
              const engLimit = billingUsage?.limits.engagements ?? planScansLimit;
              const engUsed = billingUsage?.usage.engagements ?? totalScans;
              const engPct = billingUsage?.percentages.engagements ?? (engLimit > 0 ? Math.round((engUsed / engLimit) * 100) : 0);
              return engLimit === -1 ? (
                <div className="mt-3 text-[10px] font-mono text-[var(--text-muted)]">
                  {engUsed} engagements ce mois (illimites)
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] mb-1">
                    <span>Engagements</span>
                    <span>{engUsed} / {engLimit}</span>
                  </div>
                  <div className="h-1 bg-[var(--border)] w-full">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(engPct, 100)}%`,
                        background: engPct >= 90 ? 'var(--danger)' : engPct >= 70 ? 'var(--warning)' : 'var(--success)',
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Tokens usage */}
            {(() => {
              const tokLimit = billingUsage?.limits.tokensPerMonth ?? tokensLimit;
              const tokUsed = billingUsage?.usage.tokensUsed ?? tokensUsed;
              const tokPct = billingUsage?.percentages.tokens ?? tokensUsedPct;
              return tokLimit === -1 ? (
                <div className="mt-2 text-[10px] font-mono text-[var(--text-muted)]">
                  {(tokUsed / 1_000_000).toFixed(1)}M tokens utilises (illimites)
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] mb-1">
                    <span>Tokens</span>
                    <span>{(tokUsed / 1_000_000).toFixed(1)}M / {(tokLimit / 1_000_000).toFixed(0)}M</span>
                  </div>
                  <div className="h-1 bg-[var(--border)] w-full">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(tokPct, 100)}%`,
                        background: tokPct >= 90 ? 'var(--danger)' : tokPct >= 70 ? 'var(--warning)' : 'var(--success)',
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Findings count */}
            {billingUsage && (
              <div className="mt-2 text-[10px] font-mono text-[var(--text-muted)]">
                {billingUsage.usage.findings} findings ce mois
              </div>
            )}
          </div>
          {planSlug === 'free' && (
            <Button asChild variant="secondary">
              <Link href="/pricing">Passer a Pro →</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Scans recents */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">
          Scans recents
        </p>
        {hasScans ? (
          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            <div className="grid grid-cols-4 bg-[var(--bg-card)] px-4 py-2">
              {["TARGET", "STATUS", "RESULTAT", "DUREE"].map((h) => (
                <span key={h} className="text-[8px] font-mono text-[var(--text-subtle)] uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {scans.map((scan) => (
              <div key={scan.id} className="grid grid-cols-4 px-4 py-3 hover:bg-[var(--bg-card)]/50 transition-colors">
                <span className="text-[11px] font-mono text-white truncate">{scan.target}</span>
                <span className={`text-[11px] font-mono ${STATUS_COLORS[scan.status] ?? "text-[var(--text-muted)]"}`}>
                  {STATUS_ICONS[scan.status]} {scan.status === "scanning" && scan.progress != null ? `${scan.progress}%` : ""}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)] truncate">{scan.result ?? "—"}</span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">{scan.duration ?? "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
            <p className="text-[11px] font-mono text-[var(--text-muted)] mb-4">
              Aucun scan pour le moment.
            </p>
            <Button asChild>
              {/* DASH-P2: use next-intl Link for client-side nav + locale
                  preservation instead of a raw <a> that triggers a full
                  page reload. */}
              <Link href="/dashboard/chat">Lancer votre premier scan →</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
