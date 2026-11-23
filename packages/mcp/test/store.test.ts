import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { test } from "node:test";
import { Store } from "../src/store.ts";
import type { Annotation } from "../src/types.ts";
import { note, tempFile } from "./helpers.ts";

test("annotations survive a reload with every field the toolbar sent", () => {
  const file = tempFile();
  const store = new Store(file);
  const session = store.createSession("http://localhost:5287/");
  const body = note({ sourceFile: "src/Card.tsx:12:5", cssClasses: "rounded-xl, bg-white", notes: ["Its parent is padded"] });
  store.addAnnotation(session.id, body);
  store.flush();

  const reloaded = new Store(file);
  const saved = reloaded.annotation(body.id!)!;
  assert.equal(saved.sourceFile, "src/Card.tsx:12:5");
  assert.equal(saved.cssClasses, "rounded-xl, bg-white");
  assert.deepEqual(saved.intents, { surface: "raised" });
  assert.deepEqual(saved.notes, ["Its parent is padded"]);
  assert.equal(saved.status, "pending");
  assert.equal(reloaded.session(session.id)?.annotations.length, 1);
});

test("saving is atomic: the file is whole and no temporary file stays behind", () => {
  const file = tempFile();
  const store = new Store(file);
  store.createSession("http://localhost:5287/");
  store.flush();
  assert.doesNotThrow(() => JSON.parse(readFileSync(file, "utf8")));
  assert.equal(existsSync(`${file}.tmp`), false);
});

test("a file that can't be read is kept aside instead of being overwritten", () => {
  const file = tempFile();
  writeFileSync(file, "{ not json");
  const store = new Store(file);
  assert.equal(store.sessions().length, 0);
  const kept = readdirSync(dirname(file)).filter((name) => name.startsWith(`${basename(file)}.broken-`));
  assert.equal(kept.length, 1);
  assert.equal(readFileSync(`${dirname(file)}/${kept[0]}`, "utf8"), "{ not json");
});

test("notes from the removed layout mode are dropped on load", () => {
  const file = tempFile();
  const base = { comment: "x", element: "e", elementPath: "p", timestamp: 1, x: 0, y: 0, sessionId: "ses_1", status: "pending" };
  writeFileSync(
    file,
    JSON.stringify({
      sessions: [{ id: "ses_1", url: "http://localhost/", status: "active", createdAt: "" }],
      annotations: [
        { ...base, id: "keep" },
        { ...base, id: "placement", kind: "placement" },
        { ...base, id: "rearrange", kind: "rearrange" },
      ],
    }),
  );
  const store = new Store(file);
  assert.deepEqual(store.annotations().map((annotation) => annotation.id), ["keep"]);
});

test("uploading a note again never resets what the agent did with it", () => {
  const store = new Store();
  const session = store.createSession("http://localhost:5287/");
  const body = note();
  store.addAnnotation(session.id, body);
  store.updateAnnotation(body.id!, { status: "resolved", resolvedBy: "agent", thread: [{ id: "m", role: "agent", content: "Resolved: done", timestamp: 1 }] });

  const again = store.addAnnotation(session.id, { ...body, status: "pending", comment: "edited" }) as Annotation;
  assert.equal(again.status, "resolved");
  assert.equal(again.resolvedBy, "agent");
  assert.equal(again.thread?.length, 1);
  assert.equal(again.comment, "edited");
  assert.deepEqual(store.pending(), []);
});

test("an annotation needs its AFS fields and a known session", () => {
  const store = new Store();
  const session = store.createSession("http://localhost:5287/");
  assert.equal(store.addAnnotation("ses_missing", note()), "No session ses_missing");
  assert.equal(store.addAnnotation(session.id, note({ element: "" })), "Missing element");
});
