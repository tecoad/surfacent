import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { Bot, ScanLine, SendHorizontal } from "lucide-react";
import type { Annotation } from "../../../types";
import { useExitCompletion } from "../../../hooks/use-exit-completion";
import type { AnnotationPopupCSSHandle } from "../../annotation-popup-css";
import {
  AnnotationEditor,
  type AnnotationEditorHandle,
  type AnnotationEditorProps,
} from "../../annotation-popup-css/annotation-editor";
import popupStyles from "../../annotation-popup-css/styles.module.scss";
import styles from "./styles.module.scss";

type AnnotationCardProps = {
  annotation: Annotation | null;
  editing: boolean;
  exiting: boolean;
  restorePreview: boolean;
  editorProps?: AnnotationEditorProps;
  scrollY: number;
  onExited: () => void;
};

/** What an agent is doing with the note, as a line above its heading. */
function statusLine(annotation: Annotation) {
  if (annotation.status === "suggested") {
    return (
      <p className="m-0 mb-1.5 flex items-start gap-1.5 text-ag-xs font-medium text-chrome-soft">
        <ScanLine aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="mt-px size-3.5 shrink-0 text-chrome-accent" />
        <span>
          Suggested:{" "}
          {Object.entries(annotation.aspects ?? {})
            .map(([aspect, value]) => `${aspect} ${value ?? "removed"}`)
            .join(" · ")}
        </span>
      </p>
    );
  }
  if (annotation.status === "acknowledged") {
    return (
      <p className="m-0 mb-1.5 flex items-center gap-1.5 text-ag-xs font-medium text-chrome-soft">
        <Bot aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 shrink-0 text-chrome-agent" />
        An agent is on it
      </p>
    );
  }
  if (annotation.status === "pending") {
    return (
      <p className="m-0 mb-1.5 flex items-center gap-1.5 text-ag-xs font-medium text-chrome-muted">
        <SendHorizontal aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 shrink-0" />
        Sent to the agent
      </p>
    );
  }
  return undefined;
}

/** One heading and note field persist from read-only preview through editing. */
export const AnnotationCard = forwardRef<
  AnnotationPopupCSSHandle,
  AnnotationCardProps
>(function AnnotationCard(
  {
    annotation,
    editing,
    exiting,
    restorePreview,
    editorProps,
    scrollY,
    onExited,
  },
  ref,
) {
  const previous = useRef({ annotation, editorProps });
  const displayed = annotation ?? previous.current.annotation;
  const formProps = annotation ? editorProps : previous.current.editorProps;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AnnotationEditorHandle>(null);
  const previousId = useRef<string>(undefined);
  const previousScroll = useRef(scrollY);
  const mode =
    editing && !exiting
      ? "edit"
      : annotation && (!editing || restorePreview)
        ? "preview"
        : "hidden";
  const preview = mode === "preview" || !editing;

  useLayoutEffect(() => {
    if (annotation) previous.current = { annotation, editorProps };
  }, [annotation, editorProps]);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !displayed) return;
    // Only morph content that was actually on screen. Opening from an empty
    // draft can reuse a hidden preview, but its text should not slide in.
    const directEntry = mode === "edit" && (
      previousId.current !== displayed.id ||
      (surface.dataset.state === "hidden" && getComputedStyle(surface).opacity === "0")
    );
    if (directEntry) surface.dataset.directEntry = "true";
    const position = () => {
      const x = (displayed.x / 100) * window.innerWidth;
      const y = displayed.isFixed ? displayed.y : displayed.y - scrollY;
      const showingPreview = mode === "preview" || !editing;
      const previewWidth =
        parseFloat(surface.style.getPropertyValue("--preview-width")) || 200;
      const compactWidth = Math.min(previewWidth, window.innerWidth - 24);
      const previewLeft = Math.max(12, Math.min(
        window.innerWidth - compactWidth - 12,
        x - compactWidth / 2,
      ));
      const width = showingPreview ? compactWidth : Math.min(280, window.innerWidth - 24);
      const margin = Math.min(showingPreview ? 12 : 20, (window.innerWidth - width) / 2);
      // Surfacent: the editing card is tall (it holds the aspect picker), so it opens on the side with more room.
      const above = showingPreview ? y > window.innerHeight - 101 : y > window.innerHeight / 2;
      // Expand from the preview's leading edge instead of dragging its shared
      // text left as the surface widens. Shift only to remain in the viewport.
      surface.style.left = `${Math.max(margin, Math.min(window.innerWidth - width - margin, previewLeft))}px`;
      surface.style.right = "auto";
      surface.style.top = `${Math.max(12, Math.min(window.innerHeight - 12, y + (above ? -21 : 21)))}px`;
      surface.style.bottom = "auto";
      surface.style.transform = above
        ? "translateY(-100%)"
        : "translateY(0)";
      surface.style.maxHeight = `${Math.max(100, above ? y - 33 : window.innerHeight - y - 33)}px`;
    };
    const jump =
      previousId.current !== displayed.id ||
      previousScroll.current !== scrollY ||
      surface.dataset.state === "hidden";
    if (jump) surface.dataset.positioning = "true";
    position();
    if (jump || directEntry) surface.getBoundingClientRect();
    delete surface.dataset.positioning;
    delete surface.dataset.directEntry;
    surface.dataset.state = mode;
    surface.inert = mode !== "edit";
    previousId.current = displayed.id;
    previousScroll.current = scrollY;
    const onResize = () => {
      surface.dataset.positioning = "true";
      position();
      surface.getBoundingClientRect();
      delete surface.dataset.positioning;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [
    displayed?.id,
    displayed?.x,
    displayed?.y,
    displayed?.isFixed,
    mode,
    editing,
    scrollY,
    displayed?.comment,
  ]);

  useLayoutEffect(() => {
    if (editing && !exiting) editorRef.current?.focus();
  }, [editing, exiting, displayed?.id]);
  useExitCompletion(surfaceRef, exiting, onExited);
  useImperativeHandle(
    ref,
    () => ({
      shake() {
        surfaceRef.current?.animate?.(
          [
            { translate: "0px" },
            { translate: "-3px" },
            { translate: "3px" },
            { translate: "-2px" },
            { translate: "2px" },
            { translate: "0px" },
          ],
          { duration: 250 },
        );
        editorRef.current?.focus();
      },
      submit() {
        editorRef.current?.submit();
      },
      getElement() {
        return surfaceRef.current as HTMLDivElement | null;
      },
    }),
    [],
  );

  if (!displayed || !formProps) return null;
  return (
    <div
      ref={surfaceRef}
      className={`ag-chrome scrollbar-none ${popupStyles.popup} ${styles.surface}`}
      data-feedback-toolbar
      data-annotation-card
      data-annotation-popup={editing ? "" : undefined}
      data-state="hidden"
      aria-hidden={mode === "hidden"}
      onClick={(event) => event.stopPropagation()}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || event.nativeEvent.isComposing || !editing)
          return;
        event.preventDefault();
        event.stopPropagation();
        formProps.onCancel();
      }}
    >
      <AnnotationEditor
        key={displayed.id}
        ref={editorRef}
        {...formProps}
        status={statusLine(displayed)}
        variant="card"
        preview={preview}
        resetOnPreview={!editing}
        disabled={!editing || exiting}
      />
    </div>
  );
});
