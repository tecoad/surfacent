import {
  createArea,
  createChange,
  definePrimitive,
  type AreaReason,
  type ChangeDetails,
} from "@ui-sdk/core"

type Point = { x: number; y: number }

type CharacterPadOptions = {
  /** x runs Quiet (0) to Bold (100); y runs Compact (0) to Airy (100). */
  value?: Point
  defaultValue?: Point
  onValueChange?: (value: Point, details: ChangeDetails<AreaReason>) => void
  onValueCommit?: (value: Point) => void
  disabled?: boolean
}

const center: Point = { x: 50, y: 50 }
/** The point is placed inside a 16px inset of the pad. */
const INSET = 16
/** A press must travel 3px before it drags. */
const DRAG_THRESHOLD = 3
/**
 * A press without a drag glides the point there with the settle easing:
 * 360ms, cubic-bezier(.19, 1, .22, 1) (the toolbar's own move).
 */
export const PAD_GLIDE = { duration: 360, easing: "cubic-bezier(0.19, 1, 0.22, 1)" }

const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)))
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y

/**
 * The Character pad, with Graphical's pointer rules: a press does nothing
 * until it either drags (past 3px, the point follows at once) or lifts
 * (the point glides to the spot). ui-sdk's `createArea` gives the thumb
 * its slider role, value text and arrow keys (Shift for steps of ten).
 */
const characterPad = definePrimitive({
  name: "character-pad",
  options: {
    value: "value",
    defaultValue: "value",
    onValueChange: "callback",
    onValueCommit: "callback",
    disabled: "boolean",
  },
  controlled: ["value"],
  state: (options: CharacterPadOptions) => ({
    value: options.value ?? options.defaultValue ?? center,
    disabled: options.disabled ?? false,
    dragging: false,
    gliding: false,
  }),
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    disabled: options.disabled ?? false,
  }),
  api: (context) => {
    const change = createChange(context)
    const area = createArea(context, {
      value: (state) => state.value,
      set: (value, details) => change("value", value, details),
      x: () => ({ min: 0, max: 100, step: 1, label: "Bold" }),
      y: () => ({ min: 0, max: 100, step: 1, label: "Airy" }),
      valueText: ({ x, y }) => `${x}% bold, ${y}% airy`,
      onCommit: (value) => context.options().onValueCommit?.(value),
      disabled: () => context.store.get().disabled,
    })

    let press: { pointerId: number; rect: DOMRect; x: number; y: number; moved: boolean } | null = null
    let glideTimer: ReturnType<typeof setTimeout> | undefined
    context.onDestroy(() => clearTimeout(glideTimer))

    const pointAt = (event: PointerEvent, rect: DOMRect): Point => ({
      x: clamp(((event.clientX - rect.left - INSET) / Math.max(1, rect.width - INSET * 2)) * 100),
      y: clamp(100 - ((event.clientY - rect.top - INSET) / Math.max(1, rect.height - INSET * 2)) * 100),
    })

    const commit = (value: Point) => context.options().onValueCommit?.(value)

    return {
      area,
      pointerdown(event: PointerEvent, el: HTMLElement) {
        if (context.store.get().disabled || event.button !== 0 || press) return
        event.preventDefault()
        press = { pointerId: event.pointerId, rect: el.getBoundingClientRect(), x: event.clientX, y: event.clientY, moved: false }
        el.setPointerCapture(event.pointerId)
        el.querySelector<HTMLElement>("[data-area-thumb]")?.focus({ preventScroll: true })
      },
      pointermove(event: PointerEvent) {
        if (!press || press.pointerId !== event.pointerId) return
        if (!press.moved && Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_THRESHOLD) return
        if (!press.moved) context.store.set({ dragging: true, gliding: false })
        press.moved = true
        const next = pointAt(event, press.rect)
        if (!same(next, context.store.get().value)) change("value", next, { reason: "drag", event })
      },
      pointerup(event: PointerEvent, el: HTMLElement) {
        if (!press || press.pointerId !== event.pointerId) return
        const current = press
        press = null
        const next = pointAt(event, current.rect)
        const changed = !same(next, context.store.get().value)
        if (!current.moved) {
          // A tap: the point glides to the spot.
          clearTimeout(glideTimer)
          context.store.set({ gliding: true })
          glideTimer = setTimeout(() => context.store.set({ gliding: false }), PAD_GLIDE.duration)
        }
        context.store.set({ dragging: false })
        if (changed) change("value", next, { reason: current.moved ? "drag" : "track-press", event })
        if (changed || current.moved) commit(next)
        if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
      },
      cancel(event: PointerEvent) {
        if (!press || press.pointerId !== event.pointerId) return
        const moved = press.moved
        press = null
        context.store.set({ dragging: false })
        if (moved) commit(context.store.get().value)
      },
      setValue: (value: Point) => area.set(value),
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: Point; dragging: boolean; gliding: boolean; disabled: boolean }>({
      state: (state) => ({
        value: state.value,
        dragging: state.dragging,
        gliding: state.gliding,
        disabled: state.disabled,
      }),
      attrs: (state) => ({
        "data-dragging": state.dragging ? "" : undefined,
        "data-gliding": state.gliding ? "" : undefined,
        "data-disabled": state.disabled ? "" : undefined,
      }),
      on: {
        pointerdown: (event, { el, api }) => {
          if (el) api.pointerdown(event as PointerEvent, el)
        },
        pointermove: (event, { api }) => api.pointermove(event as PointerEvent),
        pointerup: (event, { el, api }) => {
          if (el) api.pointerup(event as PointerEvent, el)
        },
        pointercancel: (event, { api }) => api.cancel(event as PointerEvent),
        lostpointercapture: (event, { api }) => api.cancel(event as PointerEvent),
      },
    }),
    thumb: slot({
      attrs: (state, { api }) => ({
        ...api.area.thumbAttrs(state),
        style: api.area.thumbStyle(state),
      }),
      on: {
        keydown: (event, { api }) => {
          api.area.keydown(event as KeyboardEvent)
        },
      },
    }),
  }),
  agent: { actions: ["setValue"] },
})

export { characterPad, type CharacterPadOptions, type Point }
