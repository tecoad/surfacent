import { getAspect } from "surfacent-core";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SettingSlider, SettingSwitch, Slider } from "./settings";
import { Badge, Card, SectionTitle } from "./ui";

/** A level's slider: Concentric (no attribute, the default), then radii of its own, as the toolbar shows them. */
const STOPS = getAspect("corner")!.values;
const DEFAULT = getAspect("corner")!.defaultValue;

/** The stack, alternating surfaces so each edge shows. The first has a radius of its own, so the stack starts there. */
const SURFACES = ["sunken", "raised", "sunken", "raised"] as const;
const START: Array<string | null> = ["1", null, null, null];

type Rule = "own" | "curve" | "minimum" | "off";
type Reading = { text: string; rule: Rule };

const TONES = { own: "accent", curve: "info", minimum: "warning", off: "neutral" } as const;

const round = (value: number, digits = 1) => String(Number(value.toFixed(digits)));

/** A level's live radius and the rule that set it. */
function read(element: HTMLElement): Reading {
  const style = getComputedStyle(element);
  const value = (name: string) => Number.parseFloat(style.getPropertyValue(name)) || 0;
  const radius = value("--corner-r");
  const own = element.dataset.corner;
  if (own && own !== "concentric") {
    const label = STOPS.find((stop) => stop.value === own)?.label ?? own;
    return { text: own === "pill" ? label : `${label} = ${round(radius)}px`, rule: "own" };
  }
  if (own !== "concentric" && value("--corner-concentric") !== 1) {
    return { text: `passes ${round(radius)}px through`, rule: "off" };
  }
  const parent = value("--corner-r-parent");
  const padding = value("--corner-inset-parent");
  const minimum = value("--corner-min");
  // The larger wins: the parent's curve, or Minimum × the parent's radius.
  return parent - padding >= parent * minimum
    ? { text: `${round(parent)} − ${round(padding)} = ${round(radius)}px`, rule: "curve" }
    : { text: `${round(parent)} × ${round(minimum, 2)} = ${round(radius)}px`, rule: "minimum" };
}

/**
 * Concentric corners, nested like the elevation stack. Each level has the
 * toolbar's slider: Concentric (the default) or a radius of its own, which the
 * levels inside start over from. The switch, Radius and Minimum are the design
 * settings; the padding of every level is only this page's.
 */
export function CornersLab() {
  const [padding, setPadding] = useState(4);
  const [corners, setCorners] = useState(START);
  const elements = useRef<Array<HTMLElement | null>>([]);
  const [readings, setReadings] = useState<Array<Reading | null>>([]);

  // One loop reads every level, so the readouts follow the sliders and the Design panel.
  useEffect(() => {
    const timer = setInterval(() => {
      const next = elements.current.map((element) => (element ? read(element) : null));
      setReadings((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const level = (index: number) => {
    const surface = SURFACES[index];
    if (!surface) return null;
    const value = corners[index] ?? null;
    const stop = Math.max(
      0,
      STOPS.findIndex((option) => option.value === (value ?? DEFAULT)),
    );
    const reading = readings[index];
    return (
      <div
        ref={(element) => {
          elements.current[index] = element;
        }}
        data-surface={surface}
        data-corner={value ?? undefined}
        className="grid gap-3 p-(--lab-padding)"
      >
        <div data-text="caption" className="flex min-h-5 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <label className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={STOPS.length - 1}
              step={1}
              value={stop}
              aria-label={`Level ${index + 1} corners`}
              onChange={(event) => {
                const next = STOPS[Number(event.target.value)]?.value ?? null;
                setCorners((previous) => previous.map((item, at) => (at === index ? (next === DEFAULT ? null : next) : item)));
              }}
              className="w-24 accent-accent"
            />
            <span className="w-24 font-medium">{STOPS[stop]?.label}</span>
          </label>
          {reading && (
            <span className="flex items-center gap-2 font-mono text-[11px] text-ink-faint tabular-nums">
              {reading.text}
              <Badge tone={TONES[reading.rule]}>{reading.rule}</Badge>
            </span>
          )}
        </div>
        {level(index + 1)}
      </div>
    );
  };

  return (
    <Card className="grid gap-4 p-5">
      <SectionTitle
        title="Corners lab"
        description="While Concentric corners is on, a level without a radius of its own follows the curve of the one it sits in (curve), or keeps Minimum × its radius when the padding is too big for that (minimum). A level's slider gives it a radius of its own (own), and the levels inside start over from it. The switch, Radius and Minimum are the design settings, also in the Design panel; the padding is only this page's."
      />

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Slider
          label="Padding"
          hint="Padding of every level, from a p-(--lab-padding) class. Only this page's."
          value={padding}
          unit="px"
          min={0}
          max={24}
          step={1}
          onChange={setPadding}
        />
        <SettingSwitch settingKey="corner-concentric" />
        <SettingSlider settingKey="corner-radius" />
        <SettingSlider settingKey="corner-min" />
      </div>

      <div style={{ "--lab-padding": `${padding}px` } as CSSProperties}>{level(0)}</div>
    </Card>
  );
}
