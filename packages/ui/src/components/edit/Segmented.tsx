import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control"
import { cx } from "../../lib/cx"

type Variant = "track" | "field"

/**
 * Segmented choices with a pill that slides to the checked one, in
 * the panel's option colors: 5% field, the checked option at 15%, labels at
 * 50% that brighten on hover. ui-sdk SegmentedControl: one tab stop, arrows
 * move and check.
 * - "track": full width (Type scale: Body / Display).
 * - "field": as wide as its labels or its class (Style, Type, format).
 */
export function Segmented({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  variant = "field",
  textClass = "text-ag-sm",
  className,
  force,
  onItemHover,
  disabled,
}: {
  items: { value: string; label: string }[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  label: string
  variant?: Variant
  textClass?: string
  className?: string
  /** Pins a state on an item for the playground: { value, state }. */
  force?: { value: string; state: string }
  /**
   * The item under the pointer, then null when it leaves the control: for
   * previews. Mouse over/out, which also fire inside a shadow root.
   */
  onItemHover?: (value: string | null) => void
  disabled?: boolean
}) {
  return (
    <SegmentedControl
      aria-label={label}
      disabled={disabled}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => next && onValueChange(next) : undefined}
      onMouseOut={
        onItemHover &&
        ((event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onItemHover(null)
        })
      }
      className={cx(
        "relative isolate flex h-6 gap-0.5 rounded-md bg-chrome-control p-0.5",
        "data-disabled:cursor-not-allowed data-disabled:opacity-35",
        variant === "track" && "w-full",
        className
      )}
    >
      <SegmentedControlIndicator
        className={cx(
          "absolute top-0.5 bottom-0.5 rounded bg-chrome-selected",
          "left-(--segmented-control-indicator-left) w-(--segmented-control-indicator-width)",
          "transition-[left,width] duration-200 ease-drawer"
        )}
      />
      {items.map((item) => (
        <SegmentedControlItem
          key={item.value}
          value={item.value}
          data-force={force?.value === item.value ? force.state : undefined}
          onMouseOver={onItemHover && (() => onItemHover(item.value))}
          className={cx(
            "relative z-[1] grid min-w-0 flex-1 place-items-center rounded px-2 font-chrome font-medium whitespace-nowrap",
            textClass,
            "text-chrome-muted transition-colors duration-150 not-data-disabled:hov:text-chrome-soft data-checked:text-chrome-text",
            "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
          )}
        >
          {item.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}
