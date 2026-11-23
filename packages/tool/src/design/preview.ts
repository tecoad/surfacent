// Live preview: an intent picked in the toolbar is written to the element
// right away, so the page shows the result before the agent edits the source.
// The attribute the source had is remembered, so a preview can be undone.
//
// The element may still carry classes the agent will remove (bg-white,
// shadow-sm…) that outrank the aspect CSS. Previewed elements are marked with
// `data-design-preview="<aspect> …"`, and each aspect's previewCss wins over
// those classes until the change is settled or undone.

import { previewStylesheet } from "surfacent-core";
import { aspects, type AspectChanges } from "./aspects";

const MARK = "data-design-preview";
// The value hovered in the picker, `<aspect>:<value>`, so an aspect can show
// that state (a response simulates hover, focus or press).
const TRY = "data-design-try";
const originals = new WeakMap<Element, Map<string, string | null>>();

let stylesInjected = false;
function ensurePreviewStyles(doc: Document) {
  if (stylesInjected || doc.querySelector("style[data-surfacent-preview]")) return;
  const style = doc.createElement("style");
  style.setAttribute("data-surfacent-preview", "");
  style.textContent = previewStylesheet();
  doc.head.appendChild(style);
  stylesInjected = true;
}

function mark(element: Element, key: string, on: boolean) {
  const tokens = new Set((element.getAttribute(MARK) ?? "").split(/\s+/).filter(Boolean));
  if (on) tokens.add(key);
  else tokens.delete(key);
  if (tokens.size) element.setAttribute(MARK, [...tokens].join(" "));
  else element.removeAttribute(MARK);
}

function remember(element: Element, attribute: string) {
  let saved = originals.get(element);
  if (!saved) {
    saved = new Map();
    originals.set(element, saved);
  }
  if (!saved.has(attribute)) saved.set(attribute, element.getAttribute(attribute));
}

function write(element: Element, attribute: string, value: string | null) {
  if (value == null) element.removeAttribute(attribute);
  else if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
}

/** The value the element had before any preview. */
export function originalValue(element: Element, attribute: string): string | null {
  const saved = originals.get(element);
  return saved?.has(attribute) ? saved.get(attribute)! : element.getAttribute(attribute);
}

/** Shows exactly `changes` on the element; aspects not in `changes` go back to their original value. */
export function previewChanges(element: Element, changes: AspectChanges = {}) {
  ensurePreviewStyles(element.ownerDocument);
  for (const aspect of aspects) {
    if (aspect.key in changes) {
      remember(element, aspect.attribute);
      write(element, aspect.attribute, changes[aspect.key]);
      mark(element, aspect.key, changes[aspect.key] != null);
    } else {
      revertAspect(element, aspect.key, aspect.attribute);
    }
  }
}

/**
 * What the page's code renders for the attribute now. React keeps the props
 * of each element it renders; after the agent edits the source and the page
 * reloads the module, they hold the new value, while the DOM still shows the
 * preview's. Elements React doesn't render fall back to the value before any
 * preview.
 */
function renderedValue(element: Element, attribute: string, before: string | null): string | null {
  const key = Object.keys(element).find((name) => name.startsWith("__reactProps$"));
  if (!key) return before;
  const value = (element as unknown as Record<string, Record<string, unknown> | undefined>)[key]?.[attribute];
  return value == null || value === false ? null : String(value);
}

function revertAspect(element: Element, key: string, attribute: string) {
  mark(element, key, false);
  const saved = originals.get(element);
  if (!saved?.has(attribute)) return;
  write(element, attribute, renderedValue(element, attribute, saved.get(attribute)!));
  saved.delete(attribute);
}

/** Marks the value hovered in the picker on the element, or clears it. */
export function previewTry(element: Element, key?: string, value?: string) {
  if (key && value) element.setAttribute(TRY, `${key}:${value}`);
  else element.removeAttribute(TRY);
}

/** Undoes every preview on the element. */
export function revertPreview(element: Element) {
  for (const aspect of aspects) revertAspect(element, aspect.key, aspect.attribute);
  element.removeAttribute(TRY);
}

/** Keeps the previewed values and drops the overrides, e.g. once the agent applied them in source. */
export function settlePreview(element: Element) {
  originals.delete(element);
  element.removeAttribute(MARK);
  element.removeAttribute(TRY);
}

/** Finds the element an annotation points to, for previews restored after a reload. */
export function findElement(selector: string | undefined): Element | null {
  if (!selector) return null;
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}
