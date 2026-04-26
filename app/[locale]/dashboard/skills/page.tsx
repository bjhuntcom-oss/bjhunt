"use client";

import { useState, useEffect, useCallback } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
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
  decepticon: "BJHUNT ALPHA 1.0",   // user-facing brand for the orchestrator graph (internal id stays for engine compat)
  vulnresearch: "Vuln Research",
};

const CATEGORY_COLORS: Record<string, string> = {
  recon: "#4a9eff",
  exploit: "#ff4444",
  "post-exploit": "#ff6b35",
  analyst: "#b366ff",
  ad: "#ff9900",
  cloud: "#00bcd4",
  contracts: "#8bc34a",
  reverser: "#e91e63",
  scanner: "#4a9eff",
  detector: "#00cc8a",
  verifier: "#00cc8a",
  patcher: "#8bc34a",
  exploiter: "#ff4444",
  shared: "#999",
  soundwave: "#b366ff",
  decepticon: "#fff",
  vulnresearch: "#b366ff",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#00cc8a",
  medium: "#ff9900",
  hard: "#ff4444",
};

const CATEGORY_TREE: { key: string; label: string; children?: { key: string; label: string }[] }[] = [
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
  {
    key: "cloud",
    label: "Cloud",
    children: [
      { key: "aws-iam-enum", label: "AWS IAM Enum" },
    ],
  },
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
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
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

  // ── Fetch single skill detail ───────────────────────────────────────

  const fetchSkillDetail = async (skill: SkillMeta) => {
    const key = skill.filePath;
    if (expandedSkill === key) {
      setExpandedSkill(null);
      setSkillDetail(null);
      return;
    }

    setExpandedSkill(key);
    setLoadingDetail(true);

    try {
      // Derive category/name from filePath
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

  // ── Search submit ───────────────────────────────────────────────────

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  // ── Toggle category tree ────────────────────────────────────────────

  const toggleTreeCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Displayed skills ───────────────────────────────────────────────

  const displayedSkills = skills;

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <PlanGate requiredPlan="pro" currentPlan={plan} featureName="Skill Catalog">
    <div className="p-6 md:p-10 max-w-7xl">
      <header className="mb-12 md:mb-16">
        <div
          className="mb-5 inline-flex items-center gap-2"
          style={{
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 10,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'var(--bjhunt-text-subtle)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              background: 'var(--bjhunt-brand-primary)',
              boxShadow: '0 0 8px var(--bjhunt-brand-primary)',
              display: 'inline-block',
            }}
          />
          <span>Skill Catalog</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontWeight: 200,
            fontSize: 'clamp(48px, 8vw, 96px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            color: 'var(--bjhunt-text)',
            margin: 0,
          }}
        >
          Skills
        </h1>
        <p
          className="mt-5 max-w-2xl"
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontWeight: 300,
            fontSize: 17,
            lineHeight: 1.5,
            color: 'var(--bjhunt-text-muted)',
          }}
        >
          Browse offensive and defensive techniques the engine can execute —
          filtered by category, MITRE ATT&amp;CK technique, or keyword.
        </p>
      </header>

      {/* Search bar */}
      <div className="flex items-center border border-[var(--border)] bg-[var(--bg-input)] mb-6">
        <Search
          size={12}
          className="ml-2 text-[var(--text-subtle)] flex-shrink-0"
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Filter skills by name, keyword, or MITRE technique (e.g., T1595)..."
          className="bg-transparent text-[10px] font-mono text-white px-2 py-2 outline-none flex-1 placeholder:text-[var(--text-subtle)]"
        />
        <button
          onClick={handleSearch}
          className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white px-3 py-2 border-l border-[var(--border)] transition-colors"
        >
          Filter
        </button>
        {(searchQuery || selectedCategory) && (
          <button
            onClick={() => {
              setSearchInput("");
              setSearchQuery("");
              setSelectedCategory(null);
            }}
            className="text-[8px] font-mono uppercase tracking-widest text-[var(--danger)] hover:text-white px-2 py-2 border-l border-[var(--border)] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex gap-4">
        {/* Category sidebar */}
        <div
          className="flex-shrink-0 border border-[var(--border)] bg-[var(--bg-card)] overflow-y-auto"
          style={{ width: 200, maxHeight: "calc(100vh - 220px)" }}
        >
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
              Categories
            </span>
          </div>

          <div className="py-1">
            {/* All */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-1.5 text-[9px] font-mono uppercase tracking-wide transition-colors ${
                selectedCategory === null
                  ? "text-white bg-[var(--bg-input)]"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-input)]/50"
              }`}
            >
              All Skills
              <span className="text-[8px] text-[var(--text-subtle)] ml-1">
                ({skills.length})
              </span>
            </button>

            {CATEGORY_TREE.map((cat) => {
              const isExpanded = expandedCategories.has(cat.key);
              const isActive = selectedCategory === cat.key;
              const count = grouped[cat.key]?.length ?? 0;

              return (
                <div key={cat.key}>
                  <div className="flex items-center">
                    {cat.children && (
                      <button
                        onClick={() => toggleTreeCategory(cat.key)}
                        className="px-1 py-1.5 text-[var(--text-subtle)] hover:text-white"
                      >
                        {isExpanded ? (
                          <ChevronDown size={8} />
                        ) : (
                          <ChevronRight size={8} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCategory(isActive ? null : cat.key)}
                      className={`flex-1 text-left py-1.5 text-[9px] font-mono uppercase tracking-wide transition-colors ${
                        !cat.children ? "px-3" : "pr-3"
                      } ${
                        isActive
                          ? "text-white bg-[var(--bg-input)]"
                          : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-input)]/50"
                      }`}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 mr-1.5"
                        style={{
                          background: CATEGORY_COLORS[cat.key] || "#999",
                        }}
                      />
                      {cat.label}
                      {count > 0 && (
                        <span className="text-[8px] text-[var(--text-subtle)] ml-1">
                          {count}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Subcategories */}
                  {cat.children && isExpanded && (
                    <div className="ml-4 border-l border-[var(--border)]">
                      {cat.children.map((sub) => (
                        <button
                          key={sub.key}
                          onClick={() => {
                            setSearchInput(sub.key);
                            setSearchQuery(sub.key);
                            setSelectedCategory(cat.key);
                          }}
                          className="w-full text-left pl-3 py-1 text-[8px] font-mono text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
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
        </div>

        {/* Skills content area */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="border border-[var(--border)] px-4 py-16 text-center">
              <p className="text-[10px] font-mono text-[var(--text-subtle)] animate-pulse">
                Loading skills catalog...
              </p>
            </div>
          ) : displayedSkills.length === 0 ? (
            <div className="border border-[var(--border)] px-4 py-16 text-center">
              <BookOpen
                size={28}
                className="mx-auto mb-3 text-[var(--text-subtle)]"
              />
              <p className="text-[11px] font-mono text-[var(--text-muted)] mb-1">
                {selectedCategory || searchQuery
                  ? "No skills match your filter."
                  : "Select a category or search to browse skills."}
              </p>
              <p className="text-[10px] font-mono text-[var(--text-subtle)]">
                {selectedCategory || searchQuery
                  ? "Try a different category or search term."
                  : "The engine contains ~70 specialized offensive and defensive skill documents."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Stats */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                  {displayedSkills.length} skills
                </span>
                {selectedCategory && (
                  <span
                    className="text-[8px] font-mono uppercase px-1.5 py-0.5 border"
                    style={{
                      color: CATEGORY_COLORS[selectedCategory] || "#999",
                      borderColor: CATEGORY_COLORS[selectedCategory] || "#999",
                      background: `${CATEGORY_COLORS[selectedCategory] || "#999"}11`,
                    }}
                  >
                    {CATEGORY_LABELS[selectedCategory] || selectedCategory}
                  </span>
                )}
              </div>

              {/* Skill cards */}
              {displayedSkills.map((skill) => {
                const isOpen = expandedSkill === skill.filePath;
                const catColor = CATEGORY_COLORS[skill.category] || "#999";
                const diffColor = DIFFICULTY_COLORS[skill.difficulty] || "#999";

                return (
                  <div
                    key={skill.filePath}
                    className="border border-[var(--border)] bg-[var(--bg-card)]"
                  >
                    {/* Skill header */}
                    <button
                      onClick={() => fetchSkillDetail(skill)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--bg-input)]/30 transition-colors"
                    >
                      {/* Expand */}
                      <div className="w-3 flex-shrink-0 mt-0.5 text-[var(--text-subtle)]">
                        {isOpen ? (
                          <ChevronDown size={10} />
                        ) : (
                          <ChevronRight size={10} />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-shrink-0 min-w-[120px]">
                        <span className="text-[10px] font-mono font-bold text-white">
                          {skill.name}
                        </span>
                      </div>

                      {/* Category tag */}
                      <div className="flex-shrink-0">
                        <span
                          className="text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 border"
                          style={{
                            color: catColor,
                            borderColor: catColor,
                            background: `${catColor}11`,
                          }}
                        >
                          {CATEGORY_LABELS[skill.category] || skill.category}
                        </span>
                      </div>

                      {/* MITRE techniques */}
                      {skill.mitre.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                          {skill.mitre.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="text-[7px] font-mono text-[var(--warning)] bg-[rgba(255,153,0,0.08)] border border-[var(--warning)]/30 px-1 py-0.5"
                            >
                              {t}
                            </span>
                          ))}
                          {skill.mitre.length > 4 && (
                            <span className="text-[7px] font-mono text-[var(--text-subtle)]">
                              +{skill.mitre.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Difficulty */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                        <span
                          className="inline-block w-1.5 h-1.5"
                          style={{ background: diffColor, borderRadius: "50%" }}
                        />
                        <span className="text-[8px] font-mono text-[var(--text-subtle)] uppercase">
                          {skill.difficulty}
                        </span>
                      </div>

                      {/* Time estimate */}
                      <div className="flex-shrink-0 hidden md:block">
                        <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                          {skill.timeEstimate}
                        </span>
                      </div>
                    </button>

                    {/* Description preview (always visible) */}
                    {skill.description && !isOpen && (
                      <div className="px-4 pb-2 -mt-1">
                        <p className="text-[9px] font-mono text-[var(--text-subtle)] line-clamp-2 leading-relaxed pl-6">
                          {skill.description}
                        </p>
                      </div>
                    )}

                    {/* Expanded: full content */}
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-[var(--border)]">
                        <div className="pt-3 space-y-3">
                          {/* Description */}
                          {skill.description && (
                            <div>
                              <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                                Description
                              </div>
                              <p className="text-[11px] font-mono text-[var(--text-muted)] leading-relaxed">
                                {skill.description}
                              </p>
                            </div>
                          )}

                          {/* Metadata row */}
                          <div className="flex items-center gap-4 flex-wrap">
                            {skill.allowedTools.length > 0 && (
                              <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                                  Tools:{" "}
                                </span>
                                {skill.allowedTools.map((t) => (
                                  <span
                                    key={t}
                                    className="text-[8px] font-mono text-[var(--text-muted)] mr-1"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            {skill.subcategory && (
                              <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                                  Subcategory:{" "}
                                </span>
                                <span className="text-[8px] font-mono text-[var(--text-muted)]">
                                  {skill.subcategory}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {skill.tags.length > 0 && (
                            <div>
                              <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                                Tags
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {skill.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[8px] font-mono text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)] px-1.5 py-0.5"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* MITRE ATT&CK (full list) */}
                          {skill.mitre.length > 0 && (
                            <div>
                              <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                                MITRE ATT&CK
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {skill.mitre.map((t) => (
                                  <span
                                    key={t}
                                    className="text-[8px] font-mono text-[var(--warning)] bg-[rgba(255,153,0,0.08)] border border-[var(--warning)] px-1.5 py-0.5"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full markdown body */}
                          {loadingDetail ? (
                            <div className="py-4 text-center">
                              <p className="text-[9px] font-mono text-[var(--text-subtle)] animate-pulse">
                                Loading skill content...
                              </p>
                            </div>
                          ) : skillDetail && expandedSkill === skill.filePath ? (
                            <div>
                              <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                                Content
                              </div>
                              <pre className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)] px-3 py-3 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                                {skillDetail.body}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </PlanGate>
  );
}
