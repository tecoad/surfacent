import {
  createChange,
  createInlineEdit,
  definePrimitive,
  type ChangeDetails,
  type InlineEditReason,
} from "@ui-sdk/core"

type ProjectNameOptions = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails<InlineEditReason>) => void
  /**
   * Saves a new name. While a returned promise runs, the field is read-only;
   * if it fails, the editor stays open with the error under it.
   */
  onRename?: (name: string) => Promise<unknown> | void
  /** Starts in the editor (playground). */
  defaultEditing?: boolean
  /** With `defaultEditing`, the text the editor starts with. */
  defaultDraft?: string
}

const ID = "name"

/** Graphical's wording when a failure carries no message. */
const FALLBACK_ERROR = "Something went wrong. Please try again."
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : FALLBACK_ERROR)
const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof (value as Promise<unknown> | undefined)?.then === "function"

/**
 * The project's name in the panel header, renamed in place as Graphical
 * does it: press it to edit with the text selected; Enter, Escape or leaving
 * saves, and Enter or Escape put focus back on the name; an empty or
 * unchanged name just closes the editor. While an async rename runs the field
 * is read-only; a failure keeps it open with the error, and Escape then
 * cancels. The box grows with the text. Built on ui-sdk's createInlineEdit.
 */
const projectName = definePrimitive({
  name: "project-name",
  options: {
    value: "string",
    defaultValue: "string",
    onValueChange: "callback",
    onRename: "callback",
    defaultEditing: "boolean",
    defaultDraft: "string",
  },
  controlled: ["value"],
  state: (options: ProjectNameOptions) => {
    const value = options.value ?? options.defaultValue ?? "Untitled"
    return {
      value,
      editing: null as string | null,
      /** The text being typed, which sizes the editor. */
      draft: options.defaultEditing ? (options.defaultDraft ?? value) : value,
      saving: false,
      error: null as string | null,
      /** Put focus back on the name when the editor closes (Enter, Escape). */
      refocus: false,
    }
  },
  sync: (options) => (options.value === undefined ? {} : { value: options.value }),
  api: (context) => {
    const { store } = context
    const change = createChange(context)
    const edit = createInlineEdit(context, {
      key: "editing",
      value: () => store.get().value,
      commit: (_id, text, details) => {
        const state = store.get()
        if (state.saving) return false
        const name = text.trim()
        // Empty or unchanged: close without renaming.
        if (!name || name === state.value) return true
        let pending: unknown
        try {
          pending = context.options().onRename?.(name)
        } catch (error) {
          store.set({ error: errorMessage(error) })
          return false
        }
        if (!isPromise(pending)) return change("value", name, details)
        // Keep the editor open, read-only, until the save settles.
        store.set({ saving: true, error: null })
        pending.then(
          () => {
            change("value", name, details)
            store.set({ editing: null, saving: false })
          },
          (error: unknown) => store.set({ saving: false, error: errorMessage(error) })
        )
        return false
      },
    })
    const { defaultEditing, defaultDraft } = context.options()
    if (defaultEditing) edit.start(ID, { reason: "imperative", text: defaultDraft })
    return {
      edit,
      rename: (event?: Event) => {
        store.set({ draft: store.get().value, error: null, refocus: false })
        return edit.start(ID, { reason: "imperative", event })
      },
      /** Enter, or Escape: save and return focus to the name; Escape after a failure cancels. */
      finish: (event: KeyboardEvent) => {
        const state = store.get()
        if (state.saving) return
        store.set({ refocus: true })
        if (event.key === "Escape" && state.error) {
          store.set({ error: null })
          edit.cancel()
          return
        }
        edit.end(event.key === "Enter" ? "enter-key" : "escape-key", event)
      },
      leave: (event: Event) => {
        store.set({ refocus: false })
        if (!store.get().saving) edit.end("focus-out", event)
      },
      /** Whether the name should take focus as it comes back, once. */
      takeRefocus: () => {
        const { refocus } = store.get()
        if (refocus) store.set({ refocus: false })
        return refocus
      },
      setDraft: (draft: string) => store.set({ draft }),
      setValue: (value: string) => change("value", value, { reason: "imperative" }),
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: string; draft: string; editing: boolean; saving: boolean; error: string | null }>({
      state: (state) => ({
        value: state.value,
        draft: state.draft,
        editing: state.editing !== null,
        saving: state.saving,
        error: state.error,
      }),
      attrs: (state) => ({
        "data-editing": state.editing !== null ? "" : undefined,
        "data-saving": state.saving ? "" : undefined,
        "data-invalid": state.error ? "" : undefined,
      }),
    }),
    display: slot<{}, { value: string }>({
      present: (state) => state.editing === null,
      state: (state) => ({ value: state.value }),
      attrs: (state) => ({ type: "button", "aria-label": `Rename ${state.value}` }),
      press: ({ api }, event) => {
        api.rename(event)
      },
      bind: (el, { api }) => {
        if (api.takeRefocus()) (el as HTMLElement).focus()
      },
    }),
    input: slot<{}, { value: string }>({
      present: (state) => state.editing !== null,
      state: (state) => ({ value: state.value }),
      attrs: (state) => ({
        type: "text",
        "aria-label": "Theme name",
        "aria-invalid": state.error ? "true" : undefined,
        readonly: state.saving ? "" : undefined,
        maxlength: "80",
        autocomplete: "off",
        spellcheck: "false",
      }),
      on: {
        keydown: (event, { api }) => {
          const key = event as KeyboardEvent
          if (key.isComposing || (key.key !== "Enter" && key.key !== "Escape")) return
          key.preventDefault()
          api.finish(key)
        },
        input: (event, { api }) => api.setDraft((event.target as HTMLInputElement).value),
        focusout: (event, { api }) => api.leave(event),
      },
      bind: (el, { api }) => {
        const input = el as HTMLInputElement
        const unbind = api.edit.bindInput(input)
        api.setDraft(input.value)
        input.select()
        return unbind
      },
    }),
  }),
  agent: { actions: ["setValue"] },
})

export { projectName, type ProjectNameOptions }
