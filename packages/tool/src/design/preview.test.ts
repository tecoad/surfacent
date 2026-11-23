import { describe, expect, it } from "vitest";
import { previewChanges, revertPreview, settlePreview } from "./preview";

/** An element as React renders it: React keeps its props on the node. */
function reactElement(props: Record<string, unknown>) {
  const element = document.createElement("div");
  for (const [name, value] of Object.entries(props)) if (typeof value === "string") element.setAttribute(name, value);
  Object.assign(element, { "__reactProps$test": props });
  document.body.append(element);
  return element;
}

describe("undoing a preview", () => {
  it("goes back to the value before the preview on elements React doesn't render", () => {
    const element = document.createElement("div");
    element.setAttribute("data-surface", "flat");
    previewChanges(element, { surface: "raised" });
    expect(element.getAttribute("data-surface")).toBe("raised");
    revertPreview(element);
    expect(element.getAttribute("data-surface")).toBe("flat");
  });

  it("keeps what the code renders now, when the agent already applied the change", () => {
    const element = reactElement({});
    previewChanges(element, { surface: "raised" });
    // The agent edits the source; React's props for the element now carry the attribute.
    Object.assign(element, { "__reactProps$test": { "data-surface": "raised" } });
    revertPreview(element);
    expect(element.getAttribute("data-surface")).toBe("raised");
  });

  it("removes the attribute when the code doesn't render it", () => {
    const element = reactElement({ className: "card" });
    previewChanges(element, { surface: "raised" });
    revertPreview(element);
    expect(element.hasAttribute("data-surface")).toBe(false);
  });

  it("settling keeps the previewed value and drops the preview's marks", () => {
    const element = reactElement({});
    previewChanges(element, { surface: "raised" });
    settlePreview(element);
    expect(element.getAttribute("data-surface")).toBe("raised");
    expect(element.hasAttribute("data-design-preview")).toBe(false);
  });
});
