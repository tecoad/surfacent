import { nestingChain, property } from "../chain.ts";
import { defineAspect } from "../define.ts";
import { DARK_SELECTOR } from "../theme.ts";
import type { CssRules } from "../types.ts";

// Ariakit Tailwind's DARK_THRESHOLD_L: above this OKLCH lightness a fill reads
// as light and takes dark ink, below it takes light ink.
const LIGHT_FILL_L = 0.645;
// Ariakit's LAYER_L_FLOOR: below this lightness, additive steps are hard to see
// on real displays, so raising a near-black parent first lifts it to the floor.
const VISIBLE_L_FLOOR = 0.13;
const INK_ON_LIGHT_L = 0.21;
const INK_ON_DARK_L = 0.96;

// Light comes from above and only touches the top edge, subtly: per level of
// elevation above the ground, at Highlight 1. The closer a surface is to the
// viewer, the brighter its top edge. It's drawn on the outer edge line, so
// children that paint their own background (a sticky header) never cover it.
const RIM_PER_LEVEL = 0.1;
// The lower lip of a recess catches a little light too.
const LIP = 0.03;
// The cast shadow grows with height above the ground: per level, it drops
// this much, blurs this much and tucks in this much. It drops more than it
// tucks in, so a higher surface's shadow visibly reaches further below it.
// Past MAX_CAST_LEVELS it stops growing.
const CAST_OFFSET_PER_LEVEL = 3;
const CAST_BLUR_PER_LEVEL = 8;
const CAST_SPREAD_PER_LEVEL = 1;
const MAX_CAST_LEVELS = 6;

const NO_SHADOW = "0 0 #0000";

/**
 * What a surface is made of: the hue and chroma of its fill and ink, how fast
 * that chroma tapers toward black and white (so tones derived from it stay
 * inside sRGB), its tone on the page plane (`--surface-anchor`) and how much
 * a level of elevation moves it (`--surface-follow`, a share of Step). The
 * neutral material is the page itself: the ground tone, moved a full step.
 * Inherited: whatever sits on a surface is made of the same material unless
 * it says otherwise. The color aspect brings other materials (the accent),
 * each with its own `--surface-material` number.
 */
export const NEUTRAL_MATERIAL: Record<string, string> = {
  "--surface-hue": "var(--tint-hue)",
  "--surface-chroma": "var(--tint-chroma)",
  "--surface-taper-light": "0.6",
  "--surface-taper-dark": "0.2",
  "--surface-material": "0",
  "--surface-anchor": "var(--tone-ground)",
  "--surface-follow": "1",
};

/** One step per level; raising a near-black base first lifts it to the visible floor. */
const levelDelta = (base: string) =>
  `calc(var(--surface-dz) * var(--tone-step) + max(0, ${VISIBLE_L_FLOOR} - ${base}) * clamp(0, var(--surface-dz) * 1000, 1))`;

// 1 when the parent is made of the same material.
const SAME_MATERIAL =
  "(1 - min(1, max(var(--surface-material) - var(--surface-material-parent), var(--surface-material-parent) - var(--surface-material))))";
// What the element starts from before its own level: on the same material,
// the parent's tone; where the material changes, the new material's tone in
// the parent's light (its page-plane tone, moved by its share of how far the
// neutral there is from the ground).
const BASE_L = `calc(${SAME_MATERIAL} * var(--surface-l-parent) + (1 - ${SAME_MATERIAL}) * (var(--surface-anchor) + var(--surface-follow) * (var(--surface-n-parent) - var(--tone-ground))))`;

/**
 * Elements that take part in elevation: surfaces, and elements that only move
 * when touched (`data-response` without a surface). They all read the level
 * of what they sit on, so a moving element carries its contents with it.
 */
export const ELEVATED = ":is([data-surface], [data-response])";

/**
 * Box-shadow that layers Tailwind's ring and inset utilities over the surface
 * shadow (`--tw-shadow`), so `focus-visible:ring-2` keeps the elevation.
 */
export const SHADOW_STACK =
  "var(--tw-inset-shadow, 0 0 #0000), var(--tw-inset-ring-shadow, 0 0 #0000), var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)";

/** Derived paint tokens. Declared on :root and on every elevated element, so each recomputes them from its own tone and level, and its descendants inherit them. */
const tokens: Record<string, string> = {
  // The material's chroma, tapering to 0 at black and white at the material's rate.
  "--surface-c":
    "max(0, min(var(--surface-chroma), (1 - var(--surface-l)) * var(--surface-taper-light), var(--surface-l) * var(--surface-taper-dark)))",
  "--surface-fill": "oklch(var(--surface-l) var(--surface-c) var(--surface-hue))",
  // 1 when the fill reads as light (dark ink), 0 when it reads as dark (light
  // ink). Decided by the tone at rest, so ink never flips while it moves. It
  // reads the target tone, which a state changes at once: the tone itself
  // eases toward it, and subtracting the state from that would undershoot.
  "--surface-light": `clamp(0, (var(--surface-l-target) - var(--surface-follow) * var(--surface-dz-state) * var(--tone-step) - ${LIGHT_FILL_L}) * 1000, 1)`,
  "--surface-ink-l": `calc(${INK_ON_DARK_L} - var(--surface-light) * ${INK_ON_DARK_L - INK_ON_LIGHT_L})`,
  "--surface-ink-c":
    "max(0, min(var(--surface-chroma) * 1.5, (1 - var(--surface-ink-l)) * 0.6, var(--surface-ink-l) * 0.2))",
  "--surface-ink": "oklch(var(--surface-ink-l) var(--surface-ink-c) var(--surface-hue))",
  "--surface-ink-muted": "oklch(var(--surface-ink-l) var(--surface-ink-c) var(--surface-hue) / 0.7)",
  "--surface-ink-faint": "oklch(var(--surface-ink-l) var(--surface-ink-c) var(--surface-hue) / 0.48)",
  "--surface-edge": "oklch(var(--surface-ink-l) var(--surface-ink-c) var(--surface-hue) / 0.11)",
  "--surface-edge-strong": "oklch(var(--surface-ink-l) var(--surface-ink-c) var(--surface-hue) / 0.2)",
  // A drop shadow falls on what the surface sits on, so its strength follows the parent tone.
  "--surface-shade": "oklch(0 0 0 / calc(0.08 + (1 - var(--surface-l-parent)) * 0.3))",
  // Highlight grows with elevation above the ground; surfaces at or below it get none.
  "--surface-zpos": "max(0, var(--surface-z))",
  "--surface-rim": `oklch(1 0 0 / min(0.3, var(--light-highlight) * ${RIM_PER_LEVEL} * var(--surface-zpos)))`,
  "--surface-lip": `oklch(1 0 0 / calc(var(--light-highlight) * ${LIP}))`,
  // The rim comes first, so it lights the top of the edge line it overlaps.
  // Closer to the viewer, further from what's below: the cast shadow moves
  // down and spreads with height. The contact shadow at the edge stays crisp.
  "--surface-height": `min(${MAX_CAST_LEVELS}, var(--surface-zpos))`,
  "--surface-cast": `0 calc(var(--surface-height) * ${CAST_OFFSET_PER_LEVEL}px) calc(var(--surface-height) * ${CAST_BLUR_PER_LEVEL}px) calc(var(--surface-height) * -${CAST_SPREAD_PER_LEVEL}px) var(--surface-shade)`,
  "--surface-shadow-raised":
    "0 -1px 0 0 var(--surface-rim), 0 0 0 1px var(--surface-edge), 0 1px 2px -1px var(--surface-shade), var(--surface-cast)",
  "--surface-shadow-pressed": "0 0 0 1px var(--surface-edge), inset 0 1px 2px 0 var(--surface-shade)",
  "--surface-shadow-sunken":
    "inset 0 0 0 1px var(--surface-edge), inset 0 1px 2px 0 var(--surface-shade), inset 0 -1px 0 0 var(--surface-lip)",
  "--surface-shadow-flat": "inset 0 0 0 1px var(--surface-edge)",
  // A dent with no rim, for elements that sink without being a surface at rest.
  "--surface-shadow-recess": "inset 0 1px 2px 0 var(--surface-shade), inset 0 -1px 0 0 var(--surface-lip)",
};

export default defineAspect({
  key: "surface",
  label: "Surface",
  why: "Fixed backgrounds and shadows (bg-white, bg-gray-50, shadow-sm) look the same wherever they sit: a card in a modal is the same gray as a card on the page, and nesting loses its depth. A surface states its level instead; its tone, light and shadow follow from what it sits on.",
  description:
    "How the element behaves in a physical world. Light comes from above: raised catches more of it, sunken less.",
  values: [
    {
      value: "raised",
      label: "Raised",
      when: "Things that sit on top and hold content or take an action: cards, popovers, menus, dialogs, filled buttons. Not layout wrappers, and not every row of a list.",
      description: "Sits above what it's on: one step lighter. The higher it is, the more light on its top edge and the longer its shadow. Cards, popovers, buttons.",
    },
    {
      value: "flat",
      label: "Flat",
      when: "A group on its parent's plane that still needs an edge: outlined panels, table rows, segmented controls, ghost buttons. Without a visible edge, leave the element without a surface.",
      description: "Same plane as what it sits on: takes that tone, separated only by a hairline. Outlined groups, rows, ghost controls.",
    },
    {
      value: "sunken",
      label: "Sunken",
      when: "What you type into or look into: inputs, search fields, wells, code blocks, progress and slider tracks. Not the body of a card.",
      description: "Recessed into what it's on: one step darker, inner shadow. Inputs, wells, tracks, code.",
    },
    {
      value: "ground",
      label: "Ground",
      when: "Back to the page tone deep in a tree: page regions and full-bleed sections inside a raised shell. Rarely needed.",
      description: "Back to the page tone wherever it is nested. Page regions, full-bleed sections.",
    },
  ],
  settings: [
    {
      key: "tone-ground",
      group: "Surface",
      label: "Ground",
      description:
        'Tone of the page and of every data-surface="ground" surface: 0 is black, 1 white. A dark theme changes only this.',
      min: 0,
      max: 1,
      step: 0.005,
      default: 0.97,
      darkDefault: 0.17,
    },
    {
      key: "tone-step",
      group: "Surface",
      label: "Step",
      description: "One level of elevation: raised is this much lighter than what it sits on, sunken this much darker.",
      min: 0,
      max: 0.15,
      step: 0.001,
      default: 0.03,
    },
    {
      key: "tint-chroma",
      group: "Surface",
      label: "Tint chroma",
      description: "Chroma of neutral fills and inks, held inside sRGB near black and white.",
      min: 0,
      max: 0.06,
      step: 0.001,
      default: 0.008,
    },
    {
      key: "tint-hue",
      group: "Surface",
      label: "Tint hue",
      description: "Hue of the neutral tint, in degrees.",
      min: 0,
      max: 360,
      step: 1,
      default: 260,
    },
    {
      key: "light-highlight",
      group: "Surface",
      label: "Highlight",
      description:
        "Light from above, on the top edge only. Each level a surface rises above the ground lights its top edge a little more: the closer to the viewer, the brighter. 0 turns it off.",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.6,
    },
  ],
  colors: {
    ink: "var(--surface-ink)",
    "ink-muted": "var(--surface-ink-muted)",
    "ink-faint": "var(--surface-ink-faint)",
    edge: "var(--surface-edge)",
    "edge-strong": "var(--surface-edge-strong)",
    surface: "var(--surface-fill)",
  },
  agent: {
    global: "Paints <body> with the ground tone and its ink (background and text color) and sets color-scheme. A background or text color on <html> or <body> fights it: remove it.",
    migrate: [
      "Cards, popovers, dialogs, menus and filled buttons: `raised`. Remove bg-white and shadow-*.",
      "Outlined groups, rows and chips that keep the tone of what they sit on: `flat`. Remove their border-gray-* (the hairline is drawn for them).",
      "Inputs, wells, tracks and code blocks, darker and recessed: `sunken`.",
      "Page regions and full-bleed sections back on the page tone: `ground`. Layout-only wrappers get nothing.",
      "Inside a surface: border-gray-* → border-edge, divide-gray-* → divide-edge; text colors become text roles (see data-text).",
      "Dark mode comes from a `dark` class or data-theme=\"dark\" on <html>: delete dark:bg-*, dark:text-* and dark:border-* as you go.",
    ],
    find: "\\b(dark:)?(bg|border|divide|ring)-(white|black|gray|neutral|zinc|slate|stone)(-[0-9]+)?\\b|\\bshadow(-[a-z0-9]+)?\\b",
    replaces:
      "neutral backgrounds (bg-white, bg-gray-*, bg-neutral-*, dark:bg-*), neutral text colors (text-gray-*, dark:text-*), neutral border/ring/divide colors and box shadows (shadow-*)",
    notes: [
      "Keep layout, spacing, radius and typography. It owns only the neutral material: brand colors stay unless data-color is set too.",
      "Neutral text and dividers inside it inherit the material: use text-ink, text-ink-muted, text-ink-faint, border-edge, divide-edge instead of fixed grays.",
      "Never repeat a surface on wrappers that are only layout: a new surface is a new material.",
    ],
  },
  // While the tool previews an intent, the element may still carry the classes
  // the agent will remove (bg-white, shadow-sm…), so the preview outranks them.
  previewCss: ({ selector: S }): CssRules => ({
    [`[data-design-preview~="surface"]${S}`]: {
      "background-color": "var(--surface-fill) !important",
      color: "var(--surface-ink) !important",
      "border-color": "var(--surface-edge) !important",
      "box-shadow": "var(--surface-shadow) !important",
    },
  }),
  css: ({ selector: S, is }): CssRules => ({
    ...property("surface-l", { initial: "1" }),
    // Where the tone is heading. `--surface-l` follows it, eased by the response's transition.
    ...property("surface-l-target", { inherits: false, initial: "1" }),
    ...property("surface-l-parent", { inherits: false, initial: "1" }),
    ...property("surface-z", { initial: "0" }),
    ...property("surface-z-parent", { inherits: false, initial: "0" }),
    ...property("surface-dz-rest", { inherits: false, initial: "0" }),
    ...property("surface-dz-state", { inherits: false, initial: "0" }),
    ...property("surface-dz", { inherits: false, initial: "0" }),
    ...property("surface-delta", { inherits: false, initial: "0" }),
    ...property("surface-n", { initial: "1" }),
    ...property("surface-n-parent", { inherits: false, initial: "1" }),
    ...property("surface-material", { initial: "0" }),
    ...property("surface-material-parent", { inherits: false, initial: "0" }),
    ...property("surface-base", { inherits: false, initial: "1" }),

    ":root": {
      "color-scheme": "light",
      "--surface-l": "var(--tone-ground)",
      "--surface-l-target": "var(--tone-ground)",
      "--surface-l-parent": "var(--tone-ground)",
      "--surface-n": "var(--tone-ground)",
      "--surface-z": "0",
      ...NEUTRAL_MATERIAL,
    },
    [DARK_SELECTOR]: { "color-scheme": "dark" },

    // Each element reads what it sits on: its tone, the neutral tone there, its elevation and its material.
    ...nestingChain({
      selector: ELEVATED,
      values: {
        "surface-l": "var(--tone-ground)",
        "surface-n": "var(--tone-ground)",
        "surface-z": "0",
        "surface-material": "0",
      },
    }),

    // Level = where it rests (raised +1, sunken −1) + where interaction moved
    // it (`--surface-dz-state`, set by the response aspect). Tone, top-edge
    // light and cast shadow all follow from the level.
    [ELEVATED]: {
      "--surface-dz": "calc(var(--surface-dz-rest) + var(--surface-dz-state))",
      // The neutral tone here: the light at this spot, for any material that starts on it.
      "--surface-n": `clamp(0, calc(var(--surface-n-parent) + ${levelDelta("var(--surface-n-parent)")}), 1)`,
      "--surface-base": BASE_L,
      "--surface-delta": `calc(var(--surface-follow) * ${levelDelta("var(--surface-base)")})`,
      "--surface-l-target": "clamp(0, calc(var(--surface-base) + var(--surface-delta)), 1)",
      "--surface-l": "var(--surface-l-target)",
      "--surface-z": "calc(var(--surface-z-parent) + var(--surface-dz))",
    },

    // Paint. Attribute specificity beats preflight's `button, input { background: transparent }`;
    // utilities still win because they live in a later cascade layer.
    [S]: {
      "--surface-shadow": NO_SHADOW,
      "background-color": "var(--surface-fill)",
      color: "var(--surface-ink)",
      "border-color": "var(--surface-edge)",
      "--tw-shadow": "var(--surface-shadow)",
      "box-shadow": SHADOW_STACK,
    },
    [is("raised")]: {
      "--surface-dz-rest": "1",
      "--surface-shadow": "var(--surface-shadow-raised)",
    },
    [is("flat")]: { "--surface-shadow": "var(--surface-shadow-flat)" },
    [is("sunken")]: {
      "--surface-dz-rest": "-1",
      "--surface-shadow": "var(--surface-shadow-sunken)",
    },
    // The page plane, in its material: the ground for the neutral, the brand color for the accent.
    [is("ground")]: { "--surface-n": "var(--tone-ground)", "--surface-l-target": "var(--surface-anchor)", "--surface-z": "0" },

    [`:root, ${ELEVATED}`]: tokens,

    body: {
      "background-color": "var(--surface-fill)",
      color: "var(--surface-ink)",
    },
  }),
});
