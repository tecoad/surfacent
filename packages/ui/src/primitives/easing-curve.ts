import { bindDrag, createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core"

export type CurveValue = [number, number, number, number]
type CurveReason = "drag" | "step-key" | "imperative"

type EasingCurveOptions = {
  value?: CurveValue
  defaultValue?: CurveValue
  onValueChange?: (value: CurveValue, details: ChangeDetails<CurveReason>) => void
  label?: string
}

/** The unit square inside the 296×160 view the handles move in. */
export const VIEW = { width: 296, height: 160, x0: 84, y0: 144, size: 128 }

const clampX = (x: number) => Math.min(1, Math.max(0, x))
const clampY = (y: number) => Math.min(2, Math.max(-1, y))
const round = (n: number) => Math.round(n * 100) / 100

/** Where a handle sits in the view, as percentages for left/top. */
export function handlePercent(x: number, y: number) {
  return {
    left: ((VIEW.x0 + x * VIEW.size) / VIEW.width) * 100,
    top: ((VIEW.y0 - y * VIEW.size) / VIEW.height) * 100,
  }
}

/**
 * A cubic-bezier editor: two handles you drag, or focus and move with the
 * arrows (0.01, Shift 0.1). Escape cancels a drag. x stays in 0…1, y in -1…2.
 */
const easingCurve = definePrimitive({
  name: "easing-curve",
  options: { value: "value", defaultValue: "value", onValueChange: "callback", label: "string" },
  controlled: ["value"],
  state: (options: EasingCurveOptions) => ({
    value: options.value ?? options.defaultValue ?? ([0.25, 0.1, 0.25, 1] as CurveValue),
    dragging: null as number | null,
  }),
  sync: (options) => (options.value === undefined ? {} : { value: options.value }),
  api: (context) => {
    const change = createChange(context)
    let stop: (() => void) | undefined
    context.onDestroy(() => stop?.())

    const moveHandle = (index: number, x: number, y: number, reason: CurveReason, event?: Event) => {
      const next = [...context.store.get().value] as CurveValue
      next[index * 2] = round(clampX(x))
      next[index * 2 + 1] = round(clampY(y))
      return change("value", next, { reason, event })
    }

    return {
      setValue: (value: CurveValue) =>
        change("value", value.map(round) as CurveValue, { reason: "imperative" }),
      pointerdown(event: PointerEvent, handle: HTMLElement, index: number) {
        const host = handle.parentElement
        if (!host || event.button !== 0) return
        event.preventDefault()
        handle.focus({ preventScroll: true })
        const start = context.store.get().value
        context.store.set({ dragging: index })
        stop?.()
        stop = bindDrag(handle, event, {
          cancelOnEscape: true,
          onMove: ({ x, y, event: move }) => {
            const rect = host.getBoundingClientRect()
            const sx = rect.width / VIEW.width
            const sy = rect.height / VIEW.height
            const vx = (x - rect.left) / sx
            const vy = (y - rect.top) / sy
            moveHandle(index, (vx - VIEW.x0) / VIEW.size, (VIEW.y0 - vy) / VIEW.size, "drag", move)
          },
          onEnd: (_event, canceled) => {
            stop = undefined
            context.store.set({ dragging: null })
            if (canceled) change("value", start, { reason: "drag" })
          },
        })
      },
      keydown(event: KeyboardEvent, index: number) {
        const by = event.shiftKey ? 0.1 : 0.01
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-by, 0],
          ArrowRight: [by, 0],
          ArrowUp: [0, by],
          ArrowDown: [0, -by],
        }
        const move = moves[event.key]
        if (!move) return
        event.preventDefault()
        const value = context.store.get().value
        moveHandle(index, value[index * 2] + move[0], value[index * 2 + 1] + move[1], "step-key", event)
      },
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: CurveValue; dragging: number | null }>({
      role: "group",
      state: (state) => ({ value: state.value, dragging: state.dragging }),
    }),
    handle: slot<{ index: number; value: string }, { x: number; y: number; dragging: boolean }>({
      // `value` names each handle as its own part, so handlers see their own index.
      props: { index: "number", value: "string" },
      state: (state, { props }) => ({
        x: state.value[props.index * 2],
        y: state.value[props.index * 2 + 1],
        dragging: state.dragging === props.index,
      }),
      attrs: (state, { props }) => {
        const x = state.value[props.index * 2]
        const y = state.value[props.index * 2 + 1]
        const { left, top } = handlePercent(x, y)
        return {
          type: "button",
          "aria-label": `Handle ${props.index + 1}: X ${x}, Y ${y}`,
          "data-dragging": state.dragging === props.index ? "" : undefined,
          style: `left: ${left.toFixed(3)}%; top: ${top.toFixed(3)}%;`,
        }
      },
      on: {
        pointerdown: (event, { el, api, props }) => {
          if (el) api.pointerdown(event as PointerEvent, el, props.index)
        },
        keydown: (event, { api, props }) => api.keydown(event as KeyboardEvent, props.index),
      },
    }),
  }),
  agent: { actions: ["setValue"] },
})

export { easingCurve, type EasingCurveOptions }
