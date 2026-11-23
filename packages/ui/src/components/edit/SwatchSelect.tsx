import { Select, SelectContent, SelectGroup, SelectGroupLabel, SelectItem, SelectTrigger } from "@ui-sdk/react/select"
import { Ban, ChevronsUpDown } from "lucide-react"
import type { CSSProperties } from "react"
import { cx } from "../../lib/cx"
import { ScrollArea } from "../ScrollArea"
import { dropdownButton, swatchBody, swatchGroupLabel, swatchItem, swatchMenu } from "./styles"

/** A swatch; one without a color stands for no color ("Not set"). */
export type SwatchOption = { value: string; label: string; color?: string }

/** The swatch for no color (Not set): a dashed circle with a slash. */
export function NoColor({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("grid place-items-center rounded-full border border-dashed border-white/25 text-chrome-faint", className)}
    >
      <Ban absoluteStrokeWidth strokeWidth={1.5} className="size-2.5" />
    </span>
  )
}
export type SwatchGroup = { label?: string; options: SwatchOption[] }

/** Swatch items in their groups, for a ui-sdk Select's menu (the color menu of Color + opacity). */
export function SwatchGroups({ groups, force }: { groups: SwatchGroup[]; force?: Record<string, string> }) {
  return groups.map((group, index) => (
    <SelectGroup key={group.label ?? index} className={cx(index > 0 && "border-t border-chrome-divider pt-2")}>
      {group.label && <SelectGroupLabel className={swatchGroupLabel}>{group.label}</SelectGroupLabel>}
      <div className="flex flex-wrap gap-2.5 p-1">
        {group.options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            label={option.label}
            data-force={force?.[option.value]}
            style={
              (option.color
                ? { ["--swatch" as string]: option.color }
                : { ["--swatch" as string]: "transparent", ["--swatch-ring" as string]: "rgb(255 255 255 / 0.3)" }) as CSSProperties
            }
            className={swatchItem}
          >
            <span className="sr-only">{option.label}</span>
            {!option.color && (
              <NoColor className="absolute inset-0 transition-[scale] duration-200 in-data-selected:scale-[0.8]" />
            )}
          </SelectItem>
        ))}
      </div>
    </SelectGroup>
  ))
}

/**
 * Picks a color from swatches: the kit's color swatch selector (Color +
 * opacity's color menu) on its own. The trigger shows the chosen swatch and
 * its name, or "Not set"; the menu shows the swatches by group. An option
 * without a color is "no color", so "Not set" can be picked too. Highlighting
 * a swatch reports it, for live previews. A ui-sdk Select: arrows move, Enter
 * picks, Escape closes.
 */
export function SwatchSelect({
  label,
  groups,
  value,
  onValueChange,
  onHighlight,
  placeholder = "Not set",
  className,
}: {
  label: string
  groups: SwatchGroup[]
  value: string | null
  onValueChange: (value: string) => void
  /** The highlighted swatch while the menu is open, then null. */
  onHighlight?: (value: string | null) => void
  placeholder?: string
  className?: string
}) {
  const chosen = groups.flatMap((group) => group.options).find((option) => option.value === value)
  const color = chosen?.color
  return (
    <Select
      items={groups.flatMap((group) => group.options)}
      value={value}
      onValueChange={(next) => next !== null && onValueChange(next as string)}
      onHighlight={onHighlight && ((next) => onHighlight((next as string | null) ?? null))}
      onOpenChange={onHighlight && ((open) => !open && onHighlight(null))}
    >
      <SelectTrigger
        aria-label={label}
        className={cx("group flex h-6 w-full min-w-0 items-center rounded-md bg-chrome-control text-left outline-none", className)}
      >
        <span className={cx(dropdownButton, "max-w-none flex-1 justify-between")}>
          <span className="flex min-w-0 items-center gap-1.5">
            {color ? (
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
                style={{ background: color }}
              />
            ) : (
              <NoColor className="size-3.5 shrink-0" />
            )}
            <span className={cx("min-w-0 truncate", !color && "text-chrome-muted")}>{chosen?.label ?? placeholder}</span>
          </span>
          <ChevronsUpDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 shrink-0 opacity-60" />
        </span>
      </SelectTrigger>
      <SelectContent side="bottom" align="start" sideOffset={4} className={cx(swatchMenu, "w-(--anchor-width) min-w-[216px]")}>
        <ScrollArea tabIndex={-1} contentClassName={swatchBody}>
          <div className="grid gap-2">
            <SwatchGroups groups={groups} />
          </div>
        </ScrollArea>
      </SelectContent>
    </Select>
  )
}
