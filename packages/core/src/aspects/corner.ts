import { nestingChain, property } from "../chain.ts";
import { defineAspect } from "../define.ts";
import type { AspectValue, CssRules, UtilityHook } from "../types.ts";

// Every shape reads the radius of the shape it sits in and how far its content
// sits from that shape's edge (the padding). While Concentric corners is on, a
// shape with no radius of its own follows that curve: the parent radius minus
// the distance, so nested corners stay parallel. Far from the edge the curve
// means nothing, and it keeps a minimum share of the parent radius instead. It
// takes the larger of the two, so it never jumps between them.
//
// A radius of its own (data-corner) stops that for the element, and the shapes
// inside follow it instead: the tree starts over there. While it's on, rounded-*
// classes on shapes don't count: every corner is concentric unless data-corner
// says otherwise. Off, shapes keep their rounded-* classes as their own radius;
// without one they have no radius and pass the curve through, adding their
// padding, so explicitly concentric shapes still follow the nearest radius.
//
// Padding and radius classes publish their value (`utilityHooks` below), so
// shapes read them. Ariakit Tailwind's ak-frame does the same with radius and
// padding declared together (`ak-frame-xl/4`). Here only overrides declare one.

/** Shapes: surfaces, elements that rise when touched, and anything with data-corner. */
const SHAPES = ":is([data-surface], [data-response], [data-corner])";
/** Shapes without data-corner, which follow the Concentric corners setting. */
const SURFACES = ":is([data-surface], [data-response])";

const SIDES = ["t", "r", "b", "l"] as const;
type Side = (typeof SIDES)[number];
const CORNERS = ["tl", "tr", "br", "bl"] as const;
type Corner = (typeof CORNERS)[number];

/** Each side's padding and each corner's radius, as the element's classes set them. */
const pad = (side: Side) => `--corner-pad-${side}`;
const own = (corner: Corner) => `--corner-own-${corner}`;

// Sides set by each Tailwind padding utility. Logical sides map to physical
// ones: only the largest side counts, so the direction doesn't matter.
const PADDING: Record<string, Side[]> = {
  p: ["t", "r", "b", "l"],
  px: ["l", "r"],
  py: ["t", "b"],
  ps: ["l"],
  pe: ["r"],
  pbs: ["t"],
  pbe: ["b"],
  pt: ["t"],
  pr: ["r"],
  pb: ["b"],
  pl: ["l"],
};

// Corners set by each Tailwind radius utility. Only the largest counts.
const RADIUS: Record<string, Corner[]> = {
  rounded: ["tl", "tr", "br", "bl"],
  "rounded-t": ["tl", "tr"],
  "rounded-r": ["tr", "br"],
  "rounded-b": ["br", "bl"],
  "rounded-l": ["tl", "bl"],
  "rounded-s": ["tl", "bl"],
  "rounded-e": ["tr", "br"],
  "rounded-tl": ["tl"],
  "rounded-tr": ["tr"],
  "rounded-br": ["br"],
  "rounded-bl": ["bl"],
  "rounded-ss": ["tl"],
  "rounded-se": ["tr"],
  "rounded-es": ["bl"],
  "rounded-ee": ["br"],
};

const hooks: Record<string, UtilityHook> = {
  ...Object.fromEntries(
    Object.entries(PADDING).map(([root, sides]) => [
      root,
      { scale: "spacing", declarations: (value: string) => Object.fromEntries(sides.map((side) => [pad(side), value])) },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(RADIUS).map(([root, corners]) => [
      root,
      {
        scale: "radius",
        declarations: (value: string) => ({
          ...Object.fromEntries(corners.map((corner) => [own(corner), value])),
          "--corner-own-set": "1",
        }),
      },
    ]),
  ),
};

/** Radii of its own on the slider, as multiples of the base radius. */
const MULTIPLES = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const values: AspectValue[] = [
  {
    value: "concentric",
    label: "Concentric",
    when: "The default: leave it unset on surfaces. Set it only on a wrapper or a painted element that should follow the curve it sits in.",
    description:
      "Follows the curve of the shape it sits in: that shape's radius minus the padding between them, at least Minimum × its radius. Every surface without a radius of its own does this while Concentric corners is on.",
  },
  ...MULTIPLES.map((multiple) => ({
    value: String(multiple),
    label: multiple === 0 ? "Square" : `${multiple}×`,
    when:
      multiple === 0
        ? "Shapes that meet an edge: full-bleed sections, a table flush with its card, a toolbar docked to the window."
        : multiple < 1
          ? "A radius of its own, smaller than the base: dense controls, tags, small thumbnails."
          : multiple === 1
            ? "A shape that starts a tree: a card on the page, a dialog, a popover."
            : "A radius of its own, larger than the base: hero cards, large media, marketing sections.",
    description:
      multiple === 0
        ? "No rounding, its own: the shapes inside start over from square."
        : `${multiple === 1 ? "The base radius" : `${multiple}× the base radius`}, its own: the shapes inside follow its curve.`,
  })),
  {
    value: "pill",
    label: "Pill",
    when: "Chips, badges, toggles and buttons meant to be round.",
    description: "Fully round ends, its own: concentric shapes inside stay pills.",
  },
];

// Toolbar checks: what the CSS can't see between a concentric shape and the
// shape it follows.

function largest(...lengths: string[]): number {
  return Math.max(0, ...lengths.map((length) => Number.parseFloat(length) || 0));
}

const radiusOf = (style: CSSStyleDeclaration) =>
  largest(style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius);

const paddingOf = (style: CSSStyleDeclaration) =>
  largest(style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft);

const px = (value: number) => `${Math.round(value * 10) / 10}px`;

/** `<div class="rounded-xl p-1">`, for the agent to find the element in source. */
function describe(element: Element): string {
  const classes = typeof element.className === "string" ? element.className.split(/\s+/).filter(Boolean) : [];
  const shown = classes.slice(0, 8).join(" ") + (classes.length > 8 ? " …" : "");
  return `<${element.localName}${shown ? ` class="${shown}"` : ""}>`;
}

/**
 * What the element is without data-corner: concentric while the setting is on,
 * if it's a surface. Anything else has no default, so the picker sets a value.
 */
function defaultOf(element: Element): string | null {
  const view = element.ownerDocument.defaultView;
  if (!view || !element.matches(SURFACES)) return null;
  const on = view.getComputedStyle(element.ownerDocument.documentElement).getPropertyValue("--corner-concentric");
  return Number.parseFloat(on) === 1 ? "concentric" : null;
}

function inspect(element: Element): string[] {
  const view = element.ownerDocument.defaultView;
  if (!view || (element.getAttribute("data-corner") ?? defaultOf(element)) !== "concentric") return [];
  const notes: string[] = [];
  const shape = element.parentElement?.closest(SHAPES) ?? null;
  const body = element.ownerDocument.body;

  for (let node = element.parentElement; node && node !== shape && node !== body; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    if (radiusOf(style) > 0) {
      notes.push(
        `${describe(node)}, the rounded element it sits in, isn't a shape, so this element follows ${shape ? "a shape further out" : "the base radius"} instead of its curve. Set data-corner on it with its radius, so the shapes inside follow it.`,
      );
      return notes;
    }
    if (shape && paddingOf(style) > 0.5) {
      notes.push(
        `${describe(node)} adds ${px(paddingOf(style))} of padding between this element and its shape, which the corners can't see. Set data-corner="concentric" on it too.`,
      );
    }
  }

  if (shape) {
    const style = view.getComputedStyle(shape);
    const real = paddingOf(style);
    const seen = largest(...SIDES.map((side) => style.getPropertyValue(pad(side))));
    if (Math.abs(real - seen) > 0.5) {
      notes.push(
        `${describe(shape)} has ${px(real)} of padding but its padding classes give ${px(seen)}, so this element follows its curve as if it were ${px(seen)} in. Set that padding with Tailwind classes (p-*, px-*, pt-*…), not inline styles or custom CSS.`,
      );
    }
  }
  return notes;
}

// Important, so the corners win over rounded-* classes, which live in a later
// layer. It also shows a preview before the agent removes those classes.
const IMPORTANT = " !important";

/** An element with a value: its content starts at its padding. */
const VALUE: Record<string, string> = {
  "--corner-inset": "var(--corner-pad)",
  "border-radius": `var(--corner-r)${IMPORTANT}`,
};

export default defineAspect({
  key: "corner",
  label: "Corners",
  why: "rounded-* on every element breaks the curves: a rounded button inside a rounded card rarely lines up with it. Corners follow the shape they sit in (concentric) unless a shape takes a radius of its own, which the shapes inside then follow.",
  description:
    "The element's radius: concentric with the shape it sits in (the default), or its own, which the shapes inside then follow.",
  values,
  ordered: true,
  defaultValue: "concentric",
  defaultOf,
  settings: [
    {
      key: "corner-concentric",
      group: "Corners",
      label: "Concentric corners",
      description:
        "Every surface follows the curve of the shape it sits in, whatever its rounded-* classes say, unless data-corner gives it a radius of its own. Off, surfaces keep their rounded-* classes and only data-corner sets radii.",
      min: 0,
      max: 1,
      step: 1,
      default: 1,
      toggle: true,
    },
    {
      key: "corner-radius",
      group: "Corners",
      label: "Radius",
      description:
        "Base radius: the radius of top-level shapes, and the unit of each element's slider (1× is this). Nested shapes derive from it.",
      min: 0,
      max: 32,
      step: 1,
      default: 12,
      unit: "px",
    },
    {
      key: "corner-min",
      group: "Corners",
      label: "Minimum",
      description:
        "The share of its parent's radius a nested shape keeps, at least, when it sits too far from the parent's edge to follow its curve. 1 keeps the parent's radius, 0 lets it go square.",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.66,
    },
  ],
  agent: {
    global: "With Concentric corners on (the default), every element with data-surface or data-response gets a concentric radius, which wins over its rounded-* classes.",
    migrate: [
      "Remove rounded-* from surfaces: they're concentric with the shape they sit in.",
      "A shape that starts the tree over (a card at the top of a page, a dialog, a popover): data-corner=\"1\", or another multiple of the base radius. Pills: `pill`. Flush or attached shapes: `0`.",
      "Images, avatars and items painted by classes rather than a surface that should follow the curve: data-corner=\"concentric\".",
      "Keep paddings as Tailwind classes (p-*, px-*…): they're the distance the corners subtract. A wrapper that adds padding between two shapes gets data-corner=\"concentric\".",
      "A child flush with the top of a shape (a sticky header): rounded-t-(--corner-r).",
    ],
    find: "\\brounded(-|\\b)",
    replaces: "border-radius utilities (rounded, rounded-*, rounded-t-*, rounded-s-* and the like)",
    notes: [
      "Radius is all it owns: keep padding, layout, borders and colors.",
      "While the Concentric corners setting is on, every surface (data-surface, data-response) is concentric: it follows the curve of the shape it sits in, and rounded-* classes on it have no effect. Don't add data-corner to make a surface concentric.",
      "data-corner gives an element a radius of its own, and the tree starts over there: the shapes inside follow it. Remove the element's rounded-* classes.",
      "The space between a shape and what sits in it comes from Tailwind padding classes (p-*, px-*, pt-*…): keep padding in classes, not inline styles or custom CSS.",
      'Elements that are neither a surface nor data-corner don\'t take part: a wrapper with padding between two shapes hides that space, and an element painted by classes (a menu item with hover:bg-*) keeps its own radius. Give them data-corner="concentric"; a wrapper has no paint, so its radius never shows.',
      "A child flush with a shape's edge, like a header at its top, reads the shape's radius from `--corner-r`: rounded-t-(--corner-r).",
    ],
  },
  utilityHooks: hooks,
  inspect,
  css: ({ is }): CssRules => ({
    // Typed values, so each level resolves to pixels instead of a growing expression.
    ...property("corner-r", { syntax: "<length>", initial: "0px" }),
    ...Object.assign(
      {},
      ...["corner-r-parent", "corner-inset", "corner-inset-parent", "corner-pad", "corner-own", "corner-curve"].map((name) =>
        property(name, { syntax: "<length>", inherits: false, initial: "0px" }),
      ),
      // What the classes set. Not inherited: an element without them has none, whatever its ancestors have.
      ...SIDES.map((side) => property(`corner-pad-${side}`, { syntax: "<length>", inherits: false, initial: "0px" })),
      ...CORNERS.map((corner) => property(`corner-own-${corner}`, { syntax: "<length>", inherits: false, initial: "0px" })),
    ),
    ...property("corner-own-set", { inherits: false, initial: "0" }),

    // Each shape reads the radius and the padding of the shape it sits in. A
    // top-level one sits on the page: a shape of the base radius with no padding.
    ...nestingChain({ selector: SHAPES, values: { "corner-r": "var(--corner-radius)", "corner-inset": "0px" } }),

    [SHAPES]: {
      "--corner-pad": `max(${SIDES.map((side) => `var(${pad(side)})`).join(", ")})`,
      "--corner-own": `max(${CORNERS.map((corner) => `var(${own(corner)})`).join(", ")})`,
      // The parent's curve, or Minimum × its radius when the curve is smaller.
      "--corner-curve":
        "max(calc(var(--corner-r-parent) - var(--corner-inset-parent)), calc(var(--corner-r-parent) * var(--corner-min)))",
      // The curve while Concentric corners is on, whatever its classes say.
      // Off, its rounded-* class if it has one, or the parent's radius passed through.
      "--corner-r":
        "calc(var(--corner-concentric) * var(--corner-curve) + (1 - var(--corner-concentric)) * (var(--corner-own-set) * var(--corner-own) + (1 - var(--corner-own-set)) * var(--corner-r-parent)))",
      // Its content starts at its padding; passing through, also at its parent's.
      "--corner-inset":
        "calc(var(--corner-pad) + (1 - var(--corner-concentric)) * (1 - var(--corner-own-set)) * var(--corner-inset-parent))",
      // Off, it paints what its classes say, corner by corner.
      "border-radius": `${CORNERS.map(
        (corner) => `calc(var(--corner-concentric) * var(--corner-curve) + (1 - var(--corner-concentric)) * var(${own(corner)}))`,
      ).join(" ")}${IMPORTANT}`,
    },

    // A value on the element: concentric whatever the setting, or a radius of its own.
    [is("concentric")]: { ...VALUE, "--corner-r": "var(--corner-curve)" },
    ...Object.fromEntries(
      MULTIPLES.map((multiple) => [is(String(multiple)), { ...VALUE, "--corner-r": `calc(var(--corner-radius) * ${multiple})` }]),
    ),
    [is("pill")]: { ...VALUE, "--corner-r": "calc(infinity * 1px)" },
  }),
});
