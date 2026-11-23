// The toolbar talks to aspects only through surfacent-core's registry, so
// new aspects (corners, spacing…) show up in the picker, the settings panel and
// the prompts without UI changes.

import { settings, type AspectChanges, type RegisteredColorField, type RegisteredSetting } from "surfacent-core";

export {
  agentGuide,
  aspects,
  colorFields,
  cssValue,
  describeChanges,
  
  inspectElement,
  isDarkTheme,
  migrationPrompt,
  normalizeSetting,
  settings,
} from "surfacent-core";
export type { Aspect, AspectChanges,  ModifierGroup } from "surfacent-core";

/** A setting as the toolbar shows it: with the aspect that owns it. */
export type AspectSetting = RegisteredSetting;
/** Settings the toolbar edits as one color, with the aspect that owns them. */
export type ColorField = RegisteredColorField;

export function hasChanges(changes: AspectChanges | null | undefined): changes is AspectChanges {
  return !!changes && Object.keys(changes).length > 0;
}

/** Settings grouped for display, in registry order. */
export function settingGroups(): Array<{ group: string; settings: AspectSetting[] }> {
  const groups = new Map<string, AspectSetting[]>();
  for (const setting of settings) {
    const list = groups.get(setting.group) ?? [];
    list.push(setting);
    groups.set(setting.group, list);
  }
  return [...groups].map(([group, list]) => ({ group, settings: list }));
}
