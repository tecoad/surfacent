import plugin, { type PluginAPI } from "tailwindcss/plugin";
import { aspects, cssContext, resolveSettings, settingsToVars } from "./index.ts";
import { DARK_SELECTOR } from "./theme.ts";
import type { PluginOptions } from "./types.ts";

type UtilityValues = NonNullable<NonNullable<Parameters<PluginAPI["matchUtilities"]>[1]>["values"]>;

/**
 * Values of a hooked spacing utility, resolved like Tailwind's own: bare
 * multiples of 0.25 on the spacing scale (`2.5` → `calc(var(--spacing) * 2.5)`),
 * named ones (`px`, theme tokens) from the theme, arbitrary ones as written.
 * No `type` option: with one, Tailwind matches none of the named values.
 */
function spacingValues(theme: PluginAPI["theme"]): UtilityValues {
  const named = Object.entries((theme("spacing") ?? {}) as Record<string, unknown>).filter(
    (entry): entry is [string, string] => !/^\d/.test(entry[0]) && typeof entry[1] === "string",
  );
  return Object.assign(Object.fromEntries(named), {
    __BARE_VALUE__: ({ value }: { value: string }) =>
      /^\d+(\.\d+)?$/.test(value) && Number(value) % 0.25 === 0 ? `calc(var(--spacing) * ${value})` : undefined,
  }) as UtilityValues;
}

/** Values of a hooked radius utility: the theme's radii (`xl`, `DEFAULT` for bare `rounded`…), arbitrary ones as written. */
function radiusValues(theme: PluginAPI["theme"]): UtilityValues {
  const named = Object.entries((theme("borderRadius") ?? {}) as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  // `rounded-full` is calc(infinity * 1px) in Tailwind's CSS, not the theme's 9999px.
  return Object.fromEntries([...named, ["full", "calc(infinity * 1px)"]]) as UtilityValues;
}

/**
 * Tailwind v4 plugin. Settings are passed as `@plugin` options:
 *
 * ```css
 * @import "tailwindcss";
 * @plugin "surfacent/tailwind" {
 *   tone-ground: 0.97;
 *   tone-ground-dark: 0.17;
 *   tone-step: 0.03;
 * }
 * ```
 *
 * Settings become CSS variables on :root, so the toolbar can preview changes
 * live before writing them back to this block.
 */
export default plugin.withOptions<PluginOptions>(
  (options = {}) =>
    ({ addBase, matchUtilities, theme }) => {
      const { light, dark } = resolveSettings(options);
      addBase({ ":root": settingsToVars(light) });
      if (Object.keys(dark).length) addBase({ [DARK_SELECTOR]: settingsToVars(dark) });
      for (const aspect of aspects) addBase(aspect.css(cssContext(aspect, light)));

      // Classes an aspect reads (p-4 publishing its padding, rounded-xl its
      // radius) keep Tailwind's CSS and add the aspect's declarations.
      const scales = { spacing: spacingValues(theme), radius: radiusValues(theme) };
      for (const aspect of aspects) {
        for (const [root, hook] of Object.entries(aspect.utilityHooks)) {
          matchUtilities({ [root]: (value) => hook.declarations(value) }, { values: scales[hook.scale] });
        }
      }
    },
  () => ({
    theme: {
      extend: {
        colors: Object.assign({}, ...aspects.map((aspect) => aspect.colors)),
      },
    },
  }),
);
