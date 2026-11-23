import { cx } from "../../lib/cx"

/** A settings row: label on the left, its control on the right, 24px tall. */
export const rowClass = "flex min-h-6 w-full min-w-0 items-center justify-between gap-3"

/** The row's label (settingsLabel): 13/20, regular. Pair with a color. */
export const labelBase = "flex min-w-0 items-center gap-0.5 text-ag/5 font-normal tracking-[-0.15px]"

/** The row's label in its usual white at 50%. */
export const labelClass = cx(labelBase, "text-chrome-muted")

/**
 * The control half of a row (cycleButton, dropdownButton): 13px/500 white,
 * its glyph dimmed. Focus draws the accent outline.
 */
export const rowControlClass = cx(
  "group relative isolate -mr-1 flex min-w-0 shrink-0 items-center gap-2 rounded-md py-0.5 pr-1 pl-1.5",
  "font-chrome text-ag font-medium text-chrome-text select-none",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-2",
  "data-disabled:cursor-not-allowed data-disabled:opacity-35"
)

/**
 * A row's dropdown trigger (dropdownButton): 13px/500 white, 4px × 8px, an
 * 8% wash on hover and while open.
 */
export const dropdownTriggerClass = cx(
  "-mr-2 flex min-w-0 shrink-0 items-center gap-2 rounded-md px-2 py-1",
  "font-chrome text-ag font-medium text-chrome-text select-none transition-colors duration-150",
  "hov:bg-white/8 data-open:bg-white/8",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
)

/**
 * Popups: the popup surface and panel motion, a flex column that
 * grows up to the room it has. Callers set the width; the body goes in a
 * ScrollArea with `popupBodyClass` on its content, plus a gap.
 */
export const popupClass = cx(
  "ag-chrome ag-panel-motion flex max-h-(--available-height) max-w-[calc(100vw-20px)] flex-col overflow-hidden rounded-2xl bg-chrome-popup",
  "shadow-[0_4px_20px_rgb(0_0_0/0.3),0_0_0_1px_rgb(255_255_255/0.08)]"
)
export const popupBodyClass = "grid px-4 py-3"

/** The header of a popup: 13px/500 title, a 22px close button. */
export const popupTitleClass = "m-0 text-ag font-medium text-chrome-text"

/** The small icon button (themeToggle): 22px, dim glyph, a soft wash on hover. */
export const iconButtonClass = cx(
  "grid size-[22px] shrink-0 place-items-center rounded-md text-chrome-faint transition-[background-color,color] duration-150",
  "hov:bg-chrome-hover hov:text-chrome-text/80",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-2",
  "data-disabled:cursor-not-allowed data-disabled:opacity-35"
)

/** One theme preset in the Themes popover (paletteItem). */
export const choiceClass = cx(
  "flex min-h-6 w-full min-w-0 items-center gap-1.5 rounded-md border border-transparent p-1 text-left",
  "transition-[background-color,border-color] duration-150",
  "hov:bg-chrome-hover data-pressed:bg-chrome-accent data-pressed:hov:bg-chrome-accent",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
)

/** An Edit section's heading (settingsNavLink): 13px at 50%, brighter on hover and while open. */
export const triggerClass = cx(
  "group relative flex h-6 w-full items-center gap-2 rounded-md text-left",
  "font-chrome text-ag font-normal text-chrome-muted transition-colors duration-150",
  "hov:text-chrome-text/90 data-open:text-chrome-text",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-2",
  "data-disabled:cursor-not-allowed data-disabled:text-chrome-ghost"
)
