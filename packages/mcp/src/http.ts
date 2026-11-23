// The HTTP side, for the browser toolbar and the agent's tools: the session,
// annotation and event routes the toolbar's sync expects, behind a policy that
// only lets this machine's dev pages and agents in.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { admit, CORS_PREFLIGHT } from "./policy.ts";
import type { Store } from "./store.ts";
import type { Annotation, Suggestion, SurfacentEvent } from "./types.ts";

export const NAME = "surfacent";
export const VERSION = "0.1.0";

function send(response: ServerResponse, headers: Record<string, string>, status: number, body?: unknown) {
  response.writeHead(status, { ...headers, ...(body === undefined ? {} : { "Content-Type": "application/json" }) });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

class BadRequest extends Error {}

async function readJson(request: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new BadRequest("Body too large");
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new BadRequest("Invalid JSON");
  }
}

type Listener = { agent: boolean };

/**
 * An agent in listening mode calls surfacent_listen again after each batch or
 * timeout: for this long after its call ends it still counts as listening, so
 * the toolbar's state doesn't blink between calls.
 */
const LISTEN_GRACE_MS = 15_000;

/** The open event streams, and when an agent's last closed. */
class Listeners extends Set<Listener> {
  agentLeftAt = 0;

  override delete(listener: Listener): boolean {
    if (listener.agent) this.agentLeftAt = Date.now();
    return super.delete(listener);
  }

  /** Whether an agent waits in surfacent_listen, or just did. */
  get listening(): boolean {
    return [...this].some((listener) => listener.agent) || Date.now() - this.agentLeftAt < LISTEN_GRACE_MS;
  }
}

/**
 * Streams events (`SurfacentEvent` envelopes) as server-sent events: one
 * session's for the toolbar, which settles previews when an agent resolves
 * them; every session's for an agent in surfacent_listen.
 */
function stream(
  store: Store,
  sessionId: string | undefined,
  request: IncomingMessage,
  response: ServerResponse,
  headers: Record<string, string>,
  listeners: Listeners,
) {
  response.writeHead(200, { ...headers, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  response.write(": connected\n\n");
  const listener: Listener = { agent: new URL(request.url ?? "/", "http://localhost").searchParams.get("agent") === "true" };
  listeners.add(listener);
  const unsubscribe = store.subscribe((event: SurfacentEvent) => {
    if (sessionId !== undefined && event.sessionId !== sessionId) return;
    response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  });
  const ping = setInterval(() => response.write(": ping\n\n"), 15000);
  request.on("close", () => {
    clearInterval(ping);
    unsubscribe();
    listeners.delete(listener);
  });
}

export function createHttpServer(store: Store): Server {
  // Open event streams, to report whether an agent is listening.
  const listeners = new Listeners();

  return createServer(async (request, response) => {
    const verdict = admit(request);
    if ("refused" in verdict) return send(response, {}, 403, { error: verdict.refused });
    const { headers } = verdict;

    const url = new URL(request.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);
    const method = request.method ?? "GET";
    try {
      if (method === "OPTIONS") return send(response, { ...headers, ...CORS_PREFLIGHT }, 204);
      if (method === "GET" && url.pathname === "/health") return send(response, headers, 200, { status: "ok", name: NAME, version: VERSION });
      if (method === "GET" && url.pathname === "/status") {
        const agentListeners = [...listeners].filter((listener) => listener.agent).length;
        return send(response, headers, 200, { status: "ok", name: NAME, version: VERSION, listening: listeners.listening, agentListeners });
      }
      if (method === "GET" && url.pathname === "/events") return stream(store, undefined, request, response, headers, listeners);

      if (parts[0] === "sessions") {
        const [, sessionId, sub] = parts;
        if (!sessionId) {
          if (method === "GET") return send(response, headers, 200, store.sessions());
          if (method === "POST") {
            const body = (await readJson(request)) as { url?: string };
            return send(response, headers, 201, store.createSession(body.url ?? ""));
          }
        } else if (!sub && method === "GET") {
          const session = store.session(sessionId);
          return session ? send(response, headers, 200, session) : send(response, headers, 404, { error: "Session not found" });
        } else if (sub === "events" && method === "GET") {
          if (!store.session(sessionId)) return send(response, headers, 404, { error: "Session not found" });
          return stream(store, sessionId, request, response, headers, listeners);
        } else if (sub === "annotations" && method === "POST") {
          const saved = store.addAnnotation(sessionId, (await readJson(request)) as Partial<Annotation>);
          return typeof saved === "string" ? send(response, headers, 400, { error: saved }) : send(response, headers, 201, saved);
        } else if (sub === "pending" && method === "GET") {
          return send(response, headers, 200, store.pending(sessionId));
        } else if (sub === "suggest" && method === "POST") {
          const asked = store.requestSuggestions(sessionId, (await readJson(request)) as { url?: unknown; candidates?: unknown });
          return typeof asked === "string" ? send(response, headers, 400, { error: asked }) : send(response, headers, 201, asked);
        }
      }

      // Suggestion mode, for the agent's tools: open requests, taking one, answering it.
      if (parts[0] === "suggestions") {
        const [, requestId, action] = parts;
        if (!requestId && method === "GET") return send(response, headers, 200, store.openRequests());
        if (requestId && action === "take" && method === "POST") {
          const taken = store.takeRequest(requestId);
          return taken ? send(response, headers, 200, taken) : send(response, headers, 409, { error: "Already taken, or not a request" });
        }
        if (requestId && action === "answer" && method === "POST") {
          const body = (await readJson(request)) as { suggestions?: Suggestion[] };
          const created = store.answerRequest(requestId, Array.isArray(body.suggestions) ? body.suggestions : []);
          return typeof created === "string" ? send(response, headers, 400, { error: created }) : send(response, headers, 201, { annotations: created });
        }
      }

      if (parts[0] === "annotations" && parts[1]) {
        const annotationId = parts[1];
        if (method === "GET") {
          const annotation = store.annotation(annotationId);
          return annotation ? send(response, headers, 200, annotation) : send(response, headers, 404, { error: "Annotation not found" });
        }
        if (method === "PATCH") {
          const annotation = store.updateAnnotation(annotationId, (await readJson(request)) as Partial<Annotation>);
          return annotation ? send(response, headers, 200, annotation) : send(response, headers, 404, { error: "Annotation not found" });
        }
        if (method === "DELETE") {
          return store.deleteAnnotation(annotationId) ? send(response, headers, 204) : send(response, headers, 404, { error: "Annotation not found" });
        }
      }

      if (method === "GET" && url.pathname === "/pending") return send(response, headers, 200, store.pending());

      return send(response, headers, 404, { error: "Not found" });
    } catch (error) {
      if (error instanceof BadRequest) return send(response, headers, 400, { error: error.message });
      process.stderr.write(`[surfacent] ${method} ${url.pathname} failed: ${String(error)}\n`);
      return send(response, headers, 500, { error: "Internal server error" });
    }
  });
}
