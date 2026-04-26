/**
 * LangGraph API client — communicates with the BJHUNT ALPHA 1.0 engine.
 *
 * All requests include the BJHUNT_API_SECRET as a Bearer token
 * for authentication (handled by api_auth.py middleware).
 */

import { config } from "../config.js";

const BASE_URL = config.langgraph.url;
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${config.langgraph.apiSecret}`,
};

interface Thread {
  threadId: string;
}

interface RunStatus {
  runId: string;
  status: string;
  result?: unknown;
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...HEADERS, ...(options.headers || {}) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LangGraph API error: ${res.status} ${res.statusText} — ${body}`);
  }

  return res;
}

export const langgraphClient = {
  /**
   * Create a new LangGraph thread (conversation context).
   */
  async createThread(): Promise<Thread> {
    const res = await request("/threads", { method: "POST", body: "{}" });
    const data = (await res.json()) as { thread_id: string };
    return { threadId: data.thread_id };
  },

  /**
   * Create a run (agent invocation) on a thread.
   *
   * ENG-P2-1: retry on transient failures with exponential backoff
   * (250ms, 500ms, 1s — caps at 3 attempts). LangGraph in dev mode is
   * known to be flaky during cold start; the audit flagged that
   * createRun was fire-and-forget with no recovery. A full BullMQ
   * queue is the proper solution but this thin retry covers the
   * 90%-case (transient 502/503 from LangGraph reload, network blip).
   */
  async createRun(
    threadId: string,
    assistantId: string,
    input: Record<string, unknown>,
  ): Promise<RunStatus> {
    const body = JSON.stringify({
      assistant_id: assistantId,
      input: { messages: [{ role: "user", content: String(input.content || JSON.stringify(input)) }] },
    });

    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await request(`/threads/${threadId}/runs`, {
          method: "POST",
          body,
        });
        const data = (await res.json()) as { run_id: string; status: string };
        return { runId: data.run_id, status: data.status };
      } catch (err) {
        lastErr = err;
        if (attempt === 3) break;
        const delay = 250 * 2 ** (attempt - 1);
        console.warn(
          `[langgraph] createRun attempt ${attempt}/3 failed, retrying in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error(`createRun failed after 3 attempts: ${String(lastErr)}`);
  },

  /**
   * Get run status.
   */
  async getRunStatus(threadId: string, runId: string): Promise<RunStatus> {
    const res = await request(`/threads/${threadId}/runs/${runId}`);
    const data = (await res.json()) as { run_id: string; status: string; result?: unknown };
    return { runId: data.run_id, status: data.status, result: data.result };
  },

  /**
   * Stream a run — returns a ReadableStream of SSE events.
   * Used by the chat endpoint to proxy agent responses to the frontend.
   *
   * The initial connection has a 30s timeout. Once streaming starts,
   * the per-chunk timeout is handled by the TransformStream in chat.ts.
   */
  async streamRun(
    threadId: string,
    assistantId: string,
    input: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${BASE_URL}/threads/${threadId}/runs/stream`;

    const connAbort = new AbortController();
    const connTimer = setTimeout(() => connAbort.abort(), 30_000);

    const onExternalAbort = () => connAbort.abort();
    if (signal) {
      if (signal.aborted) connAbort.abort();
      else signal.addEventListener("abort", onExternalAbort, { once: true });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        assistant_id: assistantId,
        input: { messages: [{ role: "user", content: String(input.content || JSON.stringify(input)) }] },
        stream_mode: ["messages", "custom"],
        on_disconnect: "cancel",
      }),
      signal: connAbort.signal,
    });

    clearTimeout(connTimer);

    if (!res.ok) {
      if (signal) signal.removeEventListener("abort", onExternalAbort);
      const body = await res.text().catch(() => "");
      throw new Error(`LangGraph API error: ${res.status} ${res.statusText} — ${body}`);
    }

    if (!res.body) {
      if (signal) signal.removeEventListener("abort", onExternalAbort);
      throw new Error("LangGraph stream returned no body");
    }

    return res.body;
  },

  /**
   * Get thread state (messages, values).
   */
  async getThreadState(threadId: string): Promise<unknown> {
    const res = await request(`/threads/${threadId}/state`);
    return res.json();
  },

  /**
   * Explicitly cancel a running run (CHAT-P1-5 belt-and-suspenders for
   * on_disconnect). LangGraph already cancels on TCP disconnect, but a
   * direct cancel POST is more reliable on slow proxies that buffer.
   * Returns true on success, false if the run is already terminal or
   * unreachable. Never throws — caller is best-effort.
   */
  async cancelRun(threadId: string, runId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/threads/${threadId}/runs/${runId}/cancel`, {
        method: "POST",
        headers: HEADERS,
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * List available assistants (agent graphs).
   */
  async listAssistants(): Promise<unknown[]> {
    const res = await request("/assistants/search", {
      method: "POST",
      body: JSON.stringify({ limit: 100 }),
    });
    return (await res.json()) as unknown[];
  },

  /**
   * Health check for the LangGraph API.
   */
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/ok`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
