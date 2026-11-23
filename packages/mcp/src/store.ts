// Sessions and annotations, in memory and saved to a JSON file, so pending
// feedback survives the agent that started the server.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { intentError } from "surfacent-core";
import type { Annotation, Candidate, Session, SessionWithAnnotations, Suggestion, SuggestionRequest, SurfacentEvent } from "./types.ts";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const log = (message: string) => process.stderr.write(`[surfacent] ${message}\n`);

/** Fields an annotation must have, besides those the server sets. */
const REQUIRED = ["comment", "elementPath", "element"] as const;

/** Kinds the toolbar's removed layout mode wrote; nothing reads them any more. */
const DROPPED_KINDS = new Set(["placement", "rearrange"]);

/** Candidates one suggestion request may hold: a page's worth, within what an agent reads at once. */
const MAX_CANDIDATES = 150;

export class Store {
  #file: string | undefined;
  #sessions = new Map<string, Session>();
  #annotations = new Map<string, Annotation>();
  // Suggestion requests live as long as the server: the toolbar asks again after a restart.
  #requests = new Map<string, SuggestionRequest>();
  #listeners = new Set<(event: SurfacentEvent) => void>();
  #sequence = 0;
  #saving: ReturnType<typeof setTimeout> | undefined;

  constructor(file?: string) {
    this.#file = file;
    if (!file || !existsSync(file)) return;
    try {
      const saved = JSON.parse(readFileSync(file, "utf8")) as { sessions?: Session[]; annotations?: Annotation[] };
      for (const session of saved.sessions ?? []) this.#sessions.set(session.id, session);
      for (const annotation of saved.annotations ?? []) {
        if (!DROPPED_KINDS.has(String(annotation.kind))) this.#annotations.set(annotation.id, annotation);
      }
    } catch (error) {
      // Keep what can't be read for a person to look at, instead of writing over it.
      const backup = `${file}.broken-${Date.now()}`;
      try {
        renameSync(file, backup);
        log(`Couldn't read ${file} (${String(error)}). Moved it to ${backup} and started empty.`);
      } catch {
        log(`Couldn't read ${file} (${String(error)}). Started empty.`);
      }
    }
  }

  subscribe(listener: (event: SurfacentEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  sessions(): Session[] {
    return [...this.#sessions.values()];
  }

  session(sessionId: string): SessionWithAnnotations | undefined {
    const session = this.#sessions.get(sessionId);
    if (!session) return undefined;
    return { ...session, annotations: this.annotations().filter((annotation) => annotation.sessionId === sessionId) };
  }

  createSession(url: string): Session {
    const session: Session = { id: id("ses"), url, status: "active", createdAt: now() };
    this.#sessions.set(session.id, session);
    this.#emit("session.created", session.id, session);
    return session;
  }

  annotations(): Annotation[] {
    return [...this.#annotations.values()].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }

  annotation(annotationId: string): Annotation | undefined {
    return this.#annotations.get(annotationId);
  }

  pending(sessionId?: string): Annotation[] {
    return this.annotations().filter(
      (annotation) => annotation.status === "pending" && (sessionId === undefined || annotation.sessionId === sessionId),
    );
  }

  /**
   * Adds an annotation to a session, or updates the one with the same id (the
   * toolbar uploads its notes again after reconnecting). The lifecycle (status,
   * thread, resolution) belongs to the server: an upload never resets it.
   * Returns an error message when the body isn't a valid annotation.
   */
  addAnnotation(sessionId: string, body: Partial<Annotation>): Annotation | string {
    if (!this.#sessions.has(sessionId)) return `No session ${sessionId}`;
    for (const field of REQUIRED) if (typeof body[field] !== "string" || !body[field]) return `Missing ${field}`;
    const existing = body.id ? this.#annotations.get(body.id) : undefined;
    const annotation: Annotation = {
      ...existing,
      ...(body as Annotation),
      id: body.id ?? id("ann"),
      timestamp: typeof body.timestamp === "number" ? body.timestamp : Date.now(),
      x: typeof body.x === "number" ? body.x : 0,
      y: typeof body.y === "number" ? body.y : 0,
      sessionId,
      status: existing?.status ?? "pending",
      thread: existing?.thread ?? [],
      resolvedAt: existing?.resolvedAt,
      resolvedBy: existing?.resolvedBy,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    this.#annotations.set(annotation.id, annotation);
    this.#emit(existing ? "annotation.updated" : "annotation.created", sessionId, annotation);
    return annotation;
  }

  updateAnnotation(annotationId: string, patch: Partial<Annotation>): Annotation | undefined {
    const existing = this.#annotations.get(annotationId);
    if (!existing) return undefined;
    const annotation: Annotation = { ...existing, ...patch, id: existing.id, sessionId: existing.sessionId, updatedAt: now() };
    if ((patch.status === "resolved" || patch.status === "dismissed") && !patch.resolvedAt) annotation.resolvedAt = now();
    this.#annotations.set(annotationId, annotation);
    this.#emit("annotation.updated", annotation.sessionId ?? "", annotation);
    return annotation;
  }

  deleteAnnotation(annotationId: string): boolean {
    const existing = this.#annotations.get(annotationId);
    if (!existing) return false;
    this.#annotations.delete(annotationId);
    this.#emit("annotation.deleted", existing.sessionId ?? "", { id: annotationId });
    return true;
  }

  /** Suggestion mode: a page's candidates, for an agent to propose intents. Returns an error message when the body isn't valid. */
  requestSuggestions(sessionId: string, body: { url?: unknown; candidates?: unknown }): SuggestionRequest | string {
    if (!this.#sessions.has(sessionId)) return `No session ${sessionId}`;
    const candidates = body.candidates;
    if (!Array.isArray(candidates) || !candidates.length) return "candidates must be a non-empty list";
    if (candidates.length > MAX_CANDIDATES) return `At most ${MAX_CANDIDATES} candidates per request`;
    const ids = new Set<string>();
    for (const candidate of candidates as Partial<Candidate>[]) {
      for (const field of ["id", "element", "elementPath", "selector"] as const) {
        if (typeof candidate[field] !== "string" || !candidate[field]) return `Every candidate needs ${field}`;
      }
      if (ids.has(candidate.id!)) return `Candidate ${candidate.id} appears twice`;
      ids.add(candidate.id!);
    }
    const request: SuggestionRequest = {
      id: id("sug"),
      sessionId,
      url: typeof body.url === "string" ? body.url : "",
      status: "open",
      candidates: candidates as Candidate[],
      createdAt: now(),
    };
    this.#requests.set(request.id, request);
    this.#emit("suggest.requested", sessionId, request);
    return request;
  }

  /** Requests no agent has taken yet. */
  openRequests(): SuggestionRequest[] {
    return [...this.#requests.values()].filter((request) => request.status === "open");
  }

  /** Hands a request to one agent: undefined when it's unknown or another agent took it. */
  takeRequest(requestId: string): SuggestionRequest | undefined {
    const request = this.#requests.get(requestId);
    if (request?.status !== "open") return undefined;
    request.status = "taken";
    // The toolbar shows that an agent is on it.
    this.#emit("suggest.taken", request.sessionId, request);
    return request;
  }

  /**
   * An agent's answer: one suggested note per suggestion, previewed on the
   * page until the person accepts it (it becomes pending) or rejects it.
   * Nothing is saved unless every suggestion is valid; the error lists what isn't.
   */
  answerRequest(requestId: string, suggestions: Suggestion[]): Annotation[] | string {
    const request = this.#requests.get(requestId);
    if (!request) return `No suggestion request ${requestId}`;
    if (request.status === "answered") return `Request ${requestId} is already answered`;
    if (!this.#sessions.has(request.sessionId)) return `The page's session ${request.sessionId} is gone`;
    const candidates = new Map(request.candidates.map((candidate) => [candidate.id, candidate]));
    const errors: string[] = [];
    for (const suggestion of suggestions) {
      if (!candidates.has(suggestion.candidateId)) errors.push(`${suggestion.candidateId}: not a candidate of this request`);
      const entries = Object.entries(suggestion.intents ?? {});
      if (!entries.length) errors.push(`${suggestion.candidateId}: no intents (leave the candidate out instead)`);
      for (const [key, value] of entries) {
        const error = intentError(key, value);
        if (error) errors.push(`${suggestion.candidateId}: ${error}`);
      }
    }
    if (errors.length) return `Nothing was saved. Fix these and call again:\n${errors.map((error) => `- ${error}`).join("\n")}`;

    request.status = "answered";
    return suggestions.map((suggestion, index) => {
      const candidate = candidates.get(suggestion.candidateId)!;
      const annotation: Annotation = {
        id: `${requestId}_${index + 1}`,
        sessionId: request.sessionId,
        url: request.url,
        comment: suggestion.reason,
        note: suggestion.reason,
        element: candidate.element,
        elementPath: candidate.elementPath,
        selector: candidate.selector,
        sourceFile: candidate.sourceFile,
        cssClasses: candidate.classes,
        nearbyText: candidate.text,
        x: candidate.x,
        y: candidate.y,
        isFixed: candidate.isFixed,
        boundingBox: candidate.boundingBox,
        timestamp: Date.now(),
        aspects: suggestion.intents,
        intents: suggestion.intents,
        intent: "change",
        origin: "suggestion",
        status: "suggested",
        thread: [],
        createdAt: now(),
        updatedAt: now(),
      };
      this.#annotations.set(annotation.id, annotation);
      this.#emit("annotation.created", request.sessionId, annotation);
      return annotation;
    });
  }

  /** Writes any change still waiting for its save. Call it before the process exits. */
  flush() {
    if (this.#saving === undefined) return;
    clearTimeout(this.#saving);
    this.#saving = undefined;
    this.#write();
  }

  #emit(type: SurfacentEvent["type"], sessionId: string, payload: SurfacentEvent["payload"]) {
    const event: SurfacentEvent = { type, timestamp: now(), sessionId, sequence: ++this.#sequence, payload };
    for (const listener of this.#listeners) listener(event);
    this.#save();
  }

  #save() {
    if (!this.#file) return;
    clearTimeout(this.#saving);
    this.#saving = setTimeout(() => {
      this.#saving = undefined;
      this.#write();
    }, 200);
    // A pending save doesn't keep the process alive; flush() covers the exit.
    this.#saving.unref();
  }

  /** Atomic: a crash mid-write leaves the previous file, never half of one. */
  #write() {
    const file = this.#file;
    if (!file) return;
    try {
      mkdirSync(dirname(file), { recursive: true });
      const temporary = `${file}.tmp`;
      writeFileSync(temporary, `${JSON.stringify({ sessions: this.sessions(), annotations: this.annotations() }, null, 1)}\n`);
      renameSync(temporary, file);
    } catch (error) {
      log(`Couldn't save ${file}: ${String(error)}`);
    }
  }
}
