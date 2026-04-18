'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        fontFamily: 'var(--bjhunt-font-mono)',
        fontSize: 'var(--bjhunt-text-xs)',
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        background: 'var(--bjhunt-brand-primary)',
        color: 'var(--bjhunt-brand-primary-fg)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <Printer style={{ width: 12, height: 12 }} />
      Print
    </button>
  )
}
