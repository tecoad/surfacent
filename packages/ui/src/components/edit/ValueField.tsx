import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/react/number-input"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { ReactNode } from "react"
import { cx } from "../../lib/cx"
import { fieldWell, labelText } from "./styles"

type NumberProps = {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  /** Pins "hover" or "focus" for the playground. */
  force?: string
}

const caret = cx(
  "vf-caret absolute z-[2] grid place-items-center text-chrome-faint",
  "not-data-disabled:hov:bg-chrome-hover not-data-disabled:hov:text-chrome-text not-data-disabled:act:bg-chrome-selected",
  "data-disabled:cursor-not-allowed"
)

/**
 * A labelled number (settingsRow): the value in a 136px field,
 * with up and down carets that show on hover. ui-sdk NumberInput: arrows, Page keys, wheel,
 * typing, clamping and snapping to `step`.
 */
export function ValueField({
  label,
  unit,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 1,
  disabled,
  force,
  ariaLabel,
}: NumberProps & { label: string; unit?: string; ariaLabel?: string }) {
  return (
    <NumberInput
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => next !== null && onValueChange(next) : undefined}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      locale="en-US"
      className="flex min-h-6 items-center justify-between gap-3 data-disabled:opacity-35"
    >
      <span className={cx(labelText, "min-w-0 truncate")}>{label}</span>
      <NumberInputGroup data-force={force} className={cx(fieldWell, "vf h-6 w-[136px] shrink-0")}>
        <span className="flex h-full items-center gap-1 pr-10 pl-2 text-ag-xs text-chrome-faint">
          <NumberInputControl
            aria-label={ariaLabel ?? label}
            className="h-full w-full min-w-0 bg-transparent text-left font-chrome text-ag-sm font-medium text-chrome-text tabular-nums outline-none"
          />
          {unit && <span>{unit}</span>}
        </span>
        <NumberInputDecrement
          aria-label={`Decrease ${ariaLabel ?? label}`}
          className={cx(caret, "top-0.5 right-5 size-[18px] rounded")}
        >
          <ChevronDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3" />
        </NumberInputDecrement>
        <NumberInputIncrement
          aria-label={`Increase ${ariaLabel ?? label}`}
          className={cx(caret, "top-0.5 right-0.5 size-[18px] rounded")}
        >
          <ChevronUp aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3" />
        </NumberInputIncrement>
      </NumberInputGroup>
    </NumberInput>
  )
}

/**
 * One cell of a compact bar: the value centered, two small carets stacked on
 * the right while hovered. Used by font weights and the type scale table.
 */
export function CompactNumber({
  label,
  caption,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 1,
  disabled,
  force,
  textClass = "text-ag-sm",
}: NumberProps & { label: string; caption?: ReactNode; textClass?: string }) {
  return (
    <NumberInput
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => next !== null && onValueChange(next) : undefined}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      locale="en-US"
      data-force={force}
      className="vf group relative flex min-w-0 flex-col"
    >
      <NumberInputGroup className="relative h-6 rounded-md outline-chrome-focus fv-within:outline-2 fv-within:outline-offset-[-2px]">
        <NumberInputControl
          aria-label={label}
          className={cx(
            "h-full w-full min-w-0 bg-transparent text-center font-chrome font-medium text-chrome-text tabular-nums outline-none",
            textClass
          )}
        />
        <NumberInputIncrement aria-label={`Increase ${label}`} className={cx(caret, "top-0.5 right-0.5 h-2.5 w-3 rounded-sm")}>
          <ChevronUp aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-2.5" />
        </NumberInputIncrement>
        <NumberInputDecrement aria-label={`Decrease ${label}`} className={cx(caret, "top-[11.5px] right-0.5 h-2.5 w-3 rounded-sm")}>
          <ChevronDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-2.5" />
        </NumberInputDecrement>
      </NumberInputGroup>
      {caption && (
        <span className="pt-1 text-center text-ag-2xs font-medium text-chrome-faint">{caption}</span>
      )}
    </NumberInput>
  )
}

/** A 136px field holding compact cells side by side, divided by hairlines. */
export function CompactBar({
  children,
  columns,
  shift = 2,
  className,
}: {
  children: ReactNode
  columns: number
  shift?: number
  className?: string
}) {
  return (
    <div
      role="group"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, ["--caret-shift" as string]: `${shift}px` }}
      className={cx("vf-bar relative isolate grid w-[136px]", className)}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-6 rounded-md border border-chrome-border bg-white/[0.03]" />
      {children}
    </div>
  )
}
