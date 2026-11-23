import { solveSpring } from "@ui-sdk/core/gesture"

export type Curve = [number, number, number, number]

/** The y of a CSS cubic-bezier at progress x, solved by bisection. */
export function bezierAt([x1, y1, x2, y2]: Curve, x: number) {
  const coord = (t: number, a: number, b: number) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t
  let lo = 0
  let hi = 1
  let t = x
  for (let i = 0; i < 24; i++) {
    t = (lo + hi) / 2
    if (coord(t, x1, x2) < x) lo = t
    else hi = t
  }
  return coord(t, y1, y2)
}

/** Progress (0 → 1, overshooting with bounce) of a spring over normalized time. */
export function springAt(bounce: number, t: number) {
  const damping = Math.max(0.05, 1 - bounce / 100)
  const spring = solveSpring(1, damping, 1, 0)
  // The solver takes milliseconds: sample 0–1.4s of a 1s spring.
  return 1 - spring.position(t * 1400)
}

/** Samples a curve into an SVG polyline inside a box, y growing upward. */
export function curvePath(
  at: (x: number) => number,
  box: { x: number; y: number; width: number; height: number },
  samples = 64
) {
  const points: string[] = []
  for (let i = 0; i <= samples; i++) {
    const x = i / samples
    const y = at(x)
    points.push(
      `${i ? "L" : "M"} ${(box.x + x * box.width).toFixed(2)} ${(box.y + box.height - y * box.height).toFixed(2)}`
    )
  }
  return points.join(" ")
}

export function formatCurve(curve: Curve) {
  return curve.map((value) => Number(value.toFixed(2))).join(", ")
}

export function parseCurve(text: string): Curve | null {
  const parts = text.split(/[\s,]+/).filter(Boolean).map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [x1, y1, x2, y2] = parts
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null
  return [x1, y1, x2, y2]
}
