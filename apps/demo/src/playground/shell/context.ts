import { createContext, useContext } from "react"

export type Theme = "dark" | "light"

export const ShellContext = createContext<{
  sidebarOpen: boolean
  toggleSidebar: () => void
}>({ sidebarOpen: true, toggleSidebar: () => {} })

export const useShell = () => useContext(ShellContext)

/** The saved theme, as index.html painted it. */
export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark"
}

export function writeTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem("pg-theme", theme)
  } catch {
    // Private windows can refuse storage; the theme still applies.
  }
}

/** Keys typed into a field are text, not shortcuts. */
export function isTyping(event: KeyboardEvent) {
  const el = event.target as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}
