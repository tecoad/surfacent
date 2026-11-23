import { memo, useLayoutEffect, useRef, useState } from "react";
import { Annotation } from "../../../types";
import { Bot, Pencil, Plus } from "lucide-react";
import { useExitCompletion } from "../../../hooks/use-exit-completion";
import styles from "./styles.module.scss";

// =============================================================================
// AnnotationMarker
// =============================================================================

type AnnotationMarkerProps = {
  annotation: Annotation;
  pending?: boolean;
  globalIndex: number;
  /** Display index within this layer (for staggered animation delays) */
  layerIndex: number;
  layerSize: number;
  isExiting: boolean;
  isClearing: boolean;
  isAnimated: boolean;
  isNew: boolean;
  isHovered: boolean;
  isRemoving: boolean;
  onRemoveComplete: (id: string) => void;
  isEditingAny: boolean;
  renumberFrom: number | null;
  onHoverEnter: (annotation: Annotation) => void;
  onEnterComplete: (id: string) => void;
  onHoverLeave: (id: string) => void;
  onClick: (annotation: Annotation, trigger: HTMLButtonElement) => void;
};

export const AnnotationMarker = memo(function AnnotationMarker({
  annotation,
  pending = false,
  globalIndex,
  layerIndex,
  layerSize,
  isExiting,
  isClearing,
  isAnimated,
  isNew,
  isHovered,
  isRemoving,
  onRemoveComplete,
  isEditingAny,
  renumberFrom,
  onHoverEnter,
  onEnterComplete,
  onHoverLeave,
  onClick,
}: AnnotationMarkerProps) {
  const [hasEntered, setHasEntered] = useState(isAnimated);
  const beganPending = useRef(pending);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  // Fast submissions finish the entrance already in flight, without restarting it.
  const confirming = beganPending.current && !pending && hasEntered && !hasConfirmed;
  useLayoutEffect(() => {
    if (isExiting) setHasEntered(false);
  }, [isExiting]);
  const markerRef = useRef<HTMLButtonElement>(null);
  const restingAction = useRef(false);
  const action = isHovered && !isEditingAny;
  useLayoutEffect(() => {
    if (!isRemoving) restingAction.current = action;
  }, [isRemoving, action]);
  // Preserve the visible glyph while this same marker leaves.
  const showAction = isRemoving ? restingAction.current : action;
  useExitCompletion(markerRef, isRemoving, () => onRemoveComplete(annotation.id));
  // An agent took the note (acknowledged) and hasn't resolved it yet.
  const working = !pending && annotation.status === "acknowledged";
  // An agent suggested it: a preview waiting for the person to accept or reject it.
  const suggested = !pending && annotation.status === "suggested";

  const animClass = isClearing
    ? styles.clearing
    : isExiting || isRemoving
      ? styles.exit
      : confirming
        ? styles.confirm
        : !isAnimated && !hasEntered
        ? styles.enter
        : "";

  const animationDelay = isClearing
    ? `${Math.min(layerIndex * 20, 120)}ms`
    : isRemoving || pending || confirming
    ? "0ms"
    : isExiting
    ? `${(layerSize - 1 - layerIndex) * 20}ms`
    : `${isNew ? 0 : layerIndex * 20}ms`;

  return (
    <button
      ref={markerRef}
      type="button"
      aria-label={pending ? "Pending annotation" : `${suggested ? "Review suggestion" : "Edit annotation"} ${globalIndex + 1}: ${annotation.element}${working ? " (an agent is working on it)" : ""}`}
      disabled={pending || isExiting || isRemoving || isClearing}
      tabIndex={pending || isEditingAny ? -1 : 0}
      className={`${styles.marker} ${pending ? styles.pending : ""} ${animClass} ${!pending && showAction ? styles.actionVisible : ""} ${isHovered && !isEditingAny && !isRemoving ? styles.previewVisible : ""}`}
      data-annotation-marker={pending ? undefined : ""}
      data-annotation-pending={pending ? "" : undefined}
      style={{
        left: `${annotation.x}%`,
        top: annotation.y,
        backgroundColor: working
          ? "var(--color-chrome-agent)"
          : suggested
            ? "color-mix(in srgb, var(--surfacent-color-accent) 35%, #1a1a1a)"
            : "var(--surfacent-color-accent)",
        ...(suggested ? { outline: "1.5px dashed var(--surfacent-color-accent)", outlineOffset: 1 } : {}),
        animationDelay,
      }}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (animClass === styles.enter || animClass === styles.confirm) {
          setHasEntered(true);
          if (!pending) setHasConfirmed(true);
          if (!pending) onEnterComplete(annotation.id);
        }
      }}
      // React's synthetic mouseenter can miss entry across a shadow boundary
      // from another React element. Bubbling mouseover reaches the marker.
      onMouseOver={() => { if (!pending) onHoverEnter(annotation); }}
      onMouseOut={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          onHoverLeave(annotation.id);
        }
      }}
      onFocus={(event) => {
        if (!pending && event.currentTarget.matches(":focus-visible")) onHoverEnter(annotation);
      }}
      onBlur={() => onHoverLeave(annotation.id)}
      onClick={(e) => {
        e.stopPropagation();
        if (!pending && !isExiting && !isRemoving) onClick(annotation, e.currentTarget);
      }}
    >
      <span
        key={globalIndex}
        className={`${styles.number} ${renumberFrom !== null && globalIndex >= renumberFrom ? styles.renumber : ""}`}
        aria-hidden="true"
      >
        <span className={styles.numberGlyph}>
          {working ? <Bot absoluteStrokeWidth strokeWidth={1.5} size={13} /> : globalIndex + 1}
        </span>
      </span>
      <span className={styles.actionGlyph} aria-hidden="true">
        <Pencil absoluteStrokeWidth strokeWidth={1.25} size={13} />
      </span>
      {beganPending.current && <span className={styles.plus} aria-hidden="true"><Plus absoluteStrokeWidth strokeWidth={1.5} size={12} /></span>}
    </button>
  );
});
