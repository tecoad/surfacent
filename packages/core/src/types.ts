/** CSS-in-JS, the shape Tailwind's `addBase` takes: selectors and at-rules map to nested rules, properties to values. */
export interface CssRules {
  [selectorOrProperty: string]: string | CssRules;
}

/** One value of an aspect attribute, e.g. `raised`. */
export interface AspectValue {
  value: string;
  /** Short label shown in the picker. */
  label: string;
  /** What the value means, shown to people and agents. */
  description: string;
  /** When to pick it, and when not: for agents choosing intents (suggestions, migrations). */
  when: string;
  /** CSS color the picker shows as a swatch, for values that are colors. Can read the settings' CSS variables. */
  swatch?: string;
}

export interface AspectSetting {
  /** Globally unique: the CSS variable `--<key>` and the `@plugin` option name. */
  key: string;
  /** Settings group in the tool, usually the aspect label. */
  group: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** Appended to the number in CSS ("px", "rem"…). Omit for plain numbers. */
  unit?: string;
  /** Makes the setting themed: `<key>-dark` holds its dark value. */
  darkDefault?: number;
  /** On or off (1 or 0), shown as a switch. Use min 0, max 1, step 1. */
  toggle?: boolean;
}

/**
 * Modifiers that exclude one another, like a text's ink (muted or faint): at
 * most one of them goes on an element, and none is the default. The toolbar
 * offers them together, one on at most.
 */
export interface ModifierGroup {
  /** The group's name, like "Ink". */
  label: string;
  /** Its modifiers' values, in the order they're offered. */
  values: string[];
}

/** A setting together with the aspect that owns it. */
export interface RegisteredSetting extends AspectSetting {
  aspect: string;
}

/**
 * Settings that make one color together, as its OKLCH channels. The toolbar
 * edits them as one color field (hex, OKLCH or Display P3) instead of a slider
 * each, and saves them as the settings they are.
 */
export interface AspectColorField {
  /** Names the field, unique across aspects: `accent`. */
  key: string;
  /** Settings group, the one its settings are in. */
  group: string;
  label: string;
  description: string;
  /** Keys of the aspect's settings holding the color's OKLCH lightness, chroma and hue. */
  channels: { lightness: string; chroma: string; hue: string };
}

/** A color field together with the aspect that owns it. */
export interface RegisteredColorField extends AspectColorField {
  aspect: string;
}

/** Resolved setting values by key. */
export type SettingValues = Record<string, number>;

/** `@plugin` options as Tailwind parses them. */
export type PluginOptions = Record<string, unknown>;

export interface AspectCssContext {
  /** The aspect attribute, e.g. `data-surface`. */
  attribute: string;
  /** `[data-surface]` */
  selector: string;
  /** Selector for one value or modifier: `[data-surface="raised"]`, or `[data-color~="tint"]` when the attribute holds several tokens. */
  is: (value: string) => string;
  /** Resolved settings (light values). */
  settings: SettingValues;
}

/** What the agent must know to apply the aspect in source code. */
export interface AspectAgentRules {
  /** What the attribute replaces on the element, listed in prompts. Omit when it owns no classes. */
  replaces?: string;
  notes?: string[];
  /** What the plugin changes everywhere as soon as it's installed, before any attribute is set. */
  global?: string;
  /** How an existing interface's classes map to this aspect, for the migration prompt. */
  migrate?: string[];
  /** A `grep -E` pattern for the classes this aspect replaces: what's left to migrate. */
  find?: string;
  /** What an app can turn off once nothing uses it any more, so it can't come back. */
  strict?: string;
}

/**
 * An aspect is one layer of Surfacent: surface, corners, spacing…
 *
 * It owns a single data attribute (`data-<key>`) whose value states an intent
 * ("this behaves as raised"), global settings that tune how every intent
 * renders, and the CSS that turns intents into styles. The Tailwind plugin,
 * the toolbar and the agent prompts only iterate over the registry.
 */
export interface AspectDefinition {
  key: string;
  label: string;
  description: string;
  /** Why the aspect exists: what it replaces and the problem with that, for agents judging intents. */
  why: string;
  values: AspectValue[];
  /** Values combine: the attribute holds a space-separated set, e.g. `data-response="hover click"`. */
  multiple?: boolean;
  /** Values form a scale, in this order: the picker shows a slider over them. */
  ordered?: boolean;
  /**
   * What an element is without the attribute. The picker shows it when the
   * attribute isn't set, and picking it removes the attribute.
   */
  defaultValue?: string;
  /**
   * Browser only: the default for one element, when it depends on the element
   * or on the settings. `null` when it has none, so picking any value sets it.
   */
  defaultOf?: (element: Element) => string | null;
  /**
   * Optional tokens that go after the one value and change how it applies,
   * e.g. `tint` in `data-color="red tint"`. Not for aspects whose values combine.
   */
  modifiers?: AspectValue[];
  /** Modifiers that exclude one another; the rest combine freely. */
  modifierGroups?: ModifierGroup[];
  settings?: AspectSetting[];
  /** Settings that are the channels of one color, edited together as that color. */
  colorFields?: AspectColorField[];
  /** Tailwind theme colors, e.g. `{ ink: "var(--surface-ink)" }`. */
  colors?: Record<string, string>;
  agent: AspectAgentRules;
  /** CSS for Tailwind's `addBase`. */
  css: (context: AspectCssContext) => CssRules;
  /**
   * Injected by the toolbar only, so a previewed intent shows over classes the
   * agent hasn't removed yet. Target `[data-design-preview~="<key>"]`.
   */
  previewCss?: (context: AspectCssContext) => CssRules;
  /**
   * Tailwind utilities the aspect hooks into, by root (`p` for `p-4`). The class
   * keeps its own CSS and also gets the hook's declarations, its value resolved
   * like Tailwind's own, so the aspect can read what classes set. Variants and
   * arbitrary values apply too.
   */
  utilityHooks?: Record<string, UtilityHook>;
  /**
   * Toolbar only, in the browser: what the CSS can't see around an element, as
   * instructions for the agent. Shown in the picker and added to the element's
   * prompt. Called for any picked element: return nothing when it doesn't apply.
   */
  inspect?: (element: Element) => string[];
}

export interface UtilityHook {
  /** The theme scale values resolve on: `spacing` (`p-4` → `calc(var(--spacing) * 4)`) or `radius` (`rounded-xl`). */
  scale: "spacing" | "radius";
  /** Declarations the class also gets, from its resolved value. */
  declarations: (value: string) => Record<string, string>;
}

export interface Aspect extends AspectDefinition {
  /** `data-<key>` */
  attribute: string;
  settings: AspectSetting[];
  colorFields: AspectColorField[];
  colors: Record<string, string>;
  modifiers: AspectValue[];
  modifierGroups: ModifierGroup[];
  utilityHooks: Record<string, UtilityHook>;
}

/** Intent changes on one element, by aspect key. `null` removes the attribute. */
export type AspectChanges = Record<string, string | null>;
