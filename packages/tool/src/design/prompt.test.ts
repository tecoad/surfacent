import { describe, expect, it } from "vitest";
import type { Annotation } from "../types";
import { composeComment, fromServerAnnotation, serverFields, toServerAnnotation } from "./prompt";

const base: Annotation = {
  id: "1",
  x: 0,
  y: 0,
  element: "div.card",
  elementPath: "main > div.card",
  timestamp: 1,
  comment: "make it stand out",
};

describe("what the server keeps", () => {
  it("sends the composed instruction as the comment, the person's words as the note, and the intents as data", () => {
    const annotation = { ...base, aspects: { surface: "raised" } };
    const fields = serverFields(annotation);
    expect(fields.comment).toBe(composeComment(annotation));
    expect(fields.comment).toMatch(/data-surface="raised"/);
    expect(fields.comment).toMatch(/Note: make it stand out$/);
    expect(fields.note).toBe("make it stand out");
    expect(fields.intents).toEqual({ surface: "raised" });
    expect(fields.notes).toEqual([]);
    expect(fields.intent).toBe("change");
  });

  it("clears the intents on the server when a note has none any more", () => {
    expect(serverFields({ ...base, aspects: undefined })).toEqual({
      comment: "make it stand out",
      note: "make it stand out",
      intents: null,
      notes: null,
      aspects: null,
    });
  });

  it("never sends local bookkeeping", () => {
    expect("_syncedTo" in toServerAnnotation({ ...base, _syncedTo: "ses_1" })).toBe(false);
  });
});

describe("reading a server's annotation back", () => {
  it("restores the person's note, so the next instruction doesn't nest the previous one", () => {
    const annotation = { ...base, aspects: { surface: "raised" } };
    const roundTrip = fromServerAnnotation(toServerAnnotation(annotation));
    expect(roundTrip.comment).toBe("make it stand out");
    expect(composeComment(roundTrip)).toBe(composeComment(annotation));
  });

  it("recovers the note from an older server's composed comment", () => {
    const legacy = { ...base, aspects: { surface: "raised" }, comment: 'Set data-surface="raised" on this element.\nNote: make it stand out' };
    expect(fromServerAnnotation(legacy).comment).toBe("make it stand out");
    expect(fromServerAnnotation({ ...legacy, comment: 'Set data-surface="raised" on this element.' }).comment).toBe("");
  });

  it("keeps plain notes as they are and drops cleared intents", () => {
    const plain = fromServerAnnotation({ ...base, aspects: null, intents: null });
    expect(plain.comment).toBe("make it stand out");
    expect(plain.aspects).toBeUndefined();
  });
});
