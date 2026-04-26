"use client";

import { useState, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { browserBackendFetch } from "@/lib/backend-client";
import { LogoSymbol, LogoWordmark } from "@/components/ui/logo";
import {
  MessageSquare,
  BarChart2,
  Users,
  Network,
  ScrollText,
  Activity,
  Bot,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  BookOpen,
  Cloud,
  Database,
  Terminal,
  HelpCircle,
  CreditCard,
} from "lucide-react";
import { PlanBadge } from "@/components/dashboard/plan-badge";

const COLLAPSE_KEY = "bjhunt:sidebar-collapsed";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "pro" | "enterprise";
}

interface DashboardShellProps {
  user: {
    displayName: string;
    email: string;
    role: string;
  };
  locale: string;
  children: React.ReactNode;
}

const getUserNav = (locale: string): NavItem[] => [
  { href: "/dashboard/chat",          label: "Chat AI",                                          icon: MessageSquare },
  { href: "/dashboard",               label: locale === "fr" ? "Aperçu" : "Overview",            icon: BarChart2     },
  { href: "/dashboard/audits",        label: "Scans",                                            icon: ShieldCheck   },
  { href: "/dashboard/findings",     label: "Findings",                                         icon: AlertTriangle },
  { href: "/dashboard/cve",          label: "CVE Intel",                                        icon: ShieldAlert,  badge: "pro"        },
  { href: "/dashboard/skills",       label: "Skills",                                           icon: BookOpen,     badge: "pro"        },
  { href: "/dashboard/tools",        label: "Tools",                                            icon: Terminal,     badge: "enterprise" },
  { href: "/dashboard/guide",        label: "Guide",                                            icon: HelpCircle    },
  { href: "/dashboard/billing",      label: locale === "fr" ? "Facturation" : "Billing",        icon: CreditCard    },
  { href: "/dashboard/settings",      label: locale === "fr" ? "Paramètres" : "Settings",        icon: Settings      },
];

const getWorkflowNav = (): NavItem[] => [
  { href: "/dashboard/cloud", label: "Cloud",  icon: Cloud,    badge: "enterprise" },
  { href: "/dashboard/ad",    label: "AD",     icon: Database, badge: "enterprise" },
];

const getAdminNav = (locale: string) => [
  { href: "/dashboard/admin/users",      label: locale === "fr" ? "Utilisateurs" : "Users",  icon: Users      },
  { href: "/dashboard/admin/agents",     label: "Agents",                                     icon: Bot        },
  { href: "/dashboard/admin/gateway",    label: "LLM Gateway",                                icon: Network    },
  { href: "/dashboard/admin/logs",       label: "Logs",                                       icon: ScrollText },
  { href: "/dashboard/admin/monitoring", label: "Monitoring",                                 icon: Activity   },
  { href: "/dashboard/admin/settings",   label: locale === "fr" ? "Paramètres" : "Settings", icon: Settings   },
];

export function DashboardShell({ user, locale, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isAdmin = user.role === "platform_admin";
  const userNav = getUserNav(locale);
  const workflowNav = getWorkflowNav();
  const adminNav = getAdminNav(locale);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const isActive = (href: string) => {
    const localelessPath = pathname.replace(/^\/(fr|en)/, "") || "/";
    if (href === "/dashboard") {
      return localelessPath === "/dashboard";
    }
    return localelessPath.startsWith(href);
  };

  const w = collapsed ? 56 : 232;

  // W8: glass-on-dark sidebar — hairline right border, eyebrow section labels
  // (JetBrains Mono 9px 0.28em tracking), nav items in font-weight 300, active
  // state via 2px left accent bar (no filled background) per W8 design system.
  const navItemClass = (active: boolean) =>
    `relative flex items-center gap-3 px-3 py-2 text-[11px] uppercase transition-colors`
    + ` ` + (active
      ? "text-[var(--bjhunt-text)]"
      : "text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)]");
  const navItemStyle: React.CSSProperties = {
    fontFamily: "var(--bjhunt-font-mono)",
    letterSpacing: "0.18em",
    fontWeight: 300,
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bjhunt-bg)" }}
    >
      {/* Sidebar — W8 glass surface */}
      <aside
        className="flex flex-col flex-shrink-0 transition-[width] duration-200"
        style={{
          width: w,
          background: "linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.003))",
          borderRight: "1px solid var(--bjhunt-border)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center px-4 flex-shrink-0"
          style={{ height: 64, borderBottom: "1px solid var(--bjhunt-border)" }}
        >
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 min-w-0">
            <LogoSymbol size={22} className="flex-shrink-0" />
            {!collapsed && <LogoWordmark className="text-[13px] truncate" />}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-col flex-1 overflow-y-auto py-4 px-2 gap-px">
          {userNav.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={`/${locale}${href}`}
                title={collapsed ? label : undefined}
                className={navItemClass(active)}
                style={navItemStyle}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5"
                    style={{ background: "var(--bjhunt-brand-primary)" }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate">{label}</span>
                    {badge && <PlanBadge requiredPlan={badge} />}
                  </>
                )}
              </Link>
            );
          })}

          {/* Workflows section eyebrow */}
          {!collapsed ? (
            <div
              className="px-3 pt-6 pb-2 mt-3"
              style={{ borderTop: "1px solid var(--bjhunt-border)" }}
            >
              <span
                style={{
                  fontFamily: "var(--bjhunt-font-mono)",
                  fontSize: 9,
                  color: "var(--bjhunt-text-disabled)",
                  textTransform: "uppercase",
                  letterSpacing: "0.28em",
                  fontWeight: 400,
                }}
              >
                Workflows
              </span>
            </div>
          ) : (
            <div
              className="my-3 mx-2"
              style={{ borderTop: "1px solid var(--bjhunt-border)" }}
            />
          )}
          {workflowNav.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={`/${locale}${href}`}
                title={collapsed ? label : undefined}
                className={navItemClass(active)}
                style={navItemStyle}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5"
                    style={{ background: "var(--bjhunt-brand-primary)" }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate">{label}</span>
                    {badge && <PlanBadge requiredPlan={badge} />}
                  </>
                )}
              </Link>
            );
          })}

          {/* Admin section eyebrow */}
          {isAdmin && (
            <>
              {!collapsed ? (
                <div
                  className="px-3 pt-6 pb-2 mt-3"
                  style={{ borderTop: "1px solid var(--bjhunt-border)" }}
                >
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 9,
                      color: "var(--bjhunt-text-disabled)",
                      textTransform: "uppercase",
                      letterSpacing: "0.28em",
                      fontWeight: 400,
                    }}
                  >
                    Admin
                  </span>
                </div>
              ) : (
                <div
                  className="my-3 mx-2"
                  style={{ borderTop: "1px solid var(--bjhunt-border)" }}
                />
              )}
              {adminNav.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={`/${locale}${href}`}
                    title={collapsed ? label : undefined}
                    className={navItemClass(active)}
                    style={navItemStyle}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5"
                        style={{ background: "var(--bjhunt-brand-primary)" }}
                      />
                    )}
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User zone — W8 hairline divider, glass treatment */}
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--bjhunt-border)" }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 mb-3 min-w-0">
              <div
                className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                style={{
                  border: "1px solid var(--bjhunt-border-strong)",
                  fontFamily: "var(--bjhunt-font-mono)",
                  fontSize: 10,
                  color: "var(--bjhunt-text)",
                  fontWeight: 400,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {(user.displayName || user.email)[0]}
              </div>
              <div className="min-w-0">
                <div
                  className="truncate"
                  style={{
                    fontSize: 11,
                    fontWeight: 300,
                    color: "var(--bjhunt-text)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {user.displayName || user.email}
                </div>
                <div
                  className="truncate"
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 9,
                    color: "var(--bjhunt-text-subtle)",
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                  }}
                >
                  {isAdmin ? "Platform Admin" : "User"}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              title={locale === "fr" ? "Déconnexion" : "Sign out"}
              onClick={async () => {
                try {
                  const res = await browserBackendFetch('/api/auth/logout', { method: 'POST' });
                  if (!res.ok) throw new Error('LOGOUT_FAILED');
                } catch {
                  // best-effort — redirect regardless
                }
                startTransition(() => {
                  router.push(`/${locale}/login`);
                });
              }}
              className="flex items-center gap-2 transition-colors disabled:opacity-60"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--bjhunt-text-muted)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--bjhunt-severity-critical)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--bjhunt-text-muted)"; }}
            >
              <LogOut className="w-3 h-3 flex-shrink-0" />
              {!collapsed && <span>{locale === "fr" ? "Déconnexion" : "Sign out"}</span>}
            </button>
            <button
              onClick={toggleCollapse}
              className="ml-auto p-1 transition-colors"
              style={{ color: "var(--bjhunt-text-subtle)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--bjhunt-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--bjhunt-text-subtle)"; }}
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main — radial ambient backdrop for W8 glass treatment. Pointer-events
          disabled on the gradient layer; children render above it via z-index. */}
      <main className="flex-1 overflow-y-auto min-w-0 relative">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0"
          style={{
            zIndex: 0,
            background:
              "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(99,102,241,0.06), transparent 50%),"
              + "radial-gradient(ellipse 50% 40% at 90% 20%, rgba(220,38,38,0.03), transparent 50%),"
              + "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(99,102,241,0.025), transparent 50%)",
          }}
        />
        <div className="relative" style={{ zIndex: 1 }}>
          {/* DASH-P2: breadcrumbs derived from pathname segments. Hidden on
              /dashboard (root) and on /dashboard/chat (chat owns its own
              top bar). Each segment links back to its accumulated path so
              the user can step up the tree without using the browser back
              button. */}
          <Breadcrumbs pathname={pathname} locale={locale} />
          {children}
        </div>
      </main>
    </div>
  );
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  audits: "Audits",
  ad: "Active Directory",
  cloud: "Cloud",
  web: "Web",
  findings: "Findings",
  cve: "CVE",
  chat: "Chat",
  reports: "Reports",
  skills: "Skills",
  guide: "Guide",
  billing: "Billing",
  security: "Security",
  settings: "Settings",
  "api-keys": "API Keys",
  notifications: "Notifications",
  admin: "Admin",
  users: "Users",
  agents: "Agents",
  gateway: "Gateway",
  logs: "Logs",
  monitoring: "Monitoring",
  tools: "Tools",
};

function Breadcrumbs({ pathname, locale }: { pathname: string; locale: string }) {
  const stripped = pathname.replace(/^\/(fr|en)/, "");
  const segments = stripped.split("/").filter(Boolean);
  // Hide on the dashboard root + chat (chat has its own header chrome)
  if (segments.length <= 1 || (segments.length === 2 && segments[1] === "chat")) {
    return null;
  }
  const crumbs = segments.map((seg, idx) => {
    const href = `/${locale}/${segments.slice(0, idx + 1).join("/")}`;
    const label =
      SEGMENT_LABELS[seg] ??
      // UUID-ish segments collapse to "…"
      (/^[0-9a-f-]{8,}$/i.test(seg) ? "…" : seg);
    return { href, label, isLast: idx === segments.length - 1 };
  });
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 px-8 py-4"
      style={{
        borderBottom: "1px solid var(--bjhunt-border)",
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: 10,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: "var(--bjhunt-text-muted)",
        fontWeight: 400,
      }}
    >
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-2">
          {c.isLast ? (
            <span style={{ color: "var(--bjhunt-text)" }}>{c.label}</span>
          ) : (
            <Link
              href={c.href}
              className="transition-colors"
              style={{ color: "var(--bjhunt-text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--bjhunt-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--bjhunt-text-muted)"; }}
            >
              {c.label}
            </Link>
          )}
          {i < crumbs.length - 1 && (
            <span style={{ color: "var(--bjhunt-text-disabled)" }}>/</span>
          )}
        </span>
      ))}
    </nav>
  );
}
