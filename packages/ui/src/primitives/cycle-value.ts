import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core"

type CycleReason = "press" | "imperative"

type CycleValueOptions = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails<CycleReason>) => void
  /** The values a press steps through, in order. The last one wraps to the first. */
  items?: string[]
  disabled?: boolean
}

/**
 * A row that steps to its next value each time it's pressed, like Motion
 * (Snappy → Gentle → None) or Neutrals (Mono → Cool → Warm).
 */
const cycleValue = definePrimitive({
  name: "cycle-value",
  options: {
    value: "string",
    defaultValue: "string",
    onValueChange: "callback",
    items: "list",
    disabled: "boolean",
  },
  controlled: ["value"],
  state: (options: CycleValueOptions) => ({
    value: options.value ?? options.defaultValue ?? options.items?.[0] ?? "",
    items: options.items ?? [],
    disabled: options.disabled ?? false,
  }),
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    items: options.items ?? [],
    disabled: options.disabled ?? false,
  }),
  api: (context) => {
    const change = createChange(context)
    const move = (by: number, event?: Event) => {
      const { value, items, disabled } = context.store.get()
      if (disabled || !items.length) return false
      const index = Math.max(0, items.indexOf(value))
      const next = items[(index + by + items.length) % items.length]
      return change("value", next, {
        reason: event ? "press" : "imperative",
        event,
      })
    }
    return {
      next: (event?: Event) => move(1, event),
      previous: (event?: Event) => move(-1, event),
      setValue: (value: string) => {
        const { items } = context.store.get()
        if (!items.includes(value)) {
          throw new Error(`No option "${value}". Options: ${items.join(", ")}.`)
        }
        return change("value", value, { reason: "imperative" })
      },
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: string; index: number; disabled: boolean }>({
      state: (state) => ({
        value: state.value,
        index: state.items.indexOf(state.value),
        disabled: state.disabled,
      }),
      attrs: (state) => ({
        type: "button",
        disabled: state.disabled ? "" : undefined,
        "data-disabled": state.disabled ? "" : undefined,
        "data-value": state.value,
      }),
      press: ({ api }, event) => {
        api.next(event)
      },
    }),
  }),
  agent: { actions: ["setValue", "next", "previous"], closed: true },
})

export { cycleValue, type CycleReason, type CycleValueOptions }
