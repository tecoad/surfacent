import type { Aspect, AspectDefinition } from "./types.ts";

/** Validates an aspect and fills in its attribute (`data-<key>`) and defaults. */
export function defineAspect(definition: AspectDefinition): Aspect {
  if (!/^[a-z][a-z0-9-]*$/.test(definition.key)) {
    throw new Error(`[surfacent] Invalid aspect key "${definition.key}"`);
  }
  if (!definition.values.length) {
    throw new Error(`[surfacent] Aspect "${definition.key}" needs at least one value`);
  }
  if (definition.defaultValue !== undefined && !definition.values.some((option) => option.value === definition.defaultValue)) {
    throw new Error(`[surfacent] Aspect "${definition.key}" default "${definition.defaultValue}" isn't one of its values`);
  }
  if (definition.multiple && definition.modifiers?.length) {
    throw new Error(`[surfacent] Aspect "${definition.key}" can't have modifiers: its values already combine`);
  }
  const grouped = new Set<string>();
  for (const group of definition.modifierGroups ?? []) {
    for (const value of group.values) {
      if (!definition.modifiers?.some((option) => option.value === value)) {
        throw new Error(`[surfacent] Modifier group "${group.label}" of "${definition.key}" names "${value}", which isn't one of its modifiers`);
      }
      if (grouped.has(value)) throw new Error(`[surfacent] Modifier "${value}" of "${definition.key}" is in two groups`);
      grouped.add(value);
    }
  }
  for (const setting of definition.settings ?? []) {
    if (!(setting.min <= setting.default && setting.default <= setting.max)) {
      throw new Error(`[surfacent] Setting "${setting.key}" default is out of range`);
    }
  }
  for (const field of definition.colorFields ?? []) {
    for (const key of Object.values(field.channels)) {
      if (!definition.settings?.some((setting) => setting.key === key)) {
        throw new Error(`[surfacent] Color field "${field.key}" names "${key}", which isn't a setting of "${definition.key}"`);
      }
    }
  }
  return Object.freeze({
    ...definition,
    settings: definition.settings ?? [],
    colorFields: definition.colorFields ?? [],
    colors: definition.colors ?? {},
    modifiers: definition.modifiers ?? [],
    modifierGroups: definition.modifierGroups ?? [],
    utilityHooks: definition.utilityHooks ?? {},
    attribute: `data-${definition.key}`,
  });
}
