/** The toolbar's geometry and the dock's position in the window. */
export const DOCK = {
  /** The collapsed launcher and the toolbar's height. */
  size: 44,
  /** Kept from the window's edges. */
  edge: 20,
  /** A press must travel this far before it drags. */
  threshold: 10,
  /** The toolbar's padding around its 34px buttons. */
  inset: 5,
}

/** Distances from the window's right and bottom edges, so the dock keeps its corner as the window resizes. */
export type DockPosition = { right: number; bottom: number }

export type Box = { width: number; height: number }

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

/** The window without its scrollbars. */
export const viewportBox = (): Box => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
})

/** Keeps the dock, at `width`, inside the window: the edge correction. */
export function clampPosition(position: DockPosition, area: Box, width: number): DockPosition {
  if (!area.width || !area.height) return position
  return {
    right: clamp(position.right, DOCK.edge, area.width - DOCK.edge - width),
    bottom: clamp(position.bottom, DOCK.edge, area.height - DOCK.edge - DOCK.size),
  }
}

export const samePosition = (a: DockPosition, b: DockPosition) => a.right === b.right && a.bottom === b.bottom

/** The default spot: the bottom-right corner. */
export const CORNER: DockPosition = { right: DOCK.edge, bottom: DOCK.edge }

/** Where the dock was left, per key; `fallback` the first time. */
export function readPosition(key: string, fallback: DockPosition = CORNER): DockPosition {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "")
    if (typeof saved?.right === "number" && typeof saved?.bottom === "number") return saved
  } catch {
    // Nothing saved, or storage is off.
  }
  return fallback
}

export function writePosition(key: string, position: DockPosition) {
  try {
    localStorage.setItem(key, JSON.stringify(position))
  } catch {
    // Private windows can refuse storage; the dock still moves.
  }
}
