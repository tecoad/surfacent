// The design settings of one group of aspects, as a dock panel: live on the
// page, saved back to the @plugin block of the app's CSS.

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  AdjustSlider,
  cx,
  DockCard,
  FieldGroup,
  fieldRow,
  HexRow,
  iconButtonClass,
  InfoTip,
  labelText,
  primaryButton,
  secondaryButton,
  ToggleRow,
  toOklch,
} from "surfacent-ui";
import { copyTextToClipboard } from "../utils/clipboard";
import { cssValue, isDarkTheme, normalizeSetting, settings, type AspectSetting, type ColorField } from "./aspects";
import { DESIGN_PANELS, panelGroups, type DesignPanelId } from "./design-panels";
import { settingsPrompt } from "./prompt";
import { formatSetting, HUE_TRACK } from "./setting-format";
import {
  clearOverrides,
  clearOverridesAfterUpdate,
  readPersisted,
  readVars,
  root,
  themedKeys,
  type Status,
  type Theme,
  type Values,
} from "./setting-values";

/** Served by `surfacent()` from `surfacent/vite` during development. */
const ENDPOINT = "/__surfacent/settings";

/** Keys stay with the field (the toolbar's shortcuts don't fire), except Escape, which closes the panel. */
const keepKeys = (event: KeyboardEvent) => {
  if (event.key !== "Escape") event.stopPropagation();
};

/** A setting's slider: its value (and unit) in the thumb; a hue gets a rainbow field. The label is blue while unsaved. */
function SettingSlider({
  setting,
  value,
  dirty,
  onChange,
}: {
  setting: AspectSetting;
  value: number;
  dirty: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className={fieldRow}>
      <span data-modified={dirty || undefined} className={cx(labelText, "flex min-w-0 items-center gap-0.5")}>
        <span className="truncate">{setting.label}</span>
        {setting.description && <InfoTip label={`About ${setting.label.toLowerCase()}`}>{setting.description}</InfoTip>}
      </span>
      <div onKeyDown={keepKeys}>
        <AdjustSlider
          ariaLabel={setting.label}
          value={value}
          min={setting.min}
          max={setting.max}
          step={setting.step}
          stops={5}
          display={(next) => formatSetting(next, setting)}
          track={setting.key.endsWith("hue") ? HUE_TRACK : undefined}
          onValueChange={onChange}
        />
      </div>
    </div>
  );
}

/** The setting a color field keeps a channel in. */
const channel = (field: ColorField, name: keyof ColorField["channels"]) =>
  settings.find((setting) => setting.key === field.channels[name])!;

/**
 * A color field: the settings that are its channels as one hex field, picked
 * in OKLCH (or typed as hex, OKLCH or Display P3). The label is blue while unsaved.
 */
function ColorSetting({
  field,
  color,
  dirty,
  onChange,
}: {
  field: ColorField;
  /** The color as CSS, from its channels. */
  color: string;
  dirty: boolean;
  onChange: (css: string) => void;
}) {
  return (
    <div onKeyDown={keepKeys}>
      <HexRow
        name={field.label}
        help={field.description}
        modified={dirty}
        hex={color}
        space="oklch"
        opacities={false}
        onHexChange={onChange}
      />
    </div>
  );
}

export function DesignPanel({ panel }: { panel: DesignPanelId }) {
  const groups = useMemo(() => panelGroups(panel), [panel]);
  const title = DESIGN_PANELS.find((entry) => entry.id === panel)!.title;
  const [theme, setTheme] = useState<Theme>(() => (isDarkTheme() ? "dark" : "light"));
  const themeRef = useRef(theme);
  const [values, setValues] = useState<Values>(readVars);
  const [persisted, setPersisted] = useState<Values>(readPersisted);
  const [source, setSource] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    setValues(readVars());
    setPersisted(readPersisted());
  }, []);

  // Where Save writes: the app's CSS file, when the dev server knows it.
  useEffect(() => {
    let cancelled = false;
    fetch(ENDPOINT)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => !cancelled && setSource(data?.file ?? null))
      .catch(() => !cancelled && setSource(null));
    return () => {
      cancelled = true;
    };
  }, []);

  // The page can switch theme on its own. Themed settings belong to the theme
  // they were edited in, so their overrides are dropped on a switch.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next: Theme = isDarkTheme() ? "dark" : "light";
      if (themeRef.current === next) return;
      themeRef.current = next;
      clearOverrides(themedKeys);
      setTheme(next);
      refresh();
    });
    observer.observe(root(), { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, [refresh]);

  const dirty = settings.filter((setting) => values[setting.key] !== persisted[setting.key]);

  const change = (setting: AspectSetting, raw: unknown) => {
    const value = normalizeSetting(setting, raw);
    root().style.setProperty(`--${setting.key}`, cssValue(setting, value));
    setValues((previous) => ({ ...previous, [setting.key]: value }));
    setStatus("idle");
  };

  /** A color picked or typed: its OKLCH channels to their settings. A grey keeps the hue there is. */
  const changeColor = (field: ColorField, css: string) => {
    const color = toOklch(css);
    if (!color) return;
    change(channel(field, "lightness"), color.l);
    change(channel(field, "chroma"), color.c);
    if (color.h !== null) change(channel(field, "hue"), color.h);
  };
  const valueOf = (setting: AspectSetting) => values[setting.key] ?? setting.default;

  const reset = () => {
    clearOverrides();
    refresh();
    setStatus("idle");
  };

  const save = async () => {
    setStatus("saving");
    try {
      // Named and normalized here, with the current registry: themed settings
      // saved from the dark theme go to `<key>-dark`.
      const options: Record<string, string> = {};
      for (const setting of settings) {
        const name = theme === "dark" && setting.darkDefault !== undefined ? `${setting.key}-dark` : setting.key;
        options[name] = String(normalizeSetting(setting, values[setting.key]));
      }
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? response.statusText);
      setPersisted(values);
      setStatus("saved");
      clearOverridesAfterUpdate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    }
  };

  const copyPrompt = async () => {
    const changed = Object.fromEntries((dirty.length ? dirty : settings).map((setting) => [setting.key, values[setting.key]]));
    await copyTextToClipboard(settingsPrompt(changed, theme));
    setStatus("copied");
  };

  const statusText =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? `Saved to ${source}`
        : status === "copied"
          ? "Prompt copied"
          : status === "error"
            ? error
            : source
              ? `${source}${dirty.length ? ` · ${dirty.length} unsaved` : ""}`
              : "No dev server: copy a prompt";

  const themeLabel = theme === "dark" ? "Preview the light theme" : "Preview the dark theme";
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <DockCard
      title={title}
      subtitle={`${theme} theme`}
      bodyClassName="flex flex-col gap-3 px-4 py-1.5"
      actions={
        <button
          type="button"
          aria-label={themeLabel}
          title={themeLabel}
          className={iconButtonClass}
          onClick={() => root().classList.toggle("dark", theme !== "dark")}
        >
          <ThemeIcon aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />
        </button>
      }
      footer={
        <div className="flex items-center gap-1.5">
          <output
            title={statusText}
            className={cx(
              "min-w-0 flex-1 truncate text-ag-xs font-light",
              status === "error" ? "text-chrome-red" : status === "saved" || status === "copied" ? "text-chrome-green" : "text-chrome-muted",
            )}
          >
            {statusText}
          </output>
          <button type="button" className={secondaryButton} disabled={!dirty.length} onClick={reset}>
            Reset
          </button>
          {source ? (
            <button type="button" className={primaryButton} disabled={!dirty.length || status === "saving"} onClick={save}>
              Save
            </button>
          ) : (
            <button type="button" className={primaryButton} onClick={copyPrompt}>
              Copy prompt
            </button>
          )}
        </div>
      }
    >
      {groups.map(({ group, entries }) => (
        <FieldGroup key={group} legend={group}>
          {entries.map((entry) => {
            if ("color" in entry) {
              const { color: field } = entry;
              const channels = (["lightness", "chroma", "hue"] as const).map((name) => channel(field, name));
              return (
                <ColorSetting
                  key={field.key}
                  field={field}
                  color={`oklch(${channels.map(valueOf).join(" ")})`}
                  dirty={channels.some((setting) => valueOf(setting) !== persisted[setting.key])}
                  onChange={(css) => changeColor(field, css)}
                />
              );
            }
            const { setting } = entry;
            const value = valueOf(setting);
            const isDirty = value !== persisted[setting.key];
            return setting.toggle ? (
              <ToggleRow
                key={setting.key}
                label={setting.label}
                help={setting.description}
                modified={isDirty}
                checked={value === setting.max}
                onCheckedChange={(on) => change(setting, on ? setting.max : setting.min)}
              />
            ) : (
              <SettingSlider
                key={setting.key}
                setting={setting}
                value={value}
                dirty={isDirty}
                onChange={(next) => change(setting, next)}
              />
            );
          })}
        </FieldGroup>
      ))}
    </DockCard>
  );
}
