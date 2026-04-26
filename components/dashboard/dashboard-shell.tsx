"use client";

/**
 * Dashboard shell — refonte 2026 / B4.
 *
 * Responsive sidebar architecture (per DESIGN-SYSTEM-2026.md §6):
 *   - <md  : drawer overlay w-[280px] + backdrop, hamburger in top bar
 *   - md/lg: persistent collapsed icons-only w-14 (tooltip on hover)
 *   - xl+  : persistent expanded w-60 (240px)
 *
 * Visual:
 *   - Canvas bg only (no surface gradient, no ambient radial — flat)
 *   - 1px hairline borders (warm charcoal var(--bjhunt-border))
 *   - Active nav item: 2px white left bar, NO fill, pure CSS hover
 *   - Top bar 56 mobile / 64 desktop with breadcrumbs + Cmd-K trigger
 *
 * Logic preservation:
 *   - props (user, locale) pattern unchanged — DashboardLayout calls /api/auth/me
 *   - signOut via browserBackendFetch('/api/auth/logout')
 *   - role check ('platform_admin')
 *   - locale-prefixed Link hrefs
 *   - Breadcrumbs hidden on /dashboard root + /dashboard/chat
 */

import { useState, useEffect, useTransition, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
  Menu,
  X,
  Search,
} from "lucide-react";
import { browserBackendFetch } from "@/lib/backend-client";
import { LogoSymbol, LogoWordmark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eyebrow, Body, Micro } from "@/components/ui/typography";
import { PlanBadge } from "@/components/dashboard/plan-badge";

/* ──────────────────────────────────────────────────────── */
/*  Nav data                                                */
/* ──────────────────────────────────────────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "pro" | "enterprise";
}

const getUserNav = (locale: string): NavItem[] => [
  { href: "/dashboard/chat",     label: "Chat AI",                                          icon: MessageSquare },
  { href: "/dashboard",          label: locale === "fr" ? "Aperçu" : "Overview",            icon: BarChart2     },
  { href: "/dashboard/audits",   label: "Scans",                                            icon: ShieldCheck   },
  { href: "/dashboard/findings", label: "Findings",                                         icon: AlertTriangle },
  { href: "/dashboard/cve",      label: "CVE Intel",                                        icon: ShieldAlert,  badge: "pro"        },
  { href: "/dashboard/skills",   label: "Skills",                                           icon: BookOpen,     badge: "pro"        },
  { href: "/dashboard/tools",    label: "Tools",                                            icon: Terminal,     badge: "enterprise" },
  { href: "/dashboard/guide",    label: "Guide",                                            icon: HelpCircle    },
  { href: "/dashboard/billing",  label: locale === "fr" ? "Facturation" : "Billing",        icon: CreditCard    },
  { href: "/dashboard/settings", label: locale === "fr" ? "Paramètres" : "Settings",        icon: Settings      },
];

const getWorkflowNav = (): NavItem[] => [
  { href: "/dashboard/cloud", label: "Cloud", icon: Cloud,    badge: "enterprise" },
  { href: "/dashboard/ad",    label: "AD",    icon: Database, badge: "enterprise" },
];

const getAdminNav = (locale: string): NavItem[] => [
  { href: "/dashboard/admin/users",      label: locale === "fr" ? "Utilisateurs" : "Users",  icon: Users      },
  { href: "/dashboard/admin/agents",     label: "Agents",                                     icon: Bot        },
  { href: "/dashboard/admin/gateway",    label: "LLM Gateway",                                icon: Network    },
  { href: "/dashboard/admin/logs",       label: "Logs",                                       icon: ScrollText },
  { href: "/dashboard/admin/monitoring", label: "Monitoring",                                 icon: Activity   },
  { href: "/dashboard/admin/settings",   label: locale === "fr" ? "Paramètres" : "Settings", icon: Settings   },
];

/* ──────────────────────────────────────────────────────── */
/*  useMediaQuery — viewport-driven sidebar mode            */
/* ──────────────────────────────────────────────────────── */

type SidebarMode = "drawer" | "collapsed" | "expanded";

function useSidebarMode(): SidebarMode {
  // SSR-safe default: collapsed (md/lg). Hydration sync via effect.
  const [mode, setMode] = useState<SidebarMode>("collapsed");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const xl = window.matchMedia("(min-width: 1280px)");
    const md = window.matchMedia("(min-width: 768px)");
    const compute = () => {
      if (xl.matches) setMode("expanded");
      else if (md.matches) setMode("collapsed");
      else setMode("drawer");
    };
    compute();
    xl.addEventListener("change", compute);
    md.addEventListener("change", compute);
    return () => {
      xl.removeEventListener("change", compute);
      md.removeEventListener("change", compute);
    };
  }, []);

  return mode;
}

/* ──────────────────────────────────────────────────────── */
/*  Active matcher                                          */
/* ──────────────────────────────────────────────────────── */

function useIsActive() {
  const pathname = usePathname();
  return useCallback(
    (href: string) => {
      const localeless = pathname.replace(/^\/(fr|en)/, "") || "/";
      if (href === "/dashboard") return localeless === "/dashboard";
      return localeless.startsWith(href);
    },
    [pathname]
  );
}

/* ──────────────────────────────────────────────────────── */
/*  NavSection — eyebrow + items, single source of truth    */
/* ──────────────────────────────────────────────────────── */

interface NavSectionProps {
  eyebrow?: string;
  items: NavItem[];
  locale: string;
  showLabels: boolean;
  onNavigate?: () => void;
  withTopBorder?: boolean;
}

function NavSection({
  eyebrow,
  items,
  locale,
  showLabels,
  onNavigate,
  withTopBorder,
}: NavSectionProps) {
  const isActive = useIsActive();

  return (
    <div className={withTopBorder ? "border-t border-[var(--bjhunt-border)] mt-3 pt-3" : ""}>
      {eyebrow && showLabels && (
        <div className="px-4 py-3">
          <Eyebrow as="span" className="text-[11px]">{eyebrow}</Eyebrow>
        </div>
      )}
      <ul className="flex flex-col">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={`/${locale}${href}`}
                title={!showLabels ? label : undefined}
                onClick={onNavigate}
                className={[
                  "relative flex items-center gap-3 h-9 px-4",
                  "text-[13px] font-medium font-sans",
                  "transition-colors duration-[var(--bjhunt-duration-base)]",
                  "hover:bg-white/[0.04]",
                  active
                    ? "text-[var(--bjhunt-text)]"
                    : "text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)]",
                  !showLabels ? "justify-center px-0" : "",
                ].join(" ")}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--bjhunt-text)]"
                  />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                {showLabels && (
                  <>
                    <span className="truncate flex-1">{label}</span>
                    {badge && <PlanBadge requiredPlan={badge} />}
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Sidebar — receives mode + onNavigate                    */
/* ──────────────────────────────────────────────────────── */

interface SidebarProps {
  user: { displayName: string; email: string; role: string };
  locale: string;
  mode: SidebarMode;
  onNavigate?: () => void;
  onClose?: () => void;
}

function Sidebar({ user, locale, mode, onNavigate, onClose }: SidebarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAdmin = user.role === "platform_admin";
  const showLabels = mode !== "collapsed";

  const userNav = getUserNav(locale);
  const workflowNav = getWorkflowNav();
  const adminNav = getAdminNav(locale);
  const initial = (user.displayName || user.email || "?")[0]?.toUpperCase() ?? "?";

  const handleSignOut = async () => {
    try {
      const res = await browserBackendFetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("LOGOUT_FAILED");
    } catch {
      // best-effort — redirect regardless
    }
    startTransition(() => router.push(`/${locale}/login`));
  };

  return (
    <aside
      className="flex flex-col h-full bg-[var(--bjhunt-bg)] border-r border-[var(--bjhunt-border)]"
      aria-label="Primary navigation"
    >
      {/* Logo row — 56 tall, hairline bottom */}
      <div className="flex items-center justify-between h-14 px-4 flex-shrink-0 border-b border-[var(--bjhunt-border)]">
        <Link
          href={`/${locale}/dashboard`}
          onClick={onNavigate}
          className="flex items-center gap-2 min-w-0 text-[var(--bjhunt-text)]"
        >
          <LogoSymbol size={20} className="flex-shrink-0" />
          {showLabels && <LogoWordmark className="text-[13px] truncate" />}
        </Link>
        {/* Close button — drawer only */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="md:hidden p-1 -mr-1 text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <NavSection items={userNav} locale={locale} showLabels={showLabels} onNavigate={onNavigate} />
        <NavSection
          eyebrow="Workflows"
          items={workflowNav}
          locale={locale}
          showLabels={showLabels}
          onNavigate={onNavigate}
          withTopBorder
        />
        {isAdmin && (
          <NavSection
            eyebrow="Admin"
            items={adminNav}
            locale={locale}
            showLabels={showLabels}
            onNavigate={onNavigate}
            withTopBorder
          />
        )}
      </nav>

      {/* User block */}
      <div className="flex-shrink-0 border-t border-[var(--bjhunt-border)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {showLabels ? (
          <div className="flex items-center gap-2.5 mb-2 min-w-0">
            <Avatar className="h-7 w-7">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Body as="div" className="truncate text-[13px] font-medium text-[var(--bjhunt-text)]">
                {user.displayName || user.email}
              </Body>
              <Micro as="div" className="truncate text-[var(--bjhunt-text-muted)]">
                {isAdmin ? "Platform Admin" : "User"}
              </Micro>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <Avatar className="h-7 w-7" title={user.displayName || user.email}>
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </div>
        )}
        <Button
          type="button"
          variant="bare"
          size="sm"
          state="critical"
          disabled={isPending}
          onClick={handleSignOut}
          title={locale === "fr" ? "Déconnexion" : "Sign out"}
          className={[
            "font-mono text-[11px] tracking-[0.18em] uppercase",
            "text-[var(--bjhunt-text-muted)] hover:text-[var(--state-critical)]",
            showLabels ? "w-full justify-start px-2" : "w-full justify-center px-0",
          ].join(" ")}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {showLabels && <span>{locale === "fr" ? "Déconnexion" : "Sign out"}</span>}
        </Button>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Top bar                                                 */
/* ──────────────────────────────────────────────────────── */

interface TopBarProps {
  pathname: string;
  locale: string;
  showHamburger: boolean;
  onHamburger: () => void;
  onCmdK: () => void;
}

function TopBar({ pathname, locale, showHamburger, onHamburger, onCmdK }: TopBarProps) {
  return (
    <header
      className={[
        "sticky top-0 z-30 flex items-center gap-3",
        "h-14 md:h-16 px-4 md:px-6",
        "bg-[var(--bjhunt-bg)]/85 backdrop-blur-md",
        "border-b border-[var(--bjhunt-border)]",
        "pt-[env(safe-area-inset-top)]",
      ].join(" ")}
    >
      {showHamburger && (
        <button
          type="button"
          onClick={onHamburger}
          aria-label="Open navigation"
          className="md:hidden p-1.5 -ml-1.5 text-[var(--bjhunt-text)] hover:bg-white/[0.04] rounded-[var(--bjhunt-radius-sm)] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <Breadcrumbs pathname={pathname} locale={locale} />
      </div>

      <button
        type="button"
        onClick={onCmdK}
        aria-label="Open command palette"
        className={[
          "inline-flex items-center gap-2 h-8 pl-2 pr-1.5",
          "text-[13px] font-sans text-[var(--bjhunt-text-muted)]",
          "border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)]",
          "hover:bg-white/[0.04] hover:border-[var(--bjhunt-border-strong)]",
          "transition-colors",
        ].join(" ")}
      >
        <Search className="w-4 h-4" />
        <kbd className="font-mono text-[11px] text-[var(--bjhunt-text-muted)] border border-[var(--bjhunt-border)] px-1.5 py-0.5 rounded-[var(--bjhunt-radius-xs)] leading-none">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Breadcrumbs                                             */
/* ──────────────────────────────────────────────────────── */

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

function humanize(seg: string) {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
  if (/^[0-9a-f-]{8,}$/i.test(seg)) return "…";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

function Breadcrumbs({ pathname, locale }: { pathname: string; locale: string }) {
  const stripped = pathname.replace(/^\/(fr|en)/, "");
  const segments = stripped.split("/").filter(Boolean);

  // Hide on dashboard root + chat (chat owns its own header)
  if (segments.length <= 1) return null;
  if (segments.length === 2 && segments[1] === "chat") return null;

  const crumbs = segments.map((seg, idx) => ({
    href: `/${locale}/${segments.slice(0, idx + 1).join("/")}`,
    label: humanize(seg),
    isLast: idx === segments.length - 1,
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-[13px] font-sans font-normal text-[var(--bjhunt-text-muted)] truncate"
    >
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5 min-w-0">
          {c.isLast ? (
            <span className="text-[var(--bjhunt-text)] truncate">{c.label}</span>
          ) : (
            <Link
              href={c.href}
              className="hover:text-[var(--bjhunt-text)] transition-colors truncate"
            >
              {c.label}
            </Link>
          )}
          {i < crumbs.length - 1 && (
            <ChevronRight
              aria-hidden
              className="w-3.5 h-3.5 flex-shrink-0 text-[var(--bjhunt-text-disabled)]"
            />
          )}
        </span>
      ))}
    </nav>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Drawer (mobile) — backdrop + focus trap + esc + scroll  */
/* ──────────────────────────────────────────────────────── */

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--bjhunt-bg-overlay)] backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  DashboardShell                                          */
/* ──────────────────────────────────────────────────────── */

interface DashboardShellProps {
  user: { displayName: string; email: string; role: string };
  locale: string;
  children: React.ReactNode;
}

export function DashboardShell({ user, locale, children }: DashboardShellProps) {
  const pathname = usePathname();
  const mode = useSidebarMode();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-close drawer when route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Auto-close drawer when leaving mobile breakpoint
  useEffect(() => {
    if (mode !== "drawer") setDrawerOpen(false);
  }, [mode]);

  const onCmdK = () => {
    // TODO: B5/B10 will wire the real cmdk modal here.
    // eslint-disable-next-line no-console
    console.log("cmdk-open");
  };

  // Persistent sidebar widths per spec §5
  const persistentWidthClass =
    mode === "expanded" ? "md:flex md:w-60" : "md:flex md:w-14";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bjhunt-bg)] text-[var(--bjhunt-text)]">
      {/* Persistent sidebar — md+ only */}
      <div className={["hidden flex-shrink-0", persistentWidthClass].join(" ")}>
        <Sidebar user={user} locale={locale} mode={mode} />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar
          user={user}
          locale={locale}
          mode="drawer"
          onClose={() => setDrawerOpen(false)}
          onNavigate={() => setDrawerOpen(false)}
        />
      </MobileDrawer>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <TopBar
          pathname={pathname}
          locale={locale}
          showHamburger={mode === "drawer"}
          onHamburger={() => setDrawerOpen(true)}
          onCmdK={onCmdK}
        />
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
