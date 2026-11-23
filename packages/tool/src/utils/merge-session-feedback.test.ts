// Joining a session: the server's word on the notes it has, and the notes it
// doesn't have stay in the toolbar, unsent.

import { expect, it } from "vitest";
import type { Annotation } from "../types";
import { isUnsent, mergeSessionFeedback, withUnsent } from "./merge-session-feedback";

const note = (id: string, fields: Partial<Annotation> = {}): Annotation => ({
  id,
  x: 0,
  y: 0,
  comment: `Note ${id}`,
  element: "div",
  elementPath: "main > div",
  timestamp: 0,
  ...fields,
});

it("keeps the server's status for the notes it has", () => {
  const local = [note("a", { status: "pending" })];
  const merged = withUnsent([note("a", { status: "acknowledged" })], local, new Map());
  expect(merged).toEqual([note("a", { status: "acknowledged" })]);
});

it("keeps the notes the server doesn't have, unsent, even ones it once had", () => {
  const local = [note("made-here"), note("lost", { status: "pending" })];
  const merged = withUnsent([], local, new Map());
  expect(merged.map((a) => a.id)).toEqual(["made-here", "lost"]);
  expect(merged.every(isUnsent)).toBe(true);
});

it("drops a suggestion the server no longer has", () => {
  expect(withUnsent([], [note("s", { status: "suggested" })], new Map())).toEqual([]);
});

it("matches a note to the server's copy by the id the server gave it", () => {
  const merged = withUnsent([note("server-1", { status: "pending" })], [note("local-1")], new Map([["local-1", "server-1"]]));
  expect(merged.map((a) => a.id)).toEqual(["server-1"]);
});

it("survives the merge with work done while the session loaded", () => {
  const before = [note("unsent")];
  const current = [note("unsent", { comment: "Edited meanwhile" }), note("new")];
  const merged = mergeSessionFeedback(before, current, withUnsent([], before, new Map()), new Map());
  expect(merged.map((a) => [a.id, a.comment])).toEqual([
    ["unsent", "Edited meanwhile"],
    ["new", "Note new"],
  ]);
  expect(merged.every(isUnsent)).toBe(true);
});
