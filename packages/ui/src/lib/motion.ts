/** A cubic-bezier timing function for script-driven tweens: progress t → eased value. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const coord = (s: number, a: number, b: number) =>
    3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s
  return (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let lo = 0
    let hi = 1
    let s = t
    for (let i = 0; i < 20; i++) {
      s = (lo + hi) / 2
      if (coord(s, x1, x2) < t) lo = s
      else hi = s
    }
    return coord(s, y1, y2)
  }
}

/** The settle (the toolbar's own move): cubic-bezier(.19, 1, .22, 1). */
export const easeGlide = cubicBezier(0.19, 1, 0.22, 1)

/** The accordion easing: cubic-bezier(.16, 1, .3, 1). */
export const easeOutExpo = cubicBezier(0.16, 1, 0.3, 1)
