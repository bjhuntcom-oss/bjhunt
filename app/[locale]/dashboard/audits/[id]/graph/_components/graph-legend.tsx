/**
 * GraphLegend — file-import dropzone for the knowledge graph.
 *
 * Conceptually a "legend" panel that also accepts new data sources to feed the
 * graph. Renders a hairline drop zone with mono labels.
 */
'use client'

import { useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { browserBackendFetch } from '@/lib/backend-client'
import { Eyebrow, Body } from '@/components/ui/typography'
import { SUPPORTED_FORMATS } from './graph-types'

export function ImportDataPanel({
  engagementId,
  onImportComplete,
}: {
  engagementId: string
  onImportComplete: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ nodesAdded: number; edgesAdded: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await browserBackendFetch(
        `/api/engagements/${engagementId}/graph/ingest`,
        { method: 'POST', body: formData },
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Import failed' }))
        setError(data.error || 'Import failed')
        return
      }

      const data = await res.json()
      setResult(data)
      setFile(null)
      onImportComplete()
    } catch {
      setError('Network error during import')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] rounded-[6px]">
      <div className="px-4 py-3 border-b border-[var(--bjhunt-border)] flex items-center gap-3 flex-wrap">
        <Upload size={14} className="text-[var(--bjhunt-text-muted)]" aria-hidden />
        <Eyebrow>Import data</Eyebrow>
        <Body size="sm" muted className="ml-auto font-mono">
          {SUPPORTED_FORMATS.map((f) => f.ext).join(' · ')}
        </Body>
      </div>

      <div className="p-4">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'border border-dashed px-4 py-8 text-center cursor-pointer transition-colors rounded-[6px]',
            dragOver
              ? 'border-[var(--state-success)] bg-[var(--state-success-tint)]'
              : 'border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)]',
          )}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.xml,.jsonl,.json,.sarif,.zip,.txt'
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0]
              if (f) handleFile(f)
            }
            input.click()
          }}
          role="button"
          tabIndex={0}
        >
          {file ? (
            <div className="inline-flex items-center justify-center gap-3">
              <FileText size={16} className="text-[var(--state-success)]" aria-hidden />
              <span className="font-mono text-[13px] text-[var(--bjhunt-text)]">{file.name}</span>
              <span className="font-mono text-[12px] text-[var(--bjhunt-text-muted)]">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          ) : (
            <>
              <Upload size={20} className="text-[var(--bjhunt-text-muted)] mx-auto mb-2" aria-hidden />
              <Body className="text-[13px]">Drop scan output here or click to browse</Body>
              <Body size="sm" muted className="mt-1">
                Auto-detects format from extension and content.
              </Body>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-[6px]"
          >
            {importing ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={12} />
                Import
              </>
            )}
          </button>

          {result && (
            <div className="inline-flex items-center gap-1.5 text-[12px] font-mono text-[var(--state-success)]">
              <CheckCircle2 size={12} />
              {result.nodesAdded} nodes, {result.edgesAdded} edges added
            </div>
          )}

          {error && (
            <div className="inline-flex items-center gap-1.5 text-[12px] font-mono text-[var(--state-critical)]">
              <XCircle size={12} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
