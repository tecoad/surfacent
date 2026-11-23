/** Values the Edit page starts from: the "Untitled" project as it was mapped. */

export type NamedColor = { name: string; hex: string }

export const PALETTE: NamedColor[] = [
  { name: "Color 1", hex: "#FFA344" },
  { name: "Color 2", hex: "#00C9BB" },
  { name: "Color 3", hex: "#76EF6B" },
  { name: "Color 4", hex: "#E864FF" },
]

export const NEUTRALS: NamedColor[] = [
  "#FFFFFF",
  "#FAFAF9",
  "#F2F0EC",
  "#E1DDD5",
  "#CBC5B9",
  "#9B968A",
  "#716C61",
  "#4A453B",
  "#29241B",
  "#000000",
].map((hex, index) => ({ name: `Neutral ${index + 1}`, hex }))

export const STATUS: NamedColor[] = [
  { name: "Success", hex: "#76EF6B" },
  { name: "Warning", hex: "#FFA344" },
  { name: "Error", hex: "#FF5263" },
]

/** Opacity steps every color comes in: full, translucent, transparent. */
export const OPACITIES = [
  { value: "100", label: "Full", meta: "100%" },
  { value: "40", label: "Translucent", meta: "40%" },
  { value: "20", label: "Transparent", meta: "20%" },
]

export type FontOption = { name: string; paid: boolean; family: string }

const system = "-apple-system, BlinkMacSystemFont, sans-serif"

export const CURATED_FONTS: FontOption[] = [
  { name: "System sans", paid: false, family: system },
  { name: "GT Standard", paid: true, family: `"GT Standard", ${system}` },
  { name: "GT Standard M", paid: true, family: `"GT Standard M", ${system}` },
  { name: "GT America", paid: true, family: `"GT America", ${system}` },
  { name: "GT Maru", paid: true, family: `"GT Maru", ui-rounded, ${system}` },
  { name: "Kecal", paid: false, family: `"Kecal", ${system}` },
  { name: "Mluvka", paid: false, family: `"Mluvka", ${system}` },
  { name: "Timeless Grotesk", paid: false, family: `"Timeless Grotesk", ${system}` },
  { name: "Timeless Sans", paid: false, family: `"Timeless Sans", ${system}` },
  { name: "Timeless Serif", paid: false, family: `"Timeless Serif", Georgia, serif` },
  { name: "GT Super Text", paid: true, family: `"GT Super Text", Georgia, serif` },
  { name: "LT Superior Serif", paid: false, family: `"LT Superior Serif", Georgia, serif` },
  { name: "Georgia", paid: false, family: "Georgia, serif" },
  { name: "Open Runde", paid: false, family: `"Open Runde", ui-rounded, ${system}` },
  { name: "Inter", paid: false, family: `Inter, ${system}` },
  { name: "Geist", paid: false, family: `Geist, ${system}` },
  { name: "Geist Mono", paid: false, family: `"Geist Mono", ui-monospace, monospace` },
]

export const GOOGLE_FONTS = [
  "ABeeZee",
  "Abel",
  "Abhaya Libre",
  "Aboreto",
  "Abril Fatface",
  "Abyssinica SIL",
  "Aclonica",
  "Acme",
  "Actor",
  "Adamina",
  "Advent Pro",
  "Alegreya",
].map((name) => ({ name, paid: false, family: `"${name}", ${system}` }))

export type FontRole = {
  role: "Data" | "Body" | "Display"
  font: string
  weights: { regular: number; medium: number; heavy: number }
}

export const FONT_ROLES: FontRole[] = [
  { role: "Data", font: "Geist Mono", weights: { regular: 400, medium: 500, heavy: 700 } },
  { role: "Body", font: "Geist", weights: { regular: 400, medium: 500, heavy: 700 } },
  { role: "Display", font: "Geist", weights: { regular: 400, medium: 500, heavy: 700 } },
]

export type ScaleStep = { unit: string; size: number; height: number }

export const TYPE_SCALE: ScaleStep[] = [
  { unit: "XXS", size: 10, height: 14 },
  { unit: "XS", size: 12, height: 16 },
  { unit: "S", size: 14, height: 20 },
  { unit: "M", size: 16, height: 24 },
  { unit: "L", size: 24, height: 32 },
  { unit: "XL", size: 36, height: 40 },
  { unit: "XXL", size: 48, height: 52 },
]

export const SPACING = [
  { unit: "XXS", value: 4 },
  { unit: "XS", value: 9 },
  { unit: "S", value: 13 },
  { unit: "M", value: 18 },
  { unit: "L", value: 26 },
  { unit: "XL", value: 35 },
  { unit: "XXL", value: 53 },
]

export const LETTER_SPACING = [
  { unit: "XS", value: -1.5 },
  { unit: "S", value: -1 },
  { unit: "M", value: 0 },
  { unit: "L", value: 1 },
  { unit: "XL", value: 2 },
]

export const RADII = [
  { unit: "XS", value: 3 },
  { unit: "S", value: 6 },
  { unit: "M", value: 9 },
  { unit: "L", value: 17 },
  { unit: "XL", value: 26 },
]

export const BORDERS = [
  { unit: "S", value: 1 },
  { unit: "M", value: 1 },
  { unit: "L", value: 2 },
]

export type Shadow = {
  id: "s" | "m" | "l"
  position: "outer" | "inner"
  style: "simple" | "soft"
  color: string
  colorOpacity: string
  opacity: number
  x: number
  y: number
  blur: number
  spread: number
}

export const SHADOWS: Shadow[] = [
  { id: "s", position: "outer", style: "soft", color: "Neutral 10", colorOpacity: "100", opacity: 0, x: 0, y: 1, blur: 2, spread: 0 },
  { id: "m", position: "outer", style: "soft", color: "Neutral 10", colorOpacity: "100", opacity: 0, x: 0, y: 8, blur: 24, spread: 0 },
  { id: "l", position: "outer", style: "soft", color: "Neutral 10", colorOpacity: "100", opacity: 0, x: 0, y: 12, blur: 30, spread: 0 },
]

export const SHADOW_POSITIONS = [
  { value: "outer", label: "Outer" },
  { value: "inner", label: "Inner" },
]

export const SHADOW_STYLES = [
  { value: "simple", label: "Simple" },
  { value: "soft", label: "Soft" },
]

export const ICON_FAMILIES = [
  { value: "Lucide", label: "Lucide", meta: "Free" },
  { value: "Phosphor", label: "Phosphor", meta: "Free" },
  { value: "Central", label: "Central", meta: "Licensed" },
  { value: "Hugeicons", label: "Hugeicons", meta: "Free + licensed" },
]

export const ICON_WEIGHTS = ["1", "1.5", "2"]

export type Motion = {
  id: "small" | "large"
  title: string
  description: string
  type: "easing" | "spring"
  curve: [number, number, number, number]
  duration: number
  bounce: number
}

export const MOTIONS: Motion[] = [
  {
    id: "small",
    title: "Small motion",
    description: "Buttons, toggles, and menus",
    type: "easing",
    curve: [0.2, 0.8, 0.2, 1],
    duration: 150,
    bounce: 20,
  },
  {
    id: "large",
    title: "Large motion",
    description: "Dialogs, drawers, and panels",
    type: "easing",
    curve: [0.16, 1, 0.3, 1],
    duration: 300,
    bounce: 20,
  },
]

/** The color groups every color menu offers. */
export const COLOR_GROUPS: { label: string; colors: NamedColor[] }[] = [
  { label: "Palette", colors: PALETTE },
  { label: "Neutrals", colors: NEUTRALS },
  { label: "Status", colors: STATUS },
]

export function hexOf(name: string) {
  for (const group of COLOR_GROUPS) {
    const found = group.colors.find((color) => color.name === name)
    if (found) return found.hex
  }
  return null
}

/** A shadow as CSS, mixing its opacity into the color. */
export function shadowCss(shadow: Shadow) {
  const hex = hexOf(shadow.color) ?? "#000000"
  const alpha = Math.round((shadow.opacity / 100) * (Number(shadow.colorOpacity) / 100) * 255)
    .toString(16)
    .padStart(2, "0")
  const inset = shadow.position === "inner" ? "inset " : ""
  return `${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${hex}${alpha}`
}

