import { Button } from "@ui-sdk/react/button"
import { ChevronLeft } from "lucide-react"
import { useId, type ReactNode, type Ref } from "react"
import { cx } from "../../lib/cx"
import {
  ProjectNameDisplay,
  ProjectNameInput,
  ProjectNameRoot,
} from "../../primitives/parts"
import { SlidersIcon } from "./icons"

/** "Edit" + sliders, as a header button: dim text, a 10% wash on hover. */
export function EditButton({
  onClick,
  buttonRef,
  force,
}: {
  onClick?: () => void
  buttonRef?: Ref<HTMLButtonElement>
  force?: string
}) {
  return (
    <Button
      ref={buttonRef}
      aria-label="Edit theme"
      onClick={onClick}
      data-force={force}
      className={cx(
        "-mr-1 flex h-[22px] shrink-0 items-center gap-1 rounded-md pr-1 pl-1.5",
        "text-ag font-medium text-chrome-faint transition-[background-color,color] duration-150",
        "hov:bg-chrome-hover hov:text-chrome-text/80",
        "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
      )}
    >
      <span>Edit</span>
      <SlidersIcon className="size-4 shrink-0" />
    </Button>
  )
}

/** Back to the main page (settingsBackButton): a 16px chevron at 40%, full on hover. */
export function BackButton({
  onClick,
  buttonRef,
  force,
}: {
  onClick?: () => void
  buttonRef?: Ref<HTMLButtonElement>
  force?: string
}) {
  return (
    <Button
      ref={buttonRef}
      aria-label="Back"
      onClick={onClick}
      data-force={force}
      className={cx(
        "group -ml-1 grid size-6 shrink-0 place-items-center rounded-md text-chrome-text",
        "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
      )}
    >
      <ChevronLeft
        aria-hidden="true"
        absoluteStrokeWidth
        strokeWidth={1.5}
        className="size-4 opacity-40 transition-[opacity,translate] duration-150 ease-drawer group-hov:-translate-x-0.5 group-hov:opacity-100"
      />
    </Button>
  )
}

/** The panel's top row (settingsHeader): 24px, then a 7% divider. */
export function PanelHeader({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 px-4">
      <div className="flex h-6 items-center gap-1">{children}</div>
      <div aria-hidden="true" className="my-2 h-px bg-chrome-divider" />
    </div>
  )
}

/** The panel title (settingsBrand): 13px/500 in #bbb. */
export function PanelTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="m-0 min-w-0 flex-1 truncate text-ag font-medium text-[#bbb]">
      {children}
    </h2>
  )
}

/** The project's name, renamed in place. Built on ui-sdk's createInlineEdit. */
export function ProjectName({
  value,
  defaultValue,
  onValueChange,
  onRename,
  defaultEditing,
  defaultDraft,
  force,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Saves the name; a promise makes the field read-only until it settles. */
  onRename?: (name: string) => Promise<unknown> | void
  defaultEditing?: boolean
  defaultDraft?: string
  force?: string
}) {
  const errorId = useId()
  return (
    <ProjectNameRoot
      value={value}
      defaultValue={defaultValue}
      defaultEditing={defaultEditing}
      defaultDraft={defaultDraft}
      onRename={onRename}
      onValueChange={onValueChange ? (next) => onValueChange(next) : undefined}
      className="relative -mx-1.5 inline-flex max-w-[calc(100%+12px)] min-w-0 align-top text-ag font-medium"
    >
      {(state) => (
        <>
          <ProjectNameDisplay
            data-force={force}
            className={cx(
              "block h-[22px] max-w-full cursor-text truncate rounded-md px-1.5 text-left text-[#bbb]",
              "transition-[background-color,color] duration-150 hov:bg-chrome-hover hov:text-chrome-text",
              "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
            )}
          >
            {(display) => display.value}
          </ProjectNameDisplay>
          {state.editing && (
            // Sizes the editor to the text being typed.
            <span aria-hidden="true" className="invisible block h-[22px] min-w-8 overflow-hidden border px-1.5 whitespace-pre">
              {state.draft || " "}
            </span>
          )}
          <ProjectNameInput
            data-force={force}
            aria-describedby={state.error ? errorId : undefined}
            className={cx(
              "absolute inset-0 w-full rounded-md border border-chrome-border bg-chrome-control px-1.5 font-chrome text-ag font-medium text-chrome-text outline-none",
              "transition-[border-color,background-color] duration-150",
              "foc:border-chrome-accent read-only:text-chrome-muted aria-invalid:border-chrome-red"
            )}
          />
          {state.editing && state.error && (
            <output
              id={errorId}
              className="absolute top-[calc(100%+4px)] left-1.5 text-ag-xs font-normal whitespace-nowrap text-chrome-red"
            >
              {state.error}
            </output>
          )}
        </>
      )}
    </ProjectNameRoot>
  )
}
