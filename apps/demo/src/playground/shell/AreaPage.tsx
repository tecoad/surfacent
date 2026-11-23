import type { ReactNode } from "react"
import { exampleName, snippetSource, type Snippet } from "../snippet"
import { Inset, PageHeader, PreviewCard } from "./parts"
import type { PageProps } from "./types"

/**
 * A page with one example and no states: the header over a Preview | Code
 * card whose content runs down the page (the tokens, the dock's guide).
 * `floating` renders outside the card, so it stays while the Code tab is
 * open: the dock, which floats over the whole window.
 */
export function AreaPage({
  meta,
  previous,
  next,
  code,
  floating,
  children,
}: Pick<PageProps, "meta" | "previous" | "next"> & {
  code?: Snippet
  floating?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <Inset>
        <article className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 px-6 pt-2 pb-24 sm:px-10">
          <PageHeader meta={meta} previous={previous} next={next} />
          <PreviewCard layout="flow" code={code && snippetSource(code, exampleName(meta.title))}>
            {children}
          </PreviewCard>
        </article>
      </Inset>
      {floating}
    </div>
  )
}
