// Suggestion mode: find the elements on the page that may need an intent, and
// describe each one for the agent that will propose intents for it.
//
// A candidate is an element that still carries classes an aspect replaces
// (each aspect's `find` pattern, the same one the migration prompt uses) or an
// interactive element without a response. The agent decides; the toolbar only
// finds and describes.

import { aspects } from "./aspects";
import { uniqueSelector } from "./selector";
import { getElementClasses, identifyElement } from "../utils/element-identification";
import { viewportRect } from "../utils/frame-dom";
import { findNearestComponentSource, formatSourceLocation, getSourceLocation, mapSourceLocation } from "../utils/source-location";

/** What the agent gets for one element: the server's Candidate. */
export interface Candidate {
  id: string;
  element: string;
  elementPath: string;
  selector: string;
  tag: string;
  role?: string;
  text?: string;
  classes?: string;
  styles?: Record<string, string>;
  size?: { width: number; height: number };
  sourceFile?: string;
  parent?: string;
  context?: Record<string, string>;
  current?: Record<string, string>;
  reasons: string[];
  x: number;
  y: number;
  isFixed?: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

/** Candidates one request holds; the server refuses more. */
export const MAX_CANDIDATES = 150;

const INTERACTIVE = "button, a[href], [role='button'], [role='link'], [role='tab'], [role='menuitem'], input:not([type='hidden']), select, textarea, summary";

/** Computed styles that say what an element looks like now, without the browser's defaults. */
const STYLE_PROPERTIES: Record<string, (value: string) => boolean> = {
  backgroundColor: (value) => value !== "rgba(0, 0, 0, 0)" && value !== "transparent",
  color: () => true,
  borderTopWidth: (value) => value !== "0px",
  borderTopColor: () => true,
  borderRadius: (value) => value !== "0px",
  boxShadow: (value) => value !== "none",
  fontSize: () => true,
  fontWeight: () => true,
};

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

function isFixed(element: HTMLElement): boolean {
  for (let current: HTMLElement | null = element; current && current !== document.body; current = current.parentElement) {
    const position = getComputedStyle(current).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

/** Why an element is a candidate: the classes each aspect would replace, and a missing response. */
function reasonsFor(element: HTMLElement): string[] {
  const className = typeof element.className === "string" ? element.className : "";
  const reasons: string[] = [];
  for (const aspect of aspects) {
    const find = aspect.agent.find;
    if (!find || !className || element.hasAttribute(aspect.attribute)) continue;
    const matches = [...className.matchAll(new RegExp(`(?:^|\\s)(\\S*?(?:${find})\\S*)`, "g"))].map((match) => match[1]!);
    if (matches.length) reasons.push(`${[...new Set(matches)].join(" ")} (${aspect.key})`);
  }
  if (element.matches(INTERACTIVE) && !element.hasAttribute("data-response")) reasons.push("interactive, without data-response");
  return reasons;
}

/** The text the element itself shows: its label, or the start of its text. */
function ownText(element: HTMLElement): string | undefined {
  const label = element.getAttribute("aria-label") ?? element.getAttribute("placeholder") ?? element.getAttribute("title");
  const text = (label ?? element.textContent ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 80) : undefined;
}

/** The intents set on an element, by aspect. */
function intentsOf(element: Element): Record<string, string> {
  const intents: Record<string, string> = {};
  for (const aspect of aspects) {
    const value = element.getAttribute(aspect.attribute);
    if (value) intents[aspect.key] = value;
  }
  return intents;
}

/** What the element sits in: for each aspect, the nearest ancestor's intent. */
function contextOf(element: Element): Record<string, string> {
  const context: Record<string, string> = {};
  for (const aspect of aspects) {
    const holder = element.parentElement?.closest(`[${aspect.attribute}]`);
    const value = holder?.getAttribute(aspect.attribute);
    if (value) context[aspect.key] = value;
  }
  return context;
}

/**
 * The page's candidates, in document order, at most MAX_CANDIDATES. Source
 * locations are mapped back to the files' own lines before they're returned.
 */
export async function findCandidates(attributeNames: readonly string[], skip: (element: Element) => boolean): Promise<{ candidates: Candidate[]; more: number }> {
  const found: { element: HTMLElement; reasons: string[] }[] = [];
  for (const element of document.body.querySelectorAll<HTMLElement>("body *")) {
    if (element instanceof SVGElement || skip(element) || !isVisible(element)) continue;
    const reasons = reasonsFor(element);
    if (reasons.length) found.push({ element, reasons });
  }
  const kept = found.slice(0, MAX_CANDIDATES);
  const ids = new Map(kept.map(({ element }, index) => [element, `c${index + 1}`]));

  const candidates = await Promise.all(
    kept.map(async ({ element, reasons }) => {
      const { name, path } = identifyElement(element, attributeNames);
      const rect = viewportRect(element);
      const fixed = isFixed(element);
      const styles = getComputedStyle(element);
      const lookedLike: Record<string, string> = {};
      for (const [property, keep] of Object.entries(STYLE_PROPERTIES)) {
        const value = styles.getPropertyValue(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));
        if (value && keep(value)) lookedLike[property] = value;
      }
      let parent: string | undefined;
      for (let current = element.parentElement; current && !parent; current = current.parentElement) parent = ids.get(current);
      const located = getSourceLocation(element);
      const source = located.found ? located.source : findNearestComponentSource(element).source;
      const mapped = source ? await mapSourceLocation(source) : undefined;
      // The note's marker: just inside the element's top-left corner.
      const markerX = rect.left + Math.min(12, rect.width / 2);
      const markerY = rect.top + Math.min(12, rect.height / 2);
      const candidate: Candidate = {
        id: ids.get(element)!,
        element: name,
        elementPath: path,
        selector: uniqueSelector(element),
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute("role") ?? undefined,
        text: ownText(element),
        classes: getElementClasses(element) || undefined,
        styles: lookedLike,
        size: { width: Math.round(rect.width), height: Math.round(rect.height) },
        sourceFile: mapped ? formatSourceLocation(mapped, "path") : undefined,
        parent,
        context: contextOf(element),
        current: intentsOf(element),
        reasons,
        x: (markerX / window.innerWidth) * 100,
        y: fixed ? markerY : markerY + window.scrollY,
        isFixed: fixed,
        boundingBox: { x: rect.left, y: fixed ? rect.top : rect.top + window.scrollY, width: rect.width, height: rect.height },
      };
      return candidate;
    }),
  );
  return { candidates, more: found.length - kept.length };
}
