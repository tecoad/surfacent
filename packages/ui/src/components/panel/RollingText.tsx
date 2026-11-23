import { useState, type ReactNode } from "react"
import { cx } from "../../lib/cx"

/**
 * A value that changes the way the cycle button does: the new text
 * drops in from 6px above as it fades in, 200ms ease-out (cycleTextIn); the
 * old text goes at once. The first value shows without animating.
 */
export function RollingText({
  value,
  render = (text) => text,
  className,
}: {
  value: string
  render?: (value: string) => ReactNode
  className?: string
}) {
  const [previous, setPrevious] = useState(value)
  const [changed, setChanged] = useState(false)
  if (previous !== value) {
    setPrevious(value)
    setChanged(true)
  }
  return (
    <span
      key={value}
      className={cx("inline-flex min-w-0 items-center", changed && "animate-cycle-in", className)}
    >
      {render(value)}
    </span>
  )
}
