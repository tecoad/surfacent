import { Check, Copy } from "lucide-react"
import { highlight } from "sugar-high"
import { cx } from "surfacent-ui"
import { useCopy } from "./copy"

/** Highlighted source (sugar-high, colors in index.css) with a copy button. */
export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const { copied, copy } = useCopy()
  const source = code.trim()
  // sugar-high escapes the source it tokenizes, and every source shown here
  // is this repo's own code, so the markup is safe to inject.
  const highlighted = { __html: highlight(source) }

  return (
    <div className={cx("relative", className)}>
      <pre className="m-0 overflow-x-auto p-5 pr-14 font-mono text-[12px]/5 text-pg-text">
        <code dangerouslySetInnerHTML={highlighted} />
      </pre>
      <button
        type="button"
        onClick={() => copy(source)}
        aria-label={copied ? "Copied" : "Copy code"}
        title={copied ? "Copied" : "Copy code"}
        className={cx(
          "absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-pg-inset text-pg-muted transition-colors duration-150",
          "hover:bg-pg-hover hover:text-pg-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-focus"
        )}
      >
        {copied ? (
          <Check aria-hidden="true" strokeWidth={1.75} className="size-4 text-chrome-green" />
        ) : (
          <Copy aria-hidden="true" strokeWidth={1.75} className="size-4" />
        )}
      </button>
    </div>
  )
}
