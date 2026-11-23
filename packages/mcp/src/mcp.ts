// The MCP side, for coding agents: surfacent_* tools over the annotations the
// toolbar sends. Each annotation names one element (its source location) and
// the intents to set on it; surfacent_guide explains what the intents mean.

import { agentGuide, PHILOSOPHY, suggestGuide } from "surfacent-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Api } from "./api.ts";
import { NAME, VERSION } from "./http.ts";
import type { Annotation, SuggestionRequest } from "./types.ts";
import { listenForWork } from "./listen.ts";

const APPLYING = `How to apply an annotation:

- It names one element: \`sourceFile\` is path:line:column of its JSX, \`elementPath\` its CSS path in the page, \`cssClasses\` its classes now.
- \`intents\` are the data attributes to set on it, by aspect: { "text": "title muted" } means data-text="title muted"; null removes the attribute. \`instruction\` says the same in words and lists the classes each aspect now owns: remove them.
- \`notes\` are what the CSS can't see around the element (a rounded parent that isn't a shape, a padded wrapper, padding set outside Tailwind classes): fix those too.
- Keep layout and spacing, radius unless it sets data-corner, text sizes unless it sets data-text, and brand colors unless it sets data-color. Replace fixed neutral colors inside it with text-ink*, border-edge, divide-edge.
- Then call surfacent_resolve with a one-line summary: the toolbar removes the note's marker. A note that only asks a question: answer it in your reply to the user, then resolve it with a short summary of the answer. A note you won't do: surfacent_dismiss with the reason.`;

/** A suggestion request as the agent gets it: the page and its candidates, by id. */
function suggestionRequest(request: SuggestionRequest) {
  return { requestId: request.id, url: request.url, candidates: request.candidates.map(({ x: _x, y: _y, isFixed: _f, boundingBox: _b, ...candidate }) => candidate) };
}

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

/** What an agent needs of an annotation, with the instruction under its own name. */
function brief(annotation: Annotation) {
  return {
    id: annotation.id,
    status: annotation.status,
    url: annotation.url,
    element: annotation.element,
    elementPath: annotation.elementPath,
    sourceFile: annotation.sourceFile,
    cssClasses: annotation.cssClasses,
    nearbyText: annotation.nearbyText,
    intents: annotation.intents,
    notes: annotation.notes,
    instruction: annotation.comment,
  };
}

export function createMcpServer(api: Api): McpServer {
  const server = new McpServer({ name: NAME, version: VERSION });

  server.registerTool(
    "surfacent_guide",
    {
      title: "How the intents work",
      description: "What each data attribute (aspect) and value means, and how to apply an annotation to the source. Read it before applying annotations.",
    },
    async () => text(`${PHILOSOPHY}\n${agentGuide()}\n${APPLYING}`),
  );

  server.registerTool(
    "surfacent_listen",
    {
      title: "Listen",
      description:
        "Listening mode: wait for work from the toolbar and return it, at once if some is waiting, otherwise a short moment after it arrives. " +
        "While you wait here the toolbar shows you as listening, and the notes the person makes come to you. " +
        "`annotations` are notes to apply: every one returned is marked as being worked on, and the toolbar shows that on its marker. " +
        "Apply each one in the source, then call surfacent_resolve with a one-line summary (the marker leaves the page); " +
        "a note that only asks a question: answer it in your reply to the user and resolve it with a short summary of the answer; " +
        "a note you won't do: surfacent_dismiss with the reason. " +
        "`suggestionRequests` come from the toolbar's suggestion mode: a page's candidates, with `suggestionGuide` saying how to judge them. " +
        "Don't edit any code for them: propose intents with surfacent_suggest, and the person reviews them as previews. " +
        "Then call surfacent_listen again to keep listening. Returns { timeout: true } when nothing arrived in time.",
      inputSchema: {
        timeoutSeconds: z.number().int().min(1).max(300).optional().describe("How long to wait for the first annotation (default 120)."),
        batchWindowSeconds: z.number().int().min(1).max(60).optional().describe("How long to keep collecting after the first one arrives (default 2)."),
      },
    },
    async ({ timeoutSeconds = 120, batchWindowSeconds = 2 }, extra) => {
      const result = await listenForWork(api, { batchMs: batchWindowSeconds * 1000, timeoutMs: timeoutSeconds * 1000, signal: extra.signal });
      if ("timeout" in result) return text(result);
      return text({
        annotations: result.annotations.map(brief),
        ...(result.requests.length
          ? { suggestionRequests: result.requests.map(suggestionRequest), suggestionGuide: suggestGuide() }
          : {}),
      });
    },
  );

  server.registerTool(
    "surfacent_suggest",
    {
      title: "Suggest intents",
      description:
        "Answer a suggestion request from surfacent_listen: intents for the candidates that need them, each with a one-line reason. " +
        "Follow its suggestionGuide. The toolbar shows them as previews the person accepts or rejects; the code doesn't change. " +
        "Intents are validated against the aspects: when one isn't valid nothing is saved, and the error says what to fix.",
      inputSchema: {
        requestId: z.string(),
        suggestions: z
          .array(
            z.object({
              candidateId: z.string(),
              intents: z.record(z.string(), z.string().nullable()).describe('By aspect, as the attribute holds it: { "surface": "raised", "response": "hover click" }.'),
              reason: z.string().describe("What the element is, and why these intents fit it. One line."),
            }),
          )
          .describe("Only the candidates that need an intent; leave out the rest."),
      },
    },
    async ({ requestId, suggestions }) => {
      const { annotations } = await api.answerRequest(requestId, suggestions);
      return text({ suggested: annotations.length, note: "The person now sees them as previews on the page and accepts or rejects each one." });
    },
  );

  server.registerTool(
    "surfacent_resolve",
    {
      title: "Resolve",
      description: "Mark an annotation as done, with a one-line summary of the change. The toolbar drops its preview and removes its marker.",
      inputSchema: { annotationId: z.string(), summary: z.string().optional() },
    },
    async ({ annotationId, summary }) => {
      const patch: Partial<Annotation> = { status: "resolved", resolvedBy: "agent" };
      return text(brief(summary ? await api.say(annotationId, "agent", `Resolved: ${summary}`, patch) : await api.update(annotationId, patch)));
    },
  );

  server.registerTool(
    "surfacent_dismiss",
    {
      title: "Dismiss",
      description: "Close an annotation without applying it, with the reason. The toolbar removes its marker.",
      inputSchema: { annotationId: z.string(), reason: z.string() },
    },
    async ({ annotationId, reason }) =>
      text(brief(await api.say(annotationId, "agent", `Dismissed: ${reason}`, { status: "dismissed", resolvedBy: "agent" }))),
  );

  return server;
}
