"use client";

import { useState } from "react";
import { FileText, Shield, Clock, Table, Loader2 } from "lucide-react";
import { browserBackendFetch } from "@/lib/backend-client";

interface ReportExportBarProps {
  engagementId: string;
}

type ReportType = "executive" | "hackerone" | "timeline" | "csv";

const REPORT_BUTTONS: { type: ReportType; label: string; icon: typeof FileText }[] = [
  { type: "executive", label: "Executive Summary", icon: FileText },
  { type: "hackerone", label: "HackerOne Report", icon: Shield },
  { type: "timeline", label: "Timeline", icon: Clock },
  { type: "csv", label: "CSV Export", icon: Table },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportExportBar({ engagementId }: ReportExportBarProps) {
  const [loading, setLoading] = useState<Record<ReportType, boolean>>({
    executive: false,
    hackerone: false,
    timeline: false,
    csv: false,
  });

  async function handleExport(type: ReportType) {
    setLoading((prev) => ({ ...prev, [type]: true }));

    try {
      const res = await browserBackendFetch(`/api/reports/${engagementId}/${type}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        console.error("Report export error:", err);
        return;
      }

      if (type === "csv") {
        // CSV is returned as raw text with Content-Disposition header
        const text = await res.text();
        const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
        const disposition = res.headers.get("content-disposition");
        const filenameMatch = disposition?.match(/filename="(.+)"/);
        const filename = filenameMatch?.[1] || `findings-export.csv`;
        downloadBlob(blob, filename);
      } else {
        // Markdown reports return JSON with { markdown, filename }
        const data = await res.json();
        const blob = new Blob([data.markdown], { type: "text/markdown;charset=utf-8" });
        downloadBlob(blob, data.filename || `report.md`);
      }
    } catch (err) {
      console.error("Report export failed:", err);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
      <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mr-2">
        Export
      </span>
      {REPORT_BUTTONS.map(({ type, label, icon: Icon }) => {
        const isLoading = loading[type];
        return (
          <button
            key={type}
            onClick={() => handleExport(type)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-strong)] hover:bg-[var(--bg-input)] disabled:opacity-50 disabled:cursor-wait transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Icon className="w-3 h-3" />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
