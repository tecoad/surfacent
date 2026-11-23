import { cx } from "../../lib/cx"
import { iconButtonClass } from "../panel/styles"

/** Labels on the Edit page (settingsLabel): 13/20, regular, white at 50%; blue with `data-modified` (changed from what's saved or in source). */
export const labelText = "font-chrome text-ag/5 font-normal tracking-[-0.15px] text-chrome-muted data-modified:text-chrome-accent"

/** A label on the left, a 136px control on the right (settingsRow). */
export const fieldRow = "grid min-h-6 grid-cols-[minmax(0,1fr)_136px] items-center gap-3"

/**
 * The field (webhookUrlInput): 6px corners, a 10% border on a 3%
 * fill; focus lifts both to 30% and 8% and draws the accent outline.
 */
export const fieldWell = cx(
  "group relative isolate rounded-md border border-chrome-border bg-white/[0.03]",
  "transition-[border-color,background-color] duration-150",
  "hov:border-white/15 focus-within:border-chrome-strong focus-within:bg-white/[0.08]",
  "outline-chrome-focus fv-within:outline-2 fv-within:outline-offset-2",
  "data-disabled:cursor-not-allowed"
)

/**
 * A select's value (dropdownButton): 13px/500 white, the glyph at 60%, an 8%
 * wash on hover and while open; the accent outline on focus.
 */
export const dropdownButton = cx(
  "flex h-6 max-w-[148px] min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2",
  "font-chrome text-ag font-medium text-chrome-text transition-colors duration-150",
  "group-hov:bg-white/8 group-open:bg-white/8",
  "outline-chrome-focus group-fv:outline-2 group-fv:outline-offset-2"
)

const shadow = "shadow-[0_4px_20px_rgb(0_0_0/0.3),0_0_0_1px_rgb(255_255_255/0.08)]"
/**
 * Popup surfaces are flex columns that clip: they grow with their content up
 * to the room they have, and the ScrollArea inside scrolls the rest under its
 * fades. The `*Body` strings go on that ScrollArea's content.
 */
const popupSurface = cx(
  "ag-chrome ag-panel-motion flex max-h-(--available-height) max-w-[calc(100vw-20px)] flex-col overflow-hidden rounded-2xl bg-chrome-popup",
  shadow
)
const menuBase = cx(
  "ag-chrome ag-panel-motion flex max-w-[calc(100vw-20px)] flex-col overflow-hidden rounded-xl bg-chrome-popup",
  shadow
)
const menuSurface = cx(menuBase, "max-h-[min(320px,var(--available-height))]")

/** Popover panels on the Edit page (shadow, motion, import): the popup surface. */
export const panelPopup = cx(popupSurface, "w-[280px]")
export const panelBody = "grid gap-3 px-4 py-3"

/** The color picker that opens from a hex field. */
export const pickerPopup = cx(popupSurface, "w-[248px]")
export const pickerBody = "grid gap-2 p-3"

/** Menus that drop from a select: the panel surface, 4px inset, 24px items. Callers may set a width. */
export const menuPopup = menuSurface
export const menuBody = "p-1"

/** The color menu: swatch groups with room around them. */
export const swatchMenu = cx(menuSurface, "w-[216px]")
export const swatchBody = "p-3"

/** The font menu: header and search, then the list in a ScrollArea that fills the rest. */
export const fontMenu = cx(menuBase, "h-[min(360px,var(--available-height,360px))] w-[max(248px,var(--anchor-width))]")

/**
 * One row of a menu (paletteItem): 24px, 6px corners, a 10% wash while
 * highlighted; the chosen one takes the accent.
 */
export const optionRow = cx(
  "group relative flex min-h-6 cursor-pointer items-center gap-1.5 rounded-md py-1 pr-6 pl-2 outline-none select-none",
  "text-ag/4 font-medium text-chrome-soft transition-colors duration-150",
  "data-highlighted:bg-chrome-hover data-highlighted:text-chrome-text",
  "data-selected:bg-chrome-accent data-selected:font-semibold data-selected:text-white data-selected:data-highlighted:bg-chrome-accent",
  "data-disabled:cursor-not-allowed data-disabled:text-chrome-ghost"
)

export const optionMeta = "ml-auto text-ag-xs font-normal text-chrome-faint tabular-nums group-data-selected:text-white/70"

/** The close button in popover headers (themeToggle): 22px. */
export const closeButton = cx("-mr-1", iconButtonClass)

/** Focus ring drawn around a whole control. */
export const ring = "outline-chrome-focus fv:outline-2 fv:outline-offset-2"



/** Popup headers: a 13px/500 title and the close button. */
export const popupHeader = "flex h-6 items-center justify-between gap-3"
export const popupTitle = "m-0 text-ag font-medium text-chrome-text"

/**
 * A color option, as a menu item: a 20px circle; the chosen one
 * shrinks to 80% inside a ring of its color (the ring sits behind, past a gap
 * of panel color). The highlighted one shows a faint ring. 200ms. Set the
 * color in `--swatch` (and the ring's in `--swatch-ring`, when it differs).
 */
export const swatchItem = cx(
  "relative size-5 shrink-0 cursor-pointer rounded-full bg-chrome-popup outline-none",
  "before:absolute before:inset-0 before:rounded-full before:bg-(--swatch) before:transition-[scale] before:duration-200",
  "after:absolute after:inset-0 after:-z-10 after:scale-[1.2] after:rounded-full after:bg-[var(--swatch-ring,var(--swatch))] after:opacity-0 after:transition-opacity after:duration-200",
  "data-highlighted:after:opacity-40 data-[force~=hover]:after:opacity-40",
  "data-selected:before:scale-[0.8] data-selected:after:opacity-100"
)

/** The section titles inside a menu (paletteSectionTitle): 11px/500 at 50%. */
export const swatchGroupLabel = "block pb-[3px] pl-[3px] text-ag-xs font-medium text-chrome-muted"

