import { getAspect } from "surfacent-core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SettingSlider } from "./settings";
import { Badge, Button, Card, Field, Input, SectionTitle, Segmented, Select, Switch, Textarea } from "./ui";

/** Tighter … Looser, as the toolbar's slider shows them. Same is the default: no attribute. */
const STEPS = getAspect("density")!.values;
const DEFAULT = getAspect("density")!.defaultValue;
const densityOf = (value: string) => (value === DEFAULT ? undefined : value);

/** The text roles, as the toolbar shows them. */
const ROLES = getAspect("text")!.values;

const round = (value: number) => String(Math.round(value * 10) / 10);

/** Reads the page on a timer, so readouts follow the sliders and the Design panel. */
function useLive<T>(read: () => T, interval = 150): T | undefined {
  const [value, setValue] = useState<T>();
  const reader = useRef(read);
  reader.current = read;
  useEffect(() => {
    const tick = () => {
      const next = reader.current();
      setValue((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    tick();
    const timer = setInterval(tick, interval);
    return () => clearInterval(timer);
  }, [interval]);
  return value;
}

/** A region's density, its spacing unit and its label size, from invisible probes inside it. */
function readRegion(region: HTMLElement | null): string {
  if (!region) return "";
  const density = Number.parseFloat(getComputedStyle(region).getPropertyValue("--density"));
  const unit = region.querySelector<HTMLElement>("[data-probe='spacing']")?.getBoundingClientRect().height ?? 0;
  const text = region.querySelector<HTMLElement>("[data-probe='text']");
  const size = text ? Number.parseFloat(getComputedStyle(text).fontSize) : 0;
  return `×${density.toFixed(2)} · spacing ${round(unit)}px · label ${round(size)}px`;
}

/** A region one step apart: `data-density` on it, probes for the readout. */
function Region({ value, refFn, children }: { value: string; refFn: (element: HTMLElement | null) => void; children: ReactNode }) {
  return (
    <div ref={refFn} data-density={densityOf(value)} className="relative">
      <span data-probe="spacing" aria-hidden className="pointer-events-none absolute h-1 w-px opacity-0" />
      <span data-probe="text" data-text="label" aria-hidden className="pointer-events-none absolute opacity-0">
        Ag
      </span>
      {children}
    </div>
  );
}

function Subtitle({ children }: { children: ReactNode }) {
  return <h3 data-text="caption faint" className="font-semibold tracking-wide uppercase">{children}</h3>;
}

/** The same small piece of UI in every row of Steps. */
function Strip() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [previews, setPreviews] = useState(true);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-44">
        <Input placeholder="Search…" />
      </div>
      <Segmented label="Range" options={["24h", "7d", "30d"] as const} value={range} onChange={setRange} />
      <Switch label="Previews" checked={previews} onChange={setPreviews} />
      <Badge tone="accent">New</Badge>
      <Button variant="flat">Cancel</Button>
      <Button>Deploy</Button>
    </div>
  );
}

const PROJECTS = [
  { name: "design-systems", status: "Ready", tone: "success", updated: "2m ago" },
  { name: "marketing-site", status: "Building", tone: "warning", updated: "14m ago" },
  { name: "console", status: "Failed", tone: "danger", updated: "1h ago" },
] as const;

/** Fields, buttons, controls, a table and text: everything a region holds. */
function Sheet() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [previews, setPreviews] = useState(true);
  const [protect, setProtect] = useState(false);
  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h4 data-text="title">New project</h4>
    <p data-text="body muted">Deploy a repository in a few steps.</p>
    <p data-text="caption faint">Drafts are saved automatically.</p>
      </div>

      <div className="grid gap-3">
        <Field label="Project name" hint="Shown on the project card.">
          <Input defaultValue="design-systems" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Framework">
            <Select defaultValue="vite">
              <option value="vite">Vite</option>
              <option value="next">Next.js</option>
              <option value="astro">Astro</option>
            </Select>
          </Field>
          <Field label="Region">
            <Input placeholder="us-east-1" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea rows={2} defaultValue="Surfaces, corners and density, decided by intent." />
        </Field>
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Deploy</Button>
          <Button variant="flat">Share</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary">New project</Button>
        </div>
        <div data-density="tight" className="flex flex-wrap items-center gap-2">
          <Button>Deploy</Button>
          <Button variant="flat">Share</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary">New project</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Range" options={["24h", "7d", "30d"] as const} value={range} onChange={setRange} />
        <Switch label="Preview deployments" checked={previews} onChange={setPreviews} />
        <Switch label="Password protection" checked={protect} onChange={setProtect} />
        <div className="flex flex-wrap gap-1">
          <Badge>Draft</Badge>
          <Badge tone="info">Preview</Badge>
          <Badge tone="success">Ready</Badge>
          <Badge tone="warning">Building</Badge>
          <Badge tone="danger">Failed</Badge>
          <Badge tone="accent">New</Badge>
        </div>
      </div>

      <div data-surface="flat" className="overflow-hidden">
        <table data-text="label" className="w-full text-left">
     <thead data-text="caption muted">
            <tr>
              <th className="px-3 py-2 font-medium">Project</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge border-t border-edge">
            {PROJECTS.map((project) => (
              <tr key={project.name}>
                <td className="px-3 py-2 font-medium">{project.name}</td>
                <td className="px-3 py-2">
                  <Badge tone={project.tone}>{project.status}</Badge>
                </td>
                <td data-text="label muted" className="px-3 py-2">{project.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Density: what a region does to everything inside. Steps shows one strip per
 * step; Text roles every role at every step; Components a full
 * sheet at a chosen step beside Same. The sliders are the design settings.
 */
export function DensityLab() {
  const strips = useRef<Array<HTMLElement | null>>([]);
  const cells = useRef(new Map<string, HTMLElement>());
  const sheets = useRef<Array<HTMLElement | null>>([]);
  const [compare, setCompare] = useState(STEPS[1]!.label);
  const compared = STEPS.find((step) => step.label === compare) ?? STEPS[1]!;

  const stripReadings = useLive(() =>
    strips.current.map((region) => {
      const button = region ? [...region.querySelectorAll<HTMLElement>('button[data-surface="raised"]')].at(-1) : undefined;
      if (!region || !button) return "";
      const density = Number.parseFloat(getComputedStyle(region).getPropertyValue("--density"));
      return `×${density.toFixed(2)} · button ${round(button.getBoundingClientRect().height)}px · text ${round(Number.parseFloat(getComputedStyle(button).fontSize))}px`;
    }),
  );
  const cellSizes = useLive(() =>
    Object.fromEntries(
      [...cells.current].map(([key, element]) => {
        const style = getComputedStyle(element);
        return [key, `${round(Number.parseFloat(style.fontSize))}/${round(Number.parseFloat(style.lineHeight))}`];
      }),
    ),
  );
  const sheetReadings = useLive(() => sheets.current.map(readRegion));

  const cell = (key: string) => (element: HTMLElement | null) => {
    if (element) cells.current.set(key, element);
    else cells.current.delete(key);
  };

  return (
    <Card className="grid gap-5 p-5">
      <SectionTitle
        title="Density lab"
        description="Each region is a step denser or roomier than the page, and the UI inside is the same code: its padding, gaps, control sizes and (by Text) text follow the region. Density, Step size and Text are the design settings, also in the Design panel; picking a region in the toolbar gives the same steps."
      />

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <SettingSlider settingKey="density-base" />
        <SettingSlider settingKey="density-step" />
        <SettingSlider settingKey="density-text" />
      </div>

      <section className="grid gap-2">
        <Subtitle>Steps</Subtitle>
        <div data-surface="sunken" className="grid divide-y divide-edge px-4">
          {STEPS.map((step, index) => (
            <div key={step.value} className="grid grid-cols-[12rem_minmax(0,1fr)] items-center gap-4 py-4">
              <div className="grid gap-0.5">
                <span data-text="label" className="font-medium">{step.label}</span>
                <span className="font-mono text-[11px] text-ink-faint tabular-nums">{stripReadings?.[index]}</span>
              </div>
              <div
                ref={(region) => {
                  strips.current[index] = region;
                }}
                data-density={densityOf(step.value)}
              >
                <Strip />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <Subtitle>Text roles</Subtitle>
        <div data-surface="sunken" className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-mono text-[11px] whitespace-nowrap text-ink-faint">
                <th className="px-4 py-2 font-medium">Role</th>
                {STEPS.map((step) => (
                  <th key={step.value} className="px-4 py-2 font-medium">
                    {step.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge border-t border-edge">
              {ROLES.map((role) => (
                <tr key={role.value}>
                  <td className="px-4 py-2 align-baseline font-mono text-[11px] whitespace-nowrap text-ink-muted" title={role.description}>
                    data-text="{role.value}"
                  </td>
                  {STEPS.map((step) => {
                    const key = `${role.value}:${step.value}`;
                    return (
                      <td key={step.value} data-density={densityOf(step.value)} className="px-4 py-2 align-baseline whitespace-nowrap">
                        <span ref={cell(key)} data-text={role.value}>
                          Ag
                        </span>
                        <span className="ml-2 font-mono text-[11px] text-ink-faint tabular-nums">{cellSizes?.[key]}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Subtitle>Components</Subtitle>
          <label data-text="caption muted" className="flex items-center gap-2">
            Compare
            <Segmented
              label="Compare with Same"
              options={STEPS.map((step) => step.label)}
              value={compare}
              onChange={setCompare}
            />
          </label>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[STEPS.find((step) => step.value === DEFAULT)!, compared].map((step, index) => (
            <div key={`${index}:${step.value}`} data-surface="sunken" className="grid content-start gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span data-text="label" className="font-medium">{step.label}</span>
                <span className="font-mono text-[11px] text-ink-faint tabular-nums">{sheetReadings?.[index]}</span>
              </div>
              <Region
                value={step.value}
                refFn={(region) => {
                  sheets.current[index] = region;
                }}
              >
                <Sheet />
              </Region>
            </div>
          ))}
        </div>
      </section>
    </Card>
  );
}
