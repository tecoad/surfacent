import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle"
import { cx } from "surfacent-ui"
import { exampleName, snippetSource } from "../snippet"
import { PanelFrame } from "./frames"
import { Inset, PageHeader, PreviewCard } from "./parts"
import type { PageProps, StateDef } from "./types"

/**
 * One element's page, laid out like the plez playground: the inset card with
 * the title and the Preview | Code card, and beside it the panel of mapped
 * states. Below 1280px the states drop under the card.
 */
export function StatePage({
  meta,
  previous,
  next,
  stateId,
  onStateChange,
  states,
  frame = "panel",
  stageClassName,
}: PageProps & {
  states: StateDef[]
  /** "panel" puts each state in the panel's card; "bare" shows it as is. */
  frame?: "panel" | "bare"
  stageClassName?: string
}) {
  const current = states.find((state) => state.id === stateId) ?? states[0]
  const panel = <StatesPanel states={states} value={current.id} onValueChange={onStateChange} />
  const content = current.render()
  const code = current.code && snippetSource(current.code, exampleName(meta.title))

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <Inset>
        <article className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-8 px-6 pt-2 pb-24 sm:px-10">
          <PageHeader meta={meta} previous={previous} next={next} />
          <div className="flex flex-col gap-3">
            <PreviewCard
              code={code}
              caption={
                <>
                  {current.group ? `${current.group} · ` : ""}
                  <span className="text-pg-text">{current.label}</span>
                </>
              }
              stageClassName={stageClassName}
            >
              {/* A new state starts fresh. */}
              <div key={current.id} className="contents">
                {(current.frame ?? frame) === "panel" ? <PanelFrame>{content}</PanelFrame> : content}
              </div>
            </PreviewCard>
            {current.note && <p className="m-0 px-1 text-[13px]/5 text-pg-muted">{current.note}</p>}
          </div>
          <div className="xl:hidden">{panel}</div>
        </article>
      </Inset>
      <aside aria-label="States" className="hidden w-72 shrink-0 overflow-y-auto overscroll-contain xl:block">
        <div className="py-5 pr-5 pl-3">{panel}</div>
      </aside>
    </div>
  )
}

/**
 * The mapped states, in titled groups split by hairlines. One vertical ui-sdk
 * Toggle Group: ↑/↓ move between rows, Enter or Space shows that state.
 */
function StatesPanel({
  states,
  value,
  onValueChange,
}: {
  states: StateDef[]
  value: string
  onValueChange: (id: string) => void
}) {
  const groups: { title: string; states: StateDef[] }[] = []
  for (const state of states) {
    const title = state.group ?? "States"
    const group = groups.find((item) => item.title === title)
    if (group) group.states.push(state)
    else groups.push({ title, states: [state] })
  }

  return (
    <ToggleGroup
      aria-label="Mapped states"
      orientation="vertical"
      value={[value]}
      deselectable={false}
      onValueChange={(next) => next[0] && onValueChange(next[0] as string)}
      className="flex flex-col"
    >
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5 [&+&]:mt-3 [&+&]:border-t [&+&]:border-pg-line [&+&]:pt-3">
          <p className="m-0 flex h-8 items-center px-2 text-[13px] font-medium text-pg-text">{group.title}</p>
          {group.states.map((state) => (
            <Toggle
              key={state.id}
              value={state.id}
              className={cx(
                "group flex h-9 w-full items-center justify-between gap-3 rounded-full px-2 text-left text-[13px] text-pg-muted",
                "transition-colors duration-150 hover:bg-pg-hover hover:text-pg-text data-pressed:bg-pg-active data-pressed:text-pg-text",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chrome-focus"
              )}
            >
              <span className="truncate">{state.label}</span>
              <span
                aria-hidden="true"
                className={cx(
                  "grid size-4 shrink-0 place-items-center rounded-full border border-pg-faint transition-colors duration-150",
                  "group-data-pressed:border-chrome-accent group-data-pressed:bg-chrome-accent"
                )}
              >
                <span className="size-1.5 scale-0 rounded-full bg-white transition-transform duration-150 group-data-pressed:scale-100" />
              </span>
            </Toggle>
          ))}
        </div>
      ))}
    </ToggleGroup>
  )
}
