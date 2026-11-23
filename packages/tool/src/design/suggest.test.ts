import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findCandidates, MAX_CANDIDATES } from "./suggest";

const skipToolbar = (element: Element) => element.tagName === "SURFACENT-TOOLBAR";

beforeEach(() => {
  // jsdom lays nothing out: give every element a visible box.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 20, y: 30, left: 20, top: 30, width: 200, height: 40, right: 220, bottom: 70, toJSON: () => ({}),
  } as DOMRect);
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("finding candidates", () => {
  it("finds elements with classes an aspect replaces, and says which", async () => {
    document.body.innerHTML = `<main><div id="card" class="rounded-xl bg-white shadow-sm p-4"><p class="text-sm text-gray-500">Hi</p></div></main>`;
    const { candidates } = await findCandidates([], skipToolbar);
    const card = candidates.find((candidate) => candidate.selector === "#card")!;
    expect(card.reasons).toEqual(["bg-white shadow-sm (surface)", "rounded-xl (corner)"]);
    const text = candidates.find((candidate) => candidate.tag === "p")!;
    expect(text.reasons).toEqual(["text-sm text-gray-500 (text)"]);
    expect(text.parent).toBe(card.id);
    expect(text.text).toBe("Hi");
  });

  it("finds interactive elements without a response, and leaves out what's already converted", async () => {
    document.body.innerHTML = `
      <div data-surface="raised" class="bg-white">
        <button id="save">Save</button>
        <button id="done" data-response="hover click">Done</button>
      </div>`;
    const { candidates } = await findCandidates([], skipToolbar);
    expect(candidates.map((candidate) => candidate.selector)).toEqual(["#save"]);
    expect(candidates[0]!.reasons).toEqual(["interactive, without data-response"]);
    // What it sits in: the raised surface around it.
    expect(candidates[0]!.context).toEqual({ surface: "raised" });
  });

  it("places each note just inside its element's corner", async () => {
    document.body.innerHTML = `<button id="go">Go</button>`;
    const { candidates } = await findCandidates([], skipToolbar);
    expect(candidates[0]!.y).toBe(30 + 12);
    expect(candidates[0]!.size).toEqual({ width: 200, height: 40 });
    expect(candidates[0]!.boundingBox).toEqual({ x: 20, y: 30, width: 200, height: 40 });
  });

  it("skips the toolbar and hidden elements", async () => {
    document.body.innerHTML = `<surfacent-toolbar class="bg-white"></surfacent-toolbar><div class="bg-white" style="display:none"></div>`;
    const { candidates } = await findCandidates([], skipToolbar);
    expect(candidates).toEqual([]);
  });

  it("sends a page's worth at most and counts the rest", async () => {
    document.body.innerHTML = Array.from({ length: MAX_CANDIDATES + 10 }, (_, index) => `<button id="b${index}">B</button>`).join("");
    const { candidates, more } = await findCandidates([], skipToolbar);
    expect(candidates).toHaveLength(MAX_CANDIDATES);
    expect(more).toBe(10);
    expect(new Set(candidates.map((candidate) => candidate.id)).size).toBe(MAX_CANDIDATES);
  });
});
