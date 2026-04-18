# Chat follow-up audit — 2026-04-17

Scope: exhaustive review of the chat UI beyond the SSE stream fixes already landed (commits 56ea0a6, ecb3699, 1d0c2fa, 7420d07, d3d4daf, etc.). Read-only on code. Playwright MCP used against prod `https://www.bjhunt.com/fr/dashboard/chat` signed in as `admin@bjhunt.com`. Evidence screenshots live next to this file.

## Summary

- Tested: ~55 / 69 checklist items (skipped a few redundant items — Copy worked, Stop worked, Enter/Shift+Enter worked, tokens streamed progressively — all already verified in W1/W2).
- Findings: **27** — 3 Critical, 11 High, 9 Medium, 4 Low.
- Top pattern: the `MessageBubble` component exposes a full toolbar (Régénérer / Bon / Mauvais / Éditer / Fork / Retry) but `app/[locale]/dashboard/chat/page.tsx` wires **none** of the handlers, so those buttons are *visually active but functionally dead*. Same pattern for `ModelSettingsPanel` state (`temperature`, `maxTokens`, `topP`, `systemPrompt`), the `webSearch` toggle, several slash commands, the `Run` button on code blocks, and the keyboard shortcuts `Ctrl+/` / `Ctrl+M` advertised in tooltips.

## Findings

### FU-01 — Régénérer button on AI messages is a no-op
- **Severity**: High
- **Category**: Interaction
- **Reproduction**: Load any past conversation, hover an assistant bubble, click the circular-arrow "Régénérer" icon. Nothing happens; no network call, no state transition (verified: `statusText` remains `READY`, no streaming indicator, no AbortController created).
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:1590` — `<MessageBubble message={msg} onRetry={...} />` is the ONLY prop passed. `onRegenerate`, `onEdit`, `onFork`, `onFeedback` are all `undefined`. `components/chat/message-actions.tsx:42` wires `onClick={onRegenerate}` which becomes `onClick={undefined}` → native button click does nothing.
- **Fix proposed**: wire `onRegenerate={() => { setMessages(prev => prev.filter(m => m.id !== msg.id)); handleSend(prevUserMessage); }}` in the `messages.map` renderer, or remove the button from the DOM when no handler is provided.

### FU-02 — Éditer button opens edit mode but Envoyer silently discards the edit
- **Severity**: High
- **Category**: Interaction
- **Reproduction**: On any user bubble, click the pencil (Éditer). A textarea opens with `Annuler` / `Envoyer`. Change the text to `edited-text-TEST`, click `Envoyer`. The edit mode closes but the original content remains (`<p>new</p>`). Verified via DOM inspection: `userMsgParagraphs: ["new"]` post-click.
- **File / line**: `components/chat/message-bubble.tsx:151` (`commitEdit()` calls `onEdit?.(editValue)` which is optional-chained → silent noop) and `app/[locale]/dashboard/chat/page.tsx:1590` (no `onEdit` prop passed).
- **Fix proposed**: in the page, wire `onEdit={(newContent) => { /* update messages, truncate history below edited message, re-send */ }}`. If edit-and-resend is out of scope, hide the pencil icon entirely.

### FU-03 — Bon / Mauvais (thumbs feedback) is local state only, never persisted
- **Severity**: Medium
- **Category**: Interaction
- **Reproduction**: Click ThumbsUp on an assistant message. Colour changes to green locally. Reload the page → feedback is gone. No `/api/feedback` or similar call observed (no `onFeedback` handler wired; `components/chat/message-actions.tsx:24`).
- **File / line**: `components/chat/message-actions.tsx:24` (`handleFeedback` only calls `setFeedback(type)`), `app/[locale]/dashboard/chat/page.tsx:1590` (no `onFeedback` prop).
- **Fix proposed**: either implement a `POST /api/chat/messages/:id/feedback` endpoint and wire `onFeedback`, or hide the buttons. Keeping a UI that pretends to capture feedback but discards it erodes trust in the rating system.

### FU-04 — Ctrl+/ and Ctrl+M keyboard shortcuts do nothing
- **Severity**: Medium
- **Category**: Interaction / A11y
- **Reproduction**: Focus anywhere on the page, press `Control+/` then `Control+M`. Tooltips on the toolbar buttons advertise these shortcuts (`components/chat/chat-input.tsx:273` and `:283`) but no event listener implements them. Verified via Playwright: both panels remain closed after pressing.
- **File / line**: tooltip lies in `components/chat/chat-input.tsx:273,283`. No matching handler anywhere in `app/[locale]/dashboard/chat/*` or `components/chat/*` (grep for `ctrlKey|metaKey` returned zero hits).
- **Fix proposed**: add a `useEffect` in the page that listens for `keydown` with `(e.ctrlKey || e.metaKey) && e.key === '/'` → `setShowPromptLibrary(v => !v)`, and `'m'` → `setShowSettings(v => !v)`. Or strip the shortcut hints from the tooltips.

### FU-05 — Model settings (temperature / maxTokens / topP / systemPrompt) are never sent to the backend
- **Severity**: Critical
- **Category**: State
- **Reproduction**: Open `Paramètres du modèle`, drag Temperature to 2.0, type a system prompt, close. Send a message. Inspect network: the `POST /api/proxy/chat/prepare` payload contains only `{ message, engagementId, agentGraph, conversationId? }` — no `temperature`, `maxTokens`, `topP`, `systemPrompt`.
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:558-568` builds `requestBody` without reading `modelSettings`. The state is declared at line 148 and referenced ONLY by the panel renderer at line 1730.
- **Fix proposed**: spread `modelSettings` (or a whitelisted subset) into `requestBody` and have `backend/src/routes/chat.ts` forward it to the LangGraph run config. Otherwise remove the panel — it's pure theatre.

### FU-06 — Recherche web (globe) toggle is decorative, never sent to backend
- **Severity**: High
- **Category**: State
- **Reproduction**: Click the globe icon. The "Recherche web active" hint appears in green. Send a message. Network payload does NOT include `webSearch: true`.
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:143` declares `webSearch` state; the value is read ONLY at line 1704 (for the `ChatInput` prop). `modelSettings.webSearch` (line 154) is duplicated state that is also unused on the wire. Neither is written into `requestBody` (line 558-568).
- **Fix proposed**: decide which one is canonical, fold them, send the flag to the backend, and have it route to a `web_search` tool in the LangGraph graph.

### FU-07 — `Run` button on bash/python code blocks has no handler
- **Severity**: Medium
- **Category**: Interaction
- **Reproduction**: Any assistant response with a fenced `\`\`\`bash` or `\`\`\`python` block renders a green `▶ Run` button next to `Copier` (header of the code block). Clicking it does nothing.
- **File / line**: `components/chat/message-bubble.tsx:108-113` — `<button className="...">Run</button>` with no `onClick`.
- **Fix proposed**: either wire it to a `/api/chat/tools/bash` endpoint that runs the snippet in the Kali sandbox (current engagement) and streams the output back as a tool-call block, or remove it. A green "Run" button on a pentest platform that does nothing is actively misleading.

### FU-08 — Inline `[1]`, `[2]`, `[new]` from DECEPTICON prompts look clickable but aren't
- **Severity**: Medium
- **Category**: Rendering / UX
- **Reproduction**: Load the conversation `Dis juste: AAA`. The agent's startup prompt renders `[1] or [2] — Resume an existing engagement / [new] — Start a new engagement`. These are styled as pill-shaped code chips. User naturally tries to click them.
- **Evidence**: `codes.map(...)` DOM probe → `{ hasOnClick: false, cursor: 'auto', role: null, ariaLabel: null }`.
- **File / line**: `components/chat/message-bubble.tsx:262` (inline `<code>` renderer). The problem is upstream: DECEPTICON's orchestrator emits `[1]`/`[2]`/`[new]` as chat-driven "quick actions" but the frontend has no parser.
- **Fix proposed**: add a post-processing step in the ReactMarkdown `code` override: when the code text matches `/^\[(\d+|new|cancel)\]$/`, render a proper `<button>` that auto-sends the matching text (`"1"`, `"2"`, `"new"`) via `handleSend`. Alternatively adjust the DECEPTICON prompt to emit explicit slash-command chips.

### FU-09 — Several slash commands do nothing (`/scan`, `/report`, `/search`, `/terminal`)
- **Severity**: Medium
- **Category**: Interaction
- **Reproduction**: Type `/scan`, the command appears in the menu with a description. Press Enter. The slash-command menu selects `/scan ` (appending a space) but never triggers any action; the user then must type a target and press Enter again, at which point the string is forwarded to the LLM as raw text (because `slashCmd.action` is undefined at `page.tsx:449`).
- **File / line**: `components/chat/slash-commands.tsx:149-168` — commands `/scan`, `/report`, `/search`, `/terminal` have no `action`. `/model` has an action that just posts a fake assistant message `"/model\n\nAffichage du modele actuel..."` (lines 112-115) — also effectively a no-op.
- **Fix proposed**: either implement them (e.g. `/scan <target>` creates an engagement with that target and triggers a recon graph) or drop them from the menu. Currently they suggest capability that doesn't exist.

### FU-10 — `/clear` clears the UI but not the DB; next message continues the same conversation
- **Severity**: High
- **Category**: State
- **Reproduction**: In a conversation with 5 messages, type `/clear`, press Enter. Messages disappear from UI. Type a new message — it gets sent with the same `conversationId` (line 563-564 of page.tsx still has the old `activeConversationId`). Reload the page → the cleared messages come back from the DB, plus your new message at the bottom.
- **File / line**: `components/chat/slash-commands.tsx:57` — `ctx.clearMessages()` only does `setMessages([])` etc.; it doesn't call `setActiveConversationId(null)`, doesn't call `DELETE /api/chat/conversations/:id/messages`, and doesn't spawn a new engagement.
- **Fix proposed**: make `/clear` create a new conversation (reuse `startNewConversation()`), OR make it delete server-side messages. Document whichever behaviour is chosen.

### FU-11 — Links inside assistant markdown open in same tab with no `rel="noopener noreferrer"`
- **Severity**: High (security + UX)
- **Category**: Rendering / Security
- **Reproduction**: Ask the agent to return a response containing `[Google](https://google.com)`. The rendered link will be a bare `<a href="...">` — `target=""` and `rel=""`. Clicking it navigates away from the chat (losing all ephemeral state: pending streams, OPPLAN panel, graph). Untrusted URLs from the LLM can also use `window.opener` for tab-nabbing.
- **File / line**: `components/chat/message-bubble.tsx:253-264` — the `components` override only patches `code`, not `a`. ReactMarkdown's default renderer has no `target`/`rel`.
- **Fix proposed**: add a component override:
  ```tsx
  a: ({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" {...props}>
      {children}
    </a>
  )
  ```
  Consider also prefixing with a `↗` icon and warning that links come from AI output.

### FU-12 — Tool calls from older turns are all collapsed under the LAST assistant message
- **Severity**: High
- **Category**: Rendering / State
- **Reproduction**: Send a message that triggers tool calls. Wait for completion. Send another message that also triggers tool calls. All tool calls from both turns render as a block UNDER the latest assistant message. Earlier assistant messages show zero tool calls.
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:1600` — `{msg.role === "assistant" && i === messages.length - 1 && sortedToolCalls.length > 0 && ...}`. The `toolCalls` state is a flat `Map<string, ToolCall>` with no message-association.
- **Fix proposed**: associate each tool call with the assistant message that spawned it (store `assistantMessageId` on the ToolCall), then render only the tool calls whose `assistantMessageId === msg.id`. Alternatively, store tool calls as part of the message object itself.

### FU-13 — History loads from DB lose tool-call UI entirely
- **Severity**: High
- **Category**: State / Rendering
- **Reproduction**: Open a past conversation where `read_file` and `bash` tool calls were visible mid-turn. Screenshot before vs after reload: after reload they vanish even from the last-assistant position, because `loadHistory` reads `m.toolCalls` from the DB message payload but:
  1. The tool calls map only gets populated (line 330-338) if `m.toolCalls` is non-empty in the payload.
  2. Rendering filter `i === messages.length - 1` excludes any tool call that belonged to a non-terminal assistant message.
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:330` + `:1600`.
- **Fix proposed**: persist tool calls with their owning message in the DB (already partially done — see `m.toolCalls`), render them inline per message regardless of position, and include them in the history hydration path.

### FU-14 — Sidebar does NOT auto-collapse on viewport resize below 768px
- **Severity**: High
- **Category**: Responsive
- **Reproduction**: Open chat at desktop width (sidebar visible). Resize window to 375px × 667px without reloading. The sidebar remains visible, occupying 280px of 375px viewport. Chat textarea is pinched to 72px wide; the message area is essentially invisible. Screenshot: `followup-mobile-375.png`.
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:140-142` — the `if (window.innerWidth < 768) setShowSidebar(false)` runs ONCE on mount. No resize listener, no CSS-driven hiding.
- **Fix proposed**: add `useEffect(() => { const onResize = () => { if (innerWidth < 768) setShowSidebar(false); }; window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, [])`. Additionally, when the sidebar IS shown on mobile, it should use the existing backdrop overlay (already implemented at line 1119) rather than pushing the chat off-screen.

### FU-15 — Tablet breakpoint (768px) layout broken: toolbar icons overflow, Send button cut off
- **Severity**: High
- **Category**: Responsive
- **Reproduction**: Resize to 768×1024. Several toolbar icons (Bibliothèque / Paramètres) are off-screen to the right of the chatbox because the toolbar is a `flex` row without `flex-wrap`. Messages wrap extremely aggressively (bubble max-width `md:max-w-[75%]` at 768px = 288px content). The Send button sits at the right edge of the chatbox, partially clipped. Screenshot: `followup-tablet-768.png`.
- **File / line**: `components/chat/chat-input.tsx:201` — `<div className="flex items-center justify-between mt-1">` has no wrap. `components/chat/message-bubble.tsx:189` — `md:max-w-[75%]` is too aggressive below ~900px viewport.
- **Fix proposed**: add `flex-wrap` to the toolbar row, increase `md:max-w-[75%]` → `md:max-w-[85%]` (or use `ch`-relative), and prioritize the Send button (flex-shrink-0 + higher z-index).

### FU-16 — No focus outline on ANY interactive element — keyboard users are blind
- **Severity**: Critical (WCAG 2.1 AA failure: SC 2.4.7 Focus Visible)
- **Category**: A11y
- **Reproduction**: Tab through the chat page. No button shows a focus indicator. Computed `outline-style: none` for every button checked (Régénérer, Copier, Send, etc.). Verified via `getComputedStyle(focused).outline` → `"rgb(102, 102, 102) none 2px"`.
- **File / line**: most button classNames in the chat use `outline-none` or Tailwind defaults that suppress focus rings. See `chat-input.tsx:195` (textarea: `outline-none`), message bubbles, sidebar buttons, etc. No `:focus-visible` override in `globals.css`.
- **Fix proposed**: add a global `*:focus-visible { outline: 2px solid var(--focus-ring, #fff); outline-offset: 2px; }` style, and stop using `outline-none` on anything focusable. WCAG 2.1 AA is a contractual requirement for public SaaS in EU; this alone fails it.

### FU-17 — Icon-only buttons lack `aria-label` (only `title` attribute)
- **Severity**: High (WCAG 4.1.2 Name, Role, Value)
- **Category**: A11y
- **Reproduction**: `button[title="Joindre un fichier"]` on the toolbar has no accessible name (it's a `<label>` wrapping a hidden `<input type="file">` with only an SVG icon). Same for Dicter, Recherche web, Bibliothèque, Paramètres, all assistant-message icon buttons (Copier le texte, Lire à voix haute).
- **File / line**: `components/chat/chat-input.tsx:213-287`, `components/chat/message-bubble.tsx:272-330`.
- **Fix proposed**: replace `title=` with `aria-label=` (or add both). For the file-upload label, add `role="button"` + `tabIndex={0}` + keyboard handler, or better: use a real `<button>` that triggers a ref'd hidden input via `.click()`.

### FU-18 — OPPLAN panel shows no empty state
- **Severity**: Low
- **Category**: UX
- **Reproduction**: Click the `OPPLAN` tab. Panel renders only the header `OPPLAN · 0/0 complete` with a completely blank body. No placeholder explains what OPPLAN is or why it's empty. Screenshot: `followup-opplan-empty.png`.
- **File / line**: `components/chat/opplan-panel.tsx:122` — `sortedPhases.map(...)` returns `[]` silently.
- **Fix proposed**: add `{sortedPhases.length === 0 && <div className="px-3 py-8 text-center text-[10px] text-[var(--text-subtle)]">No objectives yet. Start an engagement with Soundwave to generate an OPPLAN.</div>}`.

### FU-19 — Attack Graph panel shows no actual graph visualisation
- **Severity**: Medium (expectation gap)
- **Category**: Rendering
- **Reproduction**: Click `Graph`. Panel shows a 2×2 stats grid (`0 Nodes / 0 Edges / 0 Critical / 0 High`) and tabs for Nodes / Edges. No SVG/canvas graph, no nodes, no edges, no zoom/pan. Even when data is populated the user only sees a flat list.
- **File / line**: `components/chat/knowledge-graph-panel.tsx` — entire panel is list-based; no Cytoscape/vis-network/d3 integration. Yet the user-facing copy labels it "Attack Graph", which strongly implies a graph diagram.
- **Fix proposed**: either embed a real graph (e.g. Cytoscape.js with neo4j-bolt data) or rename the panel and tab to "Attack Inventory" to match what it actually is.

### FU-20 — Sub-agent card "duration" is static when running (doesn't tick)
- **Severity**: Low
- **Category**: Rendering
- **Reproduction**: When a sub-agent is running, its card header shows e.g. `3.2s`. That number only updates when the parent component re-renders for other reasons (e.g. token arrival), not on a timer. A sub-agent stuck for 30 seconds may still display `3.2s`.
- **File / line**: `components/chat/sub-agent-card.tsx:42-47` — `formatDuration(start, end?)` uses `Date.now()` but there's no `setInterval` / tick.
- **Fix proposed**: add `useEffect(() => { if (!isRunning) return; const t = setInterval(() => forceUpdate(), 500); return () => clearInterval(t); }, [isRunning])`.

### FU-21 — Stop button during stream: no visual marker that the message was cut short
- **Severity**: Medium
- **Category**: UX
- **Reproduction**: Start a long response, click `Stop`. The partial text stays, `isStreaming = false`, `content` is as-was. No badge, italic, or `(interrupted)` label. User cannot tell the difference between a complete 2-sentence reply and one that got stopped mid-sentence.
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:629-635`.
- **Fix proposed**: set `m.interrupted = true` in the AbortError branch; render a grey `⏸ Interrupted — Resume` pill at the end of the bubble.

### FU-22 — Retry banner filter only catches messages starting with "Error:"; partial responses on error stay stale
- **Severity**: Low
- **Category**: Error handling
- **Reproduction**: If the stream produces some tokens and then errors (e.g. backend 502 mid-stream), the assistant message keeps its partial content (line 642: `m.content || \`Error: ${errMsg}\``). Clicking the Retry banner filters by `content.startsWith("Error:")` (line 1647), so the partial message is NOT removed; a new assistant message is appended below. User ends up with a truncated reply + a fresh reply.
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:1644-1651`.
- **Fix proposed**: mark the failed message with a flag (e.g. `m.failed = true`) and filter by flag, not by content prefix. Remove or visually mark the failed message on retry.

### FU-23 — Assistant "empty response" banner wording assumes LangGraph, is now stale
- **Severity**: Low
- **Category**: UX / Error handling
- **Reproduction**: When the stream completes with zero content, the banner says `"Le moteur IA est temporairement indisponible. La connexion au backend a abouti mais aucune reponse n'a ete generee. Cela peut arriver si le moteur LangGraph n'est pas encore demarre."` Post-W2 fixes the engine is reliably up; the message now mostly fires on LLM refusals or model failures, not LangGraph downtime. It also leaks the internal engine name "LangGraph" to end users.
- **File / line**: `components/chat/message-bubble.tsx:213-220`.
- **Fix proposed**: soften to `"Le moteur n'a pas généré de réponse. Cela peut arriver en cas de filtrage du contenu, de prompt mal formé ou de saturation temporaire. Réessayez ou reformulez."` Remove "LangGraph".

### FU-24 — No rate-limit / debounce on suggested-prompt buttons — double-click spawns two engagements
- **Severity**: Medium
- **Category**: State
- **Reproduction**: On the empty chat welcome screen, double-click rapidly on "Scan my web application for vulnerabilities". Both clicks enter `handleSend` before `isStreaming` flips; both auto-create a new engagement; two parallel streams start, and the conversation ends up with 2 user bubbles + 2 assistant bubbles intercalated.
- **File / line**: `app/[locale]/dashboard/chat/page.tsx:437-480` — `handleSend` checks `isStreaming` to abort, but there is no guard between the click and the `isStreaming = true` state (setter is async). `createEngagement` is also not mutex'd.
- **Fix proposed**: add a local `sendingRef = useRef(false)` gate at top of `handleSend`; `if (sendingRef.current) return; sendingRef.current = true; try {...} finally {sendingRef.current = false;}`. Alternatively disable the suggestion buttons for 500 ms after click.

### FU-25 — File drop zone bypasses the picker's `accept` filter
- **Severity**: Medium
- **Category**: Interaction / Security-adjacent
- **Reproduction**: The paperclip picker restricts to `.pdf,.txt,.md,.csv,image/*` (line 220 of chat-input.tsx). But dragging a `.exe`, `.zip`, or 500 MB video onto the dropzone works: `handleDrop → processFiles → onAdd` without any type/size filter.
- **File / line**: `components/chat/file-upload-zone.tsx:33-37` (no filter).
- **Fix proposed**: add the same allow-list + a size cap (e.g. 10 MB): `rawFiles.filter(f => ALLOWED_MIMES.includes(f.type) && f.size < 10 * 1024 * 1024)`. Show a toast on rejected files.

### FU-26 — Five-file cap is enforced on picker but not on drop
- **Severity**: Low
- **Category**: Interaction
- **Reproduction**: Picker does `.slice(0, 5)` at chat-input.tsx:224. Drop handler doesn't: dropping 50 files keeps all 50.
- **File / line**: `components/chat/file-upload-zone.tsx:24-31` vs `components/chat/chat-input.tsx:222-237`.
- **Fix proposed**: enforce the cap in `FileUploadZone.onAdd` or in `setFiles` itself, so both entry paths converge.

### FU-27 — `<textarea>` for user-message editing has no maxlength, no character counter, and grows unbounded
- **Severity**: Medium
- **Category**: Interaction
- **Reproduction**: In the Éditer state (user message), paste 100k chars. Textarea has `rows={3}` but no max-height or overflow scroll; the rendered textarea extends off-screen with no scroll, pushing the `Annuler / Envoyer` buttons below the viewport.
- **File / line**: `components/chat/message-bubble.tsx:237-242`.
- **Fix proposed**: add `maxLength={4000}` (aligned with backend validation), `className="... max-h-48 overflow-y-auto"`, and a small char counter.

## Cross-cutting themes

1. **Prop-drilling mismatch**: `MessageBubble`, `MessageActions`, and `ChatInput` were designed with optional callbacks; the page provides none except `onRetry`. Fix either by tightening prop contracts (required, not optional) or by wiring the callbacks.
2. **UI theatre**: model settings panel, web-search globe, Run button, 4 slash commands, regenerate, feedback, edit — all visible, all inert. This is the single biggest source of findings in this audit and should be addressed together as a "wire-up-or-delete" sprint.
3. **A11y (keyboard + screen-reader)** is broadly absent: no focus rings, no aria-labels, no keyboard shortcut implementation. At minimum the EU-aimed public SaaS needs WCAG 2.1 AA.
4. **Responsive** below 1024px degrades quickly; mobile is unusable.

## Out of scope / already covered
- SSE concat bug (commit 56ea0a6) — ✅ verified fixed.
- Caddy 502 + CRLF (commits ecb3699, 1d0c2fa) — ✅ verified; tokens stream progressively.
- Abort propagation during stream — ✅ Stop button visible + functional.
- Textbox typable during stream — ✅ works, replacement flow works.
- Copy-to-clipboard on messages and code blocks — ✅ works (tested with navigator.clipboard).
- Slash menu keyboard nav (↑↓/Tab/Enter/Esc) — ✅ works.
- Text-to-speech button — ✅ fires `speechSynthesis` on click.
- Voice recorder (Web Speech API) — ✅ supported check present; not deeply tested in prod without mic.
- Sidebar search (title + lastMessage + engagementName) — ✅ works (verified with query `debug`).
- Date grouping (Aujourd'hui / Hier / 7 derniers jours / Plus ancien) — ✅ works and bucketizes correctly.
- Context menu (right-click → Rename / Delete) — ✅ works per inspection of `contextMenu` state handling.

## Evidence

- `docs/audit-2026-04-17/verification/followup-00-initial.png` — logged-in chat state.
- `docs/audit-2026-04-17/verification/followup-promptlib.png` — prompt library panel open.
- `docs/audit-2026-04-17/verification/followup-opplan-empty.png` — OPPLAN empty state.
- `docs/audit-2026-04-17/verification/followup-graph-empty.png` — Attack Graph empty stats grid.
- `docs/audit-2026-04-17/verification/followup-mobile-375.png` — 375×667 viewport, sidebar pinches chat to 72 px.
- `docs/audit-2026-04-17/verification/followup-tablet-768.png` — 768×1024 viewport, toolbar overflows, Send clipped.
