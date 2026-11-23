import type { ReactNode } from "react"
import themeCss from "surfacent-ui/styles.css?raw"
import { AreaPage } from "../shell/AreaPage"
import type { PageProps } from "../shell/types"
import type { Snippet } from "../snippet"

/** A slice of src/index.css, from one marker up to the next, so the page never drifts. */
function cssBetween(start: string, end: string) {
  const from = themeCss.indexOf(start)
  const to = themeCss.indexOf(end, from + start.length)
  return themeCss.slice(from, to).trimEnd()
}

/** A rule inside @layer components, shown at the top level. */
const unindent = (source: string) =>
  source
    .split("\n")
    .map((line) => line.replace(/^ {2}/, ""))
    .join("\n")

const THEME = cssBetween("  /* Panel (dark theme) */", "  --animate-cycle-in")

/** `--<prefix>-<name>: <value>;` declarations in the @theme block, by name. */
const declarations = (prefix: string) =>
  new Map(
    [...THEME.matchAll(new RegExp(`--${prefix}-([a-z-]+):\\s*([^;]+);`, "g"))].map(([, name, value]) => [
      name,
      value.replace(/\s+/g, " "),
    ])
  )

const COLORS = declarations("color")
const EASES = declarations("ease")

const CODE: Snippet = {
  imports: [],
  language: "css",
  jsx: `@theme {\n${THEME}\n}\n\n${unindent(cssBetween("  /*\n   * Panel motion", "  /*\n   * Number fields"))}`,
}

const COLOR_GROUPS: { title: string; text?: boolean; tokens: [name: string, use: string][] }[] = [
  {
    title: "Surfaces and lines",
    tokens: [
      ["chrome-surface", "Panel"],
      ["chrome-popup", "Popovers, menus"],
      ["chrome-raised", "Slider thumb"],
      ["chrome-control", "Fields, segments"],
      ["chrome-hover", "Hover, highlighted item"],
      ["chrome-selected", "Checked segment"],
      ["chrome-border", "Field border"],
      ["chrome-strong", "Focused field border"],
      ["chrome-divider", "Dividers"],
      ["chrome-track", "Switch off"],
    ],
  },
  {
    title: "Text",
    text: true,
    tokens: [
      ["chrome-text", "Values"],
      ["chrome-soft", "Secondary values"],
      ["chrome-muted", "Labels"],
      ["chrome-faint", "Icons"],
      ["chrome-ghost", "Placeholders"],
    ],
  },
  {
    title: "Accent",
    tokens: [
      ["chrome-accent", "Switch on, selection, action"],
      ["chrome-focus", "Focus outline"],
      ["chrome-agent", "An agent listening, or working on a note"],
      ["chrome-cyan", "Accent option"],
      ["chrome-green", "Accent option, success"],
      ["chrome-yellow", "Accent option, not listening"],
      ["chrome-orange", "Accent option"],
      ["chrome-red", "Accent option, errors, not connected"],
    ],
  },
]

/** The roles the panel's text plays: size/line height, weight, color. */
const TYPE = [
  { role: "Title", spec: "text-ag · 13/20 · 500 · #bbb", className: "text-ag font-medium" },
  { role: "Value", spec: "text-ag · 13/20 · 500 · white", className: "text-ag font-medium" },
  { role: "Label", spec: "text-ag · 13/20 · 400 · 50% · −0.15px", className: "text-ag tracking-[-0.15px]" },
  { role: "Field", spec: "text-ag-sm · 12/16 · 500", className: "text-ag-sm font-medium" },
  { role: "Description", spec: "text-ag-xs · 11/14 · 300 · 50%", className: "text-ag-xs font-light" },
  { role: "Pad label", spec: "text-ag-2xs · 10/12 · 500 · 35%", className: "text-ag-2xs font-medium" },
]

const CORNERS = [
  { radius: 4, name: "rounded-sm", use: "Inline links, steppers" },
  { radius: 6, name: "rounded-md", use: "Fields, buttons, swatches" },
  { radius: 8, name: "rounded-lg", use: "Tooltips, drop zones, pad" },
  { radius: 16, name: "rounded-2xl", use: "Panel, popovers" },
  { radius: 9999, name: "rounded-full", use: "Pills, switches" },
]

const MOTION = [
  ["Popover", "160ms in, 120ms out · ease-panel · 4px, 98%, blur 2px"],
  ["Page", "200ms ease · 24px and a fade"],
  ["New value", "200ms ease-out · drops 6px (cycle-in)"],
  ["Hover, color", "150ms ease"],
  ["Accordion", "300ms ease-out-expo"],
  ["Settle", "360ms ease-glide"],
] as const

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="m-0 text-[15px]/6 font-semibold text-pg-text">{title}</h2>
        {note && <p className="m-0 text-[13px]/5 text-pg-muted">{note}</p>}
      </header>
      {children}
    </section>
  )
}

const Subheading = ({ children }: { children: ReactNode }) => (
  <h3 className="m-0 text-xs font-normal text-pg-muted">{children}</h3>
)

/** Every token the panel is built from, as values, straight from src/index.css. */
function TokenSheet() {
  return (
    <div className="flex flex-col gap-12">
      <Section
        title="Colors"
        note="Swatches sit on the panel's #1a1a1a, where the translucent ones live. The palette switches to Display P3 where the screen has it."
      >
        {COLOR_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <Subheading>{group.title}</Subheading>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-4 p-0">
              {group.tokens.map(([name, use]) => {
                const value = COLORS.get(name)
                if (!value) return null
                return (
                  <li key={name} className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-chrome-surface font-chrome text-ag font-medium shadow-[0_0_0_1px_var(--color-pg-line)]"
                    >
                      {group.text ? (
                        <span style={{ color: value }}>Aa</span>
                      ) : (
                        <span className="absolute inset-0" style={{ background: value }} />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-xs/4 text-pg-text">{name}</span>
                      <span className="truncate font-mono text-[11px]/4 text-pg-muted">{value}</span>
                      <span className="truncate text-[11px]/4 text-pg-faint">{use}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Type" note="system-ui with kerning. The colors are for the panel's dark surface.">
        <dl className="m-0 flex flex-col">
          {TYPE.map((type) => (
            <div
              key={type.role}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-pg-line py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <dt className={`font-chrome text-pg-text ${type.className}`}>{type.role}</dt>
              <dd className="m-0 font-mono text-[11px]/4 text-pg-muted">{type.spec}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Corners" note="Plain border-radius, no squircle.">
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-4 gap-y-5 p-0">
          {CORNERS.map((corner) => (
            <li key={corner.name} className="flex flex-col gap-2">
              <span
                aria-hidden="true"
                className="block size-12 border border-pg-line bg-pg-hover"
                style={{ borderRadius: corner.radius }}
              />
              <span className="flex flex-col">
                <span className="font-mono text-xs/4 text-pg-text">
                  {corner.radius > 100 ? "full" : `${corner.radius}px`}
                </span>
                <span className="text-[11px]/4 text-pg-faint">{corner.use}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Motion" note="Plain CSS keywords: a transition with no curve uses ease, and ease-out is the CSS keyword, not Tailwind's curve.">
        <dl className="m-0 grid grid-cols-[minmax(96px,auto)_minmax(0,1fr)] gap-x-6 gap-y-2 text-[13px]/5">
          {MOTION.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-pg-text">{name}</dt>
              <dd className="m-0 font-mono text-xs/5 text-pg-muted">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3">
          <Subheading>Curves</Subheading>
          <dl className="m-0 grid grid-cols-[minmax(96px,auto)_minmax(0,1fr)] gap-x-6 gap-y-2">
            {[...EASES].map(([name, value]) => (
              <div key={name} className="contents">
                <dt className="font-mono text-xs/5 text-pg-text">ease-{name}</dt>
                <dd className="m-0 font-mono text-xs/5 text-pg-muted">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
    </div>
  )
}

export function TokensPage(props: PageProps) {
  return (
    <AreaPage {...props} code={CODE}>
      <TokenSheet />
    </AreaPage>
  )
}
