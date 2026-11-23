// Lab controls for design settings. Each is bound to the setting's variable on
// :root, the one the Design panel edits: the whole page follows it, and the
// panel shows the value to save it.

import { cssValue, getSetting } from "surfacent-core";
import { useEffect, useState } from "react";
import { Switch } from "./ui";

function readRoot(key: string, fallback: number): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--${key}`));
  return Number.isFinite(value) ? value : fallback;
}

/**
 * A design setting, bound to its variable on :root: the one the Design panel
 * edits, so the whole page follows, and the panel shows it to save it.
 */
function useSetting(key: string): [number, (value: number) => void] {
  const setting = getSetting(key)!;
  const [value, setValue] = useState(() => readRoot(key, setting.default));
  // The Design panel writes the same variable: follow it.
  useEffect(() => {
    const timer = setInterval(() => {
      const next = readRoot(key, setting.default);
      setValue((previous) => (previous === next ? previous : next));
    }, 200);
    return () => clearInterval(timer);
  }, [key, setting]);
  const set = (next: number) => {
    setValue(next);
    document.documentElement.style.setProperty(`--${key}`, cssValue(setting, next));
  };
  return [value, set];
}

export function Slider({
  label,
  hint,
  value,
  unit = "",
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label data-text="caption muted" className="grid w-44 gap-1.5" title={hint}>
      <span className="flex justify-between gap-2">
        {label}
        <span className="font-mono text-ink-faint tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-accent"
      />
    </label>
  );
}

export function SettingSlider({ settingKey }: { settingKey: string }) {
  const setting = getSetting(settingKey)!;
  const [value, set] = useSetting(settingKey);
  return (
    <Slider
      label={setting.label}
      hint={setting.description}
      value={value}
      unit={setting.unit}
      min={setting.min}
      max={setting.max}
      step={setting.step}
      onChange={set}
    />
  );
}

export function SettingSwitch({ settingKey }: { settingKey: string }) {
  const setting = getSetting(settingKey)!;
  const [value, set] = useSetting(settingKey);
  return (
    <label data-text="caption muted" className="flex items-center gap-2 self-center" title={setting.description}>
      {setting.label}
      <Switch label={setting.label} checked={value === setting.max} onChange={(on) => set(on ? setting.max : setting.min)} />
    </label>
  );
}
