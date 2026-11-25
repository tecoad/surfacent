import { defineAspect } from "../define.ts";
import type { AspectValue, CssRules } from "../types.ts";
import { ELEVATED, NEUTRAL_MATERIAL } from "./surface.ts";

// Color is what an element is made of. A material has a tone on the page plane
// and a step scale: each level up moves it that many steps lighter, each level
// down darker, relative to what it sits on. The neutral is the page itself
// (the ground tone, one step per level). Colored materials share one chroma,
// one tone and one step scale: the accent (the brand hue) and the hue colors
// (red, green… at fixed hues). Every color in the product has the same weight
// and reacts to elevation the same way.
//
// A color comes as a pigment (solid, the default) or as a dye (`tint`): a
// neutral surface that leans toward the color by Tint strength, with text in
// the color.
//
// On a surface, data-color sets the material of the surface and of what sits
// on it. On anything else (text, icons, ghost controls) it only colors the ink.

const SURFACE = "[data-surface]";
const NOT_SURFACE = ":not([data-surface])";

/** Hue colors: fixed OKLCH hues at the shared chroma and tone, for meaning instead of a palette. */
const HUES = [
  { value: "red", label: "Red", hue: 25, use: "Danger, errors, destructive actions." },
  { value: "orange", label: "Orange", hue: 50, use: "Warnings that need attention." },
  { value: "amber", label: "Amber", hue: 70, use: "Caution, between a warning and an alert." },
  { value: "yellow", label: "Yellow", hue: 90, use: "Alerts and pending states." },
  { value: "lime", label: "Lime", hue: 130, use: "Categories and tags, between yellow and green." },
  { value: "green", label: "Green", hue: 150, use: "Success: done, healthy, ready." },
  { value: "emerald", label: "Emerald", hue: 165, use: "Categories and tags, between green and teal." },
  { value: "teal", label: "Teal", hue: 190, use: "Secondary information." },
  { value: "cyan", label: "Cyan", hue: 215, use: "Categories and tags, between teal and blue." },
  { value: "blue", label: "Blue", hue: 255, use: "Information." },
  { value: "indigo", label: "Indigo", hue: 275, use: "Categories and tags, between blue and violet." },
  { value: "violet", label: "Violet", hue: 290, use: "Categories and tags, between indigo and purple." },
  { value: "purple", label: "Purple", hue: 300, use: "Highlights: new, beta." },
  { value: "fuchsia", label: "Fuchsia", hue: 320, use: "Categories and tags, between purple and pink." },
  { value: "pink", label: "Pink", hue: 350, use: "Categories and tags." },
  { value: "rose", label: "Rose", hue: 15, use: "Categories and tags, between pink and red." },
];

/** Colored materials, numbered for `--surface-material` (the neutral is 0). */
const MATERIALS = [
  { value: "accent", id: 1, hue: "var(--accent-hue)" },
  ...HUES.map((color, index) => ({ value: color.value, id: index + 2, hue: String(color.hue) })),
];
/** A color's tint is another material: its number plus this. */
const TINT_ID = 100;

// Chroma is exact at the shared tone and tapers to 0 at black and white, so
// lighter and darker tones stay inside sRGB.
const TAPER_LIGHT = "calc(var(--accent-chroma) / max(0.001, 1 - var(--accent-tone)))";
const TAPER_DARK = "calc(var(--accent-chroma) / max(0.001, var(--accent-tone)))";
const chroma = (l: string) => `max(0, min(var(--accent-chroma), (1 - ${l}) * ${TAPER_LIGHT}, ${l} * ${TAPER_DARK}))`;

const solid = (id: number, hue: string): Record<string, string> => ({
  "--surface-hue": hue,
  "--surface-chroma": "var(--accent-chroma)",
  "--surface-taper-light": TAPER_LIGHT,
  "--surface-taper-dark": TAPER_DARK,
  "--surface-material": String(id),
  "--surface-anchor": "var(--accent-tone)",
  "--surface-follow": "var(--accent-light)",
});

// A tint is the neutral tone in its spot leaning toward the solid color in the
// same spot by Tint strength, with that share of the color's chroma. Mixing
// after the neutral's white ceiling keeps it tinted on white surfaces. At 0
// it's the neutral, at 1 the solid. What sits on it is relative to it, with a
// step scale between the neutral's and the color's.
const TINT = "var(--accent-tint)";
const TINT_L = `clamp(0, calc((1 - ${TINT}) * var(--surface-n) + ${TINT} * (var(--accent-tone) + var(--accent-light) * (var(--surface-n) - var(--tone-ground)))), 1)`;
const tint = (id: number, hue: string): Record<string, string> => ({
  "--surface-l-target": TINT_L,
  "--surface-hue": hue,
  "--surface-chroma": `calc(${TINT} * var(--accent-chroma))`,
  "--surface-taper-light": TAPER_LIGHT,
  "--surface-taper-dark": TAPER_DARK,
  "--surface-material": String(id + TINT_ID),
  "--surface-anchor": `calc(var(--tone-ground) + ${TINT} * (var(--accent-tone) - var(--tone-ground)))`,
  "--surface-follow": `calc(1 + ${TINT} * (var(--accent-light) - 1))`,
  // Its text is the color.
  "--ink-material": String(id),
  "--ink-hue": hue,
});

/** 1 when material numbers `a` and `b` are equal, else 0. */
const same = (a: string, b: string) => `max(0, 1 - max(${a} - ${b}, ${b} - ${a}))`;

/** A color's tone where an element is: on its own material, that surface's tone; anywhere else, the color in the light there. */
/** A color in the light where an element is: its page-plane tone, moved by its share of how far the neutral there is from the ground. */
const IN_THE_LIGHT_HERE = "var(--accent-tone) + var(--accent-light) * (var(--surface-n) - var(--tone-ground))";

const toneHere = (id: string) => {
  const on = same("var(--surface-material)", id);
  return `clamp(0, calc(${on} * var(--surface-l) + (1 - ${on}) * (${IN_THE_LIGHT_HERE})), 1)`;
};

/** The hue colors' tone where an element is, for `--hue-<name>`: the color in the light there, one tone for every hue. */
const HUE_LIGHT_HERE = `clamp(0, calc(${IN_THE_LIGHT_HERE}), 1)`;

// Colored ink: the color lying on the surface below, moved to the nearest tone
// that stays legible there (4.5:1, taking luminance as L³): darker on light
// surfaces, lighter on dark ones.
const BELOW_Y = "pow(var(--surface-l), 3)";
const MAX_L_ON_LIGHT = `pow(max(0, (${BELOW_Y} + 0.05) / 4.5 - 0.05), 0.333333)`;
const MIN_L_ON_DARK = `pow(min(1, 4.5 * (${BELOW_Y} + 0.05) - 0.05), 0.333333)`;
const COLORED_INK: Record<string, string> = {
  "--ink-here-l": toneHere("var(--ink-material)"),
  "--hue-ink-l": `calc(var(--surface-light) * min(var(--ink-here-l), ${MAX_L_ON_LIGHT}) + (1 - var(--surface-light)) * max(var(--ink-here-l), ${MIN_L_ON_DARK}))`,
  "--hue-ink": `oklch(var(--hue-ink-l) ${chroma("var(--hue-ink-l)")} var(--ink-hue))`,
  color: "var(--hue-ink)",
};

/** When each hue fits: hues carry meaning, never decoration. */
const HUE_WHEN: Record<string, string> = {
  red: "Errors and destructive actions only: a delete button, an error message, a failed status.",
  orange: "Warnings that need action soon: an expiring plan, a degraded service.",
  amber: "Cautions softer than a warning: a draft, a limit getting close.",
  yellow: "Alerts and in-between states: pending, in review, attention without urgency.",
  lime: "Categories, tags and chart series that need a yellow-green of their own. Success stays green.",
  green: "Success and healthy states: done, active, paid, online.",
  emerald: "Categories, tags and chart series that need a color between green and teal. Success stays green.",
  teal: "Secondary information that needs a color of its own next to blue.",
  cyan: "Categories, tags and chart series that need a color between teal and blue. Information stays blue.",
  blue: "Neutral information: tips, info badges, informational callouts.",
  indigo: "Categories, tags and chart series that need a color between blue and violet. Information stays blue.",
  violet: "Categories, tags and chart series that need a color between indigo and purple.",
  purple: "Highlights that mark something as new: new, beta, pro.",
  fuchsia: "Categories, tags and chart series that need a color between purple and pink.",
  pink: "Categories and tags that only need to look different from one another.",
  rose: "Categories, tags and chart series that need a color between pink and red. Errors stay red.",
};

const swatch = (hue: string) => `oklch(var(--accent-tone) var(--accent-chroma) ${hue})`;

const values: AspectValue[] = [
  {
    value: "accent",
    label: "Accent",
    when: "The one action or state that matters most where it sits (the primary button, a switch that is on) and links. Not decoration, and not large areas.",
    description:
      "The brand color, lit by elevation like any surface: exactly the brand color on the page plane, lighter per level up and darker per level down by Step scale. What sits on it takes accent tones. Primary buttons, switches that are on, links.",
    swatch: swatch("var(--accent-hue)"),
  },
  {
    value: "neutral",
    label: "Neutral",
    when: "Only inside a colored element, for the parts that stay neutral.",
    description:
      "Back to the neutral material inside a color: its tone follows elevation again. A switch knob, a white card in a brand section.",
    swatch: "oklch(var(--tone-ground) var(--tint-chroma) var(--tint-hue))",
  },
  ...HUES.map((color) => ({
    value: color.value,
    label: color.label,
    when: HUE_WHEN[color.value]!,
    description: `${color.use} Same chroma, tone and step scale as the accent.`,
    swatch: swatch(String(color.hue)),
  })),
];

export default defineAspect({
  key: "color",
  label: "Color",
  why: "Palette classes (bg-blue-500, text-red-600, bg-red-50) pick a value and ignore what's under it: the same badge reads differently on each surface, and every hue needs its own hand-picked shades. A material keeps one chroma, tone and step scale for every hue, so a color sits right on any level and its ink stays legible.",
  description:
    "What the element is made of: neutral, the accent (the brand color) or a hue color, solid or as a tint. Colors share one chroma, tone and step scale. On a surface it's the material; on anything else, only the ink, kept legible.",
  values,
  modifiers: [
    {
      value: "tint",
      label: "Tint",
      when: "Soft versions of a color: status badges, callouts, soft buttons, a selected row. The solid color is for the main action.",
      description:
        "The color as a dye instead of a pigment: a neutral surface leaning toward the color by Tint strength, with that share of its chroma, and text in the color. Status badges, callouts, soft buttons.",
    },
  ],
  settings: [
    {
      key: "accent-hue",
      group: "Color",
      label: "Accent hue",
      description: "Hue of the brand color, in degrees. Hue colors keep their own hues.",
      min: 0,
      max: 360,
      step: 0.01,
      default: 262,
    },
    {
      key: "accent-chroma",
      group: "Color",
      label: "Chroma",
      description:
        "How vivid the accent and the hue colors are. Tones lighter or darker than the shared tone get less vivid, so they stay inside sRGB.",
      min: 0,
      max: 0.37,
      step: 0.0001,
      default: 0.19,
    },
    {
      key: "accent-tone",
      group: "Color",
      label: "Tone",
      description:
        "Lightness of the accent and the hue colors on the page plane (a flat badge on the ground). Below 0.645 they take light ink.",
      min: 0,
      max: 1,
      step: 0.0001,
      default: 0.58,
      darkDefault: 0.6,
    },
    {
      key: "accent-light",
      group: "Color",
      label: "Step scale",
      description:
        "How much a level of elevation changes the tone of colored materials, as a multiple of Step: at 1 as much as a neutral surface, at 0.5 half, at 2 twice, at 0 they keep their page-plane tone everywhere. Lower keeps high elevations from washing them out.",
      min: 0,
      max: 2,
      step: 0.05,
      default: 0.5,
      darkDefault: 0.5,
    },
    {
      key: "accent-tint",
      group: "Color",
      label: "Tint strength",
      description:
        "How much of its color a tint takes: the share of the color's chroma, and how far its tone leans from the neutral toward the color. 0 is the neutral, 1 the solid color.",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.15,
      darkDefault: 0.15,
    },
  ],
  // The accent's hue, chroma and tone, edited as one color. Their steps are fine
  // enough for a hex typed in to come back the same.
  colorFields: [
    {
      key: "accent",
      group: "Color",
      label: "Accent",
      description:
        "The brand color. The hue colors share its chroma and tone, so they stay as vivid and as light. Its tone is themed: the dark theme keeps its own.",
      channels: { lightness: "accent-tone", chroma: "accent-chroma", hue: "accent-hue" },
    },
  ],
  colors: {
    // The accent where it's used, for what isn't a surface: focus rings, native controls, chart marks.
    accent: "var(--accent)",
  },
  agent: {
    migrate: [
      "Brand fills (bg-indigo-600 text-white and the like): data-color=\"accent\" on the surface. Set accent-hue, accent-chroma and accent-tone in the @plugin block to the brand color.",
      "Status fills (bg-red-600, bg-green-500): the hue (`red`, `green`…). Light status backgrounds with colored text (bg-red-50 text-red-700): the hue with `tint`.",
      "Colored text and icons without a fill (links, status words): data-color on the element itself, no surface.",
    ],
    find: "\\b(bg|text|border|ring|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+\\b",
    replaces:
      "colored fills and text on the element: brand and palette backgrounds (bg-accent, bg-blue-600, bg-red-500, bg-emerald-*…) with text-white, tinted backgrounds (bg-red-500/10, bg-emerald-50…) with their colored text, the hover:/active: variants of both, or colored text and icons (text-accent, text-red-600, text-emerald-500…)",
    notes: [
      "On a surface, data-color sets its material; keep data-surface for elevation. Surfaces inside a colored one take tones of that color relative to it.",
      'Tinted fills (a light colored background with colored text) take the tint modifier: data-color="red tint" on a surface.',
      'Mark parts that stay neutral inside a color with data-color="neutral": a switch knob, a white card in a brand section.',
      "On an element without data-surface (links, icons, labels, ghost buttons) it colors only the ink, adjusted to stay legible.",
      "Use hue colors for meaning instead of palette colors: red for danger, orange or yellow for warnings, green for success, blue or teal for information.",
      "Focus rings, native controls and chart marks keep the accent token: ring-accent, accent-accent, bg-accent/80.",
      "Gradients, chart series and effects that paint with several hues read var(--hue-<name>): the hue in the light where they sit.",
    ],
  },
  previewCss: ({ is }): CssRules => ({
    [`[data-design-preview~="color"]${SURFACE}`]: {
      "background-color": "var(--surface-fill) !important",
      color: "var(--surface-ink) !important",
      "border-color": "var(--surface-edge) !important",
    },
    [`[data-design-preview~="color"]${is("tint")}${SURFACE}`]: { color: "var(--hue-ink) !important" },
    [`[data-design-preview~="color"][data-color]:not(${is("neutral")})${NOT_SURFACE}`]: { color: "var(--hue-ink) !important" },
    [`[data-design-preview~="color"]${is("neutral")}${NOT_SURFACE}`]: { color: "var(--surface-ink) !important" },
  }),
  css: ({ is }): CssRules => {
    const rules: CssRules = {
      [`${is("neutral")}${SURFACE}`]: NEUTRAL_MATERIAL,
      [`${is("neutral")}${NOT_SURFACE}`]: { color: "var(--surface-ink)" },
      // Colored ink: on colored text and icons, and on tints, for the material each names below.
      [`[data-color]:not(${is("neutral")})${NOT_SURFACE}, ${is("tint")}${SURFACE}`]: COLORED_INK,
      // The accent where each element is, for the `accent` Tailwind color, and
      // each hue color there, as `--hue-<name>` (no Tailwind color: an element
      // takes a hue with data-color), for what paints with several at once:
      // chart marks, gradients, a canvas.
      [`:root, ${ELEVATED}`]: {
        "--accent-l": toneHere("1"),
        "--accent": `oklch(var(--accent-l) ${chroma("var(--accent-l)")} var(--accent-hue))`,
        "--hue-l": HUE_LIGHT_HERE,
        "--hue-c": chroma("var(--hue-l)"),
        ...Object.fromEntries(HUES.map((color) => [`--hue-${color.value}`, `oklch(var(--hue-l) var(--hue-c) ${color.hue})`])),
      },
    };
    for (const { value, id, hue } of MATERIALS) {
      rules[`${is(value)}${SURFACE}`] = solid(id, hue);
      rules[`${is(value)}${is("tint")}${SURFACE}`] = tint(id, hue);
      rules[`${is(value)}${NOT_SURFACE}`] = { "--ink-material": String(id), "--ink-hue": hue };
    }
    return rules;
  },
});
