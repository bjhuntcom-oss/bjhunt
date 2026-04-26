"use client";

import { useState, useEffect, useCallback } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import { PageHero, Eyebrow, StatusDot } from "@/components/ui/page-hero";
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────

interface SkillMeta {
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  allowedTools: string[];
  mitre: string[];
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  timeEstimate: string;
  filePath: string;
}

interface SkillFull extends SkillMeta {
  body: string;
}

// ── Constants ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  recon: "Recon",
  exploit: "Exploit",
  "post-exploit": "Post-Exploit",
  analyst: "Analyst",
  ad: "Active Directory",
  cloud: "Cloud",
  contracts: "Smart Contracts",
  reverser: "Reverse Engineering",
  scanner: "Scanner",
  detector: "Detector",
  verifier: "Verifier",
  patcher: "Patcher",
  exploiter: "Exploiter",
  shared: "Shared",
  soundwave: "Soundwave",
  decepticon: "BJHUNT ALPHA 1.0",
  vulnresearch: "Vuln Research",
};

// All categories now resolve to design-token state colors. This retires the
// hardcoded #4a9eff / #ff4444 / etc. palette that violated the spec — and
// the prior `decepticon: "#fff"` (pure white, banned outside hero/inverted).
const CATEGORY_TONE: Record<
  string,
  "critical" | "warning" | "success" | "neutral"
> = {
  recon: "neutral",
  exploit: "critical",
  "post-exploit": "critical",
  analyst: "neutral",
  ad: "warning",
  cloud: "neutral",
  contracts: "success",
  reverser: "neutral",
  scanner: "neutral",
  detector: "success",
  verifier: "success",
  patcher: "success",
  exploiter: "critical",
  shared: "neutral",
  soundwave: "neutral",
  decepticon: "neutral",
  vulnresearch: "neutral",
};

const TONE_COLORS: Record<string, string> = {
  critical: "var(--bjhunt-status-danger, #fb565b)",
  warning: "var(--bjhunt-status-warning, #ffba00)",
  success: "var(--bjhunt-status-success, #00d992)",
  neutral: "var(--bjhunt-text-muted, #8b949e)",
};

const DIFFICULTY_TONE: Record<
  string,
  "success" | "warning" | "critical"
> = {
  easy: "success",
  medium: "warning",
  hard: "critical",
};

const CATEGORY_TREE: {
  key: string;
  label: string;
  children?: { key: string; label: string }[];
}[] = [
  {
    key: "recon",
    label: "Recon",
    children: [
      { key: "osint", label: "OSINT" },
      { key: "active-recon", label: "Active Scanning" },
      { key: "passive-recon", label: "Passive Recon" },
      { key: "web-recon", label: "Web Recon" },
      { key: "cloud-recon", label: "Cloud Recon" },
    ],
  },
  {
    key: "exploit",
    label: "Exploit",
    children: [
      { key: "web", label: "Web" },
      { key: "ad", label: "Active Directory" },
    ],
  },
  {
    key: "post-exploit",
    label: "Post-Exploit",
    children: [
      { key: "privilege-escalation", label: "Privilege Escalation" },
      { key: "lateral-movement", label: "Lateral Movement" },
      { key: "credential-access", label: "Credentials" },
      { key: "c2", label: "C2" },
      { key: "c2-sliver", label: "C2 Sliver" },
    ],
  },
  {
    key: "analyst",
    label: "Analyst",
    children: [
      { key: "sql-injection", label: "SQL Injection" },
      { key: "ssti", label: "SSTI" },
      { key: "ssrf", label: "SSRF" },
      { key: "xxe", label: "XXE" },
      { key: "idor", label: "IDOR" },
      { key: "command-injection", label: "Command Injection" },
      { key: "deserialization", label: "Deserialization" },
      { key: "auth-bypass", label: "Auth Bypass" },
      { key: "prototype-pollution", label: "Prototype Pollution" },
      { key: "prompt-injection", label: "Prompt Injection" },
      { key: "path-traversal", label: "Path Traversal" },
    ],
  },
  { key: "ad", label: "Active Directory" },
  { key: "cloud", label: "Cloud", children: [{ key: "aws-iam-enum", label: "AWS IAM Enum" }] },
  { key: "contracts", label: "Smart Contracts" },
  { key: "reverser", label: "Reverse Engineering" },
  { key: "scanner", label: "Scanner" },
  { key: "detector", label: "Detector" },
  { key: "verifier", label: "Verifier" },
  { key: "patcher", label: "Patcher" },
  { key: "exploiter", label: "Exploiter" },
  { key: "vulnresearch", label: "Vuln Research" },
  { key: "shared", label: "Shared" },
  { key: "soundwave", label: "Soundwave" },
  { key: "decepticon", label: "BJHUNT ALPHA 1.0" },
];

// Shared inline styles
const CARD_STYLE: React.CSSProperties = {
  background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
  borderColor: "var(--bjhunt-border, #3d3a39)",
  borderRadius: "var(--bjhunt-radius-md, 8px)",
};

// ── Component ───────────────────────────────────────────────────────────

export default function SkillCatalogPage() {
  const { plan } = usePlan();
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [grouped, setGrouped] = useState<Record<string, SkillMeta[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [drawerSkill, setDrawerSkill] = useState<SkillMeta | null>(null);
  const [skillDetail, setSkillDetail] = useState<SkillFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Fetch skills ────────────────────────────────────────────────────

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("q", searchQuery);

      const res = await browserBackendFetch(`/api/skills?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills ?? []);
        setGrouped(data.grouped ?? {});
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // ── Drawer open: fetch full skill body ──────────────────────────────

  const openDrawer = async (skill: SkillMeta) => {
    setDrawerSkill(skill);
    setSkillDetail(null);
    setLoadingDetail(true);

    try {
      const parts = skill.filePath.split("/");
      const category = parts[0];
      const name = parts.length > 2 ? parts[1] : skill.name;
      const res = await browserBackendFetch(`/api/skills/${category}/${name}`);
      if (res.ok) {
        const data = await res.json();
        setSkillDetail(data.skill ?? null);
      }
    } catch {
      // silent
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDrawer = () => {
    setDrawerSkill(null);
    setSkillDetail(null);
  };

  // ── Search submit ───────────────────────────────────────────────────

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const toggleTreeCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const displayedSkills = skills;

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <PlanGate requiredPlan="pro" currentPlan={plan} featureName="Skill Catalog">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1280px] mx-auto">
        <PageHero
          eyebrow="03 / SKILLS"
          title="Skills"
          lede="Browse offensive and defensive techniques the engine can execute — filtered by category, MITRE ATT&CK technique, or keyword."
        />

        {/* Filter chips row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Eyebrow>{selectedCategory ? "FILTER" : "ALL"}</Eyebrow>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-1.5 transition-colors"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: TONE_COLORS[CATEGORY_TONE[selectedCategory] || "neutral"],
                border: `1px solid ${TONE_COLORS[CATEGORY_TONE[selectedCategory] || "neutral"]}`,
                borderRadius: "var(--bjhunt-radius-sm, 4px)",
                padding: "4px 8px",
                background: "transparent",
              }}
            >
              {CATEGORY_LABELS[selectedCategory] || selectedCategory}
              <X size={10} />
            </button>
          )}
          {searchQuery && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
              }}
              className="inline-flex items-center gap-1.5 transition-colors"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--bjhunt-text-muted)",
                border: "1px solid var(--bjhunt-border, #3d3a39)",
                borderRadius: "var(--bjhunt-radius-sm, 4px)",
                padding: "4px 8px",
                background: "transparent",
              }}
            >
              "{searchQuery}"
              <X size={10} />
            </button>
          )}
          <span
            className="ml-auto"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 13,
              color: "var(--bjhunt-text-muted)",
            }}
          >
            {displayedSkills.length} skills
          </span>
        </div>

        {/* Search bar */}
        <div
          className="flex items-center mb-6 border"
          style={{
            background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
            borderColor: "var(--bjhunt-border, #3d3a39)",
            borderRadius: "var(--bjhunt-radius, 6px)",
            height: 40,
          }}
        >
          <Search size={14} className="ml-3 shrink-0" style={{ color: "var(--bjhunt-text-muted)" }} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Filter skills by name, keyword, or MITRE technique (e.g., T1595)..."
            className="bg-transparent px-2 outline-none flex-1"
            style={{
              fontFamily: "var(--bjhunt-font-sans)",
              fontSize: 14,
              color: "var(--bjhunt-text)",
              height: 38,
            }}
          />
          <button
            onClick={handleSearch}
            className="px-4 transition-colors h-full border-l"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--bjhunt-text)",
              borderColor: "var(--bjhunt-border, #3d3a39)",
            }}
          >
            Filter
          </button>
        </div>

        {/* Main layout: sidebar + content */}
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* Category sidebar */}
          <aside
            className="border overflow-y-auto shrink-0"
            style={{
              ...CARD_STYLE,
              width: "100%",
              maxWidth: 240,
              maxHeight: "calc(100vh - 220px)",
            }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
            >
              <Eyebrow>Categories</Eyebrow>
            </div>

            <div className="py-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className="w-full text-left px-4 py-2 transition-colors"
                style={{
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: 13,
                  color:
                    selectedCategory === null
                      ? "var(--bjhunt-text)"
                      : "var(--bjhunt-text-muted)",
                  background:
                    selectedCategory === null
                      ? "var(--bjhunt-bg, #050507)"
                      : "transparent",
                }}
              >
                All Skills{" "}
                <span style={{ color: "var(--bjhunt-text-subtle, #52525b)" }}>
                  ({skills.length})
                </span>
              </button>

              {CATEGORY_TREE.map((cat) => {
                const isExpanded = expandedCategories.has(cat.key);
                const isActive = selectedCategory === cat.key;
                const count = grouped[cat.key]?.length ?? 0;
                const tone = CATEGORY_TONE[cat.key] || "neutral";

                return (
                  <div key={cat.key}>
                    <div className="flex items-center">
                      {cat.children && (
                        <button
                          onClick={() => toggleTreeCategory(cat.key)}
                          className="px-2 py-2 transition-colors"
                          style={{ color: "var(--bjhunt-text-muted)" }}
                          aria-label="Toggle"
                        >
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedCategory(isActive ? null : cat.key)}
                        className={`flex-1 text-left py-2 transition-colors ${
                          !cat.children ? "px-4" : "pr-3"
                        }`}
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontSize: 13,
                          color: isActive ? "var(--bjhunt-text)" : "var(--bjhunt-text-muted)",
                          background: isActive ? "var(--bjhunt-bg, #050507)" : "transparent",
                        }}
                      >
                        <span
                          aria-hidden
                          className="inline-block mr-2"
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "var(--bjhunt-radius-pill, 9999px)",
                            background: TONE_COLORS[tone],
                            verticalAlign: "middle",
                          }}
                        />
                        {cat.label}
                        {count > 0 && (
                          <span
                            className="ml-1"
                            style={{ color: "var(--bjhunt-text-subtle, #52525b)" }}
                          >
                            ({count})
                          </span>
                        )}
                      </button>
                    </div>

                    {cat.children && isExpanded && (
                      <div
                        className="ml-6 border-l"
                        style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
                      >
                        {cat.children.map((sub) => (
                          <button
                            key={sub.key}
                            onClick={() => {
                              setSearchInput(sub.key);
                              setSearchQuery(sub.key);
                              setSelectedCategory(cat.key);
                            }}
                            className="w-full text-left pl-3 py-1 transition-colors"
                            style={{
                              fontFamily: "var(--bjhunt-font-sans)",
                              fontSize: 12,
                              color: "var(--bjhunt-text-muted)",
                            }}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Skills content area */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="border px-4 py-16 text-center" style={CARD_STYLE}>
                <p
                  className="animate-pulse"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  Loading skills catalog...
                </p>
              </div>
            ) : displayedSkills.length === 0 ? (
              <div className="border px-4 py-16 text-center" style={CARD_STYLE}>
                <BookOpen
                  size={28}
                  className="mx-auto mb-3"
                  style={{ color: "var(--bjhunt-text-muted)" }}
                />
                <p
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 14,
                    color: "var(--bjhunt-text)",
                  }}
                >
                  {selectedCategory || searchQuery
                    ? "No skills match your filter."
                    : "Select a category or search to browse skills."}
                </p>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  {selectedCategory || searchQuery
                    ? "Try a different category or search term."
                    : "The engine contains ~70 specialized offensive and defensive skill documents."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedSkills.map((skill) => {
                  const tone = CATEGORY_TONE[skill.category] || "neutral";
                  const diffTone = DIFFICULTY_TONE[skill.difficulty] || "warning";

                  return (
                    <button
                      key={skill.filePath}
                      onClick={() => openDrawer(skill)}
                      className="w-full text-left border p-4 transition-colors hover:bg-white/[0.02]"
                      style={CARD_STYLE}
                    >
                      <div className="flex items-start gap-3 flex-wrap">
                        {/* mono ID */}
                        <span
                          className="shrink-0"
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 13,
                            color: "var(--bjhunt-text-muted)",
                          }}
                        >
                          {skill.filePath}
                        </span>
                        {/* name H4 */}
                        <h4
                          className="m-0 min-w-0 truncate"
                          style={{
                            fontFamily: "var(--bjhunt-font-sans)",
                            fontWeight: 600,
                            fontSize: 16,
                            lineHeight: 1.5,
                            color: "var(--bjhunt-text)",
                            flex: "1 1 200px",
                          }}
                        >
                          {skill.name}
                        </h4>

                        {/* category chip */}
                        <span
                          className="shrink-0 inline-flex items-center"
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: TONE_COLORS[tone],
                            border: `1px solid ${TONE_COLORS[tone]}`,
                            borderRadius: "var(--bjhunt-radius-sm, 4px)",
                            padding: "2px 6px",
                            background: "transparent",
                          }}
                        >
                          {CATEGORY_LABELS[skill.category] || skill.category}
                        </span>

                        {/* status dot for difficulty */}
                        <StatusDot
                          state={diffTone}
                          label={
                            <span
                              style={{
                                fontFamily: "var(--bjhunt-font-mono)",
                                fontSize: 12,
                                fontWeight: 600,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                color: "var(--bjhunt-text-muted)",
                              }}
                            >
                              {skill.difficulty}
                            </span>
                          }
                        />
                      </div>

                      {skill.description && (
                        <p
                          className="mt-2 line-clamp-2"
                          style={{
                            fontFamily: "var(--bjhunt-font-sans)",
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: "var(--bjhunt-text-muted)",
                          }}
                        >
                          {skill.description}
                        </p>
                      )}

                      {skill.mitre.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                          {skill.mitre.slice(0, 6).map((t) => (
                            <span
                              key={t}
                              style={{
                                fontFamily: "var(--bjhunt-font-mono)",
                                fontSize: 11,
                                fontWeight: 500,
                                color: "var(--bjhunt-status-warning, #ffba00)",
                                border: "1px solid var(--bjhunt-status-warning, #ffba00)",
                                borderRadius: "var(--bjhunt-radius-sm, 4px)",
                                padding: "1px 6px",
                                background: "var(--bjhunt-severity-medium-bg, rgba(255,186,0,0.12))",
                              }}
                            >
                              {t}
                            </span>
                          ))}
                          {skill.mitre.length > 6 && (
                            <span
                              style={{
                                fontFamily: "var(--bjhunt-font-mono)",
                                fontSize: 11,
                                color: "var(--bjhunt-text-muted)",
                              }}
                            >
                              +{skill.mitre.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right drawer with skill details */}
        {drawerSkill && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={closeDrawer}
              style={{ background: "var(--bjhunt-bg-overlay, rgba(0,0,0,0.7))" }}
              aria-hidden
            />
            <aside
              role="dialog"
              aria-label={drawerSkill.name}
              className="fixed top-0 right-0 bottom-0 z-50 w-full md:w-[560px] overflow-y-auto border-l"
              style={{
                background: "var(--bjhunt-bg-elevated, #16161a)",
                borderColor: "var(--bjhunt-border, #3d3a39)",
              }}
            >
              <header
                className="flex items-start justify-between gap-3 p-6 border-b sticky top-0 z-10"
                style={{
                  background: "var(--bjhunt-bg-elevated, #16161a)",
                  borderColor: "var(--bjhunt-border, #3d3a39)",
                }}
              >
                <div className="min-w-0">
                  <Eyebrow>{CATEGORY_LABELS[drawerSkill.category] || drawerSkill.category}</Eyebrow>
                  <h3
                    className="mt-1 m-0"
                    style={{
                      fontFamily: "var(--bjhunt-font-sans)",
                      fontWeight: 600,
                      fontSize: 20,
                      lineHeight: 1.4,
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {drawerSkill.name}
                  </h3>
                  <p
                    className="mt-1 m-0"
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    {drawerSkill.filePath}
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="shrink-0 p-1 transition-colors"
                  style={{ color: "var(--bjhunt-text-muted)" }}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="p-6 space-y-5">
                {drawerSkill.description && (
                  <section>
                    <Eyebrow>Description</Eyebrow>
                    <p
                      className="mt-2"
                      style={{
                        fontFamily: "var(--bjhunt-font-sans)",
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: "var(--bjhunt-text)",
                      }}
                    >
                      {drawerSkill.description}
                    </p>
                  </section>
                )}

                {drawerSkill.mitre.length > 0 && (
                  <section>
                    <Eyebrow>MITRE ATT&CK</Eyebrow>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {drawerSkill.mitre.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 12,
                            color: "var(--bjhunt-status-warning, #ffba00)",
                            border: "1px solid var(--bjhunt-status-warning, #ffba00)",
                            borderRadius: "var(--bjhunt-radius-sm, 4px)",
                            padding: "2px 6px",
                            background: "var(--bjhunt-severity-medium-bg, rgba(255,186,0,0.12))",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {drawerSkill.allowedTools.length > 0 && (
                  <section>
                    <Eyebrow>Tools</Eyebrow>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {drawerSkill.allowedTools.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 12,
                            color: "var(--bjhunt-text)",
                            border: "1px solid var(--bjhunt-border, #3d3a39)",
                            borderRadius: "var(--bjhunt-radius-sm, 4px)",
                            padding: "2px 6px",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {drawerSkill.tags.length > 0 && (
                  <section>
                    <Eyebrow>Tags</Eyebrow>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {drawerSkill.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 12,
                            color: "var(--bjhunt-text-muted)",
                            border: "1px solid var(--bjhunt-border, #3d3a39)",
                            borderRadius: "var(--bjhunt-radius-sm, 4px)",
                            padding: "2px 6px",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <Eyebrow>Content</Eyebrow>
                  {loadingDetail ? (
                    <p
                      className="mt-2 animate-pulse"
                      style={{
                        fontFamily: "var(--bjhunt-font-sans)",
                        fontSize: 13,
                        color: "var(--bjhunt-text-muted)",
                      }}
                    >
                      Loading skill content...
                    </p>
                  ) : skillDetail ? (
                    <pre
                      className="mt-2 px-4 py-3 overflow-x-auto"
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "var(--bjhunt-text)",
                        background: "var(--bjhunt-bg, #050507)",
                        border: "1px solid var(--bjhunt-border, #3d3a39)",
                        borderRadius: "var(--bjhunt-radius, 6px)",
                        whiteSpace: "pre-wrap",
                        maxHeight: 480,
                        overflowY: "auto",
                      }}
                    >
                      {skillDetail.body}
                    </pre>
                  ) : (
                    <p
                      className="mt-2"
                      style={{
                        fontFamily: "var(--bjhunt-font-sans)",
                        fontSize: 13,
                        color: "var(--bjhunt-text-muted)",
                      }}
                    >
                      No content available.
                    </p>
                  )}
                </section>
              </div>
            </aside>
          </>
        )}
      </div>
    </PlanGate>
  );
}
