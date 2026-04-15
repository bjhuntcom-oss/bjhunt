"use client"

import { useEffect, useLayoutEffect, useRef } from "react"

interface ChatShortcuts {
  onNewConversation: () => void
  onToggleWebSearch: () => void
  onToggleSettings: () => void
  onTogglePromptLibrary: () => void
  onToggleSearch: () => void
  onExport: () => void
}

export function useChatShortcuts(shortcuts: ChatShortcuts) {
  const ref = useRef(shortcuts)
  useLayoutEffect(() => { ref.current = shortcuts })

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return

      switch (e.key) {
        case "k":
          e.preventDefault()
          ref.current.onNewConversation()
          break
        case "m":
          e.preventDefault()
          ref.current.onToggleSettings()
          break
        case "/":
          e.preventDefault()
          ref.current.onTogglePromptLibrary()
          break
        case "f":
          e.preventDefault()
          ref.current.onToggleSearch()
          break
        case "g":
          e.preventDefault()
          ref.current.onToggleWebSearch()
          break
        case "e":
          e.preventDefault()
          ref.current.onExport()
          break
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, []) // stable — attaches once
}
