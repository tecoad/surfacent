/** One radius, or [top-left, top-right, bottom-right, bottom-left]. */
export type Radius = number | readonly [number, number, number, number]

/** A plain CSS border-radius: the toolbar draws ordinary rounded corners. */
export function radiusCss(radius: Radius) {
  return typeof radius === "number" ? `${radius}px` : radius.map((r) => `${r}px`).join(" ")
}
