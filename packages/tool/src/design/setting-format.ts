import type { AspectSetting } from "./aspects";

/** The decimals a step needs: 0.005 → 3, 0.5 → 1, 10 → 0. */
function decimals(step: number) {
  const text = String(step);
  return text.includes(".") ? text.split(".")[1]!.length : 0;
}

/** A setting's value as its slider shows it: rounded to its step, with its unit. */
export function formatSetting(value: number, setting: Pick<AspectSetting, "step" | "unit">) {
  const text = value.toFixed(decimals(setting.step));
  return setting.unit ? `${text}${setting.unit === "%" ? "" : " "}${setting.unit}` : text;
}

/** The hue sliders' field: the hue circle at a mid tone. */
export const HUE_TRACK = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
  .map((hue) => `oklch(0.62 0.12 ${hue} / 0.55)`)
  .join(", ")})`;
