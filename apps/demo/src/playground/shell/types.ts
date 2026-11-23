import type { ReactNode } from "react"
import type { Snippet } from "../snippet"

/** One mapped state of an element: a row in the states panel, a render in the preview. */
export type StateDef = {
  id: string
  label: string
  /** The states panel groups rows under this title ("States" when left out). */
  group?: string
  /** A line under the preview while this state shows. */
  note?: string
  /** Overrides the page's frame: "panel" wraps the render in the panel card, "bare" doesn't. */
  frame?: "panel" | "bare"
  render: () => ReactNode
  /** What the Code tab prints and copies for this state. */
  code?: Snippet
}

export type PageMeta = {
  id: string
  title: string
  description: string
  /** The sidebar group; a page without one sits at the top of the sidebar. */
  group?: string
}

/** What the shell hands every page. */
export type PageProps = {
  meta: PageMeta
  previous?: PageMeta
  next?: PageMeta
  stateId: string | null
  onStateChange: (id: string) => void
}
