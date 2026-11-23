import { nestingChain, property } from "../chain.ts";
import { defineAspect } from "../define.ts";
import type { CssRules } from "../types.ts";

// Density is how much room things take. It's a context, not a size: set on a
// region (a toolbar, a sidebar, a card), it rescales everything inside that is
// on Tailwind's spacing scale (padding, gaps, heights, widths, icons) and, by
// Text, its type scale. A button doesn't choose its size: the same button is
// smaller in a tight toolbar and larger in a loose hero.
//
// Tailwind v4 resolves each spacing utility where it's used, as
// calc(var(--spacing) * n), and each text size as var(--text-*). A region only
// redefines those variables; its classes stay as they are. Padding the corners
// read scales with it, so concentric radii follow.
//
// Steps are relative: tight inside tight is tighter. Each step multiplies the
// density of the context by 1 + Step size, or divides it.

const STEPS = [
  {
    value: "tighter",
    label: "Tighter",
    when: "Data-heavy regions where scanning matters more than reading: dense tables, inspectors, logs.",
    step: -2,
    description: "Two steps denser than its context: less padding and gaps, smaller controls and text. Dense tables, inspectors.",
  },
  {
    value: "tight",
    label: "Tight",
    when: "Chrome around the content: toolbars, sidebars, menus, secondary panels.",
    step: -1,
    description: "One step denser than its context. Toolbars, sidebars, menus, secondary panels.",
  },
  {
    value: "same",
    label: "Same",
    when: "The default: leave it unset.",
    step: 0,
    description: "As dense as its context.",
  },
  {
    value: "loose",
    label: "Loose",
    when: "Regions people fill in or read slowly: forms, settings, onboarding.",
    step: 1,
    description: "One step roomier than its context. Forms, settings, onboarding.",
  },
  {
    value: "looser",
    label: "Looser",
    when: "Moments that need air: heroes, empty states, landing sections.",
    step: 2,
    description: "Two steps roomier than its context. Heroes, empty states, landing sections.",
  },
];

/** Tailwind's text sizes, which follow density by Text. */
const TEXT = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];

/** Density never goes past these, however steps compound. */
const MIN = 0.5;
const MAX = 2;

// Toolbar check: sizes inside the region that are fixed, so they don't follow.
const FIXED =
  /^(?:[\w-]+:)*-?(?:p[xytrblse]?|pb[se]|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|w|h|size|min-[wh]|max-[wh]|inset(?:-[xy])?|top|right|bottom|left|text|leading)-\[[^\]]*\d(?:px|rem|em)[^\]]*\]$/;

function inspect(element: Element): string[] {
  if (!element.hasAttribute("data-density")) return [];
  const fixed: string[] = [];
  const nodes = [element, ...element.querySelectorAll("*")].slice(0, 2000);
  for (const node of nodes) {
    if (typeof node.className !== "string") continue;
    const classes = node.className.split(/\s+/).filter((name) => FIXED.test(name));
    if (classes.length) fixed.push(`<${node.localName}> (${classes.join(" ")})`);
  }
  if (!fixed.length) return [];
  const shown = fixed.slice(0, 3).join(", ") + (fixed.length > 3 ? `, and ${fixed.length - 3} more` : "");
  return [
    `${fixed.length === 1 ? "One element inside uses" : `${fixed.length} elements inside use`} fixed sizes, which don't follow density: ${shown}. Where they should follow it, use Tailwind's scale instead (p-3, h-9, text-xs…).`,
  ];
}

export default defineAspect({
  key: "density",
  label: "Density",
  why: "Size classes on every control (h-8, px-3, text-sm) make a dense toolbar and a roomy form impossible to change together. Density belongs to a region: everything inside scales with it.",
  description:
    "How much room the element and everything inside take, relative to its context: padding, gaps, control sizes and text. Set it on a region, not on each control.",
  values: STEPS.map(({ value, label, when, description }) => ({ value, label, when, description })),
  ordered: true,
  defaultValue: "same",
  settings: [
    {
      key: "density-base",
      group: "Density",
      label: "Density",
      description:
        "How dense the whole page is: 1 is Tailwind's scale as written, lower is denser, higher is roomier. Regions step from here.",
      min: 0.75,
      max: 1.25,
      step: 0.01,
      default: 1,
    },
    {
      key: "density-step",
      group: "Density",
      label: "Step size",
      description: "How much one step changes spacing and sizes: tight is this much denser than its context, loose this much roomier.",
      min: 0,
      max: 0.5,
      step: 0.01,
      default: 0.25,
    },
    {
      key: "density-text",
      group: "Density",
      label: "Text",
      description: "How much text follows density: 0 keeps text sizes as written, 1 scales them as much as spacing.",
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.5,
    },
  ],
  agent: {
    global: "Redefines --spacing and Tailwind's --text-* sizes on <body> from density-base: at 1 nothing changes.",
    migrate: [
      "Remove size props and size variants from components: each keeps one base size, the medium one.",
      "A small variant becomes data-density=\"tight\": on the region that holds them (a toolbar, a table, a sidebar), or on one control that should recede. A large one becomes `loose`.",
      "Keep spacing, sizes and text on Tailwind's scale (p-3, h-9, size-4); move arbitrary values (h-[34px], p-[13px]) to the nearest step, or they won't follow.",
    ],
    find: "\\b(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|w|h|size|min-w|min-h|max-w|max-h|top|right|bottom|left|inset)-\\[[0-9]",
    notes: [
      "Density is a context: set it on the region (a toolbar, a sidebar, a card, a form), not on each control. Everything inside follows it.",
      "It owns no classes: padding, gap, size and text classes stay as they are, and scale with it. Keep them on Tailwind's scale (p-3, gap-2, h-9, size-4, text-sm): arbitrary values (p-[13px], text-[11px]) don't follow.",
      "Steps are relative to the context: tight inside a tight region is tighter.",
    ],
  },
  inspect,
  css: ({ selector: S, is }): CssRules => ({
    ...property("density", { initial: "1" }),
    ...property("density-parent", { inherits: false, initial: "1" }),

    // Tailwind's own scale, read before any region redefines it.
    ":root": {
      "--density-spacing": "var(--spacing)",
      ...Object.fromEntries(TEXT.map((size) => [`--density-text-${size}`, `var(--text-${size})`])),
    },
    // The page has the Density setting; each region steps from what it sits in.
    body: { "--density": "var(--density-base)" },
    ...nestingChain({ selector: S, values: { density: "var(--density-base)" } }),
    ...Object.fromEntries(
      STEPS.map(({ value, step }) => [
        is(value),
        {
          "--density": `clamp(${MIN}, calc(var(--density-parent) * pow(calc(1 + var(--density-step)), ${step})), ${MAX})`,
        },
      ]),
    ),

    // Wherever density is set, Tailwind's spacing and text sizes follow it.
    [`body, ${S}`]: {
      "--spacing": "calc(var(--density-spacing) * var(--density))",
      ...Object.fromEntries(
        TEXT.map((size) => [`--text-${size}`, `calc(var(--density-text-${size}) * pow(var(--density), var(--density-text)))`]),
      ),
    },
  }),
});
