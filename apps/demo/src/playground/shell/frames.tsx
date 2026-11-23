import type { ReactNode } from "react"
import { cx } from "surfacent-ui"

/**
 * The context a panel control lives in: the settings panel card,
 * 280px wide (#1a1a1a, 16px corners, 12px × 16px padding).
 */
export function PanelFrame({
  children,
  width = 280,
  className,
}: {
  children: ReactNode
  width?: number
  className?: string
}) {
  return (
    <div
      style={{ width }}
      className={cx(
        "ag-chrome relative flex shrink-0 flex-col gap-2 rounded-2xl bg-chrome-surface px-4 py-3",
        "shadow-[0_4px_20px_rgb(0_0_0/0.3),0_0_0_1px_rgb(255_255_255/0.08)]",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Room beside a panel for a popup pinned open to its left. */
export function PopupRoom({ width = 300, height, children }: { width?: number; height?: number; children: ReactNode }) {
  return (
    <div style={{ paddingLeft: width, minHeight: height }} className="relative">
      {children}
    </div>
  )
}

/** Room under a control for a menu that stays open in the top layer. */
export function MenuRoom({ height }: { height: number }) {
  return <div aria-hidden="true" style={{ height }} />
}

/** Pins a focus or editing state without letting it steal focus on load. */
export function Frozen({ children }: { children: ReactNode }) {
  return <div inert>{children}</div>
}
