import { cx } from "../../lib/cx"

const base = cx(
  "inline-flex min-h-[30px] shrink-0 items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5",
  "font-chrome text-ag-sm font-medium whitespace-nowrap select-none",
  "disabled:cursor-not-allowed disabled:opacity-35 data-disabled:cursor-not-allowed data-disabled:opacity-35",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
)

/** The submit pill: white on the accent, 90% brightness on hover. */
export const primaryButton = cx(
  base,
  "bg-chrome-accent px-3.5 text-white transition-[filter,opacity] duration-150 not-disabled:not-data-disabled:hov:brightness-90"
)

/** A quiet action beside the primary one (Cancel, Reset): an 8% wash on hover. */
export const secondaryButton = cx(
  base,
  "text-chrome-soft transition-[background-color,color,opacity] duration-150 not-disabled:not-data-disabled:hov:bg-white/8 not-disabled:not-data-disabled:hov:text-chrome-text"
)

/** A destructive action (Delete): red text, a red wash on hover. */
export const dangerButton = cx(
  base,
  "text-chrome-red transition-[background-color,opacity] duration-150 not-disabled:not-data-disabled:hov:bg-chrome-red/12"
)

/** A small text action inside a row (Remove, Copy). */
export const textButton = cx(
  "inline-flex shrink-0 items-center gap-1 rounded px-1 font-chrome text-ag-xs font-medium text-chrome-faint",
  "transition-colors duration-150 hov:text-chrome-text aria-pressed:text-chrome-red",
  "disabled:cursor-not-allowed disabled:opacity-35",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
)
