import { Moon, PanelsTopLeft, Search, Sun } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cx, ScrollArea } from "surfacent-ui"
import { GROUPS, PAGES, TOP_PAGES } from "../registry"
import { pageHref } from "../route"
import type { Theme } from "./context"

/**
 * The elements, grouped by where they live in the panel, with search (⌘K)
 * and the theme toggle (D) at the foot, as in the plez playground.
 */
export function Sidebar({
  open,
  pageId,
  theme,
  onToggleTheme,
}: {
  open: boolean
  pageId: string
  theme: Theme
  onToggleTheme: () => void
}) {
  const [query, setQuery] = useState("")
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  // Keep the current element in view as prev/next and links move through the list.
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" })
  }, [pageId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return
      event.preventDefault()
      search.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const needle = query.trim().toLowerCase()
  const matches = (title: string) => title.toLowerCase().includes(needle)
  const top = TOP_PAGES.filter((page) => matches(page.title))
  const groups = GROUPS.map((group) => ({
    group,
    pages: PAGES.filter((page) => page.group === group && matches(page.title)),
  })).filter((entry) => entry.pages.length > 0)
  const ThemeIcon = theme === "dark" ? Sun : Moon

  return (
    <nav
      aria-label="Elements"
      inert={!open}
      className={cx(
        "flex h-full w-64 shrink-0 flex-col transition-[margin,opacity] duration-200 ease-drawer",
        open ? "ml-0 opacity-100" : "-ml-64 opacity-0"
      )}
    >
      <div className="flex flex-col gap-1 px-2 pt-3 pb-2">
        <div className="flex h-8 items-center gap-2 px-2">
          <span className="grid size-5 place-items-center rounded-md bg-chrome-accent text-[11px] font-semibold text-white">
            S
          </span>
          <span className="truncate text-[13px] font-medium">Surfacent</span>
          <span className="truncate text-[13px] text-pg-faint">Playground</span>
        </div>
        <label className="flex h-8 items-center gap-2 rounded-full px-2 text-pg-muted transition-colors duration-150 focus-within:bg-pg-hover hover:bg-pg-hover">
          <Search aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("")
                event.currentTarget.blur()
              }
            }}
            placeholder="Search elements…"
            aria-label="Search elements"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-pg-text outline-none placeholder:text-pg-muted [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="font-sans text-[11px] text-pg-faint">⌘K</kbd>
        </label>
      </div>

      <ScrollArea viewportRef={list} scrollbar={false} className="flex-1" contentClassName="px-2 pb-3">
        {/* Pages outside the groups, like plez's Overview: an icon, no dot. */}
        {top.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-px p-0">
            {top.map((page) => {
              const active = page.id === pageId
              return (
                <li key={page.id}>
                  <a
                    href={pageHref(page.id)}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex h-8 items-center gap-2 rounded-full px-2 text-[13px] no-underline transition-colors duration-150",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chrome-focus",
                      active ? "bg-pg-active text-pg-text" : "text-pg-text/85 hover:bg-pg-hover hover:text-pg-text"
                    )}
                  >
                    <PanelsTopLeft
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={cx("size-4 shrink-0", active ? "text-chrome-accent" : "text-pg-muted")}
                    />
                    <span className="truncate">{page.title}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
        {groups.map(({ group, pages }) => (
          <section key={group} aria-labelledby={`group-${group}`} className="mt-3 first:mt-1">
            <h2 id={`group-${group}`} className="m-0 flex h-8 items-center px-2 text-xs font-normal text-pg-muted">
              {group}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-px p-0">
              {pages.map((page) => {
                const active = page.id === pageId
                return (
                  <li key={page.id}>
                    <a
                      href={pageHref(page.id)}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        // The margin keeps a group's title in view above its first row.
                        "group flex h-8 scroll-mt-10 items-center gap-2.5 rounded-full px-2 text-[13px] no-underline transition-colors duration-150",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chrome-focus",
                        active ? "bg-pg-active text-pg-text" : "text-pg-text/85 hover:bg-pg-hover hover:text-pg-text"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          "size-2 shrink-0 rounded-full border transition-colors duration-150",
                          active ? "border-chrome-accent bg-chrome-accent" : "border-pg-faint"
                        )}
                      />
                      <span className="truncate">{page.title}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {groups.length === 0 && top.length === 0 && <p className="m-0 px-2 py-3 text-[13px] text-pg-muted">Nothing matches “{query}”.</p>}
      </ScrollArea>

      <div className="flex justify-end px-3 pb-3">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Light theme" : "Dark theme"}
          aria-keyshortcuts="D"
          title="Toggle theme (D)"
          className="grid size-7 place-items-center rounded-full text-pg-muted transition-colors duration-150 hover:bg-pg-hover hover:text-pg-text focus-visible:outline-2 focus-visible:outline-chrome-focus"
        >
          <ThemeIcon aria-hidden="true" strokeWidth={1.75} className="size-4" />
        </button>
      </div>
    </nav>
  )
}
