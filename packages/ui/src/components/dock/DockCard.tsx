import { PopoverClose, PopoverTitle } from "@ui-sdk/react/popover"
import { X } from "lucide-react"
import { useContext, type ReactNode } from "react"
import { cx } from "../../lib/cx"
import { iconButtonClass } from "../panel/styles"
import { ScrollArea } from "../ScrollArea"
import { DockStageContext, dockSurface } from "./stage"

/**
 * A dock panel, made like the settings panel: the title (with a
 * subtitle, a leading back button or trailing actions) and a close button, a
 * divider, a body that scrolls under its fades whenever the window leaves less
 * room than the panel wants, and an optional footer. Lives in a dock's
 * popover, which gives it its motion and its `--panel-max`.
 */
export function DockCard({
  title,
  subtitle,
  leading,
  actions,
  footer,
  children,
  width = 280,
  bodyClassName = "flex flex-col gap-2 px-4 py-1.5",
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** Before the title, like a back button. */
  leading?: ReactNode
  /** After the title, before the close button. */
  actions?: ReactNode
  /** Below a divider, outside the scroll: status and buttons. */
  footer?: ReactNode
  children: ReactNode
  width?: number
  bodyClassName?: string
}) {
  // On a dock's stage the stage draws the surface, so it can resize between panels.
  const onStage = useContext(DockStageContext)
  return (
    <div
      style={{ width }}
      className={cx(
        "ag-chrome flex max-h-(--panel-max) max-w-[calc(100vw-24px)] flex-col overflow-hidden py-3",
        !onStage && dockSurface
      )}
    >
      <header className="flex h-6 shrink-0 items-center gap-1 px-4">
        {leading}
        <PopoverTitle className="m-0 flex min-w-0 flex-1 items-baseline gap-1.5 text-ag font-medium text-[#bbb]">
          <span className="truncate">{title}</span>
          {subtitle && <span className="truncate text-ag-xs font-light text-chrome-faint">{subtitle}</span>}
        </PopoverTitle>
        {actions}
        <PopoverClose
          aria-label={typeof title === "string" ? `Close ${title.toLowerCase()}` : "Close"}
          className={cx("-mr-1", iconButtonClass)}
        >
          <X aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />
        </PopoverClose>
      </header>
      <div aria-hidden="true" className="mx-4 my-2 h-px shrink-0 bg-chrome-divider" />
      {/* 6px above and below the content, taken back by the area's margin, so focus and selection rings aren't cut. */}
      <ScrollArea data-panel-scroll="" className="-my-1.5" contentClassName={bodyClassName}>
        {children}
      </ScrollArea>
      {footer && (
        <div className="shrink-0 px-4">
          <div aria-hidden="true" className="my-2 h-px bg-chrome-divider" />
          {footer}
        </div>
      )}
    </div>
  )
}
