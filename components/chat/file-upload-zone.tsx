/// <reference lib="dom" />
"use client";

import { useState, useCallback } from "react";
import { X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PendingFile {
  id: string;
  file: File;
  preview?: string;
}

interface FileUploadZoneProps {
  files: PendingFile[];
  onAdd: (files: PendingFile[]) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

export function FileUploadZone({ files, onAdd, onRemove, children }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback((rawFiles: File[]) => {
    const newFiles: PendingFile[] = rawFiles.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));
    onAdd(newFiles);
  }, [onAdd]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div
      className={cn("relative", dragging && "ring-1 ring-[var(--success)] ring-inset")}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Files preview */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1.5 max-w-[160px]">
              {f.preview ? (
                <img src={f.preview} alt={f.file.name} className="w-6 h-6 object-cover flex-shrink-0" />
              ) : (
                <FileText className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
              )}
              <span className="text-[9px] text-white truncate">{f.file.name}</span>
              <button onClick={() => onRemove(f.id)} className="text-[var(--text-muted)] hover:text-[var(--danger)] flex-shrink-0">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {dragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)]/80 border border-[var(--success)] z-10">
          <span className="text-[11px] text-[var(--success)] uppercase tracking-widest">
            Déposer les fichiers ici
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
