import { cx } from "../../lib/cx"
import { radiusCss, type Radius } from "../../lib/radius"

/**
 * The painted background of a control. It sits behind the control's content
 * (the control needs `isolate`), so the control's own focus ring isn't clipped.
 */
export function Surface({
  radius = 6,
  className,
}: {
  radius?: Radius
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      style={{ borderRadius: radiusCss(radius) }}
      className={cx(
        "pointer-events-none absolute inset-0 -z-10 transition-colors duration-150",
        className
      )}
    />
  )
}
