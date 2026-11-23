import { Button } from "@ui-sdk/react/button"
import { Download } from "lucide-react"
import type { ReactNode, Ref } from "react"
import { cx } from "../../lib/cx"

/**
 * "Use theme": the project's primary action as the submit pill —
 * 30px, 12px/500 white on the accent, 90% brightness on hover; dimmed
 * when disabled.
 */
export function UseThemeButton({
  onUse,
  disabled,
  force,
  buttonRef,
}: {
  onUse?: () => void
  disabled?: boolean
  force?: string
  buttonRef?: Ref<HTMLButtonElement>
}) {
  return (
    <Button
      ref={buttonRef}
      onClick={() => onUse?.()}
      disabled={disabled}
      data-force={force}
      className={cx(
        "inline-flex min-h-[30px] items-center justify-center gap-1.5 rounded-2xl bg-chrome-accent px-3.5 py-1.5",
        "font-chrome text-ag-sm font-medium text-white",
        "transition-[filter,opacity] duration-150",
        "not-data-disabled:hov:brightness-90",
        "data-disabled:cursor-not-allowed data-disabled:opacity-35",
        "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
      )}
    >
      <Download aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
      Use theme
    </Button>
  )
}

/** The panel's footer (the popup's actions row): a divider, then the action on the right. */
export function PanelFooter({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 px-4">
      <div aria-hidden="true" className="my-2 h-px bg-chrome-divider" />
      <div className="flex items-center justify-end gap-1.5">
        <output aria-live="polite" className="sr-only">
          Saved
        </output>
        {children}
      </div>
    </div>
  )
}
