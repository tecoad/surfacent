import { previewStylesheet } from "surfacent-core";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { Card, SectionTitle, Segmented, Switch } from "./ui";

type Stage = "Page" | "Card" | "Well" | "Brand";
type State = "Off" | "Hover" | "Focus" | "Click";

/** What the rows sit on. */
const STAGES: Record<Stage, { surface: string; color?: string }> = {
  Page: { surface: "ground" },
  Card: { surface: "raised" },
  Well: { surface: "sunken" },
  // A brand section of the page: the accent on the page plane, exactly the brand color.
  Brand: { surface: "ground", color: "accent" },
};

export type Sample = {
  name: string;
  /** The attributes that matter, shown under the name. */
  code: string;
  /**
   * The element whose readout the row shows gets `ref`. `tried` holds the
   * element in a state (`response:hover`…), like the toolbar's picker does.
   */
  render: (ref: Ref<HTMLElement>, tried?: string) => ReactNode;
};

/**
 * `oklch(0.58 0.19 262)` → "0.580 0.190 262". Mid-transition colors compute as
 * `oklab()`, read as LCH too. Fully transparent paint reads as null.
 */
function readOklch(value: string): string | null {
  const match = value.match(
    /(oklch|oklab)\(\s*([-\d.]+)(%?)\s+([-\d.]+|none)\s+([-\d.]+|none)(?:\s*\/\s*([\d.]+)(%?))?\s*\)/,
  );
  if (!match) return null;
  const alpha =
    match[6] === undefined ? 1 : Number(match[6]) / (match[7] ? 100 : 1);
  if (alpha === 0) return null;
  const l = Number(match[2]) / (match[3] ? 100 : 1);
  const [x, y] = [match[4], match[5]].map((part) =>
    part === "none" ? 0 : Number(part),
  );
  const [c, hue] =
    match[1] === "oklch"
      ? [x, y]
      : [Math.hypot(x, y), (Math.atan2(y, x) * 180) / Math.PI];
  return `${l.toFixed(3)} ${c.toFixed(3)} ${Math.round((hue + 360) % 360)}`;
}

/** Height, and the color the element paints: its fill, or its ink when it has none. */
function readout(element: HTMLElement): string {
  const style = getComputedStyle(element);
  const z = Number.parseFloat(style.getPropertyValue("--surface-z")).toFixed(2);
  const fill = readOklch(style.backgroundColor);
  if (fill) return `z ${z} · fill ${fill}`;
  const ink = readOklch(style.color);
  return ink ? `z ${z} · ink ${ink}` : `z ${z}`;
}

/**
 * One column, one row per kind of element, with its live height and paint.
 * With `controls`, above it: a state to hold every row in (as the toolbar's
 * picker simulates it), what the rows sit on, and slow motion. Without them,
 * the rows sit on a raised card and everything else is the toolbar's job.
 */
export function Lab({
  title,
  description,
  samples,
  controls = true,
}: {
  title: string;
  description: string;
  samples: Sample[];
  controls?: boolean;
}) {
  const [state, setState] = useState<State>("Off");
  const [stage, setStage] = useState<Stage>("Card");
  const [slow, setSlow] = useState(false);
  const tried = state === "Off" ? undefined : `response:${state.toLowerCase()}`;
  const elements = useRef(new Map<string, HTMLElement>());
  const [readings, setReadings] = useState<Record<string, string>>({});

  // Held states use the toolbar's preview rules; make sure they are on the page.
  useEffect(() => {
    if (document.querySelector("style[data-surfacent-preview]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-surfacent-preview", "");
    style.textContent = previewStylesheet();
    document.head.appendChild(style);
  }, []);

  // One loop reads every element, so the readouts follow states and sliders live.
  useEffect(() => {
    const read = () => {
      const next: Record<string, string> = {};
      for (const [key, element] of elements.current)
        next[key] = readout(element);
      setReadings((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    const timer = setInterval(read, 50);
    return () => clearInterval(timer);
  }, []);

  const register = (key: string) => (element: HTMLElement | null) => {
    if (element) elements.current.set(key, element);
    else elements.current.delete(key);
  };

  return (
    <Card className="grid gap-4 p-5">
      <SectionTitle title={title} description={description} />

      {controls && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label data-text="caption muted" className="flex items-center gap-2">
            State
            <Segmented
              label="State"
              options={["Off", "Hover", "Focus", "Click"] as const}
              value={state}
              onChange={setState}
            />
          </label>
          <label data-text="caption muted" className="flex items-center gap-2">
            Sits on
            <Segmented
              label="Sits on"
              options={["Page", "Card", "Well", "Brand"] as const}
              value={stage}
              onChange={setStage}
            />
          </label>
          <label data-text="caption muted" className="flex items-center gap-2">
            Slow motion
            <Switch label="Slow motion" checked={slow} onChange={setSlow} />
          </label>
        </div>
      )}

      <div
        data-surface={STAGES[stage].surface}
        data-color={STAGES[stage].color}
        className="grid divide-y divide-edge rounded-xl px-4"
        style={
          slow ? ({ "--response-motion": "900ms" } as CSSProperties) : undefined
        }
      >
        {samples.map((sample) => (
          <div
            key={sample.name}
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 py-4"
          >
            <div className="grid gap-0.5">
              <span data-text="label" className="font-medium">{sample.name}</span>
              <code className="text-[11px] text-ink-faint">{sample.code}</code>
            </div>
            <div className="flex justify-center">
              {sample.render(register(sample.name), tried)}
            </div>
            <span className="justify-self-end text-right font-mono text-[11px] text-ink-faint tabular-nums">
              {readings[sample.name] ?? ""}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
