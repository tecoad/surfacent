import { useEffect, useState } from "react"
import { PAGES, findPage, neighbors } from "../registry"
import { replaceState, useRoute } from "../route"
import { ShellContext, isTyping, readTheme, writeTheme, type Theme } from "./context"
import { Sidebar } from "./Sidebar"

/**
 * The playground: elements on the left, the chosen one in the middle and its
 * mapped states on the right. `[` hides the sidebar, `D` switches the theme.
 */
export function PlaygroundShell() {
  const route = useRoute()
  const entry = findPage(route.page) ?? PAGES[0]
  const { previous, next } = neighbors(entry.id)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [theme, setTheme] = useState<Theme>(readTheme)

  const toggleTheme = () =>
    setTheme((current) => {
      const nextTheme = current === "dark" ? "light" : "dark"
      writeTheme(nextTheme)
      return nextTheme
    })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event)) return
      if (event.key === "[") setSidebarOpen((open) => !open)
      else if (event.key.toLowerCase() === "d") {
        setTheme((current) => {
          const nextTheme = current === "dark" ? "light" : "dark"
          writeTheme(nextTheme)
          return nextTheme
        })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    document.title = `${entry.title} · Surfacent Playground`
    document.getElementById("main-content")?.scrollTo({ top: 0 })
  }, [entry.id, entry.title])

  const Page = entry.component
  const meta = { id: entry.id, title: entry.title, description: entry.description, group: entry.group }

  return (
    <ShellContext.Provider value={{ sidebarOpen, toggleSidebar: () => setSidebarOpen((open) => !open) }}>
      <div className="flex h-dvh overflow-hidden bg-pg-bg text-pg-text">
        <Sidebar open={sidebarOpen} pageId={entry.id} theme={theme} onToggleTheme={toggleTheme} />
        <Page
          key={entry.id}
          meta={meta}
          previous={previous}
          next={next}
          stateId={route.state}
          onStateChange={(state) => replaceState(entry.id, state)}
        />
      </div>
    </ShellContext.Provider>
  )
}
