import type { Ref } from "react";
import { Lab, type Sample } from "./Lab";

const COLORS = ["Accent", "Red", "Orange", "Yellow", "Green", "Teal", "Blue", "Purple", "Pink"];

/** Every color side by side; the row's readout follows the accent. */
function Palette({ target, tint, ink }: { target: Ref<HTMLElement>; tint?: boolean; ink?: boolean }) {
  return (
    <div className="flex max-w-72 flex-wrap justify-center gap-1.5">
      {COLORS.map((label) => {
        const color = label.toLowerCase();
        return (
          <span
            key={label}
            ref={color === "accent" ? (target as Ref<HTMLSpanElement>) : undefined}
            data-surface={ink ? undefined : "flat"}
            data-color={tint ? `${color} tint` : color}
            data-text="caption"
            className={ink ? "font-medium" : "rounded-md px-1.5 py-0.5 font-medium"}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

const SAMPLES: Sample[] = [
  {
    name: "Palette · solid",
    code: 'data-surface="flat" data-color="<color>"',
    render: (ref) => <Palette target={ref} />,
  },
  {
    name: "Palette · tint",
    code: 'data-surface="flat" data-color="<color> tint"',
    render: (ref) => <Palette target={ref} tint />,
  },
  {
    name: "Palette · ink",
    code: 'data-color="<color>", no surface',
    render: (ref) => <Palette target={ref} ink />,
  },
  {
    name: "Button",
    code: 'data-surface="raised" data-color="accent" data-response="hover focus click"',
    render: (ref) => (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        data-surface="raised"
        data-color="accent"
        data-response="hover focus click"
        data-text="label" className="h-9 rounded-lg px-4 font-medium"
      >
        Deploy
      </button>
    ),
  },
  {
    name: "Badge",
    code: 'data-surface="flat" data-color="accent"',
    render: (ref) => (
      <span
        ref={ref as Ref<HTMLSpanElement>}
        data-surface="flat"
        data-color="accent"
        data-text="caption" className="rounded-full px-2.5 py-0.5 font-medium"
      >
        New
      </span>
    ),
  },
  {
    name: "Soft button · tint",
    code: 'data-surface="raised" data-color="accent tint" data-response="hover focus click"',
    render: (ref) => (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        data-surface="raised"
        data-color="accent tint"
        data-response="hover focus click"
        data-text="label" className="h-9 rounded-lg px-4 font-medium"
      >
        Invite
      </button>
    ),
  },
  {
    name: "Callout · tint",
    code: 'data-surface="flat" data-color="accent tint", a solid button inside',
    render: (ref) => (
      <div ref={ref as Ref<HTMLDivElement>} data-surface="flat" data-color="accent tint" className="grid w-64 gap-1 rounded-xl p-3">
        <span data-text="label" className="font-medium">Heads up</span>
        <span data-text="caption" className="">Builds move to the new runtime on Monday.</span>
        <button
          data-surface="raised"
          data-color="accent"
          data-response="hover click"
          data-text="caption" className="mt-1 h-7 justify-self-start rounded-md px-2.5 font-medium"
        >
          Review
        </button>
      </div>
    ),
  },
  {
    name: "Switch, on",
    code: 'track: sunken, accent · knob: raised, data-color="neutral"',
    render: (ref) => (
      <span ref={ref as Ref<HTMLSpanElement>} data-surface="sunken" data-color="accent" className="relative block h-6 w-10 rounded-full">
        <span data-surface="raised" data-color="neutral" className="absolute top-0.5 left-[18px] size-5 rounded-full" />
      </span>
    ),
  },
  {
    name: "Count in a button",
    code: 'count: data-surface="sunken", no color: takes the color below',
    render: (ref) => (
      <button
        data-surface="raised"
        data-color="accent"
        data-response="hover click"
        data-text="label" className="inline-flex h-9 items-center gap-2 rounded-lg pr-1.5 pl-3.5 font-medium"
      >
        Inbox
        <span ref={ref as Ref<HTMLSpanElement>} data-surface="sunken" data-text="caption" className="rounded-md px-1.5 py-0.5 tabular-nums">
          12
        </span>
      </button>
    ),
  },
  {
    name: "Field",
    code: 'data-surface="sunken" data-response="focus", no color',
    render: (ref) => (
      <input
        ref={ref as Ref<HTMLInputElement>}
        data-surface="sunken"
        data-response="focus"
        placeholder="Search…"
        data-text="label" className="h-9 w-48 rounded-lg px-3 placeholder:text-ink-faint outline-none"
      />
    ),
  },
  {
    name: "Neutral card",
    code: 'data-surface="raised" data-color="neutral"',
    render: (ref) => (
      <div ref={ref as Ref<HTMLDivElement>} data-surface="raised" data-color="neutral" className="grid w-48 gap-0.5 rounded-xl p-3">
        <span data-text="label" className="font-medium">Card</span>
    <span data-text="caption muted">Neutral on any color</span>
      </div>
    ),
  },
  {
    name: "Link · no surface",
    code: 'data-color="accent"',
    render: (ref) => (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href="#"
        onClick={(event) => event.preventDefault()}
        data-color="accent"
        data-text="label" className="font-medium underline-offset-2 hover:underline"
      >
        View invoices
      </a>
    ),
  },
  {
    name: "Ghost button · no surface",
    code: 'data-color="accent" data-response="hover click"',
    render: (ref) => (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        data-color="accent"
        data-response="hover click"
        data-text="label" className="h-9 rounded-lg px-4 font-medium"
      >
        Learn more
      </button>
    ),
  },
];

/**
 * Prototype for colored materials: the accent and the hue colors share one
 * chroma, tone and step scale. No controls: change what a row sits on, its
 * color or its state with the toolbar.
 */
export function ColorLab() {
  return (
    <Lab
      title="Color lab"
      description="The accent and the hue colors share the accent's chroma, tone and step scale: exactly their color on the page plane, lighter per level up and darker per level down by Step scale. Solid is the pigment; tint is a neutral surface leaning toward the color, with text in the color."
      samples={SAMPLES}
      controls={false}
    />
  );
}
