import {
  ScrollArea as ScrollAreaRoot,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "@ui-sdk/react/scroll-area"
import type { ComponentProps, ReactNode, Ref } from "react"
import { cx } from "../lib/cx"

type ViewportProps = Omit<ComponentProps<typeof ScrollAreaViewport>, "className" | "children" | "ref" | "render">

/**
 * The toolbar's scroll area, on ui-sdk's ScrollArea: native scrolling whose
 * edges fade (up to 32px, as far as the content reaches past each one, so a
 * list at its top has no top fade), with no scrollbar: the fades show there's
 * more. It only scrolls down: long words wrap instead of widening the content.
 * `scrollbar` adds a 3px one, shown while the pointer is over it or
 * it scrolls. The root is a flex column that grows with
 * its content until its parent caps it, then scrolls; `flex-1` makes it fill a
 * column instead. Other props go to the viewport, the element that scrolls:
 * lists pass `tabIndex={-1}` so it never takes focus from the listbox.
 */
export function ScrollArea({
  children,
  className,
  contentClassName,
  viewportRef,
  scrollbar = false,
  ...viewport
}: ViewportProps & {
  children: ReactNode
  /** The root: its size, or how it sits in its parent. */
  className?: string
  /** The scrolling content: its padding and layout. */
  contentClassName?: string
  viewportRef?: Ref<HTMLDivElement>
  /** A 3px scrollbar, shown on hover and while scrolling. Off by default: the fades say there's more. */
  scrollbar?: boolean
}) {
  return (
    <ScrollAreaRoot className={cx("flex min-h-0 flex-col", className)}>
      <ScrollAreaViewport
        {...viewport}
        ref={viewportRef}
        className={cx(
          // Keyboard moves (a highlighted option, a revealed disclosure) stop clear of the fades.
          "min-h-0 flex-1 overscroll-contain scroll-py-8 edge-fade",
          "outline-chrome-focus fv:outline-2 fv:-outline-offset-2",
          !scrollbar && "scrollbar-none"
        )}
      >
        <ScrollAreaContent className={cx("wrap-anywhere", contentClassName)}>{children}</ScrollAreaContent>
      </ScrollAreaViewport>
      {scrollbar && (
        <ScrollAreaScrollbar className="my-2.5 flex w-[9px] justify-center opacity-0 transition-opacity duration-150 data-visible:opacity-100">
          <ScrollAreaThumb className="w-[3px] rounded-[2px] bg-white/12 transition-colors duration-150 hov:bg-white/25 data-dragging:bg-white/25" />
        </ScrollAreaScrollbar>
      )}
    </ScrollAreaRoot>
  )
}
