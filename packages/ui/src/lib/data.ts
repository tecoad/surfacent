import type { CSSProperties } from "react"

export type ThemeId = "base" | "canvas" | "felt" | "jelly" | "paper" | "alloy"

export type ThemePreset = {
  id: ThemeId
  name: string
  /** The sample button each preset shows in the Themes popup. */
  chip: CSSProperties
}

const inter = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
const grotesk = '"GT Standard", -apple-system, BlinkMacSystemFont, sans-serif'
const rounded = '"GT Maru", ui-rounded, "SF Pro Rounded", -apple-system, sans-serif'

export const THEMES: ThemePreset[] = [
  {
    id: "base",
    name: "Base",
    chip: {
      background: "#ffffff",
      color: "#000000",
      borderRadius: 8,
      boxShadow: "0 0 0 1px rgb(255 255 255 / 0.2)",
      font: `500 14px/20px ${inter}`,
      letterSpacing: "0.01em",
      padding: "8px 16px",
    },
  },
  {
    id: "canvas",
    name: "Canvas",
    chip: {
      background: "#f4f83b",
      color: "#202020",
      borderRadius: 6,
      boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.1)",
      font: `500 16px/24px ${grotesk}`,
      padding: "8px 16px",
    },
  },
  {
    id: "felt",
    name: "Felt",
    chip: {
      background: "#ffffff",
      color: "#000000",
      borderRadius: 8,
      font: `500 14px/20px ${grotesk}`,
      letterSpacing: "0.01em",
      padding: "12px 24px",
    },
  },
  {
    id: "jelly",
    name: "Jelly",
    chip: {
      background: "#00c853",
      color: "#241f16",
      borderRadius: 9999,
      font: `700 14px/20px ${rounded}`,
      letterSpacing: "0.01em",
      padding: "12px 24px",
    },
  },
  {
    id: "paper",
    name: "Paper",
    chip: {
      background: "#cbb4ef",
      color: "#20201c",
      borderRadius: 8,
      font: `500 14px/20px ${inter}`,
      letterSpacing: "0.01em",
      padding: "8px 16px",
    },
  },
  {
    id: "alloy",
    name: "Alloy",
    chip: {
      background:
        "linear-gradient(rgb(250 250 250 / 0.1), rgb(23 23 25 / 0.12)), #fafafa",
      color: "#171719",
      borderRadius: 8,
      boxShadow:
        "0 0 0 1px rgb(128 128 138 / 0.2), 0 0.25px 0.75px rgb(23 23 25 / 0.05), 0 1px 3px rgb(23 23 25 / 0.075)",
      font: `500 14px/20px ${inter}`,
      letterSpacing: "0.01em",
      padding: "8px 16px",
    },
  },
]

export function themeName(id: ThemeId) {
  return THEMES.find((theme) => theme.id === id)?.name ?? id
}

/** Canvas's brand palette, in the order the color wheel shows it. */
export const CANVAS_COLORS = [
  "#76ef6b",
  "#f4f83b",
  "#00c9bb",
  "#009ff0",
  "#e864ff",
  "#e5e5e5",
  "#ffa344",
]

export const MOTION_OPTIONS = ["Snappy", "Gentle", "None"]
export const NEUTRAL_OPTIONS = ["Mono", "Cool", "Warm"]

/** Two-state rows: the key and value each side shows. */
export const PRIMARY_ACTION = {
  label: "Primary action",
  on: { key: "Primary action", value: "Brand" },
  off: { key: "Primary action", value: "Neutral" },
}

export const TYPOGRAPHY = {
  label: "Typography licensing",
  on: { key: "Licensed", value: "GT Standard M" },
  off: { key: "Free", value: "Geist" },
}

export const ICONS = {
  label: "Icons licensing",
  on: { key: "Licensed", value: "Central" },
  off: { key: "Free", value: "Lucide" },
}

export type Character = { x: number; y: number }

export type PanelSettings = {
  theme: ThemeId
  character: Character
  motion: string
  colors: string[]
  color: number
  neutrals: string
  primaryBrand: boolean
  typographyLicensed: boolean
  iconsLicensed: boolean
}

/** The public preview's starting point (Canvas). */
export const PREVIEW_SETTINGS: PanelSettings = {
  theme: "canvas",
  character: { x: 50, y: 50 },
  motion: "Snappy",
  colors: CANVAS_COLORS,
  color: 1,
  neutrals: "Mono",
  primaryBrand: true,
  typographyLicensed: true,
  iconsLicensed: true,
}

/** The "Untitled" project from the reference screenshot. */
export const PROJECT_SETTINGS: PanelSettings = {
  ...PREVIEW_SETTINGS,
  color: 6,
  neutrals: "Warm",
  primaryBrand: false,
}
