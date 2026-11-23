import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Api } from "../src/api.ts";
import { createMcpServer } from "../src/mcp.ts";
import { note, startServer, until } from "./helpers.ts";

let server: Awaited<ReturnType<typeof startServer>>;
let client: Client;

before(async () => {
  server = await startServer();
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer(server.api).connect(serverSide);
  client = new Client({ name: "test-agent", version: "0" });
  await client.connect(clientSide);
});
after(async () => {
  await client.close();
  await server.close();
});

/** Calls a tool and parses its text: JSON when it is, the message when it errs. */
async function call(name: string, args: Record<string, unknown> = {}, signal?: AbortSignal) {
  const result = await client.callTool({ name, arguments: args }, undefined, { signal, timeout: 60_000 });
  const content = (result.content as { type: string; text: string }[])[0]!.text;
  return { isError: result.isError === true, text: content, value: result.isError ? undefined : JSON.parse(content) };
}

async function status() {
  return (await (await fetch(`${server.base}/status`)).json()) as { agentListeners: number; listening: boolean };
}

const agentListeners = async () => (await status()).agentListeners;

/** Clears what earlier tests left, so each call starts from nothing pending. */
function settleAll() {
  for (const pending of server.store.pending()) server.store.updateAnnotation(pending.id, { status: "dismissed" });
}

test("the agent gets exactly the lean tool set", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name).sort(), [
    "surfacent_dismiss",
    "surfacent_guide",
    "surfacent_listen",
    "surfacent_resolve",
    "surfacent_suggest",
  ]);
});

test("pending annotations reach the agent with what it needs, and nothing of the removed features", async () => {
  settleAll();
  const session = server.store.createSession("http://localhost:5287/");
  server.store.addAnnotation(session.id, { ...note({ sourceFile: "src/Card.tsx:12:5" }), reactComponents: "<App>", kind: "feedback" });
  const { value } = await call("surfacent_listen", { timeoutSeconds: 2 });
  const [annotation] = value.annotations;
  assert.equal(value.annotations.length, 1);
  assert.equal(annotation.sourceFile, "src/Card.tsx:12:5");
  assert.deepEqual(annotation.intents, { surface: "raised" });
  assert.equal(typeof annotation.instruction, "string");
  for (const field of ["reactComponents", "kind", "placement", "rearrange", "thread"]) assert.equal(field in annotation, false, field);
});

test("listen hands out what's already pending and marks it as being worked on", async () => {
  settleAll();
  const session = server.store.createSession("http://localhost:5287/");
  const body = note();
  server.store.addAnnotation(session.id, body);
  const { value } = await call("surfacent_listen", { timeoutSeconds: 2 });
  assert.deepEqual(value.annotations.map((annotation: { id: string }) => annotation.id), [body.id]);
  assert.equal(server.store.annotation(body.id!)?.status, "acknowledged");

  // Being worked on, it isn't handed out again.
  const again = await call("surfacent_listen", { timeoutSeconds: 1 });
  assert.deepEqual(again.value, { timeout: true });
});

test("listen waits for a new annotation, and the toolbar sees the agent listening", async () => {
  settleAll();
  const session = server.store.createSession("http://localhost:5287/");
  const listening = call("surfacent_listen", { timeoutSeconds: 10, batchWindowSeconds: 1 });
  await until(async () => (await agentListeners()) === 1);
  assert.equal((await status()).listening, true);
  const body = note();
  server.store.addAnnotation(session.id, body);
  const { value } = await listening;
  assert.deepEqual(value.annotations.map((annotation: { id: string }) => annotation.id), [body.id]);
  assert.equal(server.store.annotation(body.id!)?.status, "acknowledged");
  await until(async () => (await agentListeners()) === 0);
  // Between two calls the agent still counts as listening.
  assert.equal((await status()).listening, true);
});

test("annotations made in a row come back together", async () => {
  settleAll();
  const session = server.store.createSession("http://localhost:5287/");
  const listening = call("surfacent_listen", { timeoutSeconds: 10, batchWindowSeconds: 1 });
  await until(async () => (await agentListeners()) === 1);
  const first = note();
  const second = note();
  server.store.addAnnotation(session.id, first);
  server.store.addAnnotation(session.id, second);
  const { value } = await listening;
  assert.deepEqual(value.annotations.map((annotation: { id: string }) => annotation.id).sort(), [first.id, second.id].sort());
});

test("listen reports a quiet timeout", async () => {
  settleAll();
  const { value } = await call("surfacent_listen", { timeoutSeconds: 1 });
  assert.deepEqual(value, { timeout: true });
  await until(async () => (await agentListeners()) === 0);
});

test("cancelling listen closes its stream", async () => {
  settleAll();
  const controller = new AbortController();
  const listening = call("surfacent_listen", { timeoutSeconds: 30 }, controller.signal);
  await until(async () => (await agentListeners()) === 1);
  controller.abort();
  await assert.rejects(listening);
  await until(async () => (await agentListeners()) === 0);
});

test("resolve and dismiss close the note with the summary in its thread", async () => {
  settleAll();
  const session = server.store.createSession("http://localhost:5287/");
  const resolved = note();
  const dismissed = note();
  server.store.addAnnotation(session.id, resolved);
  server.store.addAnnotation(session.id, dismissed);

  await call("surfacent_resolve", { annotationId: resolved.id, summary: "Set data-surface=raised on the card" });
  const afterResolve = server.store.annotation(resolved.id!)!;
  assert.equal(afterResolve.status, "resolved");
  assert.equal(afterResolve.resolvedBy, "agent");
  assert.equal(afterResolve.thread?.at(-1)?.content, "Resolved: Set data-surface=raised on the card");

  await call("surfacent_dismiss", { annotationId: dismissed.id, reason: "Already raised in the source" });
  const afterDismiss = server.store.annotation(dismissed.id!)!;
  assert.equal(afterDismiss.status, "dismissed");
  assert.equal(afterDismiss.thread?.at(-1)?.content, "Dismissed: Already raised in the source");
});

test("with the server down, tools say where it should be and how to start it", async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer(new Api("http://127.0.0.1:9")).connect(serverSide);
  const offline = new Client({ name: "test-agent", version: "0" });
  await offline.connect(clientSide);
  const result = await offline.callTool({ name: "surfacent_listen", arguments: { timeoutSeconds: 1 } });
  const message = (result.content as { text: string }[])[0]!.text;
  assert.equal(result.isError, true);
  assert.match(message, /not reachable at http:\/\/127\.0\.0\.1:9/);
  assert.match(message, /cli\.ts mcp --http-only/);
  await offline.close();
});

/** A candidate as the toolbar sends it. */
const candidate = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  element: "div.card",
  elementPath: "main > div.card",
  selector: `#${id}`,
  tag: "div",
  classes: "rounded-xl, bg-white, shadow-sm",
  x: 10,
  y: 100,
  sourceFile: "src/Card.tsx:12:5",
  ...overrides,
});

function settleRequests() {
  for (const request of server.store.openRequests()) server.store.takeRequest(request.id);
}

test("a suggestion request reaches the agent with the guide, once", async () => {
  settleAll();
  settleRequests();
  const session = server.store.createSession("http://localhost:5287/");
  const request = server.store.requestSuggestions(session.id, { url: "http://localhost:5287/", candidates: [candidate("c1")] });
  assert.equal(typeof request, "object");

  const { value } = await call("surfacent_listen", { timeoutSeconds: 2 });
  assert.equal(value.suggestionRequests.length, 1);
  assert.equal(value.suggestionRequests[0].candidates[0].id, "c1");
  assert.equal("x" in value.suggestionRequests[0].candidates[0], false);
  assert.match(value.suggestionGuide, /## The idea/);
  assert.match(value.suggestionGuide, /Why it exists:/);
  assert.match(value.suggestionGuide, /## How to suggest/);

  // Taken by this agent: no other call gets it.
  assert.deepEqual((await call("surfacent_listen", { timeoutSeconds: 1 })).value, { timeout: true });
});

test("a listening agent gets a suggestion request as soon as the toolbar asks", async () => {
  settleAll();
  settleRequests();
  const session = server.store.createSession("http://localhost:5287/");
  const listening = call("surfacent_listen", { timeoutSeconds: 10, batchWindowSeconds: 1 });
  await until(async () => (await agentListeners()) === 1);
  server.store.requestSuggestions(session.id, { url: "http://localhost:5287/", candidates: [candidate("c1")] });
  const { value } = await listening;
  assert.equal(value.suggestionRequests.length, 1);
  assert.deepEqual(value.annotations, []);
});

test("suggestions are checked against the aspects; nothing is saved while one is wrong", async () => {
  settleAll();
  settleRequests();
  const session = server.store.createSession("http://localhost:5287/");
  const request = server.store.requestSuggestions(session.id, { url: "http://localhost:5287/", candidates: [candidate("c1"), candidate("c2")] });
  if (typeof request === "string") throw new Error(request);
  const before = server.store.annotations().length;

  const wrong = await call("surfacent_suggest", {
    requestId: request.id,
    suggestions: [
      { candidateId: "c1", intents: { surface: "lifted" }, reason: "A card" },
      { candidateId: "c9", intents: { surface: "raised" }, reason: "?" },
    ],
  });
  assert.equal(wrong.isError, true);
  assert.match(wrong.text, /c1: data-surface takes one of raised, flat, sunken, ground; not "lifted"/);
  assert.match(wrong.text, /c9: not a candidate/);
  assert.equal(server.store.annotations().length, before);

  const right = await call("surfacent_suggest", {
    requestId: request.id,
    suggestions: [{ candidateId: "c1", intents: { surface: "raised", response: "hover" }, reason: "A clickable card on the page" }],
  });
  assert.equal(right.value.suggested, 1);
  const [suggested] = server.store.annotations().filter((annotation) => annotation.origin === "suggestion" && annotation.sessionId === session.id);
  assert.equal(suggested!.status, "suggested");
  assert.deepEqual(suggested!.intents, { surface: "raised", response: "hover" });
  assert.equal(suggested!.selector, "#c1");
  assert.equal(suggested!.sourceFile, "src/Card.tsx:12:5");
  assert.equal(suggested!.x, 10);

  // A suggestion isn't work for agents until the person accepts it.
  assert.equal(server.store.pending().some((annotation) => annotation.id === suggested!.id), false);

  const again = await call("surfacent_suggest", { requestId: request.id, suggestions: [{ candidateId: "c2", intents: { text: "label" }, reason: "x" }] });
  assert.equal(again.isError, true);
  assert.match(again.text, /already answered/);
});

test("the toolbar's suggestion request is validated", async () => {
  const session = server.store.createSession("http://localhost:5287/");
  assert.equal(server.store.requestSuggestions(session.id, { candidates: [] }), "candidates must be a non-empty list");
  assert.equal(server.store.requestSuggestions(session.id, { candidates: [{ id: "c1" }] }), "Every candidate needs element");
  assert.equal(server.store.requestSuggestions(session.id, { candidates: [candidate("c1"), candidate("c1")] }), "Candidate c1 appears twice");
  assert.match(String(server.store.requestSuggestions(session.id, { candidates: Array.from({ length: 151 }, (_, i) => candidate(`c${i}`)) })), /At most 150/);
});

test("an accepted suggestion becomes work: a waiting agent gets it", async () => {
  settleAll();
  settleRequests();
  const session = server.store.createSession("http://localhost:5287/");
  const request = server.store.requestSuggestions(session.id, { url: "http://localhost:5287/", candidates: [candidate("c1")] });
  if (typeof request === "string") throw new Error(request);
  server.store.takeRequest(request.id);
  const answered = server.store.answerRequest(request.id, [{ candidateId: "c1", intents: { surface: "raised" }, reason: "A card" }]);
  if (typeof answered === "string") throw new Error(answered);

  const listening = call("surfacent_listen", { timeoutSeconds: 10, batchWindowSeconds: 1 });
  await until(async () => (await agentListeners()) === 1);
  // The person accepts it in the toolbar.
  server.store.updateAnnotation(answered[0]!.id, { status: "pending" });
  const { value } = await listening;
  assert.deepEqual(value.annotations.map((annotation: { id: string }) => annotation.id), [answered[0]!.id]);
});
