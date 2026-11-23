import { convertColor, formatColor, parseColor, toGamut } from "@ui-sdk/core/color"

/** A color's OKLCH channels: lightness 0 to 1, chroma, and hue in degrees, null for a grey. */
export type Oklch = { l: number; c: number; h: number | null }

/** Any CSS color (hex, oklch(), color(display-p3 …)…) as OKLCH; null when it isn't one. */
export function toOklch(css: string): Oklch | null {
  const color = parseColor(css.trim())
  if (!color) return null
  const [l, c, h] = convertColor(color, "oklch").coords
  return { l: l ?? 0, c: c ?? 0, h }
}

/** Any CSS color as hex. A wider one is mapped into sRGB first, keeping its lightness and hue. */
export function toHex(css: string): string {
  const color = parseColor(css.trim())
  return color ? formatColor(toGamut(color, "srgb"), "hex") : css
}

/** Any CSS color written as hex, `oklch()` or `color(display-p3 …)`, mapped into that format's gamut. */
export function formatAs(css: string, format: "hex" | "oklch" | "display-p3"): string {
  const color = parseColor(css.trim())
  if (!color) return css
  if (format === "hex") return formatColor(toGamut(color, "srgb"), "hex")
  if (format === "oklch") return formatColor(convertColor(color, "oklch"), "oklch")
  return formatColor(toGamut(convertColor(color, "display-p3"), "p3"), "display-p3")
}
