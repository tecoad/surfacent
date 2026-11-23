import { Popover, PopoverContent } from "@ui-sdk/react/popover"
import { useEffect, useRef, useState } from "react"
import { BackButton, CANVAS_COLORS, type Character, CharacterPad, ColorControl, cx, CycleRow, EditButton, ICON_LICENSES, ICONS, MOTION_OPTIONS, NEUTRAL_OPTIONS, PanelTitle, popupBodyClass, popupClass, PRIMARY_ACTION, ProjectName, ScrollArea, SwitchRow, ThemeChoices, type ThemeId, ThemePicker, ThemesHeader, TYPOGRAPHY, TYPOGRAPHY_LICENSES } from "surfacent-ui"
import { Frozen, PanelFrame, PopupRoom } from "../shell/frames"
import { StatePage } from "../shell/StatePage"
import type { PageProps } from "../shell/types"
import { jsx, lines, ui, uiType, USE_STATE, type PropValue, type Snippet } from "../snippet"

type Force = "default" | "hover" | "focus"
const FORCES: Force[] = ["default", "hover", "focus"]
const forceLabel = (force: Force) => force[0].toUpperCase() + force.slice(1)
const forced = (force: Force) => (force === "default" ? undefined : force)

/* Header buttons */

export function EditButtonPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={FORCES.map((force) => ({
        id: force,
        label: forceLabel(force),
        render: () => (
          <div className="flex h-6 items-center justify-between">
            <PanelTitle>Theme</PanelTitle>
            <EditButton force={forced(force)} />
          </div>
        ),
        code: {
          imports: [ui("EditButton", "PanelTitle")],
          jsx: jsx(
            "div",
            { className: "flex h-6 items-center justify-between" },
            lines(jsx("PanelTitle", {}, "Theme"), jsx("EditButton", { force: forced(force) }))
          ),
        },
      }))}
    />
  )
}

export function BackButtonPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={FORCES.map((force) => ({
        id: force,
        label: forceLabel(force),
        render: () => (
          <div className="flex h-6 items-center gap-1">
            <BackButton force={forced(force)} />
            <PanelTitle>Edit Canvas</PanelTitle>
          </div>
        ),
        code: {
          imports: [ui("BackButton", "PanelTitle")],
          jsx: jsx(
            "div",
            { className: "flex h-6 items-center gap-1" },
            lines(jsx("BackButton", { force: forced(force) }), jsx("PanelTitle", {}, "Edit Canvas"))
          ),
        },
      }))}
    />
  )
}

/* Project name */

/** Submits "Grove" once on mount, so a rename's pending or failed state can be pinned. */
function SubmittedName({ onRename }: { onRename: (name: string) => Promise<unknown> }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // After the editor has filled its input.
    const timer = setTimeout(() => {
      ref.current
        ?.querySelector("input")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
    }, 50)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div ref={ref}>
      <ProjectName defaultValue="Untitled" defaultEditing defaultDraft="Grove" onRename={onRename} />
    </div>
  )
}

const nameCode = (props: Record<string, PropValue>): Snippet => ({
  imports: [ui("ProjectName")],
  jsx: jsx("ProjectName", { defaultValue: "Untitled", ...props }),
})

export function ProjectNamePage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "interactive",
          label: "Interactive",
          note: "Click to edit (the text comes selected). Enter or Esc save and return focus to the name; leaving the field saves without returning it.",
          render: () => <ProjectName defaultValue="Untitled" />,
          code: nameCode({}),
        },
        {
          id: "hover",
          label: "Hover",
          render: () => <ProjectName defaultValue="Untitled" force="hover" />,
          code: nameCode({ force: "hover" }),
        },
        {
          id: "focus",
          label: "Focus",
          render: () => <ProjectName defaultValue="Untitled" force="focus" />,
          code: nameCode({ force: "focus" }),
        },
        {
          id: "editing",
          label: "Editing",
          group: "Editing",
          note: "Frozen (inert) so it doesn't steal focus. The box grows with the text.",
          render: () => (
            <Frozen>
              <ProjectName defaultValue="Untitled" defaultEditing force="focus" />
            </Frozen>
          ),
          code: nameCode({ defaultEditing: true, force: "focus" }),
        },
        {
          id: "saving",
          label: "Saving",
          group: "Editing",
          note: "Submitted (Enter) to a rename that hasn't answered yet: the field is read-only.",
          render: () => (
            <Frozen>
              <SubmittedName onRename={() => new Promise(() => {})} />
            </Frozen>
          ),
          code: nameCode({
            defaultEditing: true,
            defaultDraft: "Grove",
            onRename: "{() => new Promise(() => {})}",
          }),
        },
        {
          id: "error",
          label: "Save failed",
          group: "Editing",
          note: "Submitted (Enter) to a rename that failed: the editor stays open, with the border and the error in red. Esc cancels.",
          render: () => (
            <Frozen>
              <SubmittedName onRename={() => Promise.reject(new Error("Something went wrong. Please try again."))} />
              <div className="h-4" />
            </Frozen>
          ),
          code: nameCode({
            defaultEditing: true,
            defaultDraft: "Grove",
            onRename: '{() => Promise.reject(new Error("Something went wrong. Please try again."))}',
          }),
        },
      ]}
    />
  )
}

/* Theme */

function LiveThemePicker(props: { force?: string; pinned?: boolean; inline?: boolean }) {
  const [theme, setTheme] = useState<ThemeId>("canvas")
  return <ThemePicker value={theme} onValueChange={setTheme} {...props} />
}

const pickerCode = (props: Record<string, PropValue>): Snippet => ({
  imports: [USE_STATE, ui("ThemePicker"), uiType("ThemeId")],
  setup: ['const [theme, setTheme] = useState<ThemeId>("canvas")'],
  jsx: jsx("ThemePicker", { value: "{theme}", onValueChange: "{setTheme}", ...props }),
})

export function ThemePickerPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "interactive",
          label: "Interactive",
          note: "Opens the Themes popover to the left (side=left, align=start, 20px) with the panel motion.",
          render: () => <LiveThemePicker />,
          code: pickerCode({}),
        },
        {
          id: "hover",
          label: "Hover",
          group: "Trigger",
          render: () => <LiveThemePicker force="hover" />,
          code: pickerCode({ force: "hover" }),
        },
        {
          id: "focus",
          label: "Focus",
          group: "Trigger",
          render: () => <LiveThemePicker force="focus" />,
          code: pickerCode({ force: "focus" }),
        },
        {
          id: "open",
          label: "Open",
          group: "Popover",
          frame: "bare",
          note: "Pinned open and drawn in place (inline), so it stays put in the playground.",
          render: () => (
            <PopupRoom width={220} height={210}>
              <PanelFrame>
                <LiveThemePicker pinned inline />
              </PanelFrame>
            </PopupRoom>
          ),
          code: pickerCode({ pinned: true, inline: true }),
        },
        {
          id: "options",
          label: "Options: hovered, focused, chosen",
          group: "Popover",
          frame: "bare",
          note: "Felt hovered, Jelly focused, Canvas chosen (in blue).",
          render: () => (
            <Popover open onOpenChange={(_open, details) => details.cancel()}>
              <PopoverContent inline aria-label="Themes" className={cx(popupClass, "w-[200px]")}>
                <ScrollArea contentClassName={cx(popupBodyClass, "gap-2")}>
                  <ThemesHeader />
                  <ThemeChoices value="canvas" onValueChange={() => {}} force={{ felt: "hover", jelly: "focus" }} />
                </ScrollArea>
              </PopoverContent>
            </Popover>
          ),
          code: {
            imports: [
              { from: "@ui-sdk/react/popover", names: ["Popover", "PopoverContent"] },
              ui("ThemeChoices", "ThemesHeader"),
              ui("popupBodyClass", "popupClass"),
              ui("ScrollArea"),
              ui("cx"),
            ],
            jsx: jsx(
              "Popover",
              { open: true, onOpenChange: "{(_open, details) => details.cancel()}" },
              jsx(
                "PopoverContent",
                { inline: true, "aria-label": "Themes", className: '{cx(popupClass, "w-[200px]")}' },
                jsx(
                  "ScrollArea",
                  { contentClassName: '{cx(popupBodyClass, "gap-2")}' },
                  lines(
                    jsx("ThemesHeader"),
                    jsx("ThemeChoices", {
                      value: "canvas",
                      onValueChange: "{() => {}}",
                      force: '{{ felt: "hover", jelly: "focus" }}',
                    })
                  )
                )
              )
            ),
          },
        },
      ]}
    />
  )
}

/* Character */

function LivePad() {
  const [point, setPoint] = useState<Character>({ x: 50, y: 50 })
  return (
    <div className="flex flex-col gap-2">
      <CharacterPad value={point} onValueChange={setPoint} />
      <p className="m-0 text-center text-ag-xs text-chrome-muted tabular-nums">{`x ${point.x} · y ${point.y}`}</p>
    </div>
  )
}

const padCode = (props: Record<string, PropValue>): Snippet => ({
  imports: [ui("CharacterPad")],
  jsx: jsx("CharacterPad", props),
})

export function CharacterPage(props: PageProps) {
  const pinned: Array<[string, string, Character]> = [
    ["quiet-compact", "Quiet · Compact", { x: 0, y: 0 }],
    ["bold-airy", "Bold · Airy", { x: 100, y: 100 }],
    ["quiet-airy", "Quiet · Airy", { x: 0, y: 100 }],
  ]
  const point = ({ x, y }: Character) => `{{ x: ${x}, y: ${y} }}`
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "interactive",
          label: "Interactive",
          note: "Dragging (from 3px on) follows the pointer; a click glides the point there (360ms). With the point focused, arrows move 1 and Shift+arrows 10.",
          render: () => <LivePad />,
          code: {
            imports: [USE_STATE, ui("CharacterPad"), uiType("Character")],
            setup: ["const [point, setPoint] = useState<Character>({ x: 50, y: 50 })"],
            jsx: jsx(
              "div",
              { className: "flex flex-col gap-2" },
              lines(
                jsx("CharacterPad", { value: "{point}", onValueChange: "{setPoint}" }),
                jsx(
                  "p",
                  { className: "m-0 text-center text-ag-xs text-chrome-muted tabular-nums" },
                  "{`x ${point.x} · y ${point.y}`}"
                )
              )
            ),
          },
        },
        ...pinned.map(([id, label, value]) => ({
          id,
          label,
          group: "Position",
          render: () => <CharacterPad defaultValue={value} />,
          code: padCode({ defaultValue: point(value) }),
        })),
        {
          id: "pressed",
          label: "Pressed",
          group: "Interaction",
          note: "The point grows 10% on hover and while pressed, like the toolbar's markers.",
          render: () => <CharacterPad defaultValue={{ x: 62, y: 70 }} force="active" />,
          code: padCode({ defaultValue: point({ x: 62, y: 70 }), force: "active" }),
        },
        {
          id: "focus",
          label: "Point focused",
          group: "Interaction",
          render: () => <CharacterPad defaultValue={{ x: 50, y: 50 }} force="focus" />,
          code: padCode({ defaultValue: point({ x: 50, y: 50 }), force: "focus" }),
        },
        {
          id: "disabled",
          label: "Disabled",
          group: "Interaction",
          render: () => <CharacterPad defaultValue={{ x: 50, y: 50 }} disabled />,
          code: padCode({ defaultValue: point({ x: 50, y: 50 }), disabled: true }),
        },
      ]}
    />
  )
}

/* Motion and Neutrals */

const cycleCode = (list: "MOTION_OPTIONS" | "NEUTRAL_OPTIONS", props: Record<string, PropValue>): Snippet => ({
  imports: [ui("CycleRow"), ui(list)],
  jsx: jsx("CycleRow", { label: list === "MOTION_OPTIONS" ? "Motion" : "Neutrals", items: `{${list}}`, ...props }),
})

export function CycleRowPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "motion",
          label: "Motion",
          group: "Interactive",
          note: "Each press steps forward; the new value drops 6px into place (200ms) and the dots show the position.",
          render: () => <CycleRow label="Motion" items={MOTION_OPTIONS} defaultValue="Snappy" />,
          code: cycleCode("MOTION_OPTIONS", { defaultValue: "Snappy" }),
        },
        {
          id: "neutrals",
          label: "Neutrals",
          group: "Interactive",
          render: () => <CycleRow label="Neutrals" items={NEUTRAL_OPTIONS} defaultValue="Mono" />,
          code: cycleCode("NEUTRAL_OPTIONS", { defaultValue: "Mono" }),
        },
        ...MOTION_OPTIONS.map((value) => ({
          id: `motion-${value.toLowerCase()}`,
          label: value,
          group: "Motion",
          render: () => <CycleRow label="Motion" items={MOTION_OPTIONS} defaultValue={value} />,
          code: cycleCode("MOTION_OPTIONS", { defaultValue: value }),
        })),
        ...NEUTRAL_OPTIONS.map((value) => ({
          id: `neutrals-${value.toLowerCase()}`,
          label: value,
          group: "Neutrals",
          render: () => <CycleRow label="Neutrals" items={NEUTRAL_OPTIONS} defaultValue={value} />,
          code: cycleCode("NEUTRAL_OPTIONS", { defaultValue: value }),
        })),
        {
          id: "focus",
          label: "Focus",
          group: "Interaction",
          render: () => <CycleRow label="Motion" items={MOTION_OPTIONS} defaultValue="Snappy" data-force="focus" />,
          code: cycleCode("MOTION_OPTIONS", { defaultValue: "Snappy", "data-force": "focus" }),
        },
        {
          id: "disabled",
          label: "Disabled",
          group: "Interaction",
          render: () => <CycleRow label="Motion" items={MOTION_OPTIONS} defaultValue="Snappy" disabled />,
          code: cycleCode("MOTION_OPTIONS", { defaultValue: "Snappy", disabled: true }),
        },
      ]}
    />
  )
}

/* Switch rows and license details */

type RowConfig = "PRIMARY_ACTION" | "TYPOGRAPHY" | "ICONS"
const ROW_CONFIGS = { PRIMARY_ACTION, TYPOGRAPHY, ICONS }

const switchCode = (config: RowConfig, props: Record<string, PropValue>, license?: string): Snippet => ({
  imports: [
    ui("SwitchRow"),
    ui(config),
    ...(license ? [ui(license)] : []),
  ],
  jsx: jsx("SwitchRow", { [`{...${config}}`]: true, ...props }),
})

export function SwitchRowPage(props: PageProps) {
  const rows: Array<[string, string, RowConfig]> = [
    ["primary", "Primary action", "PRIMARY_ACTION"],
    ["typography", "Typography", "TYPOGRAPHY"],
    ["icons", "Icons", "ICONS"],
  ]
  return (
    <StatePage
      {...props}
      states={[
        ...rows.flatMap(([id, group, config]) =>
          [true, false].map((checked) => ({
            id: `${id}-${checked ? "on" : "off"}`,
            label: checked ? "On" : "Off",
            group,
            note: "The switch: 24×16, with a 12px thumb that travels 8px in 150ms; the key and the value change with the state.",
            render: () => <SwitchRow {...ROW_CONFIGS[config]} defaultChecked={checked} />,
            code: switchCode(config, { defaultChecked: checked }),
          }))
        ),
        {
          id: "focus",
          label: "Focus",
          group: "Interaction",
          render: () => <SwitchRow {...PRIMARY_ACTION} defaultChecked data-force="focus" />,
          code: switchCode("PRIMARY_ACTION", { defaultChecked: true, "data-force": "focus" }),
        },
        {
          id: "disabled",
          label: "Disabled",
          group: "Interaction",
          render: () => <SwitchRow {...TYPOGRAPHY} defaultChecked disabled />,
          code: switchCode("TYPOGRAPHY", { defaultChecked: true, disabled: true }),
        },
      ]}
    />
  )
}

export function LicensePage(props: PageProps) {
  const opened: Array<[string, string, RowConfig, "TYPOGRAPHY_LICENSES" | "ICON_LICENSES"]> = [
    ["typography", "Typography", "TYPOGRAPHY", "TYPOGRAPHY_LICENSES"],
    ["icons", "Icons", "ICONS", "ICON_LICENSES"],
  ]
  const LICENSES = { TYPOGRAPHY_LICENSES, ICON_LICENSES }
  const typography = { info: "{TYPOGRAPHY_LICENSES}", infoLabel: "About typography licensing", defaultChecked: true }
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "closed",
          label: "Closed",
          note: "Projects only: the (i) after the key opens the details; the panel scrolls so they fit, and Esc closes them.",
          render: () => (
            <SwitchRow {...TYPOGRAPHY} info={TYPOGRAPHY_LICENSES} infoLabel="About typography licensing" defaultChecked />
          ),
          code: switchCode("TYPOGRAPHY", typography, "TYPOGRAPHY_LICENSES"),
        },
        {
          id: "focus",
          label: "(i) focused",
          render: () => (
            <SwitchRow
              {...TYPOGRAPHY}
              info={TYPOGRAPHY_LICENSES}
              infoLabel="About typography licensing"
              defaultChecked
              infoForce="focus"
            />
          ),
          code: switchCode("TYPOGRAPHY", { ...typography, infoForce: "focus" }, "TYPOGRAPHY_LICENSES"),
        },
        ...opened.flatMap(([id, group, config, license]) =>
          [true, false].map((checked) => ({
            id: `${id}-${checked ? "on" : "off"}`,
            label: checked ? "Open · licensed" : "Open · free",
            group,
            render: () => (
              <SwitchRow
                {...ROW_CONFIGS[config]}
                info={LICENSES[license]}
                infoLabel={`About ${id} licensing`}
                defaultChecked={checked}
                defaultInfoOpen
              />
            ),
            code: switchCode(
              config,
              {
                info: `{${license}}`,
                infoLabel: `About ${id} licensing`,
                defaultChecked: checked,
                defaultInfoOpen: true,
              },
              license
            ),
          }))
        ),
      ]}
    />
  )
}

/* Color */

type ColorDemoProps = {
  start?: number
  custom?: boolean
  defaultMode?: "wheel" | "hex"
  defaultDraft?: string
  defaultInvalid?: boolean
  disabled?: boolean
  force?: { wheel?: string; add?: string }
}

function ColorDemo({ start = 1, custom, ...props }: ColorDemoProps) {
  const [colors, setColors] = useState(custom ? [...CANVAS_COLORS, "#ff5500"] : CANVAS_COLORS)
  const [color, setColor] = useState(start)
  return (
    <ColorControl
      {...props}
      colors={colors}
      value={color}
      onValueChange={setColor}
      onColorsChange={(next, index) => {
        setColors(next)
        setColor(index)
      }}
    />
  )
}

/** The aspect picker's Color, at the demo's default accent: Not set ("") first, then the values. */
const ASPECT_STRIP = [
  ["", "Not set"],
  ["oklch(0.58 0.19 262)", "Accent"],
  ["oklch(0.86 0.008 99)", "Neutral"],
  ...(
    [
      [25, "Red"],
      [50, "Orange"],
      [90, "Yellow"],
      [150, "Green"],
      [190, "Teal"],
      [255, "Blue"],
      [300, "Purple"],
      [350, "Pink"],
    ] as const
  ).map(([hue, name]) => [`oklch(0.58 0.19 ${hue})`, name]),
]

function FixedColorDemo() {
  const [color, setColor] = useState(1)
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div className="grid w-[248px] gap-2">
      <ColorControl
        label="Color"
        colors={ASPECT_STRIP.map(([css]) => css!)}
        labels={ASPECT_STRIP.map(([, name]) => name!)}
        value={color}
        onValueChange={setColor}
        onItemHover={setHovered}
      />
      <p className="m-0 text-ag-xs text-chrome-muted">{ASPECT_STRIP[hovered ?? color]![1]}</p>
    </div>
  )
}

const fixedColorCode: Snippet = {
  imports: [USE_STATE, ui("ColorControl")],
  setup: [
    `const colors = [\n${ASPECT_STRIP.map(([css]) => `  ${JSON.stringify(css)},`).join("\n")}\n]`,
    `const names = [${ASPECT_STRIP.map(([, name]) => JSON.stringify(name)).join(", ")}]`,
    "const [color, setColor] = useState(1)",
    "const [hovered, setHovered] = useState<number | null>(null)",
  ],
  jsx: jsx(
    "div",
    { className: "grid w-[248px] gap-2" },
    lines(
      jsx("ColorControl", {
        label: "Color",
        colors: "{colors}",
        labels: "{names}",
        value: "{color}",
        onValueChange: "{setColor}",
        onItemHover: "{setHovered}",
      }),
      jsx("p", { className: "m-0 text-ag-xs text-chrome-muted" }, "{names[hovered ?? color]}")
    )
  ),
}

/** The same props as the demo, as the code a page would hold. */
const colorCode = ({ start = 1, custom, force, ...props }: ColorDemoProps): Snippet => ({
  imports: [USE_STATE, ui("ColorControl"), ui("CANVAS_COLORS")],
  setup: [
    `const [colors, setColors] = useState(${custom ? '[...CANVAS_COLORS, "#ff5500"]' : "CANVAS_COLORS"})`,
    `const [color, setColor] = useState(${start})`,
  ],
  jsx: jsx("ColorControl", {
    colors: "{colors}",
    value: "{color}",
    onValueChange: "{setColor}",
    onColorsChange: "{(next, index) => {\n  setColors(next)\n  setColor(index)\n}}",
    defaultMode: props.defaultMode,
    defaultDraft: props.defaultDraft === "" ? '{""}' : props.defaultDraft,
    defaultInvalid: props.defaultInvalid,
    disabled: props.disabled,
    force: force && `{{ ${Object.entries(force).map(([key, value]) => `${key}: "${value}"`).join(", ")} }}`,
  }),
})

export function ColorPage(props: PageProps) {
  const state = (id: string, label: string, demo: ColorDemoProps, extra: { group?: string; note?: string } = {}) => ({
    id,
    label,
    ...extra,
    render: () => <ColorDemo {...demo} />,
    code: colorCode(demo),
  })
  return (
    <StatePage
      {...props}
      states={[
        state("interactive", "Interactive", { start: 1 }, {
          note: "Drag (with inertia), click, scroll or use the arrows. The + swaps the strip for a hex field; Enter or ✓ adds the color, which pops in like the dock's badge.",
        }),
        state("orange", "Orange (project)", { start: 6 }, { group: "Strip" }),
        state("custom", "Custom color", { custom: true, start: 7 }, { group: "Strip" }),
        state("focus", "Focus", { start: 3, force: { wheel: "focus" } }, { group: "Strip" }),
        state("disabled", "Disabled", { start: 1, disabled: true }, { group: "Strip" }),
        state("add-focus", "+ button focused", { start: 1, force: { add: "focus" } }, { group: "Strip" }),
        {
          id: "fixed",
          label: "Fixed colors",
          group: "Strip",
          note: "Without onColorsChange there's no +: the aspect picker's Color. \"\" is Not set, a dashed circle with a slash. onItemHover reports the swatch under a moving pointer (not while pressed), for previews; the line below shows it.",
          render: () => <FixedColorDemo />,
          code: fixedColorCode,
        },
        state("hex", "Open", { defaultMode: "hex", defaultDraft: "#F4F83B" }, { group: "Hex field" }),
        state("hex-empty", "Empty", { defaultMode: "hex", defaultDraft: "" }, { group: "Hex field" }),
        state("hex-invalid", "Invalid", { defaultMode: "hex", defaultDraft: "#ZZZ", defaultInvalid: true }, {
          group: "Hex field",
          note: "Red border and message; an invalid submit shakes (±3px, 250ms).",
        }),
      ]}
    />
  )
}
