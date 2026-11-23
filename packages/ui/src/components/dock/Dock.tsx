import { createPopoverController, Popover, PopoverContent, PopoverTrigger } from "@ui-sdk/react/popover"
import { createToolbarController, Toolbar, ToolbarButton, ToolbarSeparator } from "@ui-sdk/react/toolbar"
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@ui-sdk/react/tooltip"
import type { LucideProps } from "lucide-react"
import {
  type ComponentType,
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { cx } from "../../lib/cx"
import { PanelStage } from "./PanelStage"
import {
  clampPosition,
  DOCK,
  readPosition,
  samePosition,
  viewportBox,
  writePosition,
  type Box,
  type DockPosition,
} from "./geometry"

export type DockItem = {
  id: string
  /** The tooltip, and the button's name. */
  label: string
  /** A Lucide icon, or any component that takes its props. */
  icon: ComponentType<LucideProps>
  /** A key shown beside the label in the tooltip, like "⌘⇧C". */
  shortcut?: string
  /** The panel this item opens above the toolbar. */
  panel?: () => ReactNode
  /** What a press does, for an item without a panel. */
  onPress?: () => void
  /** A toggle's state: drawn pressed (the accent) while true. */
  pressed?: boolean
  disabled?: boolean
  /** A count on the icon, like pending notes. */
  badge?: number
  /** A dot on the icon, a connection's state: "off" red, "waiting" yellow (up, nothing listening yet), "live" an agent listening (its color, pulsing). */
  indicator?: "off" | "waiting" | "live"
  /** "danger" washes red on hover (Clear). */
  tone?: "danger"
  /** Its panel stays open while the page is used (a palette to drag from). */
  persistent?: boolean
  /** A divider before it: it starts a group of its own. */
  separated?: boolean
}

/** A count on a dock button or the closed launcher: a badge. */
function Badge({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-chrome-accent px-1",
        "font-chrome text-[10px]/none font-semibold text-white tabular-nums",
        "shadow-[0_0_0_2px_#1a1a1a] animate-[swatch-pop_300ms_cubic-bezier(0.34,1.2,0.64,1)]"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

/** A connection's state as a dot: "off" red, "waiting" yellow, "live" an agent listening (its color, pulsing). */
function StatusDot({ state, className }: { state: NonNullable<DockItem["indicator"]>; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute size-[7px] rounded-full shadow-[0_0_0_2px_#1a1a1a]",
        state === "off" ? "bg-chrome-red" : state === "live" ? "bg-chrome-agent" : "bg-chrome-yellow",
        className
      )}
    >
      {state === "live" && <span className="absolute inset-0 animate-ping rounded-full bg-chrome-agent" />}
    </span>
  )
}

/** The launcher's glyph: two strokes that cross into an × as the toolbar opens. */
function Glyph({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" data-open={open || undefined} className="dock-glyph size-6">
      <path className="dock-glyph-top" d="M5.5 9H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path className="dock-glyph-bottom" d="M5.5 15H18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle className="dock-glyph-dot" cx="17.5" cy="9" r="1.75" fill="currentColor" />
    </svg>
  )
}

/** A line between groups of buttons, and before the launcher. */
const separatorClass = "mx-[3px] h-3 w-px shrink-0 bg-white/15"

/** The open panel's tint: the accent at 25%. */
const ACTIVE_BG = "bg-[color-mix(in_srgb,var(--color-chrome-accent)_25%,transparent)]"

/** Hovering a panel's button opens it after this long; the next one takes over at once. */
const HOVER_OPEN = 100
/** A panel the pointer opened closes this long after the pointer leaves it and the dock. */
const HOVER_CLOSE = 250
/** The gap between the dock and its panel. */
const PANEL_GAP = 8

// The hover and open backgrounds aren't here: they're the row's two pills, which glide between buttons.
const buttonClass = cx(
  "relative grid size-[34px] shrink-0 place-items-center rounded-full text-white/85",
  "transition-[background-color,color,scale,opacity] duration-150 act:scale-[0.92]",
  "not-data-open:not-data-pressed:hov:text-white data-[tone=danger]:hov:text-chrome-red",
  "data-open:text-chrome-accent",
  "data-pressed:bg-[color-mix(in_srgb,var(--color-chrome-accent)_25%,transparent)] data-pressed:text-chrome-accent",
  "data-disabled:cursor-not-allowed data-disabled:opacity-35",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-3"
)

/**
 * A pill behind the toolbar's buttons that glides from one to the next
 * (fluid functionalism's hover): one background in motion, never one per
 * button blinking at their edges. It appears where it's first needed and
 * fades out where it was.
 */
function Pill({ at, className }: { at: number | null; className: string }) {
  const last = useRef(at ?? 0)
  const wasShown = useRef(false)
  const shown = at !== null
  const appearing = shown && !wasShown.current
  useEffect(() => {
    if (at !== null) last.current = at
    wasShown.current = shown
  })
  return (
    <span
      aria-hidden="true"
      style={{ translate: `${at ?? last.current}px 0` }}
      className={cx(
        "pointer-events-none absolute top-0 left-0 size-[34px] rounded-full motion-reduce:transition-none",
        appearing
          ? "transition-[opacity,background-color] duration-150 ease-[ease]"
          : "transition-[translate,opacity,background-color] duration-200 ease-morph",
        shown ? "opacity-100" : "opacity-0",
        className
      )}
    />
  )
}

/**
 * One toolbar button, named by its tooltip: a ui-sdk ToolbarButton that opens
 * its panel, or runs its action (a toggle shows pressed while it's on).
 */
function DockButton({
  item,
  controller,
  tooltips,
}: {
  item: DockItem
  controller: ReturnType<typeof createPopoverController<string>>
  tooltips: boolean
}) {
  const Icon = item.icon
  const content = (
    <>
      <Icon aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-5" />
      {item.badge ? <Badge count={item.badge} /> : null}
      {item.indicator && <StatusDot state={item.indicator} className="top-1 right-1" />}
    </>
  )
  return (
    <Tooltip delay={850} disabled={!tooltips}>
      {item.panel ? (
        <TooltipTrigger
          render={<PopoverTrigger controller={controller} payload={item.id} render={<ToolbarButton />} />}
          aria-label={item.label}
          disabled={item.disabled}
          data-tone={item.tone}
          data-dock-item={item.id}
          className={buttonClass}
        >
          {content}
        </TooltipTrigger>
      ) : (
        <TooltipTrigger
          render={<ToolbarButton />}
          aria-label={item.label}
          aria-pressed={item.pressed}
          data-pressed={item.pressed || undefined}
          data-tone={item.tone}
          data-dock-item={item.id}
          disabled={item.disabled}
          onClick={item.onPress}
          className={buttonClass}
        >
          {content}
        </TooltipTrigger>
      )}
      <TooltipContent
        side="top"
        sideOffset={14}
        className={cx(
          "ag-chrome z-50 rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-ag-sm font-medium whitespace-nowrap text-white/90",
          "shadow-[0_2px_8px_rgb(0_0_0/0.3)] origin-(--transform-origin)",
          "transition-[opacity,scale] duration-[135ms] ease-[ease]",
          "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
          "data-instant:transition-none"
        )}
      >
        {item.label}
        {item.shortcut && <kbd className="ml-2 font-chrome text-white/45">{item.shortcut}</kbd>}
        <TooltipArrow
          className={cx(
            "size-2 rotate-45 bg-[#1a1a1a]",
            "data-[side=top]:-bottom-1 data-[side=top]:rounded-br-[2px]",
            "data-[side=bottom]:-top-1 data-[side=bottom]:rounded-tl-[2px]"
          )}
        />
      </TooltipContent>
    </Tooltip>
  )
}

/** The panel a popover controller shows now, or null. */
const popoverPanel = (popover: ReturnType<typeof createPopoverController<string>>) =>
  popover.isOpen() ? (popover.getPayload() ?? null) : null

/**
 * A toolbar for any set of panels, floating over the window: a
 * launcher you can drag anywhere on the screen (it stays 20px inside), which
 * opens into a toolbar of icons with tooltips. Resting the pointer on an icon
 * opens its panel above the toolbar, or below it when there's more room
 * there; moving to the next icon hands the same surface over, which resizes
 * while the content slides toward the new icon (Stripe's menu), and a pill
 * glides behind the icons. A panel the pointer opened closes when the pointer
 * leaves; pressing its icon, or using the panel, keeps it until it's
 * dismissed. The panel keeps clear of the window's edges and, when it's taller
 * than the room it has, shrinks to fit and scrolls inside. It renders into
 * document.body (or `container`), so no ancestor can clip it.
 */
export function Dock({
  items,
  label,
  storageKey = "pg-dock",
  defaultPosition,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
  panel: panelProp,
  onPanelChange,
  badge,
  indicator,
  container,
  layer = 1000,
  attached,
  rootProps,
}: {
  items: DockItem[]
  /** Names the toolbar, like "Theme tools". */
  label: string
  /** Where the dragged position is kept. */
  storageKey?: string
  /** Where it starts before it's ever dragged; the bottom-right corner by default. */
  defaultPosition?: DockPosition
  defaultExpanded?: boolean
  /** Whether the toolbar is open, when its owner keeps that state (a shortcut opens it, say). */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /** The open panel's item id, or null, when its owner keeps that state. */
  panel?: string | null
  onPanelChange?: (panel: string | null) => void
  /** A count on the closed launcher, like pending notes. */
  badge?: number
  /** A dot on the closed launcher, as an item has one: a connection's state, seen before the toolbar opens. */
  indicator?: DockItem["indicator"]
  /** Where it renders: document.body, or an element in a shadow root that keeps its styles apart. */
  container?: Element | DocumentFragment | null
  /** Its z-index. */
  layer?: number
  /** Rendered inside the dock's fixed box, after it: something that positions itself against the dock. */
  attached?: ReactNode
  /** Attributes for the dock's root, which holds its panels too: markers a host app looks for. */
  rootProps?: { [attribute: `data-${string}`]: string | boolean | undefined }
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const [surface, setSurface] = useState<HTMLDivElement | null>(null)
  const [popover] = useState(() => createPopoverController<string>())
  const [toolbar] = useState(createToolbarController)
  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded)
  const expanded = expandedProp ?? ownExpanded
  const setExpanded = (next: boolean) => {
    setOwnExpanded(next)
    onExpandedChange?.(next)
  }
  // The item whose panel is open (the popover's payload), or null.
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const panelOpen = openPanel !== null
  const showPanel = (id: string | null) => {
    setOpenPanel(id)
    onPanelChange?.(id)
  }
  const [position, setPosition] = useState<DockPosition>(() => readPosition(storageKey, defaultPosition))
  const [area, setArea] = useState<Box>(viewportBox)
  const [rowWidth, setRowWidth] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ id: number; x: number; y: number; from: DockPosition; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  // A panel the pointer opened follows it; one opened by a press or a shortcut, or used, stays.
  const pinned = useRef(false)
  const [hovered, setHovered] = useState<string | null>(null)
  // Where each button sits in the row, for the pills.
  const [spots, setSpots] = useState<Record<string, number>>({})

  const openWidth = rowWidth + DOCK.inset * 2
  const width = expanded && rowWidth ? openWidth : DOCK.size
  // Always drawn inside the window, even while the window shrinks.
  const placed = clampPosition(position, area, width)
  const live = useRef({ area, width, placed })
  useLayoutEffect(() => {
    live.current = { area, width, placed }
  })

  useEffect(() => {
    const measure = () => setArea(viewportBox())
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  // An owner that keeps the open panel opens and closes it from here.
  useEffect(() => {
    if (panelProp === undefined || panelProp === popoverPanel(popover)) return
    if (panelProp === null) popover.close()
    else void popover.open({ payload: panelProp })
  }, [panelProp, popover])

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    const next: Record<string, number> = {}
    for (const button of row.querySelectorAll<HTMLElement>("[data-dock-item]")) next[button.dataset.dockItem!] = button.offsetLeft
    setSpots((last) => (JSON.stringify(last) === JSON.stringify(next) ? last : next))
  })

  // The row's natural width sets the open toolbar's. Its box, not its scroll width: a pill
  // left where a button was (one that just went away) would count as overflow.
  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    const measure = () => setRowWidth(row.offsetWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [])

  // Dragging: listeners stay installed so a quick release is never missed.
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = drag.current
      if (!current || event.pointerId !== current.id) return
      const dx = event.clientX - current.x
      const dy = event.clientY - current.y
      if (!current.moved) {
        if (Math.hypot(dx, dy) <= DOCK.threshold) return
        current.moved = true
        setDragging(true)
      }
      const { area: box, width: size } = live.current
      setPosition(clampPosition({ right: current.from.right - dx, bottom: current.from.bottom - dy }, box, size))
    }
    const end = (event: PointerEvent) => {
      const current = drag.current
      if (!current || event.pointerId !== current.id) return
      drag.current = null
      if (!current.moved) return
      justDragged.current = true
      setDragging(false)
      writePosition(storageKey, live.current.placed)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
    }
  }, [storageKey])

  const startDrag = (event: ReactPointerEvent) => {
    justDragged.current = false
    if (event.button !== 0) return
    // The toolbar's buttons press; only its background, or the closed launcher, drags.
    const button = (event.target as HTMLElement).closest("button")
    if (button && (button !== launcherRef.current || expanded)) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: placed, moved: false }
  }

  const toggle = (event: ReactMouseEvent) => {
    if (justDragged.current) {
      justDragged.current = false
      return
    }
    const next = !expanded
    setExpanded(next)
    if (!next) {
      popover.close()
      return
    }
    // Opening near an edge moves the dock back inside, gliding with the toolbar's
    // growth, and it stays there.
    const corrected = clampPosition(position, area, openWidth)
    if (!samePosition(corrected, position)) {
      setPosition(corrected)
      writePosition(storageKey, corrected)
    }
    // From the keyboard, focus follows into the toolbar.
    if (event.detail === 0) requestAnimationFrame(() => toolbar.focus())
  }

  // The hover pill: on the button under the pointer, unless it's off, on, or its panel is open (that's the other pill).
  const hoveredItem = items.find((item) => item.id === hovered)
  const hoverSpot =
    expanded && !dragging && hoveredItem && !hoveredItem.disabled && !hoveredItem.pressed && hoveredItem.id !== openPanel
      ? (spots[hoveredItem.id] ?? null)
      : null

  /** A press or focus that stays on the dock (dragging it, pressing another icon) keeps the panel open. */
  const staysOnDock = (event: Event | undefined) => {
    const target = (event as FocusEvent | undefined)?.relatedTarget ?? event?.target
    return target instanceof Node && !!surface?.contains(target)
  }

  return createPortal(
    <div
      {...rootProps}
      data-dragging={dragging || undefined}
      style={{
        right: placed.right,
        bottom: placed.bottom,
        zIndex: layer,
        // Where the panel's edges go, glued to the dock: see the panel's classes.
        ["--panel-right" as string]: `${placed.right}px`,
        ["--panel-bottom" as string]: `${placed.bottom + DOCK.size + PANEL_GAP}px`,
      }}
      className="fixed transition-[right,bottom] duration-360 ease-glide data-dragging:transition-none motion-reduce:transition-none"
    >
      <div
        ref={setSurface}
        data-expanded={expanded || undefined}
        onPointerDown={startDrag}
        // Pressing the background keeps focus, so an open panel stays open.
        onMouseDown={(event) => {
          if (!(event.target as HTMLElement).closest("button")) event.preventDefault()
        }}
        style={{ width }}
        className={cx(
          "dock-surface relative h-11 touch-none rounded-[22px] bg-[#1a1a1a] text-white select-none",
          "shadow-[0_2px_8px_rgb(0_0_0/0.2),0_4px_16px_rgb(0_0_0/0.1)] animate-[dock-enter_0.5s_cubic-bezier(0.34,1.2,0.64,1)_backwards]",
          "transition-[width,scale,background-color] duration-360 ease-glide motion-reduce:transition-none",
          expanded ? "cursor-grab" : "cursor-pointer hover:bg-[#2a2a2a] active:scale-95",
          dragging && "cursor-grabbing"
        )}
      >
        <Toolbar
          ref={rowRef}
          controller={toolbar}
          aria-label={label}
          inert={!expanded}
          // Escape closes an open panel first (the popover handles it); the next one closes the toolbar.
          onKeyDown={(event) => {
            if (event.key !== "Escape" || panelOpen || event.defaultPrevented) return
            setExpanded(false)
            launcherRef.current?.focus()
          }}
          // Over a gap the pill stays where it was, so it glides instead of blinking.
          onPointerOver={(event) => {
            const id = (event.target as Element).closest<HTMLElement>("[data-dock-item]")?.dataset.dockItem
            if (id) setHovered(id)
          }}
          onPointerLeave={() => setHovered(null)}
          className="dock-row absolute top-[5px] right-[5px] flex items-center gap-1.5"
        >
          <Pill at={expanded && openPanel ? (spots[openPanel] ?? null) : null} className={ACTIVE_BG} />
          <Pill
            at={hoverSpot}
            className={items.find((item) => item.id === hovered)?.tone === "danger" ? "bg-chrome-red/15" : "bg-white/12"}
          />
          {items.map((item) => (
            <Fragment key={item.id}>
              {item.separated && <ToolbarSeparator className={separatorClass} />}
              <DockButton item={item} controller={popover} tooltips={expanded && !panelOpen && !dragging} />
            </Fragment>
          ))}
          <ToolbarSeparator className={separatorClass} />
          {/* The launcher sits over this spot. */}
          <span aria-hidden="true" className="size-[34px] shrink-0" />
        </Toolbar>
        <button
          ref={launcherRef}
          type="button"
          onClick={toggle}
          aria-label={expanded ? `Close ${label.toLowerCase()}` : `Open ${label.toLowerCase()}`}
          aria-expanded={expanded}
          className={cx(
            "dock-launcher group absolute top-0 right-0 grid size-11 place-items-center rounded-full transition-colors duration-150",
            expanded ? "text-white/85 hover:text-white" : "text-white",
            "outline-chrome-focus focus-visible:outline-2 focus-visible:-outline-offset-2"
          )}
        >
          <Glyph open={expanded} />
          {!expanded && badge ? <Badge count={badge} /> : null}
          {/* Bottom right, clear of the count: like a presence dot. */}
          {!expanded && indicator ? <StatusDot state={indicator} className="right-1 bottom-1" /> : null}
        </button>
      </div>

      {attached}

      <Popover
        controller={popover}
        openOnHover
        delay={HOVER_OPEN}
        closeDelay={HOVER_CLOSE}
        onOpenChange={(open, details) => {
          const persistent = items.find((item) => item.id === popover.getPayload())?.persistent
          if (open) {
            pinned.current = details.reason !== "trigger-hover"
          } else {
            // The pointer left a panel that stays.
            if (details.reason === "trigger-hover" && (pinned.current || persistent)) return details.cancel()
            // Pressing the icon of a panel the pointer opened keeps it open instead of closing it.
            if (details.reason === "trigger-press" && !pinned.current) {
              pinned.current = true
              return details.cancel()
            }
            const leaving = details.reason === "outside-press" || details.reason === "focus-out"
            if (leaving && (persistent || staysOnDock(details.event))) return details.cancel()
            pinned.current = false
          }
          showPanel(open ? (popover.getPayload() ?? null) : null)
        }}
        onPayloadChange={(payload, details) => {
          if (details.reason === "trigger-press") pinned.current = true
          if (popover.isOpen()) showPanel(typeof payload === "string" ? payload : null)
        }}
      >
        <PopoverContent<string>
          anchor={surface}
          // The panel itself takes focus, so its close button doesn't light up on a click.
          initialFocus="content"
          side="top"
          align="end"
          sideOffset={PANEL_GAP}
          collisionPadding={12}
          // Using the panel keeps it: a drag can leave it, a field can hold focus.
          onPointerDownCapture={() => {
            pinned.current = true
          }}
          onFocusCapture={() => {
            pinned.current = true
          }}
          // The popover picks the side; its edges by the dock are set from the dock's own place, so a
          // panel resizing between panels never leaves the dock for the frame the popover takes to follow.
          className={cx(
            "group/dock-panel ag-panel-motion relative max-h-(--available-height) outline-none [--panel-max:var(--available-height)]",
            "left-auto! right-(--panel-right)! data-[side=top]:top-auto! data-[side=top]:bottom-(--panel-bottom)!"
          )}
        >
          {(state) =>
            state.payload ? (
              <PanelStage
                id={state.payload}
                order={items.filter((item) => item.panel).map((item) => item.id)}
                render={(id) => items.find((item) => item.id === id)?.panel?.() ?? null}
              />
            ) : null
          }
        </PopoverContent>
      </Popover>
    </div>,
    container ?? document.body
  )
}
