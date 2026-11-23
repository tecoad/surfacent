import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger } from "@ui-sdk/react/select"
import { Ban, Check } from "lucide-react"
import { cx } from "../../lib/cx"
import { COLOR_GROUPS, hexOf, OPACITIES } from "../../lib/edit-data"
import { ScrollArea } from "../ScrollArea"
import { labelText, menuBody, menuPopup, optionMeta, optionRow, swatchBody, swatchMenu } from "./styles"
import { SwatchGroups } from "./SwatchSelect"

const NONE = "None"

/** The color menu: swatches grouped by Palette, Neutrals and Status, then None. */
export function ColorMenuItems({ force }: { force?: Record<string, string> }) {
  return (
    <div className="grid gap-2">
      <SwatchGroups
        groups={COLOR_GROUPS.map((group) => ({
          label: group.label,
          options: group.colors.map((color) => ({ value: color.name, label: color.name, color: color.hex })),
        }))}
        force={force}
      />
      <SelectItem value={NONE} label={NONE} className={optionRow}>
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-full border border-dashed border-white/15 text-chrome-faint group-data-selected:border-white/30 group-data-selected:text-white"
        >
          <Ban absoluteStrokeWidth strokeWidth={1.5} className="size-3" />
        </span>
        None
      </SelectItem>
    </div>
  )
}

export function OpacityMenuItems() {
  return OPACITIES.map((option) => (
    <SelectItem key={option.value} value={option.value} label={option.meta} className={optionRow}>
      <span>{option.label}</span>
      <span className={optionMeta}>{option.meta}</span>
      <SelectItemIndicator className="absolute right-1.5 flex text-white">
        <Check aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
      </SelectItemIndicator>
    </SelectItem>
  ))
}

/**
 * Fill, stroke or shadow color: a token select with a swatch, joined to an
 * opacity select (100% / 40% / 20%). Choosing None turns the opacity off.
 */
export function ColorSelect({
  label,
  ariaLabel,
  color,
  onColorChange,
  opacity,
  onOpacityChange,
  pinned,
  force,
}: {
  label: string
  ariaLabel: string
  color: string
  onColorChange: (name: string) => void
  opacity: string
  onOpacityChange: (opacity: string) => void
  /** Keeps one menu open (playground). */
  pinned?: "color" | "opacity"
  force?: { color?: string; opacity?: string }
}) {
  const pin = (which: "color" | "opacity") =>
    pinned === which
      ? { open: true, modal: false as const, onOpenChange: (_open: boolean, details: { cancel: () => void }) => details.cancel() }
      : {}
  const none = color === NONE
  const hex = hexOf(color)
  const meta = OPACITIES.find((option) => option.value === opacity)?.meta ?? `${opacity}%`

  return (
    <div className={cx("grid min-h-6 items-center gap-3", label ? "grid-cols-[minmax(0,1fr)_136px]" : "grid-cols-1")}>
      {label && <span className={cx(labelText, "truncate")}>{label}</span>}
      <div className="-mr-1.5 flex min-w-0 items-center justify-end gap-0.5">
        <Select value={color} onValueChange={(next) => next !== null && onColorChange(next as string)} {...pin("color")}>
          <SelectTrigger
            aria-label={ariaLabel}
            data-force={force?.color}
            className={cx(
              "group flex h-6 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left",
              "font-chrome text-ag font-medium text-chrome-text transition-colors duration-150",
              "hov:bg-white/8 data-open:bg-white/8",
              "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
            )}
          >
            {none ? (
              <span aria-hidden="true" className="grid size-3.5 shrink-0 place-items-center rounded-full border border-dashed border-white/20 text-chrome-faint">
                <Ban absoluteStrokeWidth strokeWidth={1.5} className="size-2.5" />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
                style={{ background: hex ?? undefined }}
              />
            )}
            <span className="min-w-0 truncate">{color}</span>
          </SelectTrigger>
          <SelectContent side="top" align="end" sideOffset={6} collisionPadding={pinned ? -4000 : undefined} className={swatchMenu}>
            <ScrollArea tabIndex={-1} contentClassName={swatchBody}>
              <ColorMenuItems />
            </ScrollArea>
          </SelectContent>
        </Select>
        <Select value={none ? null : opacity} onValueChange={(next) => next !== null && onOpacityChange(next as string)} disabled={none} {...pin("opacity")}>
          <SelectTrigger
            aria-label={`${ariaLabel} opacity`}
            data-force={force?.opacity}
            className={cx(
              "flex h-6 shrink-0 items-center rounded-md px-1.5",
              "font-chrome text-ag-sm font-medium text-chrome-soft tabular-nums transition-colors duration-150",
              "hov:bg-white/8 hov:text-chrome-text data-open:bg-white/8",
              "outline-chrome-focus fv:outline-2 fv:outline-offset-2 data-disabled:cursor-not-allowed data-disabled:opacity-35"
            )}
          >
            {none ? "—" : meta}
          </SelectTrigger>
          <SelectContent side="bottom" align="end" sideOffset={6} collisionPadding={pinned ? -4000 : undefined} className={cx(menuPopup, "w-[168px]")}>
            <ScrollArea tabIndex={-1} contentClassName={menuBody}>
              <OpacityMenuItems />
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
