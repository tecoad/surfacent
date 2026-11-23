import type { Annotation } from "../types";

/** Apply a server snapshot without overwriting work done while it was loading. */
export function mergeSessionFeedback(
  before: readonly Annotation[],
  current: readonly Annotation[],
  incoming: readonly Annotation[],
  serverIds: ReadonlyMap<string, string>,
): Annotation[] {
  const serverId = (annotation: Annotation) => serverIds.get(annotation.id) ?? annotation.id;
  const previous = new Map(before.map(annotation => [serverId(annotation), annotation]));
  const latest = new Map(current.map(annotation => [serverId(annotation), annotation]));
  const receivedIds = new Set(incoming.map(annotation => annotation.id));
  const merged: Annotation[] = [];

  for (const remote of incoming) {
    const original = previous.get(remote.id);
    const local = latest.get(remote.id);
    // Absence from current storage represents a local deletion, including an
    // exit still on screen. Terminal server statuses remain authoritative.
    if (original && !local) continue;
    const edited = local && original && local.comment !== original.comment;
    merged.push(edited ? { ...remote, comment: local.comment } : remote);
  }

  // Notes created after the request began are not part of its snapshot.
  for (const [id, local] of latest) {
    if (!previous.has(id) && !receivedIds.has(id)) merged.push(local);
  }
  return merged;
}

/**
 * A note no agent has yet: made here, or a suggestion the person accepted. It
 * stays in the toolbar (copied, cleared, edited only here) until it's sent.
 */
export const isUnsent = (annotation: Annotation) => annotation.status === undefined;

/** The note without what the server said of it: it's only the toolbar's again. */
export const unsent = ({ status: _status, ...annotation }: Annotation): Annotation => annotation;

/**
 * A session's notes from the server, and the toolbar's that it doesn't have:
 * those stay in the toolbar, unsent, until they're sent. A suggestion the
 * server no longer has is gone.
 */
export function withUnsent(
  remote: readonly Annotation[],
  local: readonly Annotation[],
  serverIds: ReadonlyMap<string, string>,
): Annotation[] {
  const known = new Set(remote.map(annotation => annotation.id));
  return [
    ...remote,
    ...local
      .filter(annotation => annotation.status !== "suggested" && !known.has(serverIds.get(annotation.id) ?? annotation.id))
      .map(unsent),
  ];
}
