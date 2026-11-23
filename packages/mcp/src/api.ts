// What the MCP tools call: the HTTP server, whichever process runs it. An
// agent that starts after another one shares its server instead of a second.

import { fileURLToPath } from "node:url";
import type { Annotation, Suggestion, SuggestionRequest, SurfacentEvent, ThreadMessage } from "./types.ts";

/** How to start the server by hand: the source in surfacent's repo, the published package elsewhere. */
const START = import.meta.url.endsWith(".ts")
  ? `node ${fileURLToPath(new URL("./cli.ts", import.meta.url))} mcp --http-only`
  : "npx surfacent mcp --http-only";
/** Ordinary calls give up after this; the event stream has no limit. */
const TIMEOUT_MS = 5000;

export class Api {
  #base: string;

  constructor(base: string) {
    this.#base = base.replace(/\/$/, "");
  }

  async #fetch(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await fetch(`${this.#base}${path}`, { ...init, signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      if (init.signal?.aborted) throw error;
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error(`The surfacent server at ${this.#base} didn't answer within ${TIMEOUT_MS / 1000} s.`);
      }
      throw new Error(
        `The surfacent server is not reachable at ${this.#base}. Start it with \`${START}\`, ` +
          "or restart your agent so its MCP server starts it.",
      );
    }
  }

  async #call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.#fetch(path, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(detail.error ?? `${init?.method ?? "GET"} ${path} failed: ${response.status}`);
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  health(): Promise<{ status: string; name?: string }> {
    return this.#call("/health");
  }

  pending(): Promise<Annotation[]> {
    return this.#call("/pending");
  }

  annotation(annotationId: string): Promise<Annotation> {
    return this.#call(`/annotations/${annotationId}`);
  }

  update(annotationId: string, patch: Partial<Annotation>): Promise<Annotation> {
    return this.#call(`/annotations/${annotationId}`, { method: "PATCH", body: JSON.stringify(patch) });
  }

  /** Adds a message to the annotation's thread, with any other changes. */
  async say(annotationId: string, role: ThreadMessage["role"], content: string, patch: Partial<Annotation> = {}): Promise<Annotation> {
    const current = await this.annotation(annotationId);
    const message: ThreadMessage = { id: `msg_${Date.now().toString(36)}`, role, content, timestamp: Date.now() };
    return this.update(annotationId, { ...patch, thread: [...(current.thread ?? []), message] });
  }

  /** Suggestion requests no agent has taken yet. */
  openRequests(): Promise<SuggestionRequest[]> {
    return this.#call("/suggestions");
  }

  /** Takes a request for this agent; undefined when another agent took it first. */
  takeRequest(requestId: string): Promise<SuggestionRequest | undefined> {
    return this.#call<SuggestionRequest>(`/suggestions/${requestId}/take`, { method: "POST" }).catch(() => undefined);
  }

  /** Answers a request: the server turns the suggestions into notes previewed on the page. */
  answerRequest(requestId: string, suggestions: Suggestion[]): Promise<{ annotations: Annotation[] }> {
    return this.#call(`/suggestions/${requestId}/answer`, { method: "POST", body: JSON.stringify({ suggestions }) });
  }

  /**
   * Opens the event stream as an agent (the server counts it in /status).
   * Resolves once connected; the events then arrive until `signal` aborts or
   * the server closes the stream.
   */
  async events(signal: AbortSignal): Promise<AsyncIterable<SurfacentEvent>> {
    const response = await this.#fetch("/events?agent=true", { signal, headers: { Accept: "text/event-stream" } });
    if (!response.ok || !response.body) throw new Error(`The surfacent event stream answered ${response.status}.`);
    const reader = response.body.getReader();
    return {
      async *[Symbol.asyncIterator]() {
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          for (let end = buffer.indexOf("\n\n"); end !== -1; end = buffer.indexOf("\n\n")) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const data = block
              .split("\n")
              .filter((line) => line.startsWith("data: "))
              .map((line) => line.slice(6))
              .join("\n");
            if (!data) continue;
            try {
              yield JSON.parse(data) as SurfacentEvent;
            } catch {
              // Not an event: skip it.
            }
          }
        }
      },
    };
  }
}
