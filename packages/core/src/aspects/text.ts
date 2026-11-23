import { defineAspect } from "../define.ts";
import type { CssRules } from "../types.ts";

// Text says what a piece of text is, not how big it is: a role. Each role is a
// whole style (size, line height, letter spacing, and weight for titles), so a
// size never gets paired with a line height by hand.
//
// Its ink is part of it too: full by default, or `muted` (secondary text) and
// `faint` (tertiary) as modifiers, which take the ink of whatever it sits on.
//
// Sizes come from one scale: the body size times the ratio once per step,
// rounded to whole pixels. With the defaults (14px, 1.2) the roles land on
// 36, 24, 20, 15, 14 and 12px. They follow density by its Text setting, and
// line height is a ratio of the size, so it follows too.

const TIGHT = "-0.025em";

const ROLES = [
  {
    value: "display",
    label: "Display",
    when: "The one page title or hero line, at most once per page.",
    step: 5.25,
    leading: 40 / 36,
    weight: 600,
    tracking: TIGHT,
    description: "The page title, or a hero line. Once per page.",
  },
  {
    value: "figure",
    label: "Figure",
    when: "A number that is the content itself: a total, a stat, a price. Not a number inside a sentence.",
    step: 3,
    leading: 32 / 24,
    weight: 600,
    tracking: TIGHT,
    description: "A number that is the point: a total, a stat, a price.",
  },
  {
    value: "title",
    label: "Title",
    when: "The title of a page section or a dialog.",
    step: 2,
    leading: 28 / 20,
    weight: 600,
    tracking: TIGHT,
    description: "The title of a section or a dialog.",
  },
  {
    value: "heading",
    label: "Heading",
    when: "The title of a card, a group or a list item, however short.",
    step: 0.5,
    leading: 1.5,
    weight: 600,
    tracking: TIGHT,
    description: "The title of a card, a group or a list item.",
  },
  {
    value: "body",
    label: "Body",
    when: "Prose meant to be read: descriptions, paragraphs, help text longer than a line.",
    step: 0,
    leading: 24 / 14,
    description: "Prose: descriptions and paragraphs, with room between lines.",
  },
  {
    value: "label",
    label: "Label",
    when: "Interface text: buttons, fields, menu items, table cells, navigation. Set it on the app's root: it's what most text inherits.",
    step: 0,
    leading: 20 / 14,
    description: "Interface text: controls, fields, menus, table cells. Body size, tighter lines.",
  },
  {
    value: "caption",
    label: "Caption",
    when: "Supporting text: hints, metadata, timestamps, badges.",
    step: -1,
    leading: 16 / 12,
    description: "Secondary text: hints, metadata, timestamps, badges.",
  },
];

// Toolbar check: text sizes set by hand inside a role, which win over it.
const SIZED =
  /^(?:[\w-]+:)*(?:text-(?:xs|sm|base|lg|[2-9]?xl|\[[^\]]*\d(?:px|rem|em)\])(?:\/[\w.[\]]+)?|leading-[\w.[\]-]+|tracking-[\w.[\]-]+)$/;

function inspect(element: Element): string[] {
  if (!element.hasAttribute("data-text")) return [];
  const sized: string[] = [];
  const nodes = [element, ...element.querySelectorAll("*")].slice(0, 2000);
  for (const node of nodes) {
    if (typeof node.className !== "string") continue;
    const classes = node.className.split(/\s+/).filter((name) => SIZED.test(name));
    if (classes.length) sized.push(`<${node.localName}> (${classes.join(" ")})`);
  }
  if (!sized.length) return [];
  const shown = sized.slice(0, 3).join(", ") + (sized.length > 3 ? `, and ${sized.length - 3} more` : "");
  return [
    `${sized.length === 1 ? "One element sets its" : `${sized.length} elements set their`} own text size, line height or letter spacing, which wins over the role: ${shown}. Give ${sized.length === 1 ? "it" : "them"} a role instead.`,
  ];
}

export default defineAspect({
  key: "text",
  label: "Text",
  why: "Size, weight and gray classes chosen per element drift apart, so two card titles end up at two sizes. A role says what the text is; its size, line height, tracking, weight and ink come from the role and from the density around it.",
  description:
    "What the text is: a role that sets its size, line height, letter spacing and, for titles, weight, and how much it stands out. Everything inside inherits it until another role.",
  values: ROLES.map(({ value, label, when, description }) => ({ value, label, when, description })),
  modifiers: [
    {
      value: "muted",
      label: "Muted",
      when: "Secondary text under or beside the main one: descriptions, details under a title.",
      description: "Secondary text: the ink of what it sits on, softened. Descriptions, details under a title.",
    },
    {
      value: "faint",
      label: "Faint",
      when: "Tertiary text: timestamps, metadata, placeholders, hints.",
      description: "Tertiary text: softer still. Timestamps, metadata, placeholders, hints.",
    },
  ],
  // One ink at a time: with both, the CSS would apply only faint.
  modifierGroups: [{ label: "Ink", values: ["muted", "faint"] }],
  settings: [
    {
      key: "type-base",
      group: "Text",
      label: "Body size",
      description: "Size of body and label text. Every other role is a number of steps of the ratio from it.",
      min: 10,
      max: 20,
      step: 0.5,
      default: 14,
      unit: "px",
    },
    {
      key: "type-ratio",
      group: "Text",
      label: "Ratio",
      description:
        "How much bigger each step of the scale is. 1.2 puts the roles on 12, 14, 15, 20, 24 and 36px; higher spreads them apart.",
      min: 1.05,
      max: 1.5,
      step: 0.01,
      default: 1.2,
    },
  ],
  agent: {
    migrate: [
      "text-xs → caption; text-sm → label (interface text) or body (prose); text-base → body; text-lg → heading; text-xl → title; text-2xl → figure for numbers, title otherwise; text-3xl and up → display.",
      "Remove leading-*, tracking-* and the font-semibold or font-bold of titles. Keep font-medium on labels.",
      "Ink: text-gray-500/600 and text-ink-muted → `muted`; text-gray-400 and text-ink-faint → `faint` (data-text=\"label muted\"). Full ink is no modifier.",
      "Put data-text=\"label\" on the app's root element, so text without a role is interface text.",
    ],
    find: "\\btext-(xs|sm|base|lg|[2-9]?xl)\\b|\\btext-\\[[0-9]|\\btext-(gray|neutral|zinc|slate|stone)-[0-9]+|\\bleading-|\\btracking-",
    strict: "Turn off Tailwind's text scale once nothing uses it: `@theme { --text-*: initial; }` in the CSS that imports Tailwind.",
    replaces:
      "text size, line height and letter-spacing classes (text-xs … text-9xl, text-[…px], leading-*, tracking-*), font-semibold or font-bold on display, figure, title and heading, which set their weight, and text-ink, text-ink-muted and text-ink-faint, which the muted and faint modifiers replace",
    notes: [
      "Pick a role by what the text is (a card title is heading however short), not by the size you want.",
      "Set it on the element that holds the text, or on a container: everything inside inherits it until another data-text.",
      "Its ink is a modifier after the role: data-text=\"label muted\" for secondary text (was text-ink-muted), \"caption faint\" for tertiary (was text-ink-faint); no modifier is full ink. One ink at most: never muted and faint together. Hover colors (hover:text-ink) stay as classes.",
      "Keep brand and status colors, font-mono, font-medium on labels, uppercase, tabular-nums and truncation: a role owns size, line height, letter spacing, the weight of titles and the ink level.",
      "Sizes follow density: a label in a tight toolbar is smaller, and a caption next to it shrinks in proportion.",
    ],
  },
  inspect,
  // A previewed role shows over the size classes the agent hasn't removed yet.
  previewCss: ({ selector: S }): CssRules => ({
    [`[data-design-preview~="text"]${S}`]: {
      "font-size": "var(--type-size) !important",
      "line-height": "var(--type-leading) !important",
      "letter-spacing": "var(--type-tracking) !important",
    },
  }),
  css: ({ selector: S, is }): CssRules => ({
    [S]: {
      // The scale, rounded to whole pixels, and density on top of it.
      "--type-size":
        "round(calc(var(--type-base) * pow(var(--type-ratio), var(--type-step)) * pow(var(--density, 1), var(--density-text, 0))), 1px)",
      "font-size": "var(--type-size)",
      "line-height": "var(--type-leading)",
      "letter-spacing": "var(--type-tracking)",
    },
    // Ink: the one of whatever it sits on, softened. Classes and hover states still win.
    [is("muted")]: { color: "var(--surface-ink-muted)" },
    [is("faint")]: { color: "var(--surface-ink-faint)" },
    ...Object.fromEntries(
      ROLES.map(({ value, step, leading, weight, tracking }) => [
        is(value),
        {
          "--type-step": String(step),
          "--type-leading": String(Number(leading.toFixed(4))),
          "--type-tracking": tracking ?? "normal",
          ...(weight ? { "font-weight": String(weight) } : {}),
        },
      ]),
    ),
  }),
});
