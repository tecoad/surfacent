// Agent-facing text for intent changes. MCP servers only keep an annotation's
// comment, so the comment synced to the server carries the full instruction.

import type { Annotation } from "../types";
import { agentGuide, describeChanges, hasChanges, inspectElement, settings, type AspectSetting } from "./aspects";
import { findElement } from "./preview";

/** Instruction + note for one annotation. */
export function composeComment(annotation: Pick<Annotation, "comment" | "aspects" | "cssClasses" | "selector">): string {
  if (!hasChanges(annotation.aspects)) return annotation.comment;
  const lines = describeChanges(annotation.aspects);
  // What the CSS can't see around the element, read from the page while the preview shows.
  const element = findElement(annotation.selector);
  if (element) lines.push(...inspectElement(element, Object.keys(annotation.aspects)));
  if (annotation.cssClasses) lines.push(`Current classes: ${annotation.cssClasses}`);
  if (annotation.comment) lines.push(`Note: ${annotation.comment}`);
  return lines.join("\n");
}

/**
 * What a server keeps of an annotation's text and intents. `comment`
 * carries the full instruction for any reader; `note` keeps the person's own
 * words, so the toolbar can read them back without nesting the instruction
 * inside itself. `intents` and `notes` are the changes and checks as data for
 * surfacent's tools; `null` clears them on an update.
 */
export function serverFields(annotation: Annotation): Partial<Annotation> {
  if (!hasChanges(annotation.aspects)) {
    return { comment: annotation.comment, note: annotation.comment, intents: null, notes: null, aspects: null };
  }
  const element = findElement(annotation.selector);
  return {
    comment: composeComment(annotation),
    note: annotation.comment,
    intent: annotation.intent ?? "change",
    intents: annotation.aspects,
    notes: element ? inspectElement(element, Object.keys(annotation.aspects)) : [],
    aspects: annotation.aspects,
  };
}

/** The annotation as sent to a server: the annotation format, plus surfacent's fields, minus local bookkeeping. */
export function toServerAnnotation(annotation: Annotation): Annotation {
  const { _syncedTo: _, ...rest } = annotation;
  return { ...rest, ...serverFields(annotation) };
}

/**
 * A server's annotation as the toolbar keeps it: the person's own note in
 * `comment`. Older servers kept only the composed instruction; its "Note:"
 * line is the note.
 */
export function fromServerAnnotation(annotation: Annotation): Annotation {
  const aspects = annotation.aspects ?? undefined;
  let comment = annotation.comment;
  if (typeof annotation.note === "string") comment = annotation.note;
  else if (hasChanges(aspects)) comment = annotation.comment.split("\n").reverse().find((line) => line.startsWith("Note: "))?.slice(6) ?? "";
  return { ...annotation, aspects, comment };
}

/** The guide placed once at the top of a copied prompt, for the aspects in use. */
export function guideFor(annotations: Annotation[]): string {
  const keys = new Set<string>();
  for (const annotation of annotations) {
    if (hasChanges(annotation.aspects)) for (const key of Object.keys(annotation.aspects)) keys.add(key);
  }
  return keys.size ? agentGuide([...keys]) : "";
}

/** Prompt that asks an agent to persist settings when the dev server can't write them. */
export function settingsPrompt(values: Record<string, number>, theme: "light" | "dark"): string {
  const lines = Object.entries(values)
    .map(([key, value]) => {
      const setting = settings.find((item) => item.key === key) as AspectSetting | undefined;
      if (!setting) return null;
      const name = theme === "dark" && setting.darkDefault !== undefined ? `${key}-dark` : key;
      return `  ${name}: ${value};`;
    })
    .filter(Boolean);
  return [
    'Update the design settings in the CSS file that contains `@plugin "surfacent/tailwind"`.',
    "Set these options inside its block, keeping the other options as they are:",
    "",
    ...lines,
  ].join("\n");
}
