import color from "./aspects/color.ts";
import corner from "./aspects/corner.ts";
import density from "./aspects/density.ts";
import response from "./aspects/response.ts";
import surface from "./aspects/surface.ts";
import text from "./aspects/text.ts";
import { howToSuggest, PHILOSOPHY as PHILOSOPHY_TEXT } from "./philosophy.ts";
import type {
  Aspect,
  AspectChanges,
  AspectCssContext,
  AspectSetting,
  CssRules,
  PluginOptions,
  RegisteredColorField,
  RegisteredSetting,
  SettingValues,
} from "./types.ts";

export type * from "./types.ts";
export { defineAspect } from "./define.ts";
export { nestingChain, property } from "./chain.ts";
export { DARK_SELECTOR, isDarkTheme } from "./theme.ts";

/**
 * The layers of the tool, in the order they appear in the UI and in prompts.
 * Each is one file in ./aspects.
 */
export const aspects: readonly Aspect[] = Object.freeze([surface, color, response, corner, density, text]);

/** How an app installs surfacent and names its Tailwind plugin. */
export const PACKAGE = { name: "surfacent", install: "bun add -d surfacent", plugin: "surfacent/tailwind" } as const;

export { migrationPrompt } from "./migration.ts";
export type { MigrationElement } from "./migration.ts";
export { PHILOSOPHY } from "./philosophy.ts";

export function getAspect(key: string): Aspect | undefined {
  return aspects.find((aspect) => aspect.key === key);
}

/** Every setting of every aspect, flat. Keys are unique across aspects. */
export const settings: readonly RegisteredSetting[] = Object.freeze(
  aspects.flatMap((aspect) => aspect.settings.map((setting) => ({ ...setting, aspect: aspect.key }))),
);

const seen = new Set<string>();
for (const setting of settings) {
  if (seen.has(setting.key)) throw new Error(`[surfacent] Duplicate setting key "${setting.key}"`);
  seen.add(setting.key);
}

/** Every color field of every aspect, flat: settings the toolbar edits as one color. */
export const colorFields: readonly RegisteredColorField[] = Object.freeze(
  aspects.flatMap((aspect) => aspect.colorFields.map((field) => ({ ...field, aspect: aspect.key }))),
);

export function getSetting(key: string): RegisteredSetting | undefined {
  return settings.find((setting) => setting.key === key);
}

function decimals(step: number): number {
  return (String(step).split(".")[1] ?? "").length;
}

/** Clamps to the setting range and rounds to its step precision. */
export function normalizeSetting(setting: AspectSetting, value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return setting.default;
  const clamped = Math.min(setting.max, Math.max(setting.min, number));
  return Number(clamped.toFixed(decimals(setting.step)));
}

/** CSS value of a setting, e.g. `0.97` or `12px`. */
export function cssValue(setting: AspectSetting, value: unknown): string {
  return `${normalizeSetting(setting, value)}${setting.unit ?? ""}`;
}

/** `{ "tone-ground": 0.97 }` → `{ "--tone-ground": "0.97" }` */
export function settingsToVars(values: SettingValues): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    const setting = getSetting(key);
    if (setting) vars[`--${key}`] = cssValue(setting, value);
  }
  return vars;
}

/**
 * Resolves `@plugin` options into light and dark values. Themed settings (those
 * with a `darkDefault`) read their dark value from `<key>-dark`.
 */
export function resolveSettings(options: PluginOptions = {}): { light: SettingValues; dark: SettingValues } {
  const light: SettingValues = {};
  const dark: SettingValues = {};
  for (const setting of settings) {
    light[setting.key] = normalizeSetting(setting, options[setting.key] ?? setting.default);
    if (setting.darkDefault !== undefined) {
      dark[setting.key] = normalizeSetting(setting, options[`${setting.key}-dark`] ?? setting.darkDefault);
    }
  }
  return { light, dark };
}

/** Serializes CSS-in-JS (the shape Tailwind's addBase takes) to a stylesheet. */
export function toCss(rules: CssRules, indent = ""): string {
  let css = "";
  for (const [key, value] of Object.entries(rules)) {
    if (typeof value === "object") {
      css += `${indent}${key} {\n${toCss(value, `${indent}  `)}${indent}}\n`;
    } else {
      css += `${indent}${key}: ${value};\n`;
    }
  }
  return css;
}

/** The attribute holds several tokens: a set of values, or a value with modifiers. */
export function tokenized(aspect: Aspect): boolean {
  return Boolean(aspect.multiple || aspect.modifiers.length);
}

/** A value or a modifier of the aspect, by its token. */
export function getOption(aspect: Aspect, token: string) {
  return aspect.values.find((option) => option.value === token) ?? aspect.modifiers.find((option) => option.value === token);
}

/** Context passed to an aspect's css functions. */
export function cssContext(aspect: Aspect, values: SettingValues = resolveSettings().light): AspectCssContext {
  return {
    attribute: aspect.attribute,
    selector: `[${aspect.attribute}]`,
    is: (value) => `[${aspect.attribute}${tokenized(aspect) ? "~=" : "="}"${value}"]`,
    settings: values,
  };
}

/**
 * What the CSS can't see around an element, as instructions, from the aspects
 * in `keys` the element has. Browser only: the toolbar shows these in the
 * picker and adds them to the element's prompt.
 */
export function inspectElement(element: Element, keys: readonly string[] = aspects.map((aspect) => aspect.key)): string[] {
  return aspects.flatMap((aspect) => (aspect.inspect && keys.includes(aspect.key) ? aspect.inspect(element) : []));
}

/** Stylesheet the toolbar injects so previews show over not-yet-removed classes. */
export function previewStylesheet(): string {
  let css = "";
  for (const aspect of aspects) {
    if (aspect.previewCss) css += toCss(aspect.previewCss(cssContext(aspect)));
  }
  return css;
}

// -----------------------------------------------------------------------------
// Agent prompts
// -----------------------------------------------------------------------------

/**
 * The tokens set on an element, in registry order: its values, then its
 * modifiers. Unknown tokens are dropped, and of modifiers that exclude one
 * another only the one the CSS applies stays (the last).
 */
export function valueTokens(aspect: Aspect, value: string | null | undefined): string[] {
  const tokens = new Set((value ?? "").split(/\s+/).filter(Boolean));
  const kept = [...aspect.values, ...aspect.modifiers].map((option) => option.value).filter((option) => tokens.has(option));
  return kept.filter((token) => {
    const group = aspect.modifierGroups.find((entry) => entry.values.includes(token));
    return !group || kept.filter((other) => group.values.includes(other)).at(-1) === token;
  });
}

/** One instruction per aspect change on an element. */
export function describeChanges(changes: AspectChanges): string[] {
  const lines: string[] = [];
  for (const aspect of aspects) {
    if (!(aspect.key in changes)) continue;
    const value = changes[aspect.key];
    if (value == null) {
      const fallback = aspect.values.find((option) => option.value === aspect.defaultValue);
      lines.push(
        `Remove ${aspect.attribute} from this element${fallback ? `, so it is ${fallback.value} again (${fallback.description})` : ""}.`,
      );
      continue;
    }
    const meaning = tokenized(aspect)
      ? valueTokens(aspect, value)
          .map((token) => `${token}: ${getOption(aspect, token)?.description}`)
          .join("; ")
      : aspect.values.find((option) => option.value === value)?.description;
    lines.push(
      `Set ${aspect.attribute}="${value}" on this element${meaning ? ` (${meaning})` : ""}${aspect.agent.replaces ? `, and remove what it now owns: ${aspect.agent.replaces}` : ""}.`,
    );
  }
  return lines;
}

/**
 * Explains the attribute system once, at the top of a prompt: what each aspect
 * is and why it exists, and what each value means and when it fits. Defaults
 * to every aspect.
 */
export function agentGuide(keys: readonly string[] = aspects.map((aspect) => aspect.key)): string {
  const used = aspects.filter((aspect) => keys.includes(aspect.key));
  if (!used.length) return "";
  let guide =
    `This UI is styled by intent: data attributes say how an element behaves, and the Tailwind plugin \`${PACKAGE.plugin}\` derives the CSS from global settings in its \`@plugin\` block. Edit the JSX/HTML source, not the generated CSS.\n`;
  for (const aspect of used) {
    guide += `\n**${aspect.attribute}** — ${aspect.description}${aspect.multiple ? " Values combine, separated by spaces." : ""}\nWhy it exists: ${aspect.why}\n`;
    for (const option of aspect.values) {
      const fallback = option.value === aspect.defaultValue ? " (the default: what an element is without the attribute)" : "";
      guide += `- \`${option.value}\`${fallback}: ${option.description} When: ${option.when}\n`;
    }
    for (const option of aspect.modifiers) {
      guide += `- \`${option.value}\`, after a value (\`${aspect.values[0]?.value} ${option.value}\`): ${option.description} When: ${option.when}\n`;
    }
    for (const note of aspect.agent.notes ?? []) guide += `- ${note}\n`;
  }
  return guide;
}

/** Everything an agent needs to suggest intents for a page: the philosophy, every aspect, and how to answer. */
export function suggestGuide(): string {
  return `${PHILOSOPHY_TEXT}\n${agentGuide()}\n${howToSuggest()}`;
}

/**
 * Why an intent can't be set, or null when it can: an aspect's key and the
 * attribute's value (null removes it). Values that combine take any mix;
 * others take one value, then modifiers, one per group at most.
 */
export function intentError(key: string, value: string | null): string | null {
  const aspect = getAspect(key);
  if (!aspect) return `Unknown aspect "${key}". Aspects: ${aspects.map((entry) => entry.key).join(", ")}.`;
  if (value === null) return null;
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  const values = aspect.values.map((option) => option.value);
  const modifiers = aspect.modifiers.map((option) => option.value);
  if (!tokens.length) return `${aspect.attribute} needs a value: ${values.join(", ")}.`;
  if (aspect.multiple) {
    const unknown = tokens.filter((token) => !values.includes(token));
    return unknown.length ? `${aspect.attribute} takes any mix of ${values.join(", ")}; not ${unknown.join(", ")}.` : null;
  }
  const [first, ...rest] = tokens;
  if (!values.includes(first!)) {
    return `${aspect.attribute} takes one of ${values.join(", ")}${modifiers.length ? `, then optionally ${modifiers.join(", ")}` : ""}; not "${first}".`;
  }
  const unknown = rest.filter((token) => !modifiers.includes(token));
  if (unknown.length) return `${aspect.attribute} takes ${modifiers.length ? `the modifiers ${modifiers.join(", ")}` : "no modifiers"} after its value; not ${unknown.join(", ")}.`;
  for (const group of aspect.modifierGroups) {
    const picked = rest.filter((token) => group.values.includes(token));
    if (picked.length > 1) return `${aspect.attribute}: ${picked.join(" and ")} exclude one another (${group.label}).`;
  }
  return null;
}
