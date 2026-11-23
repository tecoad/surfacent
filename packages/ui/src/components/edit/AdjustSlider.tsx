import { Slider, SliderControl, SliderThumb, SliderTrack } from "@ui-sdk/react/slider"
import { useCallback, useState } from "react"
import { cx } from "../../lib/cx"
import { radiusCss, type Radius } from "../../lib/radius"
import { labelText } from "./styles"

/**
 * The Edit page slider: a 136px field with faint stops and a
 * thumb that shows the value inside it ("S", "110%", "1.44×"). ui-sdk Slider handles drag,
 * presses on the track and the keyboard. Leave `label` out to use it bare,
 * as in a split row.
 */
export function AdjustSlider({
  label,
  ariaLabel,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  display = (v) => String(v),
  stops,
  disabled,
  force,
  radius = 6,
  track,
}: {
  label?: string
  ariaLabel?: string
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** What the thumb says for a value. */
  display?: (value: number) => string
  /** How many dots sit along the track. */
  stops?: number
  disabled?: boolean
  /** Pins "focus" or "active" (pressed) for the playground. */
  force?: string
  radius?: Radius
  /** A background for the field, like a hue gradient. */
  track?: string
}) {
  const [thumbWidth, setThumbWidth] = useState(24)
  const measure = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const observer = new ResizeObserver(() => setThumbWidth(el.offsetWidth || 24))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const dots = stops ?? Math.min(9, Math.round((max - min) / step) + 1)

  const control = (
    <SliderControl
      data-force={force}
      style={{ ["--thumb-w" as string]: `${thumbWidth}px`, borderRadius: radiusCss(radius), background: track }}
      className={cx(
        "group relative isolate block h-6 w-full touch-pan-y border border-chrome-border bg-white/[0.03] select-none",
        "transition-[border-color,background-color] duration-150 hov:border-white/15",
        "outline-chrome-focus fv-within:outline-2 fv-within:outline-offset-2",
        "data-disabled:cursor-not-allowed"
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[calc(50%-1.5px)] right-3 left-3 flex justify-between group-data-disabled:opacity-35"
      >
        {Array.from({ length: dots }, (_, index) => (
          <i key={index} className="block size-[3px] rounded-full bg-white opacity-[0.16]" />
        ))}
      </span>
      <SliderTrack className="relative mx-[calc(2px+var(--thumb-w)/2)] block h-full">
        <SliderThumb
          ref={measure}
          aria-label={ariaLabel ?? label}
          className={cx(
            "grid h-[18px] w-max min-w-6 place-items-center rounded bg-chrome-raised px-1.5 text-ag-xs font-medium whitespace-nowrap text-chrome-text tabular-nums",
            "shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[scale] duration-100 ease-[ease]",
            "group-data-dragging:scale-105 group-act:scale-105 group-data-disabled:scale-100"
          )}
        >
          {(state) => <span className="group-data-disabled:opacity-35">{display(state.thumbValue)}</span>}
        </SliderThumb>
      </SliderTrack>
    </SliderControl>
  )

  return (
    <Slider
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => onValueChange(next as number) : undefined}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      format={(next) => display(next)}
      className={cx(label ? "grid min-h-6 grid-cols-[minmax(0,1fr)_136px] items-center gap-3" : "block min-w-0")}
    >
      {label && <span className={labelText}>{label}</span>}
      {control}
    </Slider>
  )
}
