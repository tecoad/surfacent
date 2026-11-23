import { createContext } from "react"

/** True inside a dock's panel stage, which draws the panel surface itself: a panel there leaves its own out. */
export const DockStageContext = createContext(false)

/** A dock panel's surface: #1a1a1a, 16px corners, a hairline ring and a soft shadow. */
export const dockSurface =
  "rounded-2xl bg-chrome-surface shadow-[0_4px_20px_rgb(0_0_0/0.3),0_0_0_1px_rgb(255_255_255/0.08)]"

/** How far a panel's content travels when another takes over, toward the side the pointer went. */
export const STAGE_SHIFT = 24

/** The newcomer's slide and fade, on --ease-glide. */
export const STAGE_ENTER: KeyframeAnimationOptions = { duration: 260, easing: "cubic-bezier(0.19, 1, 0.22, 1)" }

/** The leaver's, shorter: it's already been decided. */
export const STAGE_EXIT: KeyframeAnimationOptions = {
  duration: 160,
  easing: "cubic-bezier(0.19, 1, 0.22, 1)",
  fill: "forwards",
}
