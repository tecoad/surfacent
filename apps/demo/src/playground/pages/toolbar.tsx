import { useState } from "react"
import {
  Chips,
  dangerButton,
  primaryButton,
  secondaryButton,
  SwatchSelect,
  textButton,
  ToggleRow,
  type ChipItem,
  type SwatchOption,
} from "surfacent-ui"
import { StatePage } from "../shell/StatePage"
import type { PageProps } from "../shell/types"
import { jsx, lines, ui, USE_STATE, type Snippet } from "../snippet"

/* Toggle row */

type ToggleProps = { label: string; help?: string; start?: boolean; disabled?: boolean; modified?: boolean }

function ToggleDemo({ label, help, start = false, disabled, modified }: ToggleProps) {
  const [on, setOn] = useState(start)
  return <ToggleRow label={label} help={help} checked={on} onCheckedChange={setOn} disabled={disabled} modified={modified} />
}

const toggleCode = ({ label, help, start = false, disabled, modified }: ToggleProps): Snippet => ({
  imports: [USE_STATE, ui("ToggleRow")],
  setup: [`const [on, setOn] = useState(${start})`],
  jsx: jsx("ToggleRow", { label, help, checked: "{on}", onCheckedChange: "{setOn}", disabled, modified }),
})

export function ToggleRowPage(props: PageProps) {
  const off = { label: "Clear on copy" }
  const on = { label: "Clear on copy", start: true }
  const help = { label: "Hide until restart", help: "Hides the toolbar until you open a new tab." }
  const disabled = { label: "Clear on copy", disabled: true }
  const modified = { label: "Tint", start: true, modified: true }
  return (
    <StatePage
      {...props}
      states={[
        { id: "off", label: "Off", render: () => <ToggleDemo {...off} />, code: toggleCode(off) },
        { id: "on", label: "On", render: () => <ToggleDemo {...on} />, code: toggleCode(on) },
        {
          id: "help",
          label: "With help",
          note: "The ? shows the description after half a second, on hover and on focus.",
          render: () => <ToggleDemo {...help} />,
          code: toggleCode(help),
        },
        {
          id: "disabled",
          label: "Disabled",
          note: "Its label dims to 20%.",
          render: () => <ToggleDemo {...disabled} />,
          code: toggleCode(disabled),
        },
        {
          id: "modified",
          label: "Modified",
          note: "Changed from what's saved or in source: the label turns blue. Nothing else marks it.",
          render: () => <ToggleDemo {...modified} />,
          code: toggleCode(modified),
        },
      ]}
    />
  )
}

/* Swatch select */

const MARKER_COLORS: SwatchOption[] = [
  { value: "blue", label: "Blue", color: "#0088FF" },
  { value: "cyan", label: "Cyan", color: "#00C3D0" },
  { value: "green", label: "Green", color: "#34C759" },
  { value: "yellow", label: "Yellow", color: "#FFCC00" },
  { value: "orange", label: "Orange", color: "#FF8D28" },
  { value: "red", label: "Red", color: "#FF383C" },
]

/** The Color aspect's values, at the demo's default accent, after Not set (an option without a color). */
const ASPECT_COLORS: SwatchOption[] = [
  { value: "none", label: "Not set" },
  { value: "accent", label: "Accent", color: "oklch(0.58 0.19 262)" },
  { value: "neutral", label: "Neutral", color: "oklch(0.86 0.008 99)" },
  ...(
    [
      ["red", "Red", 25],
      ["orange", "Orange", 50],
      ["amber", "Amber", 70],
      ["yellow", "Yellow", 90],
      ["lime", "Lime", 130],
      ["green", "Green", 150],
      ["emerald", "Emerald", 165],
      ["teal", "Teal", 190],
      ["cyan", "Cyan", 215],
      ["blue", "Blue", 255],
      ["indigo", "Indigo", 275],
      ["violet", "Violet", 290],
      ["purple", "Purple", 300],
      ["fuchsia", "Fuchsia", 320],
      ["pink", "Pink", 350],
      ["rose", "Rose", 15],
    ] as const
  ).map(([value, label, hue]) => ({ value, label, color: `oklch(0.58 0.19 ${hue})` })),
]

const itemsCode = (items: object[]) =>
  `[\n${items.map((item) => `  ${JSON.stringify(item).replace(/"(\w+)":/g, "$1: ").replace(/,(?=\w)/g, ", ")},`).join("\n")}\n]`

function SwatchSelectDemo({ label, options, start }: { label: string; options: SwatchOption[]; start: string | null }) {
  const [value, setValue] = useState(start)
  return <SwatchSelect label={label} groups={[{ options }]} value={value} onValueChange={setValue} />
}

const swatchSelectCode = (label: string, options: SwatchOption[], start: string | null): Snippet => ({
  imports: [USE_STATE, ui("SwatchSelect")],
  setup: [
    `const colors = ${itemsCode(options)}`,
    `const [color, setColor] = useState<string | null>(${JSON.stringify(start)})`,
  ],
  jsx: jsx("SwatchSelect", { label, groups: "{[{ options: colors }]}", value: "{color}", onValueChange: "{setColor}" }),
})

export function SwatchSelectPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "markers",
          label: "Marker color",
          note: "The menu shows the toolbar's color options: the chosen one shrinks to 80% inside a ring of its own color; the highlighted one shows a faint ring. Arrows move, Enter picks.",
          render: () => <SwatchSelectDemo label="Marker color" options={MARKER_COLORS} start="blue" />,
          code: swatchSelectCode("Marker color", MARKER_COLORS, "blue"),
        },
        {
          id: "aspect",
          label: "Color aspect",
          note: "The aspect picker's Color: Not set first, then the values. Browsing the swatches previews each one on the page.",
          render: () => <SwatchSelectDemo label="Color" options={ASPECT_COLORS} start="accent" />,
          code: swatchSelectCode("Color", ASPECT_COLORS, "accent"),
        },
        {
          id: "unset",
          label: "Not set",
          note: "An option without a color is Not set: a dashed, crossed-out circle, in the menu and on the trigger. Picking it drops the value.",
          render: () => <SwatchSelectDemo label="Color" options={ASPECT_COLORS} start="none" />,
          code: swatchSelectCode("Color", ASPECT_COLORS, "none"),
        },
      ]}
    />
  )
}

/* Chips */

const RESPONSES: ChipItem[] = [
  { value: "hover", label: "Hover" },
  { value: "focus", label: "Focus" },
  { value: "click", label: "Click" },
]

const MODIFIERS: ChipItem[] = [
  { value: "muted", label: "Muted" },
  { value: "faint", label: "Faint" },
]

function ChipsDemo({ label, items, start, grow }: { label: string; items: ChipItem[]; start: string[]; grow?: boolean }) {
  const [value, setValue] = useState(start)
  return (
    <Chips
      grow={grow}
      label={label}
      items={items}
      value={value}
      onPress={(next) => setValue((on) => (on.includes(next) ? on.filter((item) => item !== next) : [...on, next]))}
    />
  )
}

const chipsCode = (label: string, items: ChipItem[], start: string[], grow?: boolean): Snippet => ({
  imports: [USE_STATE, ui("Chips")],
  setup: [`const options = ${itemsCode(items)}`, `const [on, setOn] = useState<string[]>(${JSON.stringify(start)})`],
  jsx: jsx("Chips", {
    grow,
    label,
    items: "{options}",
    value: "{on}",
    onPress: "{(next) => setOn((current) => current.includes(next) ? current.filter((item) => item !== next) : [...current, next])}",
  }),
})

export function ChipsPage(props: PageProps) {
  const disabled = MODIFIERS.map((item) => ({ ...item, disabled: true, title: "Pick a text first" }))
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "some",
          label: "Hover and Focus on",
          note: "Each chip switches on and off on its own. Arrows move between them.",
          render: () => <ChipsDemo label="Response" items={RESPONSES} start={["hover", "focus"]} />,
          code: chipsCode("Response", RESPONSES, ["hover", "focus"]),
        },
        {
          id: "grow",
          label: "Filling the row",
          note: "With grow, the chips share the row's width: the aspect picker's Response.",
          render: () => (
            <div className="w-[248px]">
              <ChipsDemo label="Response" items={RESPONSES} start={["hover"]} grow />
            </div>
          ),
          code: { ...chipsCode("Response", RESPONSES, ["hover"], true), jsx: jsx("div", { className: "w-[248px]" }, jsx("Chips", { grow: true, label: "Response", items: "{options}", value: "{on}", onPress: "{(next) => setOn((current) => current.includes(next) ? current.filter((item) => item !== next) : [...current, next])}" })) },
        },
        {
          id: "none",
          label: "All off",
          render: () => <ChipsDemo label="Response" items={RESPONSES} start={[]} />,
          code: chipsCode("Response", RESPONSES, []),
        },
        {
          id: "disabled",
          label: "Disabled",
          note: "A chip that doesn't apply yet stays at 35%.",
          render: () => <ChipsDemo label="Text modifiers" items={disabled} start={[]} />,
          code: chipsCode("Text modifiers", disabled, []),
        },
      ]}
    />
  )
}

/* Buttons */

const buttonsCode = (buttons: [string, string, boolean?][]): Snippet => ({
  imports: [ui(...new Set(buttons.map(([, style]) => style)))],
  jsx: jsx(
    "div",
    { className: "flex items-center justify-end gap-1.5" },
    lines(
      ...buttons.map(([label, style, disabled]) => jsx("button", { type: "button", className: `{${style}}`, disabled }, label))
    )
  ),
})

const BUTTON_STYLES = { primaryButton, secondaryButton, dangerButton, textButton }

function ButtonRow({ buttons }: { buttons: [string, keyof typeof BUTTON_STYLES, boolean?][] }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {buttons.map(([label, style, disabled]) => (
        <button key={label} type="button" className={BUTTON_STYLES[style]} disabled={disabled}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function ButtonsPage(props: PageProps) {
  const footer: [string, keyof typeof BUTTON_STYLES, boolean?][] = [
    ["Reset", "secondaryButton"],
    ["Save", "primaryButton"],
  ]
  const idle: [string, keyof typeof BUTTON_STYLES, boolean?][] = [
    ["Reset", "secondaryButton", true],
    ["Save", "primaryButton", true],
  ]
  const editing: [string, keyof typeof BUTTON_STYLES, boolean?][] = [
    ["Delete", "dangerButton"],
    ["Cancel", "secondaryButton"],
    ["Save", "primaryButton"],
  ]
  const text: [string, keyof typeof BUTTON_STYLES, boolean?][] = [
    ["Undo", "textButton"],
    ["Remove", "textButton"],
  ]
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "footer",
          label: "Secondary and primary",
          note: "The primary is the submit pill; the secondary only washes 8% on hover.",
          render: () => <ButtonRow buttons={footer} />,
          code: buttonsCode(footer),
        },
        {
          id: "disabled",
          label: "Disabled",
          note: "Nothing to save: both at 35%.",
          render: () => <ButtonRow buttons={idle} />,
          code: buttonsCode(idle),
        },
        {
          id: "danger",
          label: "With a danger action",
          render: () => <ButtonRow buttons={editing} />,
          code: buttonsCode(editing),
        },
        {
          id: "text",
          label: "Text actions",
          note: "Small actions inside a row, like the aspect picker's Undo and Remove.",
          render: () => <ButtonRow buttons={text} />,
          code: buttonsCode(text),
        },
      ]}
    />
  )
}
