import { Button } from "@ui-sdk/react/button"
import { Field, FieldError } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import { Check, Plus } from "lucide-react"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { cx } from "../../lib/cx"
import { normalizeHex } from "../../lib/hex"
import {
  createColorWheelController,
  SWATCH,
  wrap,
  type ColorWheelController,
} from "../../primitives/color-wheel"
import { ColorWheelRoot } from "../../primitives/parts"
import { NoColor } from "../edit/SwatchSelect"

/** Swatches on each side of the selected one. */
const REACH = 6
/** The strip and the hex field trade places with the panel motion. */
const layer = cx(
  "absolute inset-0 transition-[opacity,translate,filter] duration-160 ease-panel",
  "motion-reduce:transition-none"
)
/** A new color pops in like the dock's badge: 85% → 100%, 300ms, cubic-bezier(.34, 1.2, .64, 1). */
const POP = { duration: 300, easing: "cubic-bezier(0.34, 1.2, 0.64, 1)" }
/** An invalid hex shakes: ±3px, 250ms ease-out. */
const SHAKE: Keyframe[] = [0, -3, 3, -2, 2, 0].map((x) => ({ translate: `${x}px 0` }))

/**
 * The endless strip of brand colors, drawn as the toolbar's color options:
 * 20px circles; the selected one shrinks to 80% inside a ring of its color.
 * An empty color is no color (Not set): a dashed circle with a slash.
 */
export function ColorWheel({
  colors,
  value,
  onValueChange,
  disabled,
  controller,
  popKey = 0,
  force,
  label = "Brand Color",
  labels,
  onItemHover,
}: {
  /** CSS colors; "" is no color. */
  colors: string[]
  value: number
  onValueChange: (value: number) => void
  disabled?: boolean
  controller?: ColorWheelController
  /** Changes when a custom color was just added, to pop it in. */
  popKey?: number
  force?: string
  /** The strip's name. */
  label?: string
  /** Each color's name, read out as the value. */
  labels?: string[]
  /**
   * The swatch under the pointer as it moves (not while pressed, when the
   * pick is what shows), then null. A swatch gliding under a still pointer
   * doesn't count.
   */
  onItemHover?: (index: number | null) => void
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const hovered = useRef<number | null>(null)
  /** Where the last press was, until the pointer moves away from it. */
  const pressedAt = useRef<number | null>(null)
  const hover = (index: number | null) => {
    if (hovered.current === index) return
    hovered.current = index
    onItemHover?.(index)
  }

  useEffect(() => {
    if (!popKey) return
    stripRef.current
      ?.querySelector<HTMLElement>("[data-selected]")
      ?.animate([{ opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }], POP)
  }, [popKey])

  return (
    <ColorWheelRoot
      colors={colors}
      value={value}
      onValueChange={(next) => onValueChange(next)}
      disabled={disabled}
      controller={controller}
      labels={labels}
      aria-label={label}
      data-force={force}
      className={cx(
        "group relative h-[26px] cursor-grab touch-none rounded-full select-none",
        "outline-chrome-focus fv:outline-2 fv:outline-offset-2",
        "data-dragging:cursor-grabbing data-disabled:cursor-not-allowed data-disabled:opacity-35"
      )}
    >
      {(state) => {
        const base = Math.floor(state.position)
        const selected = Math.round(state.position)
        return (
          <div
            ref={stripRef}
            aria-hidden="true"
            onPointerMove={
              onItemHover &&
              ((event) => {
                if (event.buttons) return
                if (pressedAt.current !== null && Math.abs(event.clientX - pressedAt.current) < 4) return
                pressedAt.current = null
                const rect = event.currentTarget.getBoundingClientRect()
                const at = Math.round(state.position + (event.clientX - rect.left - rect.width / 2) / SWATCH)
                hover(wrap(at, state.colors.length))
              })
            }
            onPointerDown={
              onItemHover &&
              ((event) => {
                pressedAt.current = event.clientX
                hover(null)
              })
            }
            onPointerLeave={
              onItemHover &&
              (() => {
                pressedAt.current = null
                hover(null)
              })
            }
            className="relative h-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_24px,#000_calc(100%-24px),transparent)]"
          >
            {Array.from({ length: REACH * 2 + 1 }, (_, slot) => {
              const index = base + slot - REACH
              const color = state.colors[wrap(index, state.colors.length)]
              const isSelected = index === selected
              return (
                <span
                  key={slot}
                  data-selected={isSelected || undefined}
                  className="absolute top-[3px] left-1/2 size-5"
                  style={{ transform: `translateX(${(index - state.position) * SWATCH - 10}px)` }}
                >
                  <span
                    className={cx(
                      "absolute inset-0 rounded-full transition-[opacity,scale] duration-200",
                      isSelected ? "scale-[1.2] opacity-100" : "scale-100 opacity-0"
                    )}
                    style={{ background: color || "rgb(255 255 255 / 0.3)" }}
                  />
                  <span className="absolute inset-0 rounded-full bg-chrome-surface" />
                  {color ? (
                    <span
                      className={cx(
                        "absolute inset-0 rounded-full transition-[scale] duration-200",
                        isSelected ? "scale-[0.8]" : "scale-100"
                      )}
                      style={{ background: color }}
                    />
                  ) : (
                    <NoColor
                      className={cx("absolute inset-0 transition-[scale] duration-200", isSelected ? "scale-[0.8]" : "scale-100")}
                    />
                  )}
                </span>
              )
            })}
          </div>
        )
      }}
    </ColorWheelRoot>
  )
}

/**
 * The Color group's control: the strip, plus "+" to type a hex color.
 * A new color goes in where the selection is and pops; a color already in
 * the palette is glided to instead. Without `onColorsChange` the colors are
 * fixed: the strip alone, no "+".
 */
export function ColorControl({
  colors,
  value,
  onValueChange,
  onColorsChange,
  disabled,
  defaultMode = "wheel",
  defaultDraft,
  defaultInvalid = false,
  force,
  label,
  labels,
  onItemHover,
}: {
  /** CSS colors; "" is no color (Not set). */
  colors: string[]
  value: number
  onValueChange: (value: number) => void
  /** The palette with a new color inserted, and that color's index. Omit for fixed colors. */
  onColorsChange?: (colors: string[], index: number) => void
  disabled?: boolean
  defaultMode?: "wheel" | "hex"
  defaultDraft?: string
  defaultInvalid?: boolean
  /** Pins states for the playground: { wheel, add }. */
  force?: { wheel?: string; add?: string }
  /** The strip's name. */
  label?: string
  /** Each color's name, read out as the value. */
  labels?: string[]
  /** The swatch under a moving pointer, then null: for previews. */
  onItemHover?: (index: number | null) => void
}) {
  const [mode, setMode] = useState(defaultMode)
  const [draft, setDraft] = useState(defaultDraft ?? colors[value]?.toUpperCase() ?? "")
  const [invalid, setInvalid] = useState(defaultInvalid)
  const [popKey, setPopKey] = useState(0)
  const [wheel] = useState(createColorWheelController)
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const hex = mode === "hex"
  const opened = useRef(false)

  useEffect(() => {
    if (!hex || !opened.current) return
    inputRef.current?.focus({ preventScroll: true })
    inputRef.current?.select()
  }, [hex])

  const open = () => {
    opened.current = true
    setDraft(colors[value]?.toUpperCase() ?? "")
    setInvalid(false)
    setMode("hex")
  }

  const close = () => {
    setMode("wheel")
    setInvalid(false)
    addRef.current?.focus({ preventScroll: true })
  }

  const confirm = (event?: FormEvent) => {
    event?.preventDefault()
    const color = normalizeHex(draft)
    if (!color) {
      setInvalid(true)
      inputRef.current?.focus({ preventScroll: true })
      inputRef.current?.animate(SHAKE, { duration: 250, easing: "ease-out" })
      return
    }
    const existing = colors.findIndex((item) => item.toLowerCase() === color)
    if (existing >= 0) {
      wheel.scrollTo(existing)
    } else {
      const at = wheel.current() ?? value
      const next = [...colors]
      next.splice(at, 0, color)
      onColorsChange?.(next, at)
      setPopKey((key) => key + 1)
    }
    close()
  }

  if (!onColorsChange) {
    return (
      <ColorWheel
        colors={colors}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        force={force?.wheel}
        label={label}
        labels={labels}
        onItemHover={onItemHover}
      />
    )
  }

  return (
    <form noValidate onSubmit={confirm} className="grid grid-cols-[minmax(0,1fr)_20px] items-center gap-x-2">
      <div className="relative h-[26px] min-w-0">
        <div
          inert={hex}
          aria-hidden={hex || undefined}
          className={cx(layer, hex ? "-translate-x-1 opacity-0 blur-[2px]" : "translate-x-0 opacity-100 blur-0")}
        >
          <ColorWheel
            colors={colors}
            value={value}
            onValueChange={onValueChange}
            disabled={disabled || hex}
            controller={wheel}
            popKey={popKey}
            force={force?.wheel}
            label={label}
            labels={labels}
            onItemHover={onItemHover}
          />
        </div>
        <div
          inert={!hex}
          aria-hidden={!hex || undefined}
          className={cx(layer, hex ? "translate-x-0 opacity-100 blur-0" : "translate-x-1 opacity-0 blur-[2px]")}
        >
          <Field invalid={invalid || undefined} className="relative h-full">
            <Input
              ref={inputRef}
              id={inputId}
              aria-label="Hex color"
              placeholder="#AABBCC"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onValueChange={(next) => {
                setDraft(next)
                setInvalid(false)
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  event.stopPropagation()
                  close()
                }
              }}
              className={cx(
                "h-[26px] w-full rounded-md border border-chrome-border bg-white/[0.03] px-2 font-chrome text-ag-sm font-medium text-chrome-text uppercase outline-none",
                "transition-[border-color,background-color] duration-150 placeholder:text-chrome-text/30",
                "focus:border-chrome-strong focus:bg-white/[0.08] data-invalid:border-chrome-red"
              )}
            />
            <FieldError className="absolute top-full left-0 mt-1 text-ag-xs text-chrome-red">
              {() => "Enter a 3- or 6-digit hex code."}
            </FieldError>
          </Field>
        </div>
      </div>
      <Button
        ref={addRef}
        type={hex ? "submit" : "button"}
        onClick={
          hex
            ? undefined
            : (event) => {
                // React re-renders this button as type="submit" before the
                // browser runs the click's default action, which would then
                // submit the form and close the field again.
                event.preventDefault()
                open()
              }
        }
        disabled={disabled}
        aria-label={hex ? "Confirm hex color" : "Add custom color"}
        aria-expanded={hex}
        aria-controls={inputId}
        data-force={force?.add}
        className={cx(
          "group relative grid size-5 place-items-center rounded-full",
          "transition-[background-color,border-color,color,scale] duration-150 act:scale-[0.92]",
          hex
            ? "bg-chrome-accent text-white hov:brightness-90"
            : "border border-dashed border-white/15 bg-white/[0.04] text-chrome-faint hov:border-chrome-strong hov:text-chrome-text/80",
          "outline-chrome-focus fv:outline-2 fv:outline-offset-2",
          "data-disabled:cursor-not-allowed data-disabled:opacity-35"
        )}
      >
        <Plus
          aria-hidden="true"
          absoluteStrokeWidth
          strokeWidth={1.5}
          className={cx(
            "col-start-1 row-start-1 size-3 transition-[opacity,scale] duration-150",
            hex ? "scale-80 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <Check
          aria-hidden="true"
          absoluteStrokeWidth
          strokeWidth={2}
          className={cx(
            "col-start-1 row-start-1 size-3 transition-[opacity,scale] duration-150",
            hex ? "scale-100 opacity-100" : "scale-80 opacity-0"
          )}
        />
      </Button>
      {invalid && <div aria-hidden="true" className="col-span-full h-4" />}
    </form>
  )
}
