import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs"
import { ArrowLeft, ArrowRight, PanelLeft } from "lucide-react"
import type { ReactNode } from "react"
import { cx } from "surfacent-ui"
import { pageHref } from "../route"
import { CodeBlock } from "./CodeBlock"
import { useShell } from "./context"
import type { PageMeta } from "./types"

const iconButton = cx(
  "grid size-8 shrink-0 place-items-center rounded-full text-pg-muted transition-colors duration-150",
  "hover:bg-pg-hover hover:text-pg-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-focus",
  "aria-disabled:pointer-events-none aria-disabled:opacity-35"
)

/** The rounded card the page scrolls in, with the sidebar toggle in its corner. */
export function Inset({ children }: { children: ReactNode }) {
  const { sidebarOpen, toggleSidebar } = useShell()
  return (
    <main
      className={cx(
        "m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-pg-inset shadow-(--pg-inset-shadow) xl:mr-0",
        sidebarOpen && "ml-0"
      )}
    >
      <div id="main-content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="pointer-events-none sticky top-0 z-10 flex h-12 items-center px-3 *:pointer-events-auto">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Hide the sidebar" : "Show the sidebar"}
            aria-keyshortcuts="["
            title="Sidebar ( [ )"
            className={iconButton}
          >
            <PanelLeft aria-hidden="true" strokeWidth={1.75} className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </main>
  )
}

function PageArrow({ direction, page }: { direction: "previous" | "next"; page?: PageMeta }) {
  const Icon = direction === "previous" ? ArrowLeft : ArrowRight
  const label = direction === "previous" ? "Previous" : "Next"
  return (
    <a
      href={page ? pageHref(page.id) : undefined}
      aria-label={page ? `${label}: ${page.title}` : label}
      aria-disabled={page ? undefined : true}
      title={page ? `${label}: ${page.title}` : undefined}
      className={iconButton}
    >
      <Icon aria-hidden="true" strokeWidth={1.75} className="size-4" />
    </a>
  )
}

export function PageHeader({ meta, previous, next }: { meta: PageMeta; previous?: PageMeta; next?: PageMeta }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {meta.group && <p className="m-0 text-xs/4 text-pg-faint">{meta.group}</p>}
          <h1 className="m-0 text-[28px]/9 font-semibold tracking-[-0.02em] text-pg-text">{meta.title}</h1>
        </div>
        <nav aria-label="Neighboring elements" className={cx("flex gap-1", meta.group ? "pt-5" : "pt-1")}>
          <PageArrow direction="previous" page={previous} />
          <PageArrow direction="next" page={next} />
        </nav>
      </div>
      <p className="m-0 max-w-2xl text-[13px]/5 text-pg-muted">{meta.description}</p>
    </header>
  )
}

const tab = cx(
  "relative z-[1] flex h-8 items-center rounded-full px-3 text-[13px] font-medium text-pg-muted transition-colors duration-150",
  "hover:text-pg-text data-selected:text-pg-text data-disabled:cursor-not-allowed data-disabled:opacity-40",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-focus"
)

const stage = {
  center: "relative flex min-h-[360px] items-center justify-center overflow-x-auto px-6 py-12 sm:px-10",
  flow: "relative px-6 py-8 sm:px-8",
}

/**
 * A hairline frame with Preview and Code tabs (ui-sdk Tabs): Preview shows
 * the live element, Code the same thing as paste-ready source with a copy
 * button. The stage centers one element, or lets a sheet of content flow
 * from the top.
 */
export function PreviewCard({
  code,
  caption,
  layout = "center",
  stageClassName,
  children,
}: {
  code?: string
  caption?: ReactNode
  layout?: keyof typeof stage
  stageClassName?: string
  children: ReactNode
}) {
  return (
    <Tabs defaultValue="preview" className="flex w-full flex-col rounded-[28px] border border-pg-line">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-pg-line px-3 py-2.5">
        <TabsList aria-label="View" className="relative flex items-center gap-1">
          <TabsIndicator
            className={cx(
              "absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width)",
              "rounded-full bg-pg-active transition-[left,width] duration-200 ease-drawer"
            )}
          />
          <TabsTab value="preview" className={tab}>
            Preview
          </TabsTab>
          <TabsTab value="code" disabled={!code} className={tab}>
            Code
          </TabsTab>
        </TabsList>
        {caption && <span className="truncate pr-2 text-[13px] text-pg-muted">{caption}</span>}
      </div>
      <TabsPanel value="preview" className="outline-none">
        <div className={cx(stage[layout], stageClassName)}>{children}</div>
      </TabsPanel>
      <TabsPanel value="code" className="outline-none">
        {code && <CodeBlock code={code} />}
      </TabsPanel>
    </Tabs>
  )
}
