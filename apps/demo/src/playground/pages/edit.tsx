import { useState } from "react"
import { AddColorButton, AdjustSlider, BackButton, ColorSelect, ColorsSection, EDIT_SECTIONS, EditSectionBody, EditSections, FieldGroup, fieldRow, FONT_ROLES, FontPicker, type FontRole, FontWeights, HexRow, ICON_FAMILIES, ICON_WEIGHTS, ImportThemeButton, labelText, type Motion, MotionField, MOTIONS, PanelTitle, ScaleTable, Segmented, type Shadow, SHADOW_POSITIONS, ShadowField, SHADOWS, TokenSelect, TYPE_SCALE, TypeScaleSection, ValueField } from "surfacent-ui"
import { Frozen, MenuRoom, PanelFrame, PopupRoom } from "../shell/frames"
import { StatePage } from "../shell/StatePage"
import type { PageProps } from "../shell/types"
import { jsx, lines, ui, uiType, USE_STATE, type ImportLine, type PropValue, type Snippet } from "../snippet"

const snippet = (imports: ImportLine[], code: string, setup?: string[]): Snippet => ({ imports, jsx: code, setup })

/** An object prop as source: `{{ trigger: "hover", toggle: "hover" }}`. */
const objectSource = (value: Record<string, string | undefined>) =>
  `{{ ${Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .map(([key, item]) => `${key}: "${item}"`)
    .join(", ")} }}`

/* Edit sections */

const sectionsCode = (props: Record<string, PropValue>, body = false): Snippet =>
  snippet(
    [
      ui("EditSections"),
      ...(props.sections ? [ui("EDIT_SECTIONS")] : []),
      ...(body ? [ui("EditSectionBody")] : []),
    ],
    jsx("EditSections", {
      ...props,
      renderPanel: body ? "{(section) => <EditSectionBody id={section.id} />}" : undefined,
    })
  )

export function EditSectionsPage(props: PageProps) {
  const few = EDIT_SECTIONS.slice(0, 3)
  const firstThree = "{EDIT_SECTIONS.slice(0, 3)}"
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "closed",
          label: "Closed",
          note: "A nav link: 13px at 50%, brighter on hover. The chevron turns 90° in 250ms.",
          render: () => <EditSections sections={few} />,
          code: sectionsCode({ sections: firstThree }),
        },
        {
          id: "focus",
          label: "Trigger focused",
          render: () => <EditSections sections={few} force={{ id: "fonts", state: "focus" }} />,
          code: sectionsCode({ sections: firstThree, force: '{{ id: "fonts", state: "focus" }}' }),
        },
        {
          id: "open",
          label: "Open",
          note: "The panel opens in 300ms cubic-bezier(.16,1,.3,1).",
          render: () => (
            <EditSections
              sections={EDIT_SECTIONS.slice(5, 8)}
              defaultValue={["borders"]}
              renderPanel={(section) => <EditSectionBody id={section.id} />}
            />
          ),
          code: sectionsCode({ sections: "{EDIT_SECTIONS.slice(5, 8)}", defaultValue: '{["borders"]}' }, true),
        },
        {
          id: "disabled",
          label: "Disabled · preview",
          render: () => <EditSections sections={few} disabled />,
          code: sectionsCode({ sections: firstThree, disabled: true }),
        },
        {
          id: "all",
          label: "Full list",
          note: "All 10 sections, each with the real controls.",
          render: () => <EditSections renderPanel={(section) => <EditSectionBody id={section.id} />} />,
          code: sectionsCode({}, true),
        },
      ]}
    />
  )
}

/* Import theme */

const importButton = ui("ImportThemeButton")

export function ImportThemePage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "header",
          label: "Header",
          note: "In projects, the Edit page gets the import button on the right.",
          render: () => (
            <div className="flex h-6 items-center gap-1">
              <BackButton />
              <PanelTitle>Edit Untitled</PanelTitle>
              <ImportThemeButton />
            </div>
          ),
          code: snippet(
            [ui("BackButton", "PanelTitle"), importButton],
            jsx(
              "div",
              { className: "flex h-6 items-center gap-1" },
              lines(jsx("BackButton"), jsx("PanelTitle", {}, "Edit Untitled"), jsx("ImportThemeButton"))
            )
          ),
        },
        {
          id: "hover",
          label: "Hover",
          render: () => <ImportThemeButton force="hover" />,
          code: snippet([importButton], jsx("ImportThemeButton", { force: "hover" })),
        },
        {
          id: "open",
          label: "Open",
          frame: "bare",
          note: "A drop zone for a file or a folder, and the Choose file / Choose folder buttons. Pinned open and drawn in place.",
          render: () => (
            <PopupRoom height={230}>
              <PanelFrame>
                <div className="relative ml-auto flex h-6 w-[22px] items-center">
                  <ImportThemeButton pinnedOpen />
                </div>
              </PanelFrame>
            </PopupRoom>
          ),
          code: snippet([importButton], jsx("ImportThemeButton", { pinnedOpen: true })),
        },
      ]}
    />
  )
}

/* Number field */

function CompactWeights({ force }: { force?: string }) {
  const [weights, setWeights] = useState<FontRole["weights"]>({ regular: 400, medium: 500, heavy: 700 })
  return <FontWeights role="Body" weights={weights} onWeightsChange={setWeights} force={force} />
}

function ScaleTableDemo() {
  const [rows, setRows] = useState(TYPE_SCALE.slice(0, 4))
  return <ScaleTable rows={rows} onRowsChange={setRows} force="hover" />
}

const valueCode = (props: Record<string, PropValue>) =>
  snippet([ui("ValueField")], jsx("ValueField", props))

const weightsCode = (force?: string) =>
  snippet(
    [USE_STATE, ui("FontWeights"), uiType("FontRole")],
    jsx("FontWeights", { role: "Body", weights: "{weights}", onWeightsChange: "{setWeights}", force }),
    ['const [weights, setWeights] = useState<FontRole["weights"]>({ regular: 400, medium: 500, heavy: 700 })']
  )

export function NumberFieldPage(props: PageProps) {
  const spacingM = { label: "M", ariaLabel: "Spacing M", defaultValue: 18, min: 0, max: 256 }
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "default",
          label: "Default",
          note: "The steppers show on hover or with focus; ↑/↓, Page Up/Down and the wheel change the value too, clamped and snapped to the step.",
          render: () => <ValueField {...spacingM} />,
          code: valueCode(spacingM),
        },
        {
          id: "hover",
          label: "Hover · steppers",
          render: () => <ValueField {...spacingM} force="hover" />,
          code: valueCode({ ...spacingM, force: "hover" }),
        },
        {
          id: "focus",
          label: "Focus",
          render: () => <ValueField {...spacingM} force="focus" />,
          code: valueCode({ ...spacingM, force: "focus" }),
        },
        {
          id: "limit",
          label: "At the limit",
          note: "At the minimum, the down stepper is off.",
          render: () => <ValueField label="XXS" ariaLabel="Spacing XXS" defaultValue={0} min={0} max={256} force="hover" />,
          code: valueCode({ label: "XXS", ariaLabel: "Spacing XXS", defaultValue: 0, min: 0, max: 256, force: "hover" }),
        },
        {
          id: "disabled",
          label: "Disabled",
          render: () => <ValueField label="L" ariaLabel="Border L" defaultValue={2} disabled />,
          code: valueCode({ label: "L", ariaLabel: "Border L", defaultValue: 2, disabled: true }),
        },
        {
          id: "percent",
          label: "%",
          group: "Unit",
          render: () => <ValueField label="XS" ariaLabel="Letter spacing XS" unit="%" defaultValue={-1.5} min={-100} max={100} step={0.5} />,
          code: valueCode({ label: "XS", ariaLabel: "Letter spacing XS", unit: "%", defaultValue: -1.5, min: -100, max: 100, step: 0.5 }),
        },
        {
          id: "ms",
          label: "ms",
          group: "Unit",
          render: () => <ValueField label="Duration" unit="ms" defaultValue={150} min={0} max={5000} step={25} />,
          code: valueCode({ label: "Duration", unit: "ms", defaultValue: 150, min: 0, max: 5000, step: 25 }),
        },
        {
          id: "px",
          label: "px",
          group: "Unit",
          render: () => <ValueField label="Blur" unit="px" defaultValue={24} min={0} max={256} step={0.5} />,
          code: valueCode({ label: "Blur", unit: "px", defaultValue: 24, min: 0, max: 256, step: 0.5 }),
        },
        { id: "weights", label: "Weights", group: "Compact", render: () => <CompactWeights />, code: weightsCode() },
        {
          id: "weights-hover",
          label: "Weights · first cell hovered",
          group: "Compact",
          note: "The steppers stack on the right and the divider slides aside.",
          render: () => <CompactWeights force="hover" />,
          code: weightsCode("hover"),
        },
        {
          id: "table",
          label: "Scale table",
          group: "Compact",
          render: () => <ScaleTableDemo />,
          code: snippet(
            [USE_STATE, ui("ScaleTable"), ui("TYPE_SCALE")],
            jsx("ScaleTable", { rows: "{rows}", onRowsChange: "{setRows}", force: "hover" }),
            ["const [rows, setRows] = useState(TYPE_SCALE.slice(0, 4))"]
          ),
        },
      ]}
    />
  )
}

/* Slider */

const percent = (v: number) => `${v}%`
const PERCENT = "{(v) => `${v}%`}"

const sliderCode = (props: Record<string, PropValue>, imports: ImportLine[] = []) =>
  snippet([ui("AdjustSlider"), ...imports], jsx("AdjustSlider", props))

export function SliderPage(props: PageProps) {
  const size = { label: "Size", defaultValue: 100, min: 75, max: 150, step: 5, display: PERCENT, stops: 9 }
  const bounce = { label: "Bounce", defaultValue: 20, min: 0, max: 100, display: PERCENT, stops: 9 }
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "spacing",
          label: "Spacing · 110%",
          note: "Drag, click the track or use the arrows (Shift for bigger steps). The thumb grows 5% while dragging.",
          render: () => <AdjustSlider label="Spacing" defaultValue={110} min={40} max={150} step={5} display={percent} stops={9} />,
          code: sliderCode({ label: "Spacing", defaultValue: 110, min: 40, max: 150, step: 5, display: PERCENT, stops: 9 }),
        },
        {
          id: "roundness",
          label: "Roundness · 100%",
          render: () => <AdjustSlider label="Roundness" defaultValue={100} min={0} max={200} step={5} display={percent} stops={9} />,
          code: sliderCode({ label: "Roundness", defaultValue: 100, min: 0, max: 200, step: 5, display: PERCENT, stops: 9 }),
        },
        {
          id: "proportion",
          label: "Proportion · 1.44×",
          render: () => (
            <AdjustSlider label="Proportion" defaultValue={1.44} min={1.14} max={1.6} step={0.01} display={(v) => `${v.toFixed(2)}×`} stops={9} />
          ),
          code: sliderCode({
            label: "Proportion",
            defaultValue: 1.44,
            min: 1.14,
            max: 1.6,
            step: 0.01,
            display: "{(v) => `${v.toFixed(2)}×`}",
            stops: 9,
          }),
        },
        {
          id: "weight",
          label: "Weight · 3 steps",
          render: () => (
            <AdjustSlider label="Weight" ariaLabel="Icon weight" defaultValue={1} min={0} max={2} step={1} display={(v) => ICON_WEIGHTS[v]} stops={3} />
          ),
          code: sliderCode(
            {
              label: "Weight",
              ariaLabel: "Icon weight",
              defaultValue: 1,
              min: 0,
              max: 2,
              step: 1,
              display: "{(v) => ICON_WEIGHTS[v]}",
              stops: 3,
            },
            [ui("ICON_WEIGHTS")]
          ),
        },
        {
          id: "opacity",
          label: "Opacity · 0%",
          render: () => <AdjustSlider label="Opacity" defaultValue={0} min={0} max={100} display={percent} stops={9} />,
          code: sliderCode({ label: "Opacity", defaultValue: 0, min: 0, max: 100, display: PERCENT, stops: 9 }),
        },
        {
          id: "focus",
          label: "Focus",
          group: "Interaction",
          render: () => <AdjustSlider label="Bounce" defaultValue={20} min={0} max={100} display={percent} stops={9} force="focus" />,
          code: sliderCode({ ...bounce, force: "focus" }),
        },
        {
          id: "pressed",
          label: "Pressed",
          group: "Interaction",
          render: () => <AdjustSlider label="Size" defaultValue={100} min={75} max={150} step={5} display={percent} stops={9} force="active" />,
          code: sliderCode({ ...size, force: "active" }),
        },
        {
          id: "disabled",
          label: "Disabled",
          group: "Interaction",
          render: () => (
            <AdjustSlider label="Padding" defaultValue={3} min={0} max={7} display={(v) => ["0", "XXS", "XS", "S", "M", "L", "XL", "XXL"][v]} disabled />
          ),
          code: sliderCode({
            label: "Padding",
            defaultValue: 3,
            min: 0,
            max: 7,
            display: '{(v) => ["0", "XXS", "XS", "S", "M", "L", "XL", "XXL"][v]}',
            disabled: true,
          }),
        },
      ]}
    />
  )
}

/* Segmented control */

const SCALE_KINDS = [
  { value: "body", label: "Body" },
  { value: "display", label: "Display" },
]
const ICON_STYLES = [
  { value: "filled", label: "Filled" },
  { value: "outline", label: "Outline" },
]
const MOTION_TYPES = [
  { value: "easing", label: "Easing" },
  { value: "spring", label: "Spring" },
]
const FORMATS = [
  { value: "hex", label: "Hex" },
  { value: "oklch", label: "OKLCH" },
  { value: "p3", label: "Display P3" },
]

/** An items array as source: `{[{ value: "body", label: "Body" }, …]}`. */
const itemsSource = (items: { value: string; label: string }[]) =>
  `{[${items.map((item) => `{ value: "${item.value}", label: "${item.label}" }`).join(", ")}]}`

const segmentedImport = ui("Segmented")

/** A segmented control in a field row, its label on the left. */
const fieldRowCode = (label: string, props: Record<string, PropValue>) =>
  snippet(
    [segmentedImport, ui("fieldRow", "labelText")],
    jsx("div", { className: "{fieldRow}" }, lines(jsx("span", { className: "{labelText}" }, label), jsx("Segmented", props)))
  )

export function SegmentedPage(props: PageProps) {
  const iconStyle = { label: "Icon style", items: itemsSource(ICON_STYLES), defaultValue: "outline" }
  const scale = (value: string) =>
    snippet([segmentedImport], jsx("Segmented", { label: "Type scale", variant: "track", items: itemsSource(SCALE_KINDS), defaultValue: value }))
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "body",
          label: "Body",
          group: "Track",
          note: "The pill (white at 15%) slides to the checked option in 200ms; arrows move and check.",
          render: () => <Segmented label="Type scale" variant="track" items={SCALE_KINDS} defaultValue="body" />,
          code: scale("body"),
        },
        {
          id: "display",
          label: "Display",
          group: "Track",
          render: () => <Segmented label="Type scale" variant="track" items={SCALE_KINDS} defaultValue="display" />,
          code: scale("display"),
        },
        {
          id: "outline",
          label: "Outline",
          group: "Field",
          render: () => (
            <div className={fieldRow}>
              <span className={labelText}>Style</span>
              <Segmented label="Icon style" items={ICON_STYLES} defaultValue="outline" />
            </div>
          ),
          code: fieldRowCode("Style", iconStyle),
        },
        {
          id: "hover",
          label: "Hover on Filled",
          group: "Field",
          render: () => (
            <div className={fieldRow}>
              <span className={labelText}>Style</span>
              <Segmented label="Icon style" items={ICON_STYLES} defaultValue="outline" force={{ value: "filled", state: "hover" }} />
            </div>
          ),
          code: fieldRowCode("Style", { ...iconStyle, force: objectSource({ value: "filled", state: "hover" }) }),
        },
        {
          id: "focus",
          label: "Focus on Spring",
          group: "Field",
          render: () => (
            <div className={fieldRow}>
              <span className={labelText}>Type</span>
              <Segmented label="Motion type" items={MOTION_TYPES} defaultValue="easing" force={{ value: "spring", state: "focus" }} />
            </div>
          ),
          code: fieldRowCode("Type", {
            label: "Motion type",
            items: itemsSource(MOTION_TYPES),
            defaultValue: "easing",
            force: objectSource({ value: "spring", state: "focus" }),
          }),
        },
        {
          id: "three",
          label: "Three options",
          group: "Field",
          render: () => <Segmented label="Color format" items={FORMATS} defaultValue="oklch" className="w-full" />,
          code: snippet(
            [segmentedImport],
            jsx("Segmented", { label: "Color format", items: itemsSource(FORMATS), defaultValue: "oklch", className: "w-full" })
          ),
        },
      ]}
    />
  )
}

/* Token select */

const tokenSelectCode = (props: Record<string, PropValue>, list: "ICON_FAMILIES" | "SHADOW_POSITIONS" = "ICON_FAMILIES") =>
  snippet([ui("TokenSelect"), ui(list)], jsx("TokenSelect", props))

export function TokenSelectPage(props: PageProps) {
  const family = { label: "Family", ariaLabel: "Icon family", options: "{ICON_FAMILIES}", defaultValue: "Central" }
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "default",
          label: "Default",
          note: "The whole row is the trigger; the value is a dropdown button. Typing searches, arrows move.",
          render: () => <TokenSelect label="Family" ariaLabel="Icon family" options={ICON_FAMILIES} defaultValue="Central" />,
          code: tokenSelectCode(family),
        },
        {
          id: "hover",
          label: "Hover",
          render: () => <TokenSelect label="Family" ariaLabel="Icon family" options={ICON_FAMILIES} defaultValue="Central" force="hover" />,
          code: tokenSelectCode({ ...family, force: "hover" }),
        },
        {
          id: "focus",
          label: "Focus",
          render: () => <TokenSelect label="Family" ariaLabel="Icon family" options={ICON_FAMILIES} defaultValue="Central" force="focus" />,
          code: tokenSelectCode({ ...family, force: "focus" }),
        },
        {
          id: "open-meta",
          label: "With meta",
          group: "Open menu",
          note: "24px items, the chosen one in blue, with meta on the right (Free, Licensed). Pinned open.",
          render: () => (
            <>
              <TokenSelect label="Family" ariaLabel="Icon family (open)" options={ICON_FAMILIES} defaultValue="Central" pinned />
              <MenuRoom height={140} />
            </>
          ),
          code: tokenSelectCode({ ...family, ariaLabel: "Icon family (open)", pinned: true }),
        },
        {
          id: "open",
          label: "Without meta",
          group: "Open menu",
          render: () => (
            <>
              <TokenSelect label="Position" ariaLabel="Shadow position (open)" options={SHADOW_POSITIONS} defaultValue="outer" pinned />
              <MenuRoom height={80} />
            </>
          ),
          code: tokenSelectCode(
            { label: "Position", ariaLabel: "Shadow position (open)", options: "{SHADOW_POSITIONS}", defaultValue: "outer", pinned: true },
            "SHADOW_POSITIONS"
          ),
        },
      ]}
    />
  )
}

/* Hex field */

function LiveHex(props: {
  name: string
  hex: string
  onRemove?: () => void
  force?: string
  pinnedOpen?: boolean
  help?: string
  modified?: boolean
  space?: "hsl" | "oklch"
  opacities?: boolean
}) {
  const [hex, setHex] = useState(props.hex)
  return <HexRow {...props} hex={hex} onHexChange={setHex} />
}

const hexImport = ui("HexRow")

const hexCode = (start: string, { name, ...props }: Record<string, PropValue>) =>
  snippet([USE_STATE, hexImport], jsx("HexRow", { name, hex: "{hex}", onHexChange: "{setHex}", ...props }), [
    `const [hex, setHex] = useState("${start}")`,
  ])

export function HexFieldPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "default",
          label: "Default",
          note: "The field opens the color picker (format, area, hue, value and opacities).",
          render: () => <LiveHex name="Neutral 1" hex="#FFFFFF" />,
          code: hexCode("#FFFFFF", { name: "Neutral 1" }),
        },
        {
          id: "hover",
          label: "Hover · remove",
          note: "Palette colors show × on hover; the field shrinks to make room.",
          render: () => <LiveHex name="Color 1" hex="#FFA344" onRemove={() => {}} force="hover" />,
          code: hexCode("#FFA344", { name: "Color 1", onRemove: "{() => {}}", force: "hover" }),
        },
        {
          id: "focus",
          label: "Focus",
          render: () => <LiveHex name="Color 2" hex="#00C9BB" force="focus" />,
          code: hexCode("#00C9BB", { name: "Color 2", force: "focus" }),
        },
        {
          id: "setting",
          label: "Color setting",
          note: "A single color made of settings, like the Surface panel's Accent: no opacities, picked in OKLCH over the colors the screen can show, typed as hex, OKLCH or Display P3. Blue once modified.",
          render: () => <LiveHex name="Accent" hex="oklch(0.58 0.19 262)" help="The brand color." space="oklch" opacities={false} modified />,
          code: hexCode("oklch(0.58 0.19 262)", { name: "Accent", help: "The brand color.", space: "oklch", opacities: false, modified: true }),
        },
        {
          id: "open",
          label: "Picker open",
          frame: "bare",
          note: "Pinned open and drawn in place, beside the panel.",
          render: () => (
            <PopupRoom width={268} height={330}>
              <PanelFrame>
                <LiveHex name="Color 1" hex="#FFA344" pinnedOpen />
              </PanelFrame>
            </PopupRoom>
          ),
          code: hexCode("#FFA344", { name: "Color 1", pinnedOpen: true }),
        },
        {
          id: "group",
          label: "Field group",
          render: () => (
            <FieldGroup legend="Status">
              <LiveHex name="Success" hex="#76EF6B" />
              <LiveHex name="Warning" hex="#FFA344" />
            </FieldGroup>
          ),
          code: snippet(
            [USE_STATE, hexImport, ui("FieldGroup")],
            jsx(
              "FieldGroup",
              { legend: "Status" },
              lines(
                jsx("HexRow", { name: "Success", hex: "{success}", onHexChange: "{setSuccess}" }),
                jsx("HexRow", { name: "Warning", hex: "{warning}", onHexChange: "{setWarning}" })
              )
            ),
            ['const [success, setSuccess] = useState("#76EF6B")', 'const [warning, setWarning] = useState("#FFA344")']
          ),
        },
        {
          id: "section",
          label: "Colors section",
          note: "Palette, Neutrals and Status, as on the Edit page.",
          render: () => <ColorsSection />,
          code: snippet([ui("ColorsSection")], jsx("ColorsSection")),
        },
      ]}
    />
  )
}

/* Add color */

const addColorCode = (props: Record<string, PropValue>) =>
  snippet([ui("AddColorButton")], jsx("AddColorButton", props))

export function AddColorPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "default",
          label: "Default",
          note: "A dashed toggle.",
          render: () => <AddColorButton />,
          code: addColorCode({}),
        },
        { id: "hover", label: "Hover", render: () => <AddColorButton force="hover" />, code: addColorCode({ force: "hover" }) },
        { id: "focus", label: "Focus", render: () => <AddColorButton force="focus" />, code: addColorCode({ force: "focus" }) },
        {
          id: "disabled",
          label: "Disabled",
          note: "The palette already has 8 colors.",
          render: () => <AddColorButton disabled />,
          code: addColorCode({ disabled: true }),
        },
      ]}
    />
  )
}

/* Color + opacity */

function LiveColorSelect() {
  const [color, setColor] = useState("Neutral 10")
  const [opacity, setOpacity] = useState("100")
  return <ColorSelect label="Color" ariaLabel="Fill" color={color} onColorChange={setColor} opacity={opacity} onOpacityChange={setOpacity} />
}

/** A fixed color select: the handlers do nothing, as in the preview. */
const colorSelectCode = ({ opacity, ...props }: Record<string, PropValue>) =>
  snippet(
    [ui("ColorSelect")],
    jsx("ColorSelect", { ...props, onColorChange: "{() => {}}", opacity, onOpacityChange: "{() => {}}" })
  )

export function ColorSelectPage(props: PageProps) {
  const noop = () => {}
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "interactive",
          label: "Interactive",
          note: "Fill, Stroke and Shadow use a color select joined to an opacity select; None turns the opacity off.",
          render: () => <LiveColorSelect />,
          code: snippet(
            [USE_STATE, ui("ColorSelect")],
            jsx("ColorSelect", {
              label: "Color",
              ariaLabel: "Fill",
              color: "{color}",
              onColorChange: "{setColor}",
              opacity: "{opacity}",
              onOpacityChange: "{setOpacity}",
            }),
            ['const [color, setColor] = useState("Neutral 10")', 'const [opacity, setOpacity] = useState("100")']
          ),
        },
        {
          id: "none",
          label: "None · opacity off",
          render: () => <ColorSelect label="Color" ariaLabel="Stroke color" color="None" onColorChange={noop} opacity="100" onOpacityChange={noop} />,
          code: colorSelectCode({ label: "Color", ariaLabel: "Stroke color", color: "None", opacity: "100" }),
        },
        {
          id: "hover",
          label: "Hover · focus",
          render: () => (
            <ColorSelect
              label="Color"
              ariaLabel="Fill (hover)"
              color="Color 1"
              onColorChange={noop}
              opacity="40"
              onOpacityChange={noop}
              force={{ color: "hover", opacity: "focus" }}
            />
          ),
          code: colorSelectCode({
            label: "Color",
            ariaLabel: "Fill (hover)",
            color: "Color 1",
            opacity: "40",
            force: objectSource({ color: "hover", opacity: "focus" }),
          }),
        },
        {
          id: "color-menu",
          label: "Color menu",
          group: "Open",
          note: "Swatches: the chosen one shrinks inside a ring of its own color. Pinned open.",
          render: () => (
            <>
              <MenuRoom height={236} />
              <ColorSelect label="" ariaLabel="Shadow color (open)" color="Neutral 10" onColorChange={noop} opacity="100" onOpacityChange={noop} pinned="color" />
            </>
          ),
          code: colorSelectCode({ label: "", ariaLabel: "Shadow color (open)", color: "Neutral 10", opacity: "100", pinned: "color" }),
        },
        {
          id: "opacity-menu",
          label: "Opacity menu",
          group: "Open",
          render: () => (
            <>
              <ColorSelect label="Color" ariaLabel="Fill opacity (open)" color="Color 3" onColorChange={noop} opacity="40" onOpacityChange={noop} pinned="opacity" />
              <MenuRoom height={90} />
            </>
          ),
          code: colorSelectCode({ label: "Color", ariaLabel: "Fill opacity (open)", color: "Color 3", opacity: "40", pinned: "opacity" }),
        },
      ]}
    />
  )
}

/* Font */

type FontDemo = {
  index?: number
  force?: { trigger?: string; toggle?: string }
  defaultWeightsOpen?: boolean
  pinnedMenu?: boolean
  defaultSource?: "curated" | "google" | "custom"
  defaultQuery?: string
}

function LiveFont({ index = 1, ...rest }: FontDemo) {
  const [role, setRole] = useState(FONT_ROLES[index])
  return <FontPicker value={role} onValueChange={setRole} {...rest} />
}

const fontCode = ({ index = 1, force, ...props }: FontDemo) =>
  snippet(
    [USE_STATE, ui("FontPicker"), ui("FONT_ROLES")],
    jsx("FontPicker", { value: "{role}", onValueChange: "{setRole}", ...props, force: force && objectSource(force) }),
    [`const [role, setRole] = useState(FONT_ROLES[${index}])`]
  )

export function FontPage(props: PageProps) {
  const font = (id: string, label: string, demo: FontDemo, extra: { group?: string; note?: string } = {}) => ({
    id,
    label,
    ...extra,
    render: () =>
      demo.pinnedMenu ? (
        <>
          <Frozen>
            <LiveFont {...demo} />
          </Frozen>
          <MenuRoom height={370} />
        </>
      ) : (
        <LiveFont {...demo} />
      ),
    code: fontCode(demo),
  })
  return (
    <StatePage
      {...props}
      states={[
        font("default", "Default", { index: 0 }, {
          note: "Each role (Data, Body, Display) opens a menu with the list's source, search, and every family rendered in its own face. The button beside it reveals the weights.",
        }),
        font("hover", "Hover", { force: { trigger: "hover", toggle: "hover" } }),
        font("focus", "Focus", { force: { trigger: "focus" } }),
        font("weights", "Weights open", { defaultWeightsOpen: true }),
        font("curated", "Curated", { pinnedMenu: true }, { group: "Menu", note: "Pinned open." }),
        font("google", "Google", { pinnedMenu: true, defaultSource: "google" }, { group: "Menu" }),
        font("no-results", "Search with no results", { pinnedMenu: true, defaultQuery: "zzzz" }, { group: "Menu" }),
        font("custom", "Custom · upload", { pinnedMenu: true, defaultSource: "custom" }, { group: "Menu" }),
        {
          id: "scale",
          label: "Type Scale section",
          group: "Section",
          render: () => <TypeScaleSection />,
          code: snippet([ui("TypeScaleSection")], jsx("TypeScaleSection")),
        },
      ]}
    />
  )
}

/* Shadow */

function LiveShadow(props: { index?: number; force?: string; pinnedOpen?: boolean }) {
  const { index = 1, ...rest } = props
  const [shadow, setShadow] = useState<Shadow>(SHADOWS[index])
  return <ShadowField shadow={shadow} onShadowChange={setShadow} {...rest} />
}

const shadowCode = (index: number, props: Record<string, PropValue>) =>
  snippet(
    [USE_STATE, ui("ShadowField"), ui("SHADOWS"), uiType("Shadow")],
    jsx("ShadowField", { shadow: "{shadow}", onShadowChange: "{setShadow}", ...props }),
    [`const [shadow, setShadow] = useState<Shadow>(SHADOWS[${index}])`]
  )

export function ShadowPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "default",
          label: "Default",
          note: "Each row opens a popover to the left: position, style, color, opacity and X/Y/Blur/Spread.",
          render: () => <LiveShadow index={0} />,
          code: shadowCode(0, {}),
        },
        { id: "hover", label: "Hover", render: () => <LiveShadow force="hover" />, code: shadowCode(1, { force: "hover" }) },
        {
          id: "open",
          label: "Popover open",
          frame: "bare",
          note: "Pinned open and drawn in place, beside the panel.",
          render: () => (
            <PopupRoom height={440}>
              <PanelFrame>
                <LiveShadow pinnedOpen />
              </PanelFrame>
            </PopupRoom>
          ),
          code: shadowCode(1, { pinnedOpen: true }),
        },
      ]}
    />
  )
}

/* Motion */

function LiveMotion(props: { motion: Motion; force?: string; pinnedOpen?: boolean }) {
  const [motion, setMotion] = useState(props.motion)
  return <MotionField motion={motion} onMotionChange={setMotion} force={props.force} pinnedOpen={props.pinnedOpen} />
}

const motionCode = (start: string, props: Record<string, PropValue>) =>
  snippet(
    [USE_STATE, ui("MotionField"), ui("MOTIONS"), uiType("Motion")],
    jsx("MotionField", { motion: "{motion}", onMotionChange: "{setMotion}", ...props }),
    [`const [motion, setMotion] = useState<Motion>(${start})`]
  )

const openMotion = (motion: Motion, height: number) => (
  <PopupRoom height={height}>
    <PanelFrame>
      <LiveMotion motion={motion} pinnedOpen />
    </PanelFrame>
  </PopupRoom>
)

export function MotionPage(props: PageProps) {
  return (
    <StatePage
      {...props}
      states={[
        {
          id: "default",
          label: "Default",
          note: "Easing with a draggable curve (handles, arrows, Esc cancels) or Spring with Bounce, and a preview that plays the motion.",
          render: () => <LiveMotion motion={MOTIONS[0]} />,
          code: motionCode("MOTIONS[0]", {}),
        },
        {
          id: "hover",
          label: "Hover",
          render: () => <LiveMotion motion={MOTIONS[1]} force="hover" />,
          code: motionCode("MOTIONS[1]", { force: "hover" }),
        },
        {
          id: "easing",
          label: "Easing",
          group: "Popover open",
          frame: "bare",
          note: "Pinned open and drawn in place, beside the panel.",
          render: () => openMotion(MOTIONS[0], 450),
          code: motionCode("MOTIONS[0]", { pinnedOpen: true }),
        },
        {
          id: "spring",
          label: "Spring",
          group: "Popover open",
          frame: "bare",
          render: () => openMotion({ ...MOTIONS[0], type: "spring" }, 470),
          code: motionCode('{ ...MOTIONS[0], type: "spring" }', { pinnedOpen: true }),
        },
        {
          id: "drawer",
          label: "Large · drawer",
          group: "Popover open",
          frame: "bare",
          render: () => openMotion(MOTIONS[1], 450),
          code: motionCode("MOTIONS[1]", { pinnedOpen: true }),
        },
      ]}
    />
  )
}
