// surfacent_listen: listening mode. Hands pending notes and suggestion requests
// to an agent as soon as there are any.

import type { Api } from "./api.ts";
import type { Annotation, SuggestionRequest } from "./types.ts";

export type ListenResult = { timeout: true } | { annotations: Annotation[]; requests: SuggestionRequest[] };

/**
 * Returns what's already waiting, or waits for something new and returns it a
 * short batch window after the first arrives (so notes made in a row come
 * together), or a timeout. Every note it returns is marked acknowledged: the
 * toolbar shows it as being worked on, and no later call hands it out again.
 * Every suggestion request it returns is taken by this agent the same way.
 */
export async function listenForWork(
  api: Api,
  { batchMs, timeoutMs, signal }: { batchMs: number; timeoutMs: number; signal?: AbortSignal },
): Promise<ListenResult> {
  if (signal?.aborted) throw new Error("Listening cancelled");
  const [pending, open] = await Promise.all([api.pending(), api.openRequests()]);
  if (pending.length || open.length) return claim(api, pending, open);

  const notes = new Map<string, Annotation>();
  const requests = new Map<string, SuggestionRequest>();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  let ending: "batch" | "timeout" | "closed" | "cancelled" = "closed";
  try {
    const events = await api.events(controller.signal);
    await new Promise<void>((resolve) => {
      let batch: ReturnType<typeof setTimeout> | undefined;
      const finish = (reason: typeof ending) => {
        ending = reason;
        clearTimeout(timeout);
        clearTimeout(batch);
        resolve();
      };
      const timeout = setTimeout(() => finish("timeout"), timeoutMs);
      controller.signal.addEventListener("abort", () => finish("cancelled"), { once: true });
      const arrived = () => {
        if (batch) return;
        clearTimeout(timeout);
        batch = setTimeout(() => finish("batch"), batchMs);
      };
      const collectNote = (annotation: Annotation) => {
        if (annotation.status !== "pending" || notes.has(annotation.id)) return;
        notes.set(annotation.id, annotation);
        arrived();
      };
      const collectRequest = (request: SuggestionRequest) => {
        if (request.status !== "open" || requests.has(request.id)) return;
        requests.set(request.id, request);
        arrived();
      };
      // What arrived between the first read and the stream opening.
      api.pending().then((list) => list.forEach(collectNote), () => {});
      api.openRequests().then((list) => list.forEach(collectRequest), () => {});
      void (async () => {
        try {
          for await (const event of events) {
            // New notes, and notes that just became work: an accepted suggestion, a note the person changed after an agent took it.
            if (event.type === "annotation.created" || event.type === "annotation.updated") collectNote(event.payload as Annotation);
            if (event.type === "suggest.requested") collectRequest(event.payload as SuggestionRequest);
          }
        } catch {
          // The stream broke off: what was collected is still returned.
        }
        finish(batch ? "batch" : "closed");
      })();
    });
  } finally {
    signal?.removeEventListener("abort", cancel);
    controller.abort();
  }

  if (signal?.aborted) throw new Error("Listening cancelled");
  if (notes.size || requests.size) return claim(api, [...notes.values()], [...requests.values()]);
  if (ending === "closed") throw new Error("The surfacent server closed the event stream (it may have restarted). Call surfacent_listen again.");
  return { timeout: true };
}

/**
 * Marks notes as being worked on and takes requests, keeping what's still
 * there: a person may have deleted a note meanwhile, another agent may have
 * taken a request first.
 */
async function claim(api: Api, notes: Annotation[], requests: SuggestionRequest[]): Promise<ListenResult> {
  const [claimed, taken] = await Promise.all([
    Promise.all(notes.map((note) => api.update(note.id, { status: "acknowledged" }).catch(() => undefined))),
    Promise.all(requests.map((request) => api.takeRequest(request.id))),
  ]);
  return {
    annotations: claimed.filter((note): note is Annotation => note !== undefined),
    requests: taken.filter((request): request is SuggestionRequest => request !== undefined),
  };
}
