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

  const w = collapsed ? 56 : 220;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Sidebar */}
      <aside
        className="flex flex-col bg-[var(--bg-input)] border-r border-[var(--border)] flex-shrink-0 transition-[width] duration-200"
        style={{ width: w }}
      >
        {/* Logo */}
        <div className="flex items-center px-3.5 border-b border-[var(--border)] flex-shrink-0" style={{ height: 56 }}>
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 min-w-0">
            <LogoSymbol size={22} className="flex-shrink-0" />
            {!collapsed && <LogoWordmark className="text-[13px] truncate" />}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-col flex-1 overflow-y-auto py-3 px-2 gap-0.5">
          {userNav.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href);
            const navClass = `relative flex items-center gap-3 px-2.5 py-2 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors ${
              active
                ? "text-white bg-[var(--bg-card)]"
                : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)]/50"
            }`;
            return (
              <Link key={href} href={`/${locale}${href}`} title={collapsed ? label : undefined} className={navClass}>
                {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--bjhunt-brand-primary)]" />}
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

          {/* Workflows section */}
          {!collapsed && (
            <div className="px-2.5 pt-4 pb-1 border-t border-[var(--border)] mt-2">
              <span className="text-[8px] font-mono text-[var(--text-subtle)] uppercase tracking-[0.2em]">
                Workflows
              </span>
            </div>
          )}
          {collapsed && <div className="my-2 mx-2 border-t border-[var(--border)]" />}
          {workflowNav.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={`/${locale}${href}`}
                title={collapsed ? label : undefined}
                className={`relative flex items-center gap-3 px-2.5 py-2 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? "text-white bg-[var(--bg-card)]"
                    : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)]/50"
                }`}
              >
                {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--bjhunt-brand-primary)]" />}
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

          {/* Admin section */}
          {isAdmin && (
            <>
              {!collapsed && (
                <div className="px-2.5 pt-4 pb-1 border-t border-[var(--border)] mt-2">
                  <span className="text-[8px] font-mono text-[var(--text-subtle)] uppercase tracking-[0.2em]">
                    Admin
                  </span>
                </div>
              )}
              {collapsed && <div className="my-2 mx-2 border-t border-[var(--border)]" />}
              {adminNav.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={`/${locale}${href}`}
                    title={collapsed ? label : undefined}
                    className={`relative flex items-center gap-3 px-2.5 py-2 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors ${
                      active
                        ? "text-white bg-[var(--bg-card)]"
                        : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)]/50"
                    }`}
                  >
                    {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--bjhunt-brand-primary)]" />}
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User zone */}
        <div className="border-t border-[var(--border)] p-3 flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <div className="w-6 h-6 bg-[var(--border-strong)] flex items-center justify-center text-[9px] font-bold uppercase flex-shrink-0">
                {(user.displayName || user.email)[0]}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-white font-mono truncate">{user.displayName || user.email}</div>
                {user.displayName && (
                  <div className="text-[8px] text-[var(--text-subtle)] font-mono truncate">{user.email}</div>
                )}
                <div className="text-[8px] text-[var(--text-subtle)] uppercase tracking-widest truncate">
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
              className="flex items-center gap-2 text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--danger)] uppercase tracking-[0.1em] transition-colors disabled:opacity-60"
            >
              <LogOut className="w-3 h-3 flex-shrink-0" />
              {!collapsed && <span>{locale === "fr" ? "Déconnexion" : "Sign out"}</span>}
            </button>
            <button
              onClick={toggleCollapse}
              className="ml-auto p-1 text-[var(--text-subtle)] hover:text-white transition-colors"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
