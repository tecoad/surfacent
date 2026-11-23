import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle"
import { cx } from "../../lib/cx"

export type ChipItem = { value: string; label: string; disabled?: boolean; title?: string }

/**
 * Options that each switch on and off (states an element responds to, a
 * text's muted or faint): the Segmented look, one tab stop, arrows move. A
 * press reports the chip pressed; the pointer reports what it's over.
 */
export function Chips({
  label,
  items,
  value,
  onPress,
  onItemHover,
  grow,
  className,
}: {
  label: string
  items: ChipItem[]
  /** The chips that are on. */
  value: string[]
  onPress: (value: string) => void
  /** The chip under the pointer, then null when it leaves. */
  onItemHover?: (value: string | null) => void
  /** The chips share the row's width instead of hugging their labels. */
  grow?: boolean
  className?: string
}) {
  return (
    <ToggleGroup
      aria-label={label}
      multiple
      value={value}
      onValueChange={(next) => {
        const pressed =
          (next as string[]).find((item) => !value.includes(item)) ?? value.find((item) => !next.includes(item))
        if (pressed) onPress(pressed)
      }}
      onMouseOut={
        onItemHover &&
        ((event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onItemHover(null)
        })
      }
      className={cx("flex flex-wrap gap-1", className)}
    >
      {items.map((item) => (
        <Toggle
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          title={item.title}
          onMouseOver={onItemHover && !item.disabled ? () => onItemHover(item.value) : undefined}
          className={cx(
            "grid h-6 min-w-0 place-items-center rounded-md bg-chrome-control px-2 font-chrome text-ag-sm font-medium whitespace-nowrap",
            grow && "flex-1",
            "text-chrome-muted transition-[background-color,color] duration-150",
            "not-data-disabled:hov:text-chrome-soft data-pressed:bg-chrome-selected data-pressed:text-chrome-text",
            "data-disabled:cursor-not-allowed data-disabled:opacity-35",
            "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
          )}
        >
          {item.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
