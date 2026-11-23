"use client"

import { createParts } from "@ui-sdk/react/primitive"
import { characterPad } from "./character-pad"
import { colorWheel } from "./color-wheel"
import { cycleValue } from "./cycle-value"
import { easingCurve } from "./easing-curve"
import { projectName } from "./project-name"

export const { Root: EasingCurveRoot, Handle: EasingCurveHandle } = createParts(
  easingCurve,
  { root: "div", handle: "button" }
)

/** React parts for the panel's own primitives. */
export const { Root: CycleValue } = createParts(cycleValue, { root: "button" })

export const { Root: CharacterPadRoot, Thumb: CharacterPadThumb } = createParts(
  characterPad,
  { root: "div", thumb: "span" }
)

export const { Root: ColorWheelRoot } = createParts(colorWheel, { root: "div" })

export const {
  Root: ProjectNameRoot,
  Display: ProjectNameDisplay,
  Input: ProjectNameInput,
} = createParts(projectName, {
  root: "div",
  display: "button",
  input: "input",
})
