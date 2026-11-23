import { defineAspect } from "../define.ts";
import type { CssRules } from "../types.ts";
import { SHADOW_STACK } from "./surface.ts";

// One physical law, the same for every element: attention brings it closer,
// force pushes it in. An element only chooses what it answers to (any mix of
// hover, focus and click), never the direction, so a click can't make
// anything rise.
//
// The response only moves the element's level (`--surface-dz-state`); tone,
// top-edge light and cast shadow follow from the surface rules.

const ENABLED = ':not(:disabled, [aria-disabled="true"])';
// In use: focused, or holding the focus (a field wrapper around an input).
const IN_USE = ":is(:focus-visible, :has(:focus-visible))";

const RISE = "var(--response-rise)";
const SINK = "calc(var(--response-press) * -1)";
const MOTION = "var(--response-motion)";

// Not a surface at rest: part of the plane until it moves.
const GHOST = ":not([data-surface])";
// A ghost that moves shows as a surface: raised when it rises, a dent when pressed.
const RISEN: CssRules = {
  "background-color": "var(--surface-fill)",
  "--surface-shadow": "var(--surface-shadow-raised)",
  "--tw-shadow": "var(--surface-shadow)",
  "box-shadow": SHADOW_STACK,
};
const DENTED: CssRules = {
  "background-color": "var(--surface-fill)",
  "--surface-shadow": "var(--surface-shadow-recess)",
  "--tw-shadow": "var(--surface-shadow)",
  "box-shadow": SHADOW_STACK,
};

export default defineAspect({
  key: "response",
  label: "Response",
  why: "Hover and press classes (hover:bg-*, hover:shadow-*, active:scale-*) each invent their own motion, so similar controls answer differently. One law keeps every element coherent: attention brings it closer, a press pushes it in.",
  description:
    "What the element answers to, in any mix. The physics is always the same: attention brings it closer, a press pushes it in.",
  multiple: true,
  values: [
    {
      value: "hover",
      label: "Hover",
      when: "Elements that react to the pointer and lead somewhere: buttons, clickable cards, list rows, links styled as surfaces. Not static content.",
      description: "Rises while the pointer is over it.",
    },
    {
      value: "focus",
      label: "Focus",
      when: "Fields, and anything reached by keyboard that should rise while in use.",
      description: "Rises while it's in use: a field being typed in, or keyboard focus.",
    },
    {
      value: "click",
      label: "Click",
      when: "Anything people press: buttons, toggles, clickable cards and rows.",
      description: "Sinks below its rest while pressed.",
    },
  ],
  settings: [
    {
      key: "response-rise",
      group: "Response",
      label: "Rise",
      description: "Levels an element comes closer when it gets attention: pointer over it, or in use.",
      min: 0,
      max: 1.5,
      step: 0.05,
      default: 0.6,
    },
    {
      key: "response-press",
      group: "Response",
      label: "Press",
      description: "Levels an element sinks below its rest when pressed.",
      min: 0,
      max: 2,
      step: 0.05,
      default: 0.6,
    },
    {
      key: "response-motion",
      group: "Response",
      label: "Motion",
      description: "How long a level change takes. A press lands in about half, like a real press.",
      min: 0,
      max: 600,
      step: 10,
      default: 140,
      unit: "ms",
    },
  ],
  agent: {
    migrate: [
      "Buttons: `hover click`. Fields: `focus`. Clickable cards: `hover`.",
      "Ghost buttons, menu items and list rows (no fill at rest): data-response without data-surface; they show a fill only while they move.",
      "Remove hover:bg-*, active:bg-*, focus:bg-*, hover:shadow-*, active:scale-* and hover:-translate-y-*. Keep focus-visible rings.",
    ],
    find: "\\b(hover|active|focus):(bg|shadow|scale|-?translate)-",
    replaces:
      "hover, focus, active and pressed styling (hover:bg-*, focus:bg-*, active:bg-*, hover:shadow-*, active:shadow-*, hover:-translate-y-*, active:scale-* and the like)",
    notes: [
      "A response only moves the element's level; tone, light and shadow come from the surface settings.",
      "Without data-surface the element is invisible at rest and only shows while it moves (ghost buttons, list rows).",
      "Elements without data-response don't move at all. Typical sets: buttons `hover click`, fields `focus`, cards `hover`.",
    ],
  },
  previewCss: ({ selector: R, is }): CssRules => {
    // While a value is hovered in the toolbar, the element carries
    // data-design-try="response:<value>" and shows that state, like the
    // DevTools :hov toggles, without leaving edit mode.
    const tries = (value: string) => `[data-design-try="response:${value}"]${is(value)}${ENABLED}`;
    return {
      // A previewed response must show over hover/focus utilities the agent will remove.
      [`[data-design-preview~="response"]${R}${ENABLED}:is(:hover, :active, :focus-visible, :has(:focus-visible))`]: {
        "background-color": "var(--surface-fill) !important",
      },
      [tries("hover")]: { "--surface-dz-state": RISE },
      [`${tries("hover")}${GHOST}`]: RISEN,
      [tries("focus")]: { "--surface-dz-state": RISE },
      [`${tries("focus")}${GHOST}`]: RISEN,
      [tries("click")]: { "--surface-dz-state": SINK },
      [`${tries("click")}${GHOST}`]: DENTED,
      [`[data-surface="raised"]${tries("click")}`]: { "--surface-shadow": "var(--surface-shadow-pressed)" },
    };
  },
  css: ({ selector: R, is }): CssRules => {

    // Rules go from weakest to strongest contact: hover, focus, press. With
    // equal specificity the later one wins, so a press beats the hover it
    // happens under, and a field in use doesn't jump when the pointer passes.
    return {
      // Attention. Hover only where a pointer can hover, so nothing stays up after a tap.
      "@media (hover: hover)": {
        [`${is("hover")}${ENABLED}:hover`]: { "--surface-dz-state": RISE },
        [`${is("hover")}${GHOST}${ENABLED}:hover`]: RISEN,
      },
      [`${is("focus")}${ENABLED}${IN_USE}`]: { "--surface-dz-state": RISE },
      [`${is("focus")}${GHOST}${ENABLED}${IN_USE}`]: RISEN,

      // Force.
      [`${is("click")}${ENABLED}:active`]: { "--surface-dz-state": SINK },
      [`${is("click")}${GHOST}${ENABLED}:active`]: DENTED,
      [`[data-surface="raised"]${is("click")}${ENABLED}:active`]: {
        "--surface-shadow": "var(--surface-shadow-pressed)",
      },

      // Attention eases in and out; a press lands faster.
      "@media (prefers-reduced-motion: no-preference)": {
        [R]: {
          transition: `--surface-l ${MOTION} ease-out, --surface-z ${MOTION} ease-out, box-shadow ${MOTION} ease-out, background-color ${MOTION} ease-out`,
        },
        [`${R}:active`]: { "transition-duration": `calc(${MOTION} * 0.45)` },
      },
    };
  },
});
