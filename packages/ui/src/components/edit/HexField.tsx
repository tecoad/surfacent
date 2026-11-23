import { Button } from "@ui-sdk/react/button"
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerAreaCanvas,
  ColorPickerAreaThumb,
  ColorPickerInput,
  ColorPickerSlider,
  ColorPickerSliderThumb,
  ColorPickerSwatch,
} from "@ui-sdk/react/color-picker"
import {
  NumberInput,
  NumberInputControl,
  NumberInputGroup,
} from "@ui-sdk/react/number-input"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/react/popover"
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from "@ui-sdk/react/slider"
import { Plus, X } from "lucide-react"
import { useState, type ReactNode } from "react"
import { formatAs, toHex } from "../../lib/color"
import { cx } from "../../lib/cx"
import { InfoTip } from "../controls/InfoTip"
import { Segmented } from "./Segmented"
import { ScrollArea } from "../ScrollArea"
import { fieldWell, labelText, pickerBody, pickerPopup, popupTitle } from "./styles"

/** The swatch beside a hex value: the color at 100%, 40% and 20%, side by side. */
export function SplitSwatch({ hex, translucent = 40, transparent = 20 }: { hex: string; translucent?: number; transparent?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-3.5 shrink-0 overflow-hidden rounded-full bg-[repeating-conic-gradient(#ccc_0%_25%,#fff_0%_50%)] bg-size-[6px_6px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
    >
      <span className="h-full flex-1" style={{ background: hex }} />
      <span className="h-full flex-1" style={{ background: hex, opacity: translucent / 100 }} />
      <span className="h-full flex-1" style={{ background: hex, opacity: transparent / 100 }} />
    </span>
  )
}

const FORMATS = [
  { value: "hex", label: "Hex" },
  { value: "oklch", label: "OKLCH" },
  { value: "display-p3", label: "Display P3" },
]

/** "Translucent 40%": a bar that fills as it's dragged, with the value editable on the right. */
function OpacityBar({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
}) {
  return (
    <div className={cx(fieldWell, "h-6 overflow-hidden text-ag-sm")}>
      <Slider value={value} onValueChange={(next) => onValueChange(next as number)} min={0} max={100} step={1} className="absolute inset-0">
        <SliderControl className="absolute inset-0 cursor-ew-resize touch-none">
          <SliderTrack className="relative block size-full">
            <SliderIndicator className="bg-white/[0.08]" />
            <SliderThumb aria-label={`${label} opacity`} className="h-full w-px opacity-0" />
          </SliderTrack>
        </SliderControl>
      </Slider>
      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-chrome-muted">{label}</span>
      <NumberInput value={value} onValueChange={(next) => next !== null && onValueChange(next)} min={0} max={100} locale="en-US" className="absolute inset-y-0 right-2 flex items-center">
        <NumberInputGroup className="flex h-full items-center text-chrome-faint">
          <NumberInputControl
            aria-label={`${label} opacity percentage`}
            className="h-full w-10 bg-transparent text-right font-medium text-chrome-text tabular-nums outline-none"
          />
          %
        </NumberInputGroup>
      </NumberInput>
    </div>
  )
}

/**
 * The picker that opens from a hex field: format, area, hue, value and
 * opacities. The area edits HSL's saturation and lightness, or, in `oklch`,
 * chroma and lightness over the colors the screen can show.
 */
export function ColorPickerPanel({
  name,
  hex,
  onHexChange,
  space = "hsl",
  opacities = true,
}: {
  name: string
  /** Any CSS color; changes come back in the format picked above the area. */
  hex: string
  onHexChange: (hex: string) => void
  space?: "hsl" | "oklch"
  /** The Translucent and Transparent bars, for a palette color's tints. */
  opacities?: boolean
}) {
  const [format, setFormat] = useState<"hex" | "oklch" | "display-p3">("hex")
  const [translucent, setTranslucent] = useState(40)
  const [transparent, setTransparent] = useState(20)

  return (
    <>
      <PopoverTitle className={cx(popupTitle, "flex h-6 items-center")}>{name}</PopoverTitle>
      <Segmented
        label="Color format"
        items={FORMATS}
        value={format}
        onValueChange={(next) => setFormat(next as typeof format)}
        className="w-full"
      />
      <ColorPicker
        value={formatAs(hex, format)}
        onValueChange={(next) => onHexChange(next)}
        space={space}
        format={format}
        gamut={format === "display-p3" ? "p3" : "srgb"}
        className="grid gap-2"
      >
        <ColorPickerArea
          {...(space === "hsl" && { x: "saturation", y: "lightness" })}
          className={cx(
            "relative h-32 cursor-crosshair touch-none rounded-md shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]",
            space === "hsl" ? "bg-(image:--color-area-background)" : "bg-white/[0.03]"
          )}
        >
          {space === "oklch" && <ColorPickerAreaCanvas className="absolute inset-0 size-full rounded-md" />}
          <ColorPickerAreaThumb className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#fff,0_1px_3px_rgb(0_0_0/0.3)] outline-chrome-focus fv:outline-2 fv:outline-offset-3" />
        </ColorPickerArea>
        <div className="flex h-6 items-center gap-3">
          <span className="w-8 shrink-0 text-ag-sm text-chrome-muted">Hue</span>
          <ColorPickerSlider channel="hue" className="relative h-2.5 min-w-0 flex-1 cursor-pointer touch-none rounded-full bg-(image:--color-slider-background)">
            <ColorPickerSliderThumb
              aria-label="Hue"
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--color-picker-color) shadow-[0_0_0_2px_#fff,0_1px_3px_rgb(0_0_0/0.3)] outline-chrome-focus fv:outline-2 fv:outline-offset-3"
            />
          </ColorPickerSlider>
        </div>
        <div className={cx(fieldWell, "grid h-6 min-w-0")}>
          <ColorPickerSwatch className="pointer-events-none absolute top-1/2 left-2 z-[1] size-3.5 -translate-y-1/2 rounded-full bg-(--color-picker-color) shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]" />
          <ColorPickerInput
            aria-label={`${name} color value`}
            className="h-full w-full min-w-0 bg-transparent pr-2 pl-7 font-chrome text-ag-sm font-medium text-chrome-text tabular-nums outline-none"
          />
        </div>
      </ColorPicker>
      {opacities && (
        <>
          <OpacityBar label="Translucent" value={translucent} onValueChange={setTranslucent} />
          <OpacityBar label="Transparent" value={transparent} onValueChange={setTransparent} />
        </>
      )}
    </>
  )
}

/**
 * A palette row: the name, a hex field that opens the color picker, and,
 * for removable colors, an × that slides in on hover. Without opacities it's
 * a single color, like a setting: a help tip, and a blue name once modified.
 */
export function HexRow({
  name,
  hex,
  onHexChange,
  onRemove,
  force,
  pinnedOpen,
  help,
  modified,
  space,
  opacities = true,
}: {
  name: string
  /** Any CSS color: the field shows it as hex. */
  hex: string
  onHexChange: (hex: string) => void
  onRemove?: () => void
  /** Pins "hover" or "focus" on the row for the playground. */
  force?: string
  pinnedOpen?: boolean
  /** What the color is for, behind a (?) beside the name. */
  help?: ReactNode
  /** Changed from what's saved or in source: the name turns blue. */
  modified?: boolean
  /** The picker's area: HSL (default) or OKLCH. */
  space?: "hsl" | "oklch"
  /** The swatch's split and the picker's opacity bars, for a palette color's tints. */
  opacities?: boolean
}) {
  // The picker opens beside the row, clear of the panel's labels.
  const [row, setRow] = useState<HTMLDivElement | null>(null)
  return (
    <div ref={setRow} data-force={force} className="palette-row relative grid min-h-6 grid-cols-[minmax(0,1fr)_136px] items-center gap-3">
      <span data-modified={modified || undefined} className={cx(labelText, "flex min-w-0 items-center gap-0.5")}>
        <span className="truncate">{name}</span>
        {help && <InfoTip label={`About ${name.toLowerCase()}`}>{help}</InfoTip>}
      </span>
      <Popover
        open={pinnedOpen || undefined}
        onOpenChange={pinnedOpen ? (_open, details) => details.cancel() : undefined}
      >
        <PopoverTrigger
          aria-label={`Pick ${name} color`}
          data-force={force}
          className={cx(
            fieldWell,
            "palette-field flex h-6 items-center gap-1.5 px-1.5 text-left fv:outline-2 fv:outline-offset-2",
            "data-open:border-chrome-strong data-open:bg-white/[0.08]",
            onRemove ? "justify-self-start" : ""
          )}
        >
          {opacities ? (
            <SplitSwatch hex={hex} />
          ) : (
            <span
              aria-hidden="true"
              className="size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
              style={{ background: hex }}
            />
          )}
          <span className="font-chrome text-ag-sm font-medium text-chrome-text tabular-nums">{toHex(hex).toUpperCase()}</span>
        </PopoverTrigger>
        <PopoverContent
          anchor={row}
          side="left"
          align="start"
          sideOffset={24}
          inline={pinnedOpen}
          initialFocus="content"
          className={cx(pickerPopup, pinnedOpen && "absolute top-0 right-[calc(100%+24px)] z-10")}
        >
          <ScrollArea contentClassName={pickerBody}>
            <ColorPickerPanel name={name} hex={hex} onHexChange={onHexChange} space={space} opacities={opacities} />
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {onRemove && (
        <Button
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className={cx(
            "palette-remove absolute top-0.5 right-0 grid size-5 place-items-center rounded-full text-chrome-faint",
            "hov:bg-chrome-red/25 hov:text-chrome-red act:scale-[0.92]",
            "outline-chrome-focus fv:outline-2 fv:outline-offset-1"
          )}
        >
          <X aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3" />
        </Button>
      )}
    </div>
  )
}

/** "+ Add color" under the palette, as a dashed toggle (canvasToggle). */
export function AddColorButton({
  onClick,
  disabled,
  force,
}: {
  onClick?: () => void
  disabled?: boolean
  force?: string
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      data-force={force}
      className={cx(
        "group flex min-h-7 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-chrome-border px-2 py-1.5",
        "font-chrome text-ag font-normal text-chrome-text/60 transition-[background-color,border-color,color] duration-150",
        "not-data-disabled:hov:border-white/15 not-data-disabled:hov:bg-white/[0.04] not-data-disabled:hov:text-chrome-text/80",
        "outline-chrome-focus fv:outline-2 fv:outline-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-35"
      )}
    >
      <Plus aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 text-chrome-text/35 group-hov:text-chrome-text/60" />
      <span>Add color</span>
    </Button>
  )
}
