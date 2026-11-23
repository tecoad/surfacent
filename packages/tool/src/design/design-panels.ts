// The design settings split across three dock panels, by aspect group. A
// group no panel names (a new aspect's) shows in the last one.

import { colorFields, settingGroups, type AspectSetting, type ColorField } from "./aspects";

/** A row of a panel: a setting, or a color field standing for the settings that are its channels. */
export type PanelEntry = { setting: AspectSetting } | { color: ColorField };

export type DesignPanelId = "surface" | "corners" | "rhythm";

export const DESIGN_PANELS: { id: DesignPanelId; title: string; label: string; groups: string[] }[] = [
  { id: "surface", title: "Surface", label: "Surface, color and response", groups: ["Surface", "Color", "Response"] },
  { id: "corners", title: "Corners", label: "Corners", groups: ["Corners"] },
  { id: "rhythm", title: "Rhythm", label: "Rhythm: density and text", groups: ["Density", "Text"] },
];

export const isDesignPanel = (id: string | null): id is DesignPanelId => DESIGN_PANELS.some((panel) => panel.id === id);

/**
 * A panel's setting groups, in registry order. A color's channels show once,
 * as the color, where the first of them is.
 */
export function panelGroups(id: DesignPanelId): Array<{ group: string; entries: PanelEntry[] }> {
  const named = new Set(DESIGN_PANELS.flatMap((panel) => panel.groups));
  const last = DESIGN_PANELS[DESIGN_PANELS.length - 1]!;
  const own = DESIGN_PANELS.find((panel) => panel.id === id)!.groups;
  return settingGroups()
    .filter(({ group }) => own.includes(group) || (id === last.id && !named.has(group)))
    .map(({ group, settings }) => {
      const entries: PanelEntry[] = [];
      for (const setting of settings) {
        const color = colorFields.find((field) => Object.values(field.channels).includes(setting.key));
        if (!color) entries.push({ setting });
        else if (!entries.some((entry) => "color" in entry && entry.color.key === color.key)) entries.push({ color });
      }
      return { group, entries };
    });
}
