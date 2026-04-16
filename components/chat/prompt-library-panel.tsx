// components/chat/prompt-library-panel.tsx
"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Category = "Pentest" | "Code" | "Analyse" | "Rédaction" | "Général" | "Mes prompts"

interface Prompt {
  id: string
  title: string
  content: string
}

const PRESET_PROMPTS: Record<Exclude<Category, "Mes prompts">, Prompt[]> = {
  Pentest: [
    { id: "p1", title: "Scan réseau", content: "Effectue un scan de reconnaissance sur la cible [IP/domaine] et identifie les ports ouverts, les services exposés et les vulnérabilités potentielles." },
    { id: "p2", title: "Analyse de vulnérabilité", content: "Analyse les vulnérabilités de l'application web à l'adresse [URL] en recherchant les injections SQL, XSS, CSRF et les mauvaises configurations." },
    { id: "p3", title: "Rapport de pentest", content: "Génère un rapport de pentest professionnel pour [CIBLE] incluant : résumé exécutif, méthodologie, findings critiques, score CVSS et recommandations de remédiation." },
    { id: "p4", title: "Analyse de logs", content: "Analyse ces logs de sécurité et identifie les patterns suspects, tentatives d'intrusion, anomalies et les IOC (Indicators of Compromise) :\n\n[COLLER LES LOGS ICI]" },
  ],
  Code: [
    { id: "c1", title: "Revue de sécurité", content: "Effectue une revue de sécurité du code suivant en cherchant les vulnérabilités OWASP Top 10, les failles logiques et les mauvaises pratiques :\n\n```\n[CODE]\n```" },
    { id: "c2", title: "Expliquer le code", content: "Explique ce code en détail : son rôle, sa logique, ses dépendances et ses potentiels problèmes :\n\n```\n[CODE]\n```" },
    { id: "c3", title: "Débogage", content: "Aide-moi à déboguer ce problème. Voici l'erreur : [ERREUR]\n\nVoici le code concerné :\n```\n[CODE]\n```" },
    { id: "c4", title: "Optimiser", content: "Optimise ce code en termes de performance, lisibilité et bonnes pratiques :\n\n```\n[CODE]\n```" },
  ],
  Analyse: [
    { id: "a1", title: "Analyse de fichier", content: "Analyse ce fichier et fournis : type, contenu suspect, métadonnées importantes, hash et indicateurs de compromission potentiels." },
    { id: "a2", title: "Threat intelligence", content: "Fournis une analyse threat intelligence sur [IOC/acteur/malware] incluant : TTPs (MITRE ATT&CK), campagnes connues, cibles habituelles et contre-mesures." },
    { id: "a3", title: "Analyse réseau", content: "Analyse cette capture réseau [PCAP/logs] et identifie : protocoles utilisés, communications suspectes, exfiltration de données potentielle et C2." },
  ],
  Rédaction: [
    { id: "r1", title: "Rapport d'incident", content: "Rédige un rapport d'incident de sécurité pour : [DESCRIPTION DE L'INCIDENT]\n\nInclure : timeline, impact, cause racine, mesures prises et recommandations." },
    { id: "r2", title: "Note technique", content: "Rédige une note technique concise sur [SUJET] destinée à [PUBLIC CIBLE] incluant les points essentiels et les actions recommandées." },
    { id: "r3", title: "Email sécurité", content: "Rédige un email professionnel pour informer [DESTINATAIRE] d'un problème de sécurité concernant [PROBLÈME] avec les actions requises." },
  ],
  Général: [
    { id: "g1", title: "Résumer", content: "Résume le contenu suivant en points clés concis :\n\n[CONTENU]" },
    { id: "g2", title: "Traduire", content: "Traduis le texte suivant en [LANGUE CIBLE] en conservant le sens technique :\n\n[TEXTE]" },
    { id: "g3", title: "Comparer", content: "Compare [A] et [B] en termes de [CRITÈRES] et fournis une recommandation." },
  ],
}

const STORAGE_KEY = "bjhunt:prompt-library-custom"

interface PromptLibraryPanelProps {
  onSelect: (content: string) => void
  onClose: () => void
}

export function PromptLibraryPanel({ onSelect, onClose }: PromptLibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("Pentest")
  const [customPrompts, setCustomPrompts] = useState<Prompt[]>([])
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setCustomPrompts(JSON.parse(stored) as Prompt[])
    } catch {
      // ignore
    }
  }, [])

  function saveCustom(prompts: Prompt[]) {
    setCustomPrompts(prompts)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts))
  }

  function addCustom() {
    if (!newTitle.trim() || !newContent.trim()) return
    const p: Prompt = { id: `custom-${Date.now()}`, title: newTitle.trim(), content: newContent.trim() }
    saveCustom([...customPrompts, p])
    setNewTitle("")
    setNewContent("")
    setAdding(false)
  }

  function deleteCustom(id: string) {
    saveCustom(customPrompts.filter((p) => p.id !== id))
  }

  const categories: Category[] = ["Pentest", "Code", "Analyse", "Rédaction", "Général", "Mes prompts"]
  const prompts: Prompt[] =
    activeCategory === "Mes prompts" ? customPrompts : PRESET_PROMPTS[activeCategory]

  return (
    <div
      className="w-80 flex flex-col h-full flex-shrink-0"
      style={{
        background: "rgba(10, 10, 10, 0.9)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
        <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Bibliothèque de prompts</span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-3" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-2 py-1 text-[8px] uppercase tracking-wider transition-colors",
              activeCategory === cat
                ? "bg-white text-black"
                : "text-[var(--text-muted)] hover:text-white border border-[var(--border)] hover:border-[var(--border-strong)]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Prompts list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {prompts.length === 0 && activeCategory === "Mes prompts" && (
          <p className="text-[10px] text-[var(--text-muted)] text-center py-4">
            Aucun prompt personnalisé. Ajoutez-en un ci-dessous.
          </p>
        )}
        {prompts.map((p) => (
          <div key={p.id} className="group">
            <button
              onClick={() => { onSelect(p.content); onClose() }}
              className="w-full text-left px-3 py-2.5 transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(255, 255, 255, 0.06)";
                el.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(255, 255, 255, 0.03)";
                el.style.borderColor = "rgba(255, 255, 255, 0.06)";
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-medium text-white">{p.title}</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{p.content}</p>
                </div>
                {activeCategory === "Mes prompts" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCustom(p.id) }}
                    className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Add custom prompt */}
      {activeCategory === "Mes prompts" && (
        <div className="p-3" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          {adding ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titre du prompt"
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 text-[10px] text-white placeholder:text-[var(--text-muted)] outline-none"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Contenu du prompt..."
                rows={3}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 text-[10px] text-white placeholder:text-[var(--text-muted)] outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setAdding(false)} className="flex-1 py-1.5 text-[9px] uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] hover:text-white">Annuler</button>
                <button onClick={addCustom} className="flex-1 py-1.5 text-[9px] uppercase tracking-wider bg-white text-black hover:bg-white/90">Sauvegarder</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-[9px] uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] hover:text-white hover:border-[var(--border-strong)] transition-colors"
            >
              <Plus className="w-3 h-3" />
              Nouveau prompt
            </button>
          )}
        </div>
      )}
    </div>
  )
}
