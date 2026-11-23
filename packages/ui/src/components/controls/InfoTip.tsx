import { Tooltip, TooltipContent, TooltipTrigger } from "@ui-sdk/react/tooltip"
import { CircleAlert, CircleHelp } from "lucide-react"
import type { ReactNode } from "react"
import { cx } from "../../lib/cx"

/**
 * A setting's description behind a small (?), as a help tooltip:
 * it shows after a moment on hover, and on focus. As a warning, a red (!)
 * holds something to check instead, beside the label it's about.
 */
export function InfoTip({ label, children, tone }: { label: string; children: ReactNode; tone?: "warning" }) {
  const Icon = tone === "warning" ? CircleAlert : CircleHelp
  return (
    <Tooltip delay={500}>
      <TooltipTrigger
        aria-label={label}
        className={cx(
          "-my-1 grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-150",
          tone === "warning" ? "text-chrome-red/80 hov:text-chrome-red" : "text-chrome-ghost hov:text-chrome-muted",
          "outline-chrome-focus fv:outline-2 fv:outline-offset-1"
        )}
      >
        <Icon aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        collisionPadding={8}
        className={cx(
          "ag-chrome z-50 max-w-56 rounded-lg bg-chrome-raised px-2.5 py-2 text-ag-xs font-light text-chrome-soft",
          "shadow-[0_2px_8px_rgb(0_0_0/0.3)] origin-(--transform-origin)",
          "transition-[opacity,scale] duration-[135ms] ease-[ease]",
          "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0"
        )}
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
