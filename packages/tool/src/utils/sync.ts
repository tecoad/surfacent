// =============================================================================
// Server Sync Utilities
// =============================================================================
//
// Optional server synchronization for the annotation protocol.
// When an endpoint is provided, annotations sync to a server.
// Falls back gracefully to local-only mode on network errors.
//

import type { Annotation, Session, SessionWithAnnotations } from "../types";
import { fromServerAnnotation, toServerAnnotation } from "../design/prompt";

/**
 * Create a new session on the server.
 */
export async function createSession(
  endpoint: string,
  url: string
): Promise<Session> {
  const response = await fetch(`${endpoint}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  return response.json();
}

/**
 * Get an existing session with its annotations.
 */
export async function getSession(
  endpoint: string,
  sessionId: string
): Promise<SessionWithAnnotations> {
  const response = await fetch(`${endpoint}/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.status}`);
  }

  const session: SessionWithAnnotations = await response.json();
  return { ...session, annotations: session.annotations.map(fromServerAnnotation) };
}

/**
 * Sync a new annotation to the server.
 * Returns the annotation with any server-assigned fields.
 */
export async function syncAnnotation(
  endpoint: string,
  sessionId: string,
  annotation: Annotation
): Promise<Annotation> {
  // Older page-level notes were saved with an empty path, which the server
  // rejects. Repair only the two known document elements when retrying them.
  if (!annotation.elementPath && (annotation.element === "body" || annotation.element === "html")) {
    annotation = { ...annotation, elementPath: annotation.element };
  }
  const response = await fetch(`${endpoint}/sessions/${sessionId}/annotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The comment carries the instruction for any annotation server; surfacent's also keeps the intents.
    body: JSON.stringify(toServerAnnotation(annotation)),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync annotation: ${response.status}`);
  }

  // The server's copy, with the person's note and the intents as the toolbar keeps them.
  return { ...fromServerAnnotation(await response.json()), comment: annotation.comment, aspects: annotation.aspects };
}

/**
 * Suggestion mode: send the page's candidates for an agent to propose intents.
 * The agent's suggestions come back as suggested notes on the session.
 */
export async function requestSuggestions(
  endpoint: string,
  sessionId: string,
  body: { url: string; candidates: unknown[] },
): Promise<{ id: string }> {
  const response = await fetch(`${endpoint}/sessions/${sessionId}/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `Failed to request suggestions: ${response.status}`);
  }
  return response.json();
}

/**
 * Update an annotation on the server.
 */
export async function updateAnnotation(
  endpoint: string,
  annotationId: string,
  data: Partial<Annotation>
): Promise<Annotation> {
  const response = await fetch(`${endpoint}/annotations/${annotationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update annotation: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete an annotation from the server.
 */
export async function deleteAnnotation(
  endpoint: string,
  annotationId: string
): Promise<void> {
  const response = await fetch(`${endpoint}/annotations/${annotationId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete annotation: ${response.status}`);
  }
}
