// The design settings as the page has them: CSS variables on <html>, which
// the design panels override live and the dev server saves to the @plugin block.

import { isDarkTheme, settings } from "./aspects";

export type Values = Record<string, number>;
export type Theme = "light" | "dark";
export type Status = "idle" | "saving" | "saved" | "copied" | "error";

export const themedKeys = settings.filter((setting) => setting.darkDefault !== undefined).map((setting) => setting.key);
export const root = () => document.documentElement;

export function readVars(): Values {
  const style = getComputedStyle(root());
  const dark = isDarkTheme();
  const values: Values = {};
  for (const setting of settings) {
    const raw = Number.parseFloat(style.getPropertyValue(`--${setting.key}`));
    const fallback = dark && setting.darkDefault !== undefined ? setting.darkDefault : setting.default;
    values[setting.key] = Number.isFinite(raw) ? raw : fallback;
  }
  return values;
}

/** What the stylesheet says, without the panel's live overrides. */
export function readPersisted(): Values {
  const overrides = settings.map((setting) => [setting.key, root().style.getPropertyValue(`--${setting.key}`)] as const);
  for (const [key] of overrides) root().style.removeProperty(`--${key}`);
  const values = readVars();
  for (const [key, value] of overrides) if (value) root().style.setProperty(`--${key}`, value);
  return values;
}

export function clearOverrides(keys: readonly string[] = settings.map((setting) => setting.key)) {
  for (const key of keys) root().style.removeProperty(`--${key}`);
}

/** Drops live overrides once the saved stylesheet is in, so they never hide a later theme switch. */
export function clearOverridesAfterUpdate() {
  const hot = (import.meta as unknown as { hot?: { on: Function; off?: Function } }).hot;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    hot?.off?.("vite:afterUpdate", finish);
    requestAnimationFrame(() => clearOverrides());
  };
  hot?.on("vite:afterUpdate", finish);
  setTimeout(finish, 3000);
}
