import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AnnotationPopupCSSProps } from "./index";
import styles from "./styles.module.scss";
import { ArrowDown, ArrowUp, SquareArrowOutUpRight } from "lucide-react";
import { cx, dangerButton, iconButtonClass, primaryButton, secondaryButton, textButton } from "surfacent-ui";
import { AspectPicker } from "../../design/aspect-picker";
import { hasChanges } from "../../design/aspects";

/** Focus an element while temporarily blocking focus-trap libraries (e.g. Radix
 *  FocusScope) from reclaiming focus via focusin/focusout handlers. */
function focusBypassingTraps(el: HTMLElement | null) {
  if (!el) return;
  const trap = (e: Event) => e.stopImmediatePropagation();
  document.addEventListener("focusin", trap, true);
  document.addEventListener("focusout", trap, true);
  try {
    el.focus({ preventScroll: true });
  } finally {
    document.removeEventListener("focusin", trap, true);
    document.removeEventListener("focusout", trap, true);
  }
}

export type AnnotationEditorProps = Pick<
  AnnotationPopupCSSProps,
  | "element"
  | "selectedText"
  | "placeholder"
  | "initialValue"
  | "submitLabel"
  | "onSubmit"
  | "onCancel"
  | "onDelete"
  | "deleteLabel"
  | "onOpenSource"
  | "accentColor"
  | "aspectElement"
  | "aspectChanges"
  | "onAspectChange"
  | "onAspectPreview"
  | "onSelectParent"
  | "onSelectChild"
> & {
  /** A line above the heading, inside the form's padding: what an agent is doing with the note. */
  status?: ReactNode;
  disabled?: boolean;
  preview?: boolean;
  resetOnPreview?: boolean;
  variant?: "popup" | "card";
};

export type AnnotationEditorHandle = { focus: () => void; submit: () => void };

/** The form is shared by new-note popups and the saved-note preview card. */
export const AnnotationEditor = forwardRef<
  AnnotationEditorHandle,
  AnnotationEditorProps
>(function AnnotationEditor(
  {
    element,
    selectedText,
    placeholder = "What should change?",
    initialValue = "",
    submitLabel = "Add",
    onSubmit,
    onCancel,
    onDelete,
    deleteLabel = "Delete",
    onOpenSource,
    accentColor = "#3c82f7",
    disabled = false,
    preview = false,
    resetOnPreview = true,
    variant = "popup",
    aspectElement,
    aspectChanges,
    onAspectChange,
    onAspectPreview,
    onSelectParent,
    onSelectChild,
    status,
  },
  ref,
) {
  const isCard = variant === "card";
  const [text, setText] = useState(initialValue);
  // A picked intent is enough to save: the note becomes optional.
  const canSubmit = !!text.trim() || hasChanges(aspectChanges);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const previewExcerpt = selectedText
    ? ` "${selectedText.slice(0, 30)}${selectedText.length > 30 ? "..." : ""}"`
    : "";
  useLayoutEffect(() => {
    const form = formRef.current;
    const textarea = textareaRef.current;
    if (!isCard || !form || !textarea) return;
    const measure = () => {
      form.style.setProperty(
        "--editor-field-height",
        `${textarea.offsetHeight}px`,
      );
    };
    measure();
    // Canvas measures the existing text without adding a second renderer.
    if ("CanvasRenderingContext2D" in window) {
      const context = document.createElement("canvas").getContext("2d");
      if (context) {
        const family = getComputedStyle(textarea).fontFamily;
        context.font = `13px ${family}`;
        const noteWidth = context.measureText(
          initialValue.replace(/\s+/g, " "),
        ).width;
        context.font = `italic 12px ${family}`;
        const headingWidth = context.measureText(
          element + previewExcerpt,
        ).width;
        const width = Math.min(
          200,
          Math.max(120, Math.ceil(Math.max(noteWidth, headingWidth)) + 24),
        );
        form
          .closest<HTMLElement>("[data-annotation-card]")
          ?.style.setProperty("--preview-width", `${width}px`);
        const note = form.querySelector<HTMLElement>("[data-shared-note]");
        if (note)
          note.toggleAttribute("data-truncated", noteWidth > width - 24);
      }
    }
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(textarea);
    return () => observer?.disconnect();
  }, [isCard, element, initialValue, previewExcerpt]);
  useLayoutEffect(() => {
    if (preview && resetOnPreview) {
      setText(initialValue);
      if (textareaRef.current) {
        textareaRef.current.scrollTop = 0;
        textareaRef.current.scrollLeft = 0;
      }
    }
  }, [preview, resetOnPreview, initialValue]);
  const handleSubmit = useCallback(() => {
    if (disabled || !canSubmit) return;
    onSubmit(text.trim());
  }, [disabled, canSubmit, text, onSubmit]);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        const textarea = textareaRef.current;
        focusBypassingTraps(textarea);
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd =
            textarea.value.length;
          textarea.scrollTop = isCard ? 0 : textarea.scrollHeight;
        }
      },
      // Surfacent: commit from outside, e.g. a click elsewhere on the page.
      submit: handleSubmit,
    }),
    [isCard, handleSubmit],
  );
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    if (event.altKey && event.key === "ArrowUp" && onSelectParent) {
      event.preventDefault();
      onSelectParent();
      return;
    }
    if (event.altKey && event.key === "ArrowDown" && onSelectChild) {
      event.preventDefault();
      onSelectChild();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === "Escape") onCancel();
  };

  return (
    <div
      ref={formRef}
      className={isCard ? styles.sharedForm : undefined}
      style={isCard ? undefined : { display: "contents" }}
      data-annotation-editor
      data-preview={preview || undefined}
    >
      {status}
      <div className={styles.header} data-editor-heading>
        <span className={cx(styles.element, !isCard && "truncate text-ag font-medium text-[#bbb]")}>
          {element}
          {isCard && previewExcerpt && (
            <span className={styles.previewExcerpt}>{previewExcerpt}</span>
          )}
        </span>
        {!preview && (onSelectParent || onSelectChild) && (
          <span className="-mr-1 ml-auto flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label="Select parent element"
              title="Parent element (⌥↑)"
              disabled={!onSelectParent}
              onClick={onSelectParent}
              className={cx(iconButtonClass, "disabled:pointer-events-none disabled:opacity-35")}
            >
              <ArrowUp aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Select child element"
              title="Back to child (⌥↓)"
              disabled={!onSelectChild}
              onClick={onSelectChild}
              className={cx(iconButtonClass, "disabled:pointer-events-none disabled:opacity-35")}
            >
              <ArrowDown aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
            </button>
          </span>
        )}
      </div>

      {onOpenSource && (
        <div
          className={isCard ? styles.sharedExtra : undefined}
          style={isCard ? undefined : { display: "contents" }}
        >
          <div
            className={isCard ? styles.sharedExtraInner : undefined}
            style={isCard ? undefined : { display: "contents" }}
          >
            <button
              type="button"
              className={cx(styles.sourceAction, textButton, "-ml-1 mb-2 opacity-100")}
              onClick={onOpenSource}
            >
              <SquareArrowOutUpRight aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3" />
              Open in editor
            </button>
          </div>
        </div>
      )}

      {selectedText && (
        <div
          className={isCard ? styles.sharedExtra : undefined}
          style={isCard ? undefined : { display: "contents" }}
        >
          <div
            className={isCard ? styles.sharedExtraInner : undefined}
            style={isCard ? undefined : { display: "contents" }}
          >
            <div className={cx(styles.quote, "mb-2 border-l-2 border-chrome-strong bg-transparent py-0.5 pl-2 text-ag-xs italic text-chrome-soft")}>
              &ldquo;{selectedText.slice(0, 80)}
              {selectedText.length > 80 ? "..." : ""}&rdquo;
            </div>
          </div>
        </div>
      )}

      {onAspectChange && !preview && (
        <AspectPicker
          element={aspectElement}
          changes={aspectChanges ?? {}}
          onChange={onAspectChange}
          onPreview={onAspectPreview}
          compact={isCard}
        />
      )}

      <div
        data-shared-note
        className={isCard ? styles.sharedNote : undefined}
        style={
          isCard
            ? ({
                "--field-border": isFocused ? accentColor : undefined,
              } as React.CSSProperties)
            : { display: "contents" }
        }
      >
        <div
          className={isCard ? styles.sharedNoteContent : undefined}
          style={isCard ? undefined : { display: "contents" }}
        >
          <textarea
            ref={textareaRef}
            className={cx(
              styles.textarea,
              !isCard &&
                "mt-2 block rounded-md border-chrome-border bg-white/[0.03] px-2.5 py-2 font-chrome text-ag-sm text-chrome-text placeholder:text-chrome-text/30 focus:bg-white/[0.08] scrollbar-none",
            )}
            readOnly={preview}
            aria-hidden={preview}
            style={
              isCard
                ? undefined
                : { borderColor: isFocused ? accentColor : undefined }
            }
            placeholder={placeholder}
            value={preview ? text.replace(/\s+/g, " ") : text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={2}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      <div
        data-editor-actions
        className={isCard ? styles.sharedActions : undefined}
        style={isCard ? undefined : { display: "contents" }}
      >
        <div className={styles.actions}>
          {onDelete && (
            <div className={styles.deleteWrapper}>
              <button
                className={cx(styles.deleteButton, dangerButton, "-ml-2")}
                onClick={onDelete}
                type="button"
                aria-label={`${deleteLabel} annotation`}
              >
                {deleteLabel}
              </button>
            </div>
          )}
          <button type="button" className={cx(styles.cancel, secondaryButton)} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={cx(styles.submit, primaryButton)}
            style={{ backgroundColor: accentColor }}
            onClick={handleSubmit}
            disabled={disabled || !canSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
});
