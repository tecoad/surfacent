"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useExitCompletion } from "../../hooks/use-exit-completion";
import styles, { css as popupCss } from "./styles.module.scss";
import { ensureStyles } from "../../utils/ensure-styles";
import { AnnotationEditor, type AnnotationEditorHandle } from "./annotation-editor";
import type { AspectChanges } from "../../design/aspects";

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Types
// =============================================================================

export interface AnnotationPopupCSSProps {
  /** Element name to display in header */
  element: string;
  /** Optional selected/highlighted text */
  selectedText?: string;
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Initial value for textarea (for edit mode) */
  initialValue?: string;
  /** Label for submit button (default: "Add") */
  submitLabel?: string;
  /** Called when annotation is submitted with text */
  onSubmit: (text: string) => void;
  /** Called when popup is cancelled/dismissed */
  onCancel: () => void;
  /** Called when delete button is clicked (only shown if provided) */
  onDelete?: () => void;
  /** The delete button's label (default: "Delete"). */
  deleteLabel?: string;
  /** Optional host-provided action for opening the detected source in an editor. */
  onOpenSource?: () => void;
  /** Position styles (left, top) */
  style?: React.CSSProperties;
  /** Custom color for submit button and textarea focus (hex) */
  accentColor?: string;
  /** External exit state (parent controls exit animation) */
  isExiting?: boolean;
  /** Called after the externally controlled exit animation finishes. */
  onExitComplete?: () => void;
  /** Surfacent: element whose intent is being picked. */
  aspectElement?: Element | null;
  /** Surfacent: intent changes picked so far. Shows the aspect picker when set. */
  aspectChanges?: AspectChanges;
  onAspectChange?: (key: string, value: string | null | undefined) => void;
  onAspectPreview?: (key: string, value: string | null | undefined, tried?: string) => void;
  /** Surfacent: move the selection to the parent / back to the child. */
  onSelectParent?: () => void;
  onSelectChild?: () => void;
}

export interface AnnotationPopupCSSHandle {
  /** Shake the popup (e.g., when user clicks outside) */
  shake: () => void;
  /** Submit with the current note, as the submit button would. */
  submit: () => void;
  /** The popup element, for measuring and placement. */
  getElement: () => HTMLDivElement | null;
}

// =============================================================================
// Component
// =============================================================================

export const AnnotationPopupCSS = forwardRef<AnnotationPopupCSSHandle, AnnotationPopupCSSProps>(
  function AnnotationPopupCSS(
    {
      element,
      selectedText,
      placeholder = "What should change?",
      initialValue = "",
      submitLabel = "Add",
      onSubmit,
      onCancel,
      onDelete,
      onOpenSource,
      style,
      accentColor = "#3c82f7",
      isExiting = false,
      onExitComplete,
      aspectElement,
      aspectChanges,
      onAspectChange,
      onAspectPreview,
      onSelectParent,
      onSelectChild,
    },
    ref
  ) {
    const [isShaking, setIsShaking] = useState(false);
    const [animState, setAnimState] = useState<"initial" | "enter" | "entered" | "exit">("initial");
    const editorRef = useRef<AnnotationEditorHandle>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      ensureStyles(popupRef.current?.getRootNode(), "annotation-popup", popupCss);
    }, []);
    const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Animate in on mount and focus textarea
    useEffect(() => {
      // Start enter animation (use setTimeout to bypass freeze patch)
      const startTimer = setTimeout(() => {
        setAnimState(previous => previous === "initial" ? "enter" : previous);
      }, 0);
      return () => {
        clearTimeout(startTimer);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      };
    }, []);

    useEffect(() => {
      if (isExiting) return;
      const timer = setTimeout(() => editorRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }, [isExiting]);

    // Shake animation
    const shake = useCallback(() => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setIsShaking(true);
      shakeTimerRef.current = setTimeout(() => {
        setIsShaking(false);
        editorRef.current?.focus();
      }, 250);
    }, []);

    // Expose shake to parent via ref
    useImperativeHandle(ref, () => ({
      shake,
      submit: () => editorRef.current?.submit(),
      getElement: () => popupRef.current,
    }), [shake]);

    // Handle cancel with exit animation
    const handleCancel = useCallback(() => {
      if (onExitComplete) {
        onCancel();
        return;
      }
      setAnimState("exit");
    }, [onCancel, onExitComplete]);

    const visibleAnimState = isExiting ? "exit" : animState;
    useExitCompletion(popupRef, visibleAnimState === "exit", () => {
      if (isExiting) onExitComplete?.();
      else onCancel();
    });
    const popupClassName = [
      // surfacent-ui's chrome: system type with kerning, white on #1a1a1a.
      "ag-chrome",
      styles.popup,
      visibleAnimState === "enter" ? styles.enter : "",
      visibleAnimState === "entered" ? styles.entered : "",
      visibleAnimState === "exit" ? styles.exit : "",
      isShaking && visibleAnimState !== "exit" ? styles.shake : "",
    ].filter(Boolean).join(" ");

    return (
      <div
        ref={popupRef}
        className={popupClassName}
        data-annotation-popup
        style={style}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.animationName.includes("popupEnter") && !isExiting) {
            setAnimState("entered");
          }
        }}
        onKeyDownCapture={(event) => {
          if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
          // Surfacent: Escape in a menu inside the popup (the aspect picker's) closes the menu only.
          if ((event.target as Element).closest?.('[data-slot="select-content"], [data-slot="select-trigger"][data-open]')) return;
          event.preventDefault();
          event.stopPropagation();
          handleCancel();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnnotationEditor
          ref={editorRef}
          element={element}
          selectedText={selectedText}
          placeholder={placeholder}
          initialValue={initialValue}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          onDelete={onDelete}
          onOpenSource={onOpenSource}
          accentColor={accentColor}
          disabled={visibleAnimState === "exit"}
          aspectElement={aspectElement}
          aspectChanges={aspectChanges}
          onAspectChange={onAspectChange}
          onAspectPreview={onAspectPreview}
          onSelectParent={onSelectParent}
          onSelectChild={onSelectChild}
        />
      </div>
    );
  }
);

