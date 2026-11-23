import { useState, type ReactNode } from "react"
import {
  BORDERS,
  FONT_ROLES,
  ICON_FAMILIES,
  ICON_WEIGHTS,
  LETTER_SPACING,
  MOTIONS,
  NEUTRALS,
  PALETTE,
  RADII,
  SHADOWS,
  SPACING,
  STATUS,
  TYPE_SCALE,
  type NamedColor,
} from "../../lib/edit-data"
import { AdjustSlider } from "./AdjustSlider"
import { FontPicker } from "./FontPicker"
import { AddColorButton, HexRow } from "./HexField"
import { MotionField } from "./MotionField"
import { Segmented } from "./Segmented"
import { ShadowField } from "./ShadowField"
import { fieldRow, labelText } from "./styles"
import { TokenSelect } from "./TokenSelect"
import { CompactBar, CompactNumber, ValueField } from "./ValueField"

/** A titled group inside a section, like Palette or Neutrals. */
export function FieldGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0 [&+&]:mt-1">
      <legend className="mb-1 p-0 pl-[3px] font-chrome text-ag-xs font-medium text-chrome-muted">{legend}</legend>
      <div className="flex flex-col gap-2">{children}</div>
    </fieldset>
  )
}

const MAX_PALETTE = 8

export function ColorsSection() {
  const [palette, setPalette] = useState<NamedColor[]>(PALETTE)
  const [neutrals, setNeutrals] = useState(NEUTRALS)
  const [status, setStatus] = useState(STATUS)
  const update = (list: NamedColor[], index: number, hex: string) =>
    list.map((color, i) => (i === index ? { ...color, hex: hex.toUpperCase() } : color))

  return (
    <>
      <FieldGroup legend="Palette">
        {palette.map((color, index) => (
          <HexRow
            key={color.name}
            name={color.name}
            hex={color.hex}
            onHexChange={(hex) => setPalette((list) => update(list, index, hex))}
            onRemove={palette.length > 1 ? () => setPalette((list) => list.filter((_, i) => i !== index)) : undefined}
          />
        ))}
        <AddColorButton
          disabled={palette.length >= MAX_PALETTE}
          onClick={() =>
            setPalette((list) => [...list, { name: `Color ${list.length + 1}`, hex: "#A3A3A3" }])
          }
        />
      </FieldGroup>
      <FieldGroup legend="Neutrals">
        {neutrals.map((color, index) => (
          <HexRow key={color.name} name={color.name} hex={color.hex} onHexChange={(hex) => setNeutrals((list) => update(list, index, hex))} />
        ))}
      </FieldGroup>
      <FieldGroup legend="Status">
        {status.map((color, index) => (
          <HexRow key={color.name} name={color.name} hex={color.hex} onHexChange={(hex) => setStatus((list) => update(list, index, hex))} />
        ))}
      </FieldGroup>
    </>
  )
}

export function FontsSection() {
  const [roles, setRoles] = useState(FONT_ROLES)
  return roles.map((role, index) => (
    <FontPicker
      key={role.role}
      value={role}
      onValueChange={(next) => setRoles((list) => list.map((item, i) => (i === index ? next : item)))}
    />
  ))
}

const SCALE_KINDS = [
  { value: "body", label: "Body" },
  { value: "display", label: "Display" },
]

/** The type scale table: Size and Height for each step, edited in place. */
export function ScaleTable({ rows, onRowsChange, force }: { rows: typeof TYPE_SCALE; onRowsChange: (rows: typeof TYPE_SCALE) => void; force?: string }) {
  return (
    <table aria-label="Body scale values in pixels" className="-mt-1 w-full border-separate border-spacing-y-1.5">
      <thead>
        <tr>
          <th className="p-0 pl-[3px] text-left text-ag-xs font-medium text-chrome-muted">Unit</th>
          <th className="w-[136px] p-0">
            <span className="grid grid-cols-2 text-center text-ag-xs font-medium text-chrome-muted">
              <span>Size</span>
              <span>Height</span>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const set = (key: "size" | "height", value: number) =>
            onRowsChange(rows.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
          return (
            <tr key={row.unit}>
              <th className={`${labelText} p-0 text-left font-normal`}>{row.unit}</th>
              <td className="p-0">
                <CompactBar columns={2}>
                  <CompactNumber label={`Text ${row.unit} size`} value={row.size} onValueChange={(v) => set("size", v)} min={1} max={256} force={index === 0 ? force : undefined} />
                  <CompactNumber label={`Text ${row.unit} line height`} value={row.height} onValueChange={(v) => set("height", v)} min={1} max={256} />
                </CompactBar>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function TypeScaleSection() {
  const [kind, setKind] = useState("body")
  const [size, setSize] = useState(100)
  const [proportion, setProportion] = useState(1.44)
  const [rows, setRows] = useState(TYPE_SCALE)
  const scaled = (next: { size?: number; proportion?: number }) => {
    const s = (next.size ?? size) / 100
    const p = (next.proportion ?? proportion) / 1.44
    setRows(
      TYPE_SCALE.map((row, i) => {
        const value = Math.max(1, Math.round(row.size * s * Math.pow(p, i - 3)))
        return { ...row, size: value, height: Math.max(1, Math.round((row.height / row.size) * value)) }
      })
    )
  }
  return (
    <>
      <Segmented label="Type scale" variant="track" items={SCALE_KINDS} value={kind} onValueChange={setKind} />
      <div className="flex flex-col gap-2">
        <AdjustSlider label="Size" value={size} onValueChange={(v) => { setSize(v); scaled({ size: v }) }} min={75} max={150} step={5} display={(v) => `${v}%`} stops={9} />
        <AdjustSlider label="Proportion" value={proportion} onValueChange={(v) => { setProportion(v); scaled({ proportion: v }) }} min={1.14} max={1.6} step={0.01} display={(v) => `${v.toFixed(2)}×`} stops={9} />
      </div>
      <ScaleTable rows={rows} onRowsChange={setRows} />
    </>
  )
}

/** A scale slider that resizes a list of steps around their base values. */
function ScaledSteps({
  slider,
  steps,
  base,
  unit,
  fieldStep = 1,
  min = 0,
  max = 256,
  labelPrefix,
}: {
  slider?: { label: string; min: number; max: number; step: number; initial: number }
  steps: { unit: string; value: number }[]
  base?: number
  unit?: string
  fieldStep?: number
  min?: number
  max?: number
  labelPrefix: string
}) {
  const [scale, setScale] = useState(slider?.initial ?? 100)
  const [values, setValues] = useState(steps.map((step) => step.value))
  return (
    <>
      {slider && (
        <AdjustSlider
          label={slider.label}
          value={scale}
          onValueChange={(next) => {
            setScale(next)
            setValues(steps.map((step) => Math.round((step.value / (base ?? slider.initial)) * next)))
          }}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          display={(v) => `${v}%`}
          stops={9}
        />
      )}
      {steps.map((step, index) => (
        <ValueField
          key={step.unit}
          label={step.unit}
          ariaLabel={`${labelPrefix} ${step.unit}`}
          unit={unit}
          value={values[index]}
          onValueChange={(next) => setValues((list) => list.map((v, i) => (i === index ? next : v)))}
          min={min}
          max={max}
          step={fieldStep}
        />
      ))}
    </>
  )
}

export function SpacingSection() {
  return (
    <ScaledSteps
      labelPrefix="Spacing"
      slider={{ label: "Spacing", min: 40, max: 150, step: 5, initial: 110 }}
      steps={SPACING}
    />
  )
}

export function LetterSpacingSection() {
  return <ScaledSteps labelPrefix="Letter spacing" steps={LETTER_SPACING} unit="%" fieldStep={0.5} min={-100} max={100} />
}

export function CornersSection() {
  return (
    <ScaledSteps
      labelPrefix="Radius"
      slider={{ label: "Roundness", min: 0, max: 200, step: 5, initial: 100 }}
      steps={RADII}
    />
  )
}

export function BordersSection() {
  return <ScaledSteps labelPrefix="Border" steps={BORDERS} max={32} />
}

export function ShadowsSection() {
  const [shadows, setShadows] = useState(SHADOWS)
  return shadows.map((shadow, index) => (
    <ShadowField
      key={shadow.id}
      shadow={shadow}
      onShadowChange={(next) => setShadows((list) => list.map((item, i) => (i === index ? next : item)))}
    />
  ))
}

const ICON_STYLES = [
  { value: "filled", label: "Filled" },
  { value: "outline", label: "Outline" },
]

export function IconsSection() {
  const [family, setFamily] = useState("Central")
  const [style, setStyle] = useState("outline")
  const [weight, setWeight] = useState(1)
  return (
    <>
      <TokenSelect label="Family" ariaLabel="Icon family" options={ICON_FAMILIES} value={family} onValueChange={setFamily} />
      <div className={fieldRow}>
        <span className={labelText}>Style</span>
        <Segmented label="Icon style" items={ICON_STYLES} value={style} onValueChange={setStyle} />
      </div>
      <AdjustSlider
        label="Weight"
        ariaLabel="Icon weight"
        value={weight}
        onValueChange={setWeight}
        min={0}
        max={2}
        step={1}
        display={(v) => ICON_WEIGHTS[v] ?? String(v)}
        stops={3}
      />
    </>
  )
}

export function MotionSection() {
  const [motions, setMotions] = useState(MOTIONS)
  return (
    <div className="flex flex-col gap-2">
      {motions.map((motion, index) => (
        <MotionField
          key={motion.id}
          motion={motion}
          onMotionChange={(next) => setMotions((list) => list.map((item, i) => (i === index ? next : item)))}
        />
      ))}
    </div>
  )
}

const BODIES: Record<string, () => ReactNode> = {
  colors: () => <ColorsSection />,
  fonts: () => <FontsSection />,
  scale: () => <TypeScaleSection />,
  spacing: () => <SpacingSection />,
  letterSpacing: () => <LetterSpacingSection />,
  corners: () => <CornersSection />,
  borders: () => <BordersSection />,
  shadows: () => <ShadowsSection />,
  icons: () => <IconsSection />,
  motion: () => <MotionSection />,
}

/** The content of one Edit section. */
export function EditSectionBody({ id }: { id: string }) {
  return BODIES[id]?.() ?? null
}
