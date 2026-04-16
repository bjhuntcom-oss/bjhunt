"use client";

import { useState, useCallback } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import { cn } from "@/lib/utils";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
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
  CheckCircle2,
  XCircle,
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
    inputPlaceholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.POstGetfAytaZS82wHcjoTyoqhMyxXiWdR7Nn7A29DNSl0EiXLdwJ6xC6AfgZWF1bOsS_TuYI3OG85AmiExREkrS6tDfTQ2B3WXlrr-wp5AokiRbz3_oB4OxG-W9KcEEbDRcZc0nH3L7LzYptiy1PtAylQGxHTWZXtGz4ht0bAecBgmpdgXMguEIcoqPJ1n3pIWk_dUZegpqx0Lka21H6XxUTxiy8OcaarA8zdnPUnV6AmNP3ecFawIFYdvJB_cm-GvpCSbr8G8y_Mllj8f4x9nBH8pQux89_6gUY618iYv7tuPWBFfEbLxtF2pZS6YC1aSfLQxaOoaBSTlpVbHEaJd2T",
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
    inputPlaceholder: '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Action": "s3:*",\n      "Resource": "*"\n    }\n  ]\n}',
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

// ── Category colors ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  execution: "var(--danger)",
  query: "#60a5fa",
  intel: "var(--warning)",
  utility: "var(--success)",
  cloud: "#a78bfa",
  recon: "#f97316",
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

  // ── Execute ─────────────────────────────────────────────────────────

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

  // ── Copy output ─────────────────────────────────────────────────────

  const copyOutput = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Format output (try JSON pretty-print) ──────────────────────────

  const formatOutput = (output: string): string => {
    try {
      const parsed = JSON.parse(output);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return output;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <PlanGate requiredPlan="enterprise" currentPlan={plan} featureName="Tool Playground">
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.2em] text-white">
          TOOL PLAYGROUND
        </h1>
        <p className="text-[10px] text-[var(--text-subtle)] font-mono mt-1">
          Execute engine tools directly -- bash commands, graph queries, CVE lookups, JWT analysis
        </p>
      </div>

      {/* Tool selector tabs */}
      <div className="flex items-center gap-0 mb-6 flex-wrap">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = activeTool === t.id;
          const catColor = CATEGORY_COLORS[t.category] || "var(--text-muted)";

          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTool(t.id);
                setResult(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[9px] font-mono uppercase tracking-widest border transition-colors",
                active
                  ? "text-white bg-[var(--bg-card)] border-[var(--border-strong)]"
                  : "text-[var(--text-subtle)] border-[var(--border)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-input)]/30",
                t.id !== TOOLS[0]!.id && "border-l-0",
              )}
            >
              <Icon
                className="w-3 h-3 flex-shrink-0"
                style={{ color: active ? catColor : undefined }}
              />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active tool panel */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)]">
        {/* Tool header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <tool.icon
              className="w-3.5 h-3.5"
              style={{ color: CATEGORY_COLORS[tool.category] }}
            />
            <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
              {tool.name}
            </span>
            <span
              className="text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 border"
              style={{
                color: CATEGORY_COLORS[tool.category],
                borderColor: (CATEGORY_COLORS[tool.category] || "var(--border)") + "40",
              }}
            >
              {tool.category}
            </span>
          </div>
          <span className="text-[9px] font-mono text-[var(--text-subtle)]">
            {tool.description}
          </span>
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1.5">
            {tool.inputLabel}
          </div>
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-mono text-white px-3 py-2.5 outline-none placeholder:text-[var(--text-subtle)] resize-y min-h-[60px]"
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-mono text-white px-3 py-2.5 outline-none placeholder:text-[var(--text-subtle)]"
              spellCheck={false}
            />
          )}

          {/* Execute button */}
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[8px] font-mono text-[var(--text-subtle)]">
              {tool.inputType === "textarea" ? "Ctrl+Enter to execute" : "Enter to execute"}
            </span>
            <button
              onClick={execute}
              disabled={loading || !inputValue.trim()}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-[9px] font-mono uppercase tracking-widest border transition-colors",
                loading || !inputValue.trim()
                  ? "text-[var(--text-subtle)] border-[var(--border)] cursor-not-allowed opacity-50"
                  : "text-[var(--success)] border-[var(--success)]/40 hover:border-[var(--success)] hover:bg-[var(--success)]/5",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  <span>Execute</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output area */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
              Output
            </div>
            {result && (
              <div className="flex items-center gap-3">
                {/* Status */}
                <div className="flex items-center gap-1">
                  {result.status === "success" ? (
                    <CheckCircle2 className="w-2.5 h-2.5" style={{ color: "var(--success)" }} />
                  ) : (
                    <XCircle className="w-2.5 h-2.5" style={{ color: "var(--danger)" }} />
                  )}
                  <span
                    className="text-[8px] font-mono uppercase tracking-wider"
                    style={{ color: result.status === "success" ? "var(--success)" : "var(--danger)" }}
                  >
                    {result.status}
                  </span>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-[var(--text-subtle)]" />
                  <span className="text-[8px] font-mono text-[var(--text-muted)]">
                    {result.durationMs}ms
                  </span>
                </div>

                {/* Timestamp */}
                <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                  {new Date(result.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>

                {/* Copy */}
                <button
                  onClick={copyOutput}
                  className="flex items-center gap-1 text-[8px] font-mono text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Output box */}
          <div
            className={cn(
              "bg-[var(--bg)] border min-h-[120px] max-h-[400px] overflow-auto",
              result?.status === "success"
                ? "border-l-2 border-l-[var(--success)] border-t-[var(--border)] border-r-[var(--border)] border-b-[var(--border)]"
                : result?.status === "error"
                  ? "border-l-2 border-l-[var(--danger)] border-t-[var(--border)] border-r-[var(--border)] border-b-[var(--border)]"
                  : "border-[var(--border)]",
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-subtle)]" />
                <span className="ml-2 text-[10px] font-mono text-[var(--text-subtle)] animate-pulse">
                  Executing {tool.name}...
                </span>
              </div>
            ) : result ? (
              <pre className="text-[10px] font-mono text-[var(--text-muted)] p-3 whitespace-pre-wrap break-words leading-relaxed">
                {formatOutput(result.output)}
              </pre>
            ) : (
              <div className="flex items-center justify-center py-8">
                <span className="text-[10px] font-mono text-[var(--text-subtle)]">
                  Output will appear here after execution
                </span>
              </div>
            )}
          </div>

          {/* Meta info */}
          {result?.meta && Object.keys(result.meta).length > 0 && (
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {Object.entries(result.meta).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1">
                  <span className="text-[7px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                    {key}:
                  </span>
                  <span className="text-[8px] font-mono text-[var(--text-muted)]">
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
        <div className="mt-6">
          <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-2">
            Recent Executions ({history.length})
          </div>
          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            {history.map((entry, idx) => {
              const entryTool = TOOLS.find((t) => t.id === entry.tool);
              const Icon = entryTool?.icon || Terminal;
              const catColor = CATEGORY_COLORS[entryTool?.category || ""] || "var(--text-muted)";

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveTool(entry.tool);
                    setResult(entry);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[var(--bg-input)]/30 transition-colors"
                >
                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color: catColor }} />
                  <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider flex-shrink-0 w-[70px]">
                    {entryTool?.name || entry.tool}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--text-subtle)] truncate flex-1">
                    {entry.output.slice(0, 80)}...
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {entry.status === "success" ? (
                      <CheckCircle2 className="w-2.5 h-2.5" style={{ color: "var(--success)" }} />
                    ) : (
                      <XCircle className="w-2.5 h-2.5" style={{ color: "var(--danger)" }} />
                    )}
                    <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                      {entry.durationMs}ms
                    </span>
                    <span className="text-[8px] font-mono text-[var(--text-subtle)]">
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
        </div>
      )}
    </div>
    </PlanGate>
  );
}
