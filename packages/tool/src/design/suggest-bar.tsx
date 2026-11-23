// Suggestion mode's review bar, attached above the dock: while the agent
// works, then to walk through its suggestions and accept or reject them.

import { ChevronLeft, ChevronRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { cx, iconButtonClass, primaryButton, secondaryButton } from "surfacent-ui";

/** Asking for suggestions: reading the page, waiting for an agent, an agent working on them. */
export type SuggestState = "idle" | "scanning" | "waiting" | "taken";

export function SuggestBar({
  state,
  count,
  index,
  agentListening,
  notice,
  showOriginal,
  onPrevious,
  onNext,
  onToggleOriginal,
  onAcceptAll,
  onRejectAll,
  onStop,
}: {
  state: SuggestState;
  /** Suggestions waiting for the person. */
  count: number;
  /** The one being reviewed, from 0. */
  index: number;
  agentListening: boolean;
  /** A short message when there's nothing to review, e.g. nothing left to suggest. */
  notice: string | null;
  showOriginal: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleOriginal: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onStop: () => void;
}) {
  if (state === "idle" && !count && !notice) return null;
  return (
    <div
      data-feedback-toolbar
      className={cx(
        "absolute right-0 bottom-[calc(100%+8px)] flex max-w-[calc(100vw-32px)] items-center gap-1 rounded-[14px] bg-[#1a1a1a] p-1.5 pl-3",
        "font-chrome text-ag-sm text-chrome-soft shadow-[0_2px_8px_rgb(0_0_0/0.2),0_4px_16px_rgb(0_0_0/0.1)]",
      )}
    >
      {state !== "idle" ? (
        <>
          <LoaderCircle aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 shrink-0 animate-spin text-chrome-muted" />
          <span className="mr-1 truncate" role="status">
            {state === "scanning"
              ? "Reading the page…"
              : state === "taken" || agentListening
                ? "The agent is looking at this page…"
                : "Waiting for an agent: ask yours to listen (surfacent_listen)."}
          </span>
          <button type="button" className={secondaryButton} onClick={onStop}>
            Stop
          </button>
        </>
      ) : count ? (
        <>
          <button type="button" aria-label="Previous suggestion" className={iconButtonClass} onClick={onPrevious}>
            <ChevronLeft aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />
          </button>
          <span className="tabular-nums whitespace-nowrap" role="status">
            {index + 1} of {count} {count === 1 ? "suggestion" : "suggestions"}
          </span>
          <button type="button" aria-label="Next suggestion" className={iconButtonClass} onClick={onNext}>
            <ChevronRight aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />
          </button>
          <button
            type="button"
            aria-pressed={showOriginal}
            title="Show the page without the suggestions"
            className={cx(secondaryButton, "ml-1")}
            onClick={onToggleOriginal}
          >
            {showOriginal ? (
              <EyeOff aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
            ) : (
              <Eye aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
            )}
            Before
          </button>
          <button type="button" className={secondaryButton} onClick={onRejectAll}>
            Reject all
          </button>
          <button type="button" className={primaryButton} onClick={onAcceptAll}>
            Accept all
          </button>
        </>
      ) : (
        <span className="mr-1.5" role="status">
          {notice}
        </span>
      )}
    </div>
  );
}
