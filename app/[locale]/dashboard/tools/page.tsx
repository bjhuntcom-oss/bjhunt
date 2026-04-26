"use client";

import { useState, useCallback } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import { cn } from "@/lib/utils";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import { PageHero, Eyebrow, StatusDot } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  Search,
  Key,
  Shield,
  Network,
  Database,
  Play,
  Loader2,
  Clock,
  Copy,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────

interface ToolDef {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: typeof Terminal;
  inputType: "textarea" | "input";
  inputLabel: string;
  inputPlaceholder: string;
  inputKey: string;
}

interface ToolResult {
  tool: string;
  output: string;
  status: "success" | "error";
  meta: Record<string, unknown>;
  durationMs: number;
  timestamp: string;
}

// ── Tool catalog ────────────────────────────────────────────────────────

const TOOLS: ToolDef[] = [
  {
    id: "bash",
    name: "Bash",
    description: "Execute commands in Kali sandbox",
    category: "execution",
    icon: Terminal,
    inputType: "textarea",
    inputLabel: "Command",
    inputPlaceholder: "nmap -sV 192.168.1.1",
    inputKey: "command",
  },
  {
    id: "kg_query",
    name: "KG Query",
    description: "Run Cypher queries on the knowledge graph",
    category: "query",
    icon: Database,
    inputType: "textarea",
    inputLabel: "Cypher Query",
    inputPlaceholder: "MATCH (n:Host)-[:HAS_PORT]->(p:Port) RETURN n, p LIMIT 10",
    inputKey: "query",
  },
  {
    id: "cve_lookup",
    name: "CVE Lookup",
    description: "Quick NVD/EPSS lookup",
    category: "intel",
    icon: Search,
    inputType: "input",
    inputLabel: "CVE ID",
    inputPlaceholder: "CVE-2024-3400",
    inputKey: "cveId",
  },
  {
    id: "jwt_parse",
    name: "JWT Parse",
    description: "Decode and analyze JWT tokens",
    category: "utility",
    icon: Key,
    inputType: "textarea",
    inputLabel: "JWT Token",
    inputPlaceholder:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
    inputKey: "token",
  },
  {
    id: "iam_audit",
    name: "IAM Audit",
    description: "Analyze AWS IAM policy JSON",
    category: "cloud",
    icon: Shield,
    inputType: "textarea",
    inputLabel: "IAM Policy JSON",
    inputPlaceholder:
      '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Action": "s3:*",\n      "Resource": "*"\n    }\n  ]\n}',
    inputKey: "policy",
  },
  {
    id: "network_scan",
    name: "Network Scan",
    description: "Quick nmap-style scan summary",
    category: "recon",
    icon: Network,
    inputType: "input",
    inputLabel: "Target",
    inputPlaceholder: "192.168.1.1",
    inputKey: "target",
  },
];

// All hardcoded blue/purple/orange hex have been replaced by neutral or
// state colors per the 2026 design spec — chromatic accents are reserved
// for state semantics (success / warning / critical), not category labels.
const CATEGORY_TONE: Record<string, "critical" | "warning" | "success" | "neutral"> = {
  execution: "critical",
  query: "neutral",
  intel: "warning",
  utility: "success",
  cloud: "neutral",
  recon: "neutral",
};

const TONE_COLORS: Record<string, string> = {
  critical: "var(--bjhunt-status-danger, #fb565b)",
  warning: "var(--bjhunt-status-warning, #ffba00)",
  success: "var(--bjhunt-status-success, #00d992)",
  neutral: "var(--bjhunt-text-muted, #8b949e)",
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
  borderColor: "var(--bjhunt-border, #3d3a39)",
  borderRadius: "var(--bjhunt-radius-md, 8px)",
};

// ── Component ───────────────────────────────────────────────────────────

export default function ToolPlaygroundPage() {
  const { plan } = usePlan();
  const [activeTool, setActiveTool] = useState<string>("bash");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [history, setHistory] = useState<ToolResult[]>([]);
  const [copied, setCopied] = useState(false);

  const tool = TOOLS.find((t) => t.id === activeTool)!;

  const inputValue = inputValues[activeTool] || "";

  const setInputValue = (val: string) => {
    setInputValues((prev) => ({ ...prev, [activeTool]: val }));
  };

  const execute = useCallback(async () => {
    if (!inputValue.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await browserBackendFetch("/api/tools/execute", {
        method: "POST",
        body: JSON.stringify({
          tool: activeTool,
          input: { [tool.inputKey]: inputValue.trim() },
        }),
      });

      if (res.ok) {
        const data: ToolResult = await res.json();
        setResult(data);
        setHistory((prev) => [data, ...prev].slice(0, 20));
      } else {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setResult({
          tool: activeTool,
          output: err.error || `HTTP ${res.status}: ${res.statusText}`,
          status: "error",
          meta: {},
          durationMs: 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResult({
        tool: activeTool,
        output: `Network error: ${message}`,
        status: "error",
        meta: {},
        durationMs: 0,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [activeTool, inputValue, loading, tool.inputKey]);

  const copyOutput = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatOutput = (output: string): string => {
    try {
      const parsed = JSON.parse(output);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return output;
    }
  };

  const inputBaseStyle: React.CSSProperties = {
    fontFamily: "var(--bjhunt-font-mono)",
    fontSize: 13,
    color: "var(--bjhunt-text)",
    background: "var(--bjhunt-bg, #050507)",
    border: "1px solid var(--bjhunt-border, #3d3a39)",
    borderRadius: "var(--bjhunt-radius, 6px)",
  };

  return (
    <PlanGate requiredPlan="enterprise" currentPlan={plan} featureName="Tool Playground">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1280px] mx-auto">
        <PageHero
          eyebrow="05 / TOOLS"
          title="Tool Playground"
          lede="Execute engine tools directly — bash commands, graph queries, CVE lookups, JWT analysis."
        />

        {/* Tool selector tabs */}
        <div
          className="flex items-center flex-wrap mb-6 border overflow-hidden"
          style={{
            borderColor: "var(--bjhunt-border, #3d3a39)",
            borderRadius: "var(--bjhunt-radius-md, 8px)",
            background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
          }}
        >
          {TOOLS.map((t, idx) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            const tone = CATEGORY_TONE[t.category] || "neutral";

            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(t.id);
                  setResult(null);
                }}
                className="flex items-center gap-2 px-4 transition-colors"
                style={{
                  height: 40,
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? "var(--bjhunt-text)" : "var(--bjhunt-text-muted)",
                  background: active ? "var(--bjhunt-bg, #050507)" : "transparent",
                  borderLeft:
                    idx === 0 ? "none" : "1px solid var(--bjhunt-border, #3d3a39)",
                }}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: active ? TONE_COLORS[tone] : "currentColor" }}
                />
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active tool panel */}
        <div className="border" style={CARD_STYLE}>
          {/* Tool header */}
          <header
            className="flex items-center justify-between px-6 py-4 border-b flex-wrap gap-3"
            style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <tool.icon
                className="w-4 h-4 shrink-0"
                style={{ color: TONE_COLORS[CATEGORY_TONE[tool.category] || "neutral"] }}
              />
              <h3
                className="m-0"
                style={{
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontWeight: 600,
                  fontSize: 16,
                  color: "var(--bjhunt-text)",
                }}
              >
                {tool.name}
              </h3>
              <span
                style={{
                  fontFamily: "var(--bjhunt-font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: TONE_COLORS[CATEGORY_TONE[tool.category] || "neutral"],
                  border: `1px solid ${TONE_COLORS[CATEGORY_TONE[tool.category] || "neutral"]}`,
                  borderRadius: "var(--bjhunt-radius-sm, 4px)",
                  padding: "2px 6px",
                }}
              >
                {tool.category}
              </span>
            </div>
            <span
              style={{
                fontFamily: "var(--bjhunt-font-sans)",
                fontSize: 13,
                color: "var(--bjhunt-text-muted)",
              }}
            >
              {tool.description}
            </span>
          </header>

          {/* Input area */}
          <div
            className="px-6 py-4 border-b"
            style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
          >
            <label
              className="block mb-2"
              style={{
                fontFamily: "var(--bjhunt-font-sans)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--bjhunt-text)",
              }}
            >
              {tool.inputLabel}
            </label>
            {tool.inputType === "textarea" ? (
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    execute();
                  }
                }}
                placeholder={tool.inputPlaceholder}
                rows={tool.id === "iam_audit" ? 8 : 4}
                className="w-full outline-none resize-y px-3 py-2.5 min-h-[60px]"
                style={inputBaseStyle}
                spellCheck={false}
              />
            ) : (
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    execute();
                  }
                }}
                placeholder={tool.inputPlaceholder}
                className="w-full outline-none px-3"
                style={{ ...inputBaseStyle, height: 40 }}
                spellCheck={false}
              />
            )}

            <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
              <span
                style={{
                  fontFamily: "var(--bjhunt-font-mono)",
                  fontSize: 12,
                  color: "var(--bjhunt-text-muted)",
                }}
              >
                {tool.inputType === "textarea" ? "Ctrl+Enter to execute" : "Enter to execute"}
              </span>
              <Button
                variant="state" state="success"
                size="md"
                onClick={execute}
                disabled={loading || !inputValue.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    <span>Executing</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-2" />
                    <span>Execute</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Output area */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
              <Eyebrow>Output</Eyebrow>
              {result && (
                <div className="flex items-center gap-4 flex-wrap">
                  <StatusDot
                    state={result.status === "success" ? "success" : "critical"}
                    label={
                      <span
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color:
                            result.status === "success"
                              ? "var(--bjhunt-status-success, #00d992)"
                              : "var(--bjhunt-status-danger, #fb565b)",
                        }}
                      >
                        {result.status}
                      </span>
                    }
                  />
                  <div
                    className="flex items-center gap-1"
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{result.durationMs}ms</span>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    {new Date(result.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <button
                    onClick={copyOutput}
                    className="inline-flex items-center gap-1 transition-colors"
                    style={{
                      fontFamily: "var(--bjhunt-font-sans)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              )}
            </div>

            <div
              className={cn("min-h-[120px] max-h-[400px] overflow-auto")}
              style={{
                background: "var(--bjhunt-bg, #050507)",
                border: "1px solid var(--bjhunt-border, #3d3a39)",
                borderLeftWidth: 2,
                borderLeftColor:
                  result?.status === "success"
                    ? "var(--bjhunt-status-success, #00d992)"
                    : result?.status === "error"
                      ? "var(--bjhunt-status-danger, #fb565b)"
                      : "var(--bjhunt-border, #3d3a39)",
                borderRadius: "var(--bjhunt-radius, 6px)",
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--bjhunt-text-muted)" }} />
                  <span
                    className="ml-2 animate-pulse"
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    Executing {tool.name}...
                  </span>
                </div>
              ) : result ? (
                <pre
                  className="p-4 whitespace-pre-wrap break-words"
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--bjhunt-text)",
                    margin: 0,
                  }}
                >
                  {formatOutput(result.output)}
                </pre>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    Output will appear here after execution
                  </span>
                </div>
              )}
            </div>

            {result?.meta && Object.keys(result.meta).length > 0 && (
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {Object.entries(result.meta).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--bjhunt-text-muted)",
                      }}
                    >
                      {key}:
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 12,
                        color: "var(--bjhunt-text)",
                      }}
                    >
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Execution history */}
        {history.length > 0 && (
          <section className="mt-8">
            <div className="mb-3">
              <Eyebrow>Recent Executions ({history.length})</Eyebrow>
            </div>
            <div className="border" style={CARD_STYLE}>
              {history.map((entry, idx) => {
                const entryTool = TOOLS.find((t) => t.id === entry.tool);
                const Icon = entryTool?.icon || Terminal;
                const tone = CATEGORY_TONE[entryTool?.category || ""] || "neutral";

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveTool(entry.tool);
                      setResult(entry);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]",
                      idx > 0 && "border-t"
                    )}
                    style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: TONE_COLORS[tone] }} />
                    <span
                      className="shrink-0 w-[100px]"
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 13,
                        color: "var(--bjhunt-text)",
                      }}
                    >
                      {entryTool?.name || entry.tool}
                    </span>
                    <span
                      className="flex-1 truncate"
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 13,
                        color: "var(--bjhunt-text-muted)",
                      }}
                    >
                      {entry.output.slice(0, 100)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusDot state={entry.status === "success" ? "success" : "critical"} />
                      <span
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 12,
                          color: "var(--bjhunt-text-muted)",
                        }}
                      >
                        {entry.durationMs}ms
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 12,
                          color: "var(--bjhunt-text-muted)",
                        }}
                      >
                        {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PlanGate>
  );
}
