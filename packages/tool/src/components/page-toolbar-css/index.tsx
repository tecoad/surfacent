"use client";

import { useLatestAction } from "../../hooks/use-latest-action";
import { isUnsent, mergeSessionFeedback, unsent, withUnsent } from "../../utils/merge-session-feedback";
import { createPageEvents, createFrameProjector, viewportRect, parentFrame, captureFrameContext } from "../../utils/frame-dom";
import { deepElementFromPoint, pierceElementFromPoint, annotationElementFromPoint } from "../../utils/hit-testing";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { ComponentType as ReactComponentType, Dispatch, SetStateAction } from "react";
import { usePagePath, runPageTask, matchesPage } from "../../utils/page-routing";
import { createPortal } from "react-dom";
import { useFeedbackPortal } from "./use-feedback-portal";
import { ShadowRoot } from "../shadow-root";

import {
  AnnotationPopupCSS,
  AnnotationPopupCSSHandle,
} from "../annotation-popup-css";
import {
  identifyElement,
  getNearbyText,
  getElementClasses,
  closestCrossingShadow,
} from "../../utils/element-identification";
import {
  loadAnnotations,
  saveAnnotations,
  getStorageKey,
  loadSessionId,
  saveSessionId,
  clearSessionId,
  loadToolbarHidden,
  saveToolbarHidden,
} from "../../utils/storage";
import {
  createSession,
  getSession,
  syncAnnotation,
  requestSuggestions,
  updateAnnotation as updateAnnotationOnServer,
  deleteAnnotation as deleteAnnotationFromServer,
} from "../../utils/sync";
import {
  getSourceLocation,
  findNearestComponentSource,
  formatSourceLocation,
  mapSourceLocation,
  type SourceLocation,
} from "../../utils/source-location";

import type { Annotation } from "../../types";
import { generateOutput } from "../../utils/generate-output";
import { captureElementAttributes, DEFAULT_IDENTIFYING_ATTRIBUTES } from "../../utils/element-attributes";
import { copyTextToClipboard } from "../../utils/clipboard";
import { subscribeSessionResolutions } from "../../utils/session-resolutions";
import { AnnotationCard } from "./annotation-card";
import { css as annotationCardCss } from "./annotation-card/styles.module.scss";
import { AnnotationMarker } from "./annotation-marker";
import { SettingsPanel } from "../../design/settings-panel";
import { MCP_INDICATOR, MCP_LABEL, type McpState } from "../../design/mcp-state";
import { useMcpSetup } from "../../design/mcp-setup";
import { HoverTooltip } from "./hover-tooltip";

import { css as resetCss } from "../reset.scss";
import styles, { css as toolbarCss } from "./styles.module.scss";
import { css as uiCss, properties as uiProperties } from "virtual:surfacent-ui-css";
import { css as popupCss } from "../annotation-popup-css/styles.module.scss";
import { css as annotationMarkerCss } from "./annotation-marker/styles.module.scss";
import { DesignPanel } from "../../design/design-panel";
import { DESIGN_PANELS, isDesignPanel, type DesignPanelId } from "../../design/design-panels";
import {
  AlignVerticalSpaceAround,
  Check,
  Copy,
  Layers,
  LoaderCircle,
  ScanLine,
  SendHorizontal,
  Settings,
  SquareRoundCorner,
  Trash2,
  type LucideProps,
} from "lucide-react";
import { cx, Dock, type DockItem } from "surfacent-ui";
import { hasChanges, type AspectChanges } from "../../design/aspects";
import { findElement, previewChanges, previewTry, revertPreview, settlePreview } from "../../design/preview";
import { fromServerAnnotation, serverFields } from "../../design/prompt";
import { findCandidates } from "../../design/suggest";
import { SuggestBar, type SuggestState } from "../../design/suggest-bar";
import { uniqueSelector } from "../../design/selector";
import { chooseSide, placeBesideElement, type PopupSide } from "../../design/placement";

// The SCSS the toolbar still uses, in the `legacy` layer that src/design/ui.css places
// between Tailwind's preflight and its utilities.
const shadowCss = [
  resetCss,
  toolbarCss,
  popupCss,
  annotationMarkerCss,
  annotationCardCss,
].join("\n");

// =============================================================================
// Types
// =============================================================================

type HoverInfo = {
  element: string;
  elementPath: string;
  rect: DOMRect | null;
  isPiercing?: boolean;
};

export type ToolbarSettings = {
  autoClearAfterCopy: boolean;
  annotationColorId: string;
  /** Notes go to a listening agent as they're made; off, the Send button sends them. */
  autoSend: boolean;
};

const DEFAULT_SETTINGS: ToolbarSettings = {
  autoClearAfterCopy: true,
  annotationColorId: "blue",
  autoSend: true,
};

/**
 * Saved with the settings, and bumped when a default changes: earlier
 * versions saved every setting as soon as the toolbar loaded, so a value
 * saved before the change is only the old default. v2: clear on copy is on.
 */
const SETTINGS_VERSION = 2;

/** ⌘ (or Ctrl) picks through overlays: the element under the pointer, even when something covers it. */
const isPierceModifier = (event: {
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean => event.metaKey || event.ctrlKey;

// No purple: it's an agent's color (--color-chrome-agent), on the notes it works on.
const COLOR_OPTIONS = [
  { id: "blue",    label: "Blue",    srgb: "#0088FF", p3: "color(display-p3 0.00 0.53 1.00)" },
  { id: "cyan",    label: "Cyan",    srgb: "#00C3D0", p3: "color(display-p3 0.00 0.76 0.82)" },
  { id: "green",   label: "Green",   srgb: "#34C759", p3: "color(display-p3 0.20 0.78 0.35)" },
  { id: "yellow",  label: "Yellow",  srgb: "#FFCC00", p3: "color(display-p3 1.00 0.80 0.00)" },
  { id: "orange",  label: "Orange",  srgb: "#FF8D28", p3: "color(display-p3 1.00 0.55 0.16)" },
  { id: "red",     label: "Red",     srgb: "#FF383C", p3: "color(display-p3 1.00 0.22 0.24)" },
];

const surfacentColorTokensCss = [
  ...COLOR_OPTIONS.map(
    (c) => `
    [data-surfacent-accent="${c.id}"] {
      --surfacent-color-accent: ${c.srgb};
    }
    @supports (color: color(display-p3 0 0 0)) {
      [data-surfacent-accent="${c.id}"] {
        --surfacent-color-accent: ${c.p3};
      }
    }
  `,
  ),
  `:host {
    ${COLOR_OPTIONS.map((c) => `--surfacent-color-${c.id}: ${c.srgb};`).join("\n")}
  }`,
  `@supports (color: color(display-p3 0 0 0)) {
    :host {
      ${COLOR_OPTIONS.map((c) => `--surfacent-color-${c.id}: ${c.p3};`).join("\n")}
    }
  }`,
].join("");

// =============================================================================
// Utils
// =============================================================================

function isElementFixed(element: HTMLElement): boolean {
  let outer = element;
  for (let frame = parentFrame(outer.ownerDocument); frame; frame = parentFrame(outer.ownerDocument)) outer = frame;
  let current: HTMLElement | null = outer;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const position = style.position;
    if (position === "fixed" || position === "sticky") {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function isRenderableAnnotation(annotation: Annotation): boolean {
  return annotation.kind !== "placement" && annotation.kind !== "rearrange" &&
    annotation.status !== "resolved" && annotation.status !== "dismissed";
}

function detectSource(element: Element): SourceLocation | undefined {
  const result = getSourceLocation(element as HTMLElement);
  const loc = result.found ? result : findNearestComponentSource(element as HTMLElement);
  return loc.found ? loc.source : undefined;
}

const sourcePath = (source: SourceLocation | undefined) => source && formatSourceLocation(source, "path");

/** A note the agent already took goes back to it when the person changes it. */
const reopened = (annotation: Annotation): Pick<Annotation, "status"> =>
  annotation.status === "acknowledged" ? { status: "pending" } : {};


// =============================================================================
// Types for Props
// =============================================================================

export type PageFeedbackToolbarCSSProps = {
  /** Callback fired when an annotation is added. */
  onAnnotationAdd?: (annotation: Annotation) => void;
  /** Callback fired when an annotation is deleted. */
  onAnnotationDelete?: (annotation: Annotation) => void;
  /** Callback fired when an annotation comment is edited. */
  onAnnotationUpdate?: (annotation: Annotation) => void;
  /** Callback fired when all annotations are cleared. Receives the annotations that were cleared. */
  onAnnotationsClear?: (annotations: Annotation[]) => void;
  /** Callback fired after a Copy attempt. Receives formatted output even if clipboard access fails. */
  onCopy?: (output: string) => void;
  /** Whether to copy to clipboard when the copy button is clicked. Defaults to true. */
  copyToClipboard?: boolean;
  /** Server URL for sync (e.g., "http://127.0.0.1:4848"). If not provided, uses localStorage only. */
  endpoint?: string;
  /** Pre-existing session ID to join. If not provided with endpoint, creates a new session. */
  sessionId?: string;
  /** Called when a new session is created (only when endpoint is provided without sessionId). */
  onSessionCreated?: (sessionId: string) => void;
  /** Custom class name applied to the toolbar container. Use to adjust positioning or z-index. */
  className?: string;
  /** Separate feedback and sessions by pathname + hash. Defaults to false. */
  useHashLocation?: boolean;
  /** Optional app name included in copied and submitted feedback. */
  appName?: string;
  /** Enable global keyboard shortcuts. Popup Enter/Escape remain available. Defaults to true. */
  enableKeyboardShortcuts?: boolean;
  /** Stable data attributes used in element paths. Replaces the default identifying list. */
  identifyingAttributes?: readonly string[];
  /** Show Open in editor when source metadata exists. The host chooses the editor integration. */
  onOpenSource?: (sourceFile: string) => void;
  /** Mount inside a host modal/popover to share its focus and top layer. Defaults to document.body. */
  portalContainer?: HTMLElement | ShadowRoot | null;
};

/** Alias for PageFeedbackToolbarCSSProps */
export type SurfacentProps = PageFeedbackToolbarCSSProps;

// =============================================================================
// Component
// =============================================================================

/**
 * The UI stylesheet's `@property` rules (Tailwind's shadows, transforms and
 * borders rely on them) only take effect in the document, not in the
 * toolbar's shadow root, so they go to the page's head.
 */
/** The dock icon of each design panel. */
const DESIGN_PANEL_ICONS: Record<DesignPanelId, ReactComponentType<LucideProps>> = {
  surface: Layers,
  corners: SquareRoundCorner,
  rhythm: AlignVerticalSpaceAround,
};

/** The suggest button's icon while the agent works. */
function WorkingIcon({ className, ...props }: LucideProps) {
  return <LoaderCircle {...props} className={cx(className, "animate-spin")} />;
}

function usePageProperties(css: string) {
  useEffect(() => {
    let style = document.head.querySelector<HTMLStyleElement>("style[data-surfacent-properties]");
    if (!style) {
      style = document.createElement("style");
      style.setAttribute("data-surfacent-properties", "");
      document.head.append(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }, [css]);
}

export function PageFeedbackToolbarCSS(props: PageFeedbackToolbarCSSProps = {}) {
  usePageProperties(uiProperties);
  const pathname = usePagePath(props.useHashLocation ?? false);
  const activeState = useState(false);
  const portalHost = useFeedbackPortal(props.portalContainer);
  if (!portalHost) return null;
  return createPortal(<PageFeedbackToolbarForRoute
    {...props}
    key={props.useHashLocation ? pathname : undefined}
    pathname={pathname}
    activeState={activeState}
    portalHost={portalHost}
  />, portalHost);
}

function PageFeedbackToolbarForRoute({
  pathname,
  activeState,
  portalHost,
  useHashLocation = false,
  appName,
  enableKeyboardShortcuts = true,
  identifyingAttributes: attributeNames = DEFAULT_IDENTIFYING_ATTRIBUTES,
  onOpenSource,
  portalContainer,
  onAnnotationAdd,
  onAnnotationDelete,
  onAnnotationUpdate,
  onAnnotationsClear,
  onCopy,
  copyToClipboard = true,
  endpoint,
  sessionId: initialSessionId,
  onSessionCreated,
  className: userClassName,
}: PageFeedbackToolbarCSSProps & {
  pathname: string;
  activeState: [boolean, Dispatch<SetStateAction<boolean>>];
  portalHost: HTMLDivElement;
}) {
  const [isActive, setIsActive] = activeState;
  const [, updateFrameScroll] = useState(0);
  // This owns live subscriptions, so its lifetime must survive memo-cache
  // invalidation during a development refresh.
  const [pageEvents] = useState(() => createPageEvents(document, () => updateFrameScroll(value => value + 1)));
  useEffect(() => { pageEvents.start(); return () => pageEvents.stop(); }, [pageEvents]);
  const routeAlive = useRef(true);
  useLayoutEffect(() => {
    routeAlive.current = true;
    return () => { routeAlive.current = false; };
  }, []);
  const routeTask = useCallback(<T,>(work: () => Promise<T>): Promise<T> =>
    useHashLocation ? runPageTask(JSON.stringify([endpoint, pathname]), work) : work(),
    [endpoint, pathname, useHashLocation]);
  const serverIds = useRef(new Map<string, string>());
  const deletedIds = useRef(new Set<string>());
  // Notes on their way to the server: not sent again, and their edits follow them there.
  const sendingIds = useRef(new Set<string>());
  const onServer = (annotation: Annotation) => !isUnsent(annotation) || sendingIds.current.has(annotation.id);
  const keepFeedback = (annotation: Annotation) => isRenderableAnnotation(annotation) &&
    !deletedIds.current.has(annotation.id);
  const syncPageAnnotation = async (...args: Parameters<typeof syncAnnotation>) => {
    const saved = await syncAnnotation(...args);
    const sent = args[2];
    const localId = sent.id;
    if (localId) {
      serverIds.current.set(localId, saved.id);
      if (deletedIds.current.has(localId)) deletedIds.current.add(saved.id);
    }
    // Hash routes already queue edits/deletes behind creation. On ordinary
    // pages those actions may have reached the server before its ID existed.
    if (!useHashLocation) {
      const pagePath = new URL(sent.url || window.location.href).pathname;
      const latest = loadAnnotations<Annotation>(pagePath).find(a => a.id === localId);
      try {
        if (deletedIds.current.has(localId)) {
          await deleteAnnotationFromServer(args[0], saved.id);
        } else if (latest && latest.comment !== sent.comment) {
          await updateAnnotationOnServer(args[0], saved.id, serverFields(latest));
          return { ...saved, comment: latest.comment };
        }
      } catch (error) {
        console.warn("[surfacent] Failed to apply changes made during sync:", error);
      }
    }
    return saved;
  };
  const scopeSession = (session: Awaited<ReturnType<typeof getSession>>) =>
    useHashLocation ? { ...session, annotations: session.annotations.filter(a =>
      !deletedIds.current.has(a.id) && matchesPage(a.url || session.url, pathname, window.location.origin)) } : session;
  const latestPathname = useRef(pathname);
  latestPathname.current = pathname;
  const applySessionFeedback = (before: Annotation[], incoming: Annotation[], pagePath = pathname) => {
    const merged = mergeSessionFeedback(before, loadAnnotations<Annotation>(pagePath), incoming, serverIds.current)
      .filter(keepFeedback);
    // A response for a page the host has since navigated away from must not
    // become the new page's notes.
    if (pagePath === latestPathname.current && routeAlive.current) setAnnotations(merged);
    saveAnnotations(pagePath, merged);
  };
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isToolbarHidden, setIsToolbarHidden] = useState(() => loadToolbarHidden());
  const [isToolbarHiding, setIsToolbarHiding] = useState(false);

  // Stop toolbar events after React's portal delegation, before they reach host
  // bubble listeners. Capture-phase dismissal belongs to the host integration.
  const portalWrapperRef = useRef<HTMLDivElement>(null);
  // The dock renders into the shadow root's wrapper, once it exists.
  const [dockContainer, setDockContainer] = useState<HTMLDivElement | null>(null);
  const setPortalWrapper = useCallback((node: HTMLDivElement | null) => {
    portalWrapperRef.current = node;
    setDockContainer(node);
  }, []);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const focusControlsOnOpenRef = useRef(false);
  const focusLauncherOnCloseRef = useRef(false);
  const focusSettingsOnOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (isActive && focusControlsOnOpenRef.current) {
      focusControlsOnOpenRef.current = false;
      controlsRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    } else if (!isActive && focusLauncherOnCloseRef.current) {
      focusLauncherOnCloseRef.current = false;
      launcherRef.current?.focus();
    }
  }, [isActive]);
  useEffect(() => {
    const stop = (e: Event) => {
      const wrapper = portalWrapperRef.current;
      if (wrapper && e.composedPath().includes(wrapper)) {
        e.stopPropagation();
      }
    };
    const events = ["mousedown", "click", "pointerdown"] as const;
    events.forEach((evt) => portalHost.addEventListener(evt, stop));
    return () => {
      events.forEach((evt) => portalHost.removeEventListener(evt, stop));
    };
  }, [portalHost]);

  // Marker visibility, animated in and out with the toolbar
  const [markersVisible, setMarkersVisible] = useState(false);
  const [markersExiting, setMarkersExiting] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    id: string;
    x: number;
    y: number;
    clientY: number;
    element: string;
    elementPath: string;
    selectedText?: string;
    isSubmitted?: boolean;
    boundingBox?: { x: number; y: number; width: number; height: number };
    nearbyText?: string;
    cssClasses?: string;
    isFixed?: boolean;
    sourceFile?: string;
    attributes?: Record<string, string>;
    frame?: Annotation["frame"];
    // Element reference for live position queries
    targetElement?: HTMLElement;
    // Surfacent: intent changes picked in the popup, previewed live.
    aspects?: AspectChanges;
    selector?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyAction = useLatestAction();
  const [isClearing, setIsClearing] = useState(false);
  const clearingIds = useRef(new Set<string>());
  const pendingClearIds = useRef(new Set<string>());
  const finishClearBatch = useCallback(() => {
    if (!clearingIds.current.size) setIsClearing(false);
  }, []);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [hoveredTargetElement, setHoveredTargetElement] =
    useState<HTMLElement | null>(null);
  const [renumberFrom, setRenumberFrom] = useState<number | null>(null);
  const renumberTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (renumberTimeoutRef.current) clearTimeout(renumberTimeoutRef.current);
  }, []);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(
    null,
  );
  const editingTriggerRef = useRef<HTMLButtonElement | null>(null);
  const editingFromKeyboardRef = useRef(false);
  const [restoreEditPreview, setRestoreEditPreview] = useState(false);
  useLayoutEffect(() => {
    if (editingAnnotation || !editingTriggerRef.current) return;
    const trigger = editingTriggerRef.current;
    editingTriggerRef.current = null;
    if (pendingAnnotation) return;
    const target = isActive && trigger.isConnected && !trigger.disabled
      ? trigger : launcherRef.current;
    target?.focus({ preventScroll: true });
  }, [editingAnnotation, isActive, pendingAnnotation]);

  const [editingTargetElement, setEditingTargetElement] =
    useState<HTMLElement | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Which design panel (surface, corners, rhythm) is open, if any.
  const [designPanel, setDesignPanel] = useState<DesignPanelId | null>(null);
  const showDesign = designPanel !== null;
  const [settingsPage, setSettingsPage] = useState<"main" | "mcp">(
    "main",
  );

  const [settings, setSettings] = useState<ToolbarSettings>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("feedback-toolbar-settings") ?? "") as Partial<ToolbarSettings> & { version?: number };
      const current = saved.version === SETTINGS_VERSION;
      return {
        autoClearAfterCopy: current && typeof saved.autoClearAfterCopy === "boolean"
          ? saved.autoClearAfterCopy
          : DEFAULT_SETTINGS.autoClearAfterCopy,
        // The marker color was always the person's choice: it carries over.
        annotationColorId: COLOR_OPTIONS.find(c => c.id === saved.annotationColorId)
          ? saved.annotationColorId!
          : DEFAULT_SETTINGS.annotationColorId,
        autoSend: typeof saved.autoSend === "boolean" ? saved.autoSend : DEFAULT_SETTINGS.autoSend,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = useCallback((patch: Partial<ToolbarSettings>) => {
    setSettings(current => ({ ...current, ...patch }));
  }, []);

  // Server sync state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    useHashLocation ? null : initialSessionId ?? null,
  );
  const sessionInitializedRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >(endpoint ? "connecting" : "disconnected");
  // An agent is in listening mode (surfacent_listen): what it receives, it takes at once.
  const [agentListening, setAgentListening] = useState(false);
  // MCP is an option here: an endpoint, or a dev server that tells how to start one. The
  // endpoint only comes once the server runs, so before that the state is Not connected.
  const mcpSetup = useMcpSetup();
  const mcpAvailable = !!endpoint || !!mcpSetup;
  // Suggestion mode: asking the agent, what it said, and comparing before and after.
  const [suggesting, setSuggesting] = useState<SuggestState>("idle");
  const [suggestNotice, setSuggestNotice] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  // Draggable toolbar state

  // For animations - track which markers have animated in and which are exiting
  const animatedMarkers = useRef(new Set<string>());
  const markerKeys = useRef(new Map<string, string>());
  const handleMarkerEntered = useCallback((id: string) => {
    animatedMarkers.current.add(id);
    if (recentlyAddedIdRef.current === id) recentlyAddedIdRef.current = null;
  }, []);
  const [exitingMarkers, setExitingMarkers] = useState<Set<string>>(new Set());
  const [pendingExiting, setPendingExiting] = useState(false);
  const [editExiting, setEditExiting] = useState(false);

  const recentlyAddedIdRef = useRef<string | null>(null);
  const prevConnectionStatusRef = useRef<typeof connectionStatus | null>(null);

  const popupRef = useRef<AnnotationPopupCSSHandle>(null);
  const editPopupRef = useRef<AnnotationPopupCSSHandle>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useLayoutEffect(() => {
    if (showSettings && focusSettingsOnOpenRef.current) {
      focusSettingsOnOpenRef.current = false;
      portalWrapperRef.current?.querySelector<HTMLButtonElement>(
        '[data-surfacent-settings-panel] button',
      )?.focus();
    }
  }, [showSettings]);

  // Markers show while the toolbar is open: closing it is how to hide them.
  // This single effect handles all marker show/hide animations
  const shouldShowMarkers = isActive;
  useEffect(() => {
    if (shouldShowMarkers) {
      // Show markers - reset animations and make visible
      setMarkersExiting(false);
      setMarkersVisible(true);
      animatedMarkers.current.clear();
      // Each marker reports its actual animation end, including its stagger.
    } else if (markersVisible) {
      // Hide markers - start exit animation, then unmount
      setMarkersExiting(true);
      const timer = setTimeout(() => {
        setMarkersVisible(false);
        setMarkersExiting(false);
      }, 250);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowMarkers]);

  // Mount and load
  useEffect(() => {
    setMounted(true);
    setScrollY(window.scrollY);
    const stored = loadAnnotations<Annotation>(pathname);
    setAnnotations(stored.filter(isRenderableAnnotation));

    // The toolbar's UI (surfacent-ui) is dark only, so a light theme saved by
    // an earlier version is ignored.
  }, [pathname]);

  // Save settings
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "feedback-toolbar-settings",
        JSON.stringify({ ...settings, version: SETTINGS_VERSION }),
      );
    }
  }, [settings, mounted]);

  // Joins the page's session on the server, or starts one, and takes the
  // server's word on the notes it has. Nothing is uploaded: notes go to an
  // agent when they're sent.
  const joinSession = async (sessionIdToJoin: string | null) => {
    if (!endpoint) return;
    const before = loadAnnotations<Annotation>(pathname);
    let session: { id: string; annotations: Annotation[] } | undefined;
    if (sessionIdToJoin) {
      try {
        session = scopeSession(await getSession(endpoint, sessionIdToJoin));
      } catch (error) {
        console.warn("[surfacent] Could not join session, creating new:", error);
        clearSessionId(pathname);
      }
    }
    const created = !session;
    session ??= { ...(await createSession(endpoint, window.location.href)), annotations: [] };
    saveSessionId(pathname, session.id);
    if (routeAlive.current) {
      setCurrentSessionId(session.id);
      setConnectionStatus("connected");
      if (created) onSessionCreated?.(session.id);
    }
    applySessionFeedback(before, withUnsent(session.annotations, before, serverIds.current));
  };

  // Initialize server session (when endpoint is provided)
  useEffect(() => {
    if (!endpoint || !mounted || sessionInitializedRef.current) return;
    sessionInitializedRef.current = true;
    setConnectionStatus("connecting");
    void routeTask(async () => {
      try {
        // Rejoin the stored session on refresh.
        await joinSession(initialSessionId || loadSessionId(pathname));
      } catch (error) {
        // Network error - continue in local-only mode
        if (routeAlive.current) setConnectionStatus("disconnected");
        console.warn("[surfacent] Failed to initialize session, using local storage:", error);
      }
    });
  }, [endpoint, initialSessionId, mounted, onSessionCreated, pathname, routeTask]);

  // Periodic check of the server: whether it runs, and whether an agent listens.
  useEffect(() => {
    if (!endpoint || !mounted) return;

    const checkHealth = async () => {
      try {
        const response = await fetch(`${endpoint}/status`, { signal: AbortSignal.timeout(3000) });
        // A server without /status (another annotation server) still answers /health.
        const ok = response.ok || (response.status === 404 && (await fetch(`${endpoint}/health`)).ok);
        const status = response.ok ? ((await response.json()) as { listening?: boolean }) : {};
        setConnectionStatus(ok ? "connected" : "disconnected");
        setAgentListening(ok && status.listening === true);
      } catch {
        setConnectionStatus("disconnected");
        setAgentListening(false);
      }
    };

    // Check immediately, then every 2 seconds: a listening agent gets notes soon after it starts.
    checkHealth();
    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
  }, [endpoint, mounted]);

  const currentAnnotationsRef = useRef(annotations);
  /** The note as the list has it now: a card may hold it from before it was sent or taken. */
  const live = (annotation: Annotation) => currentAnnotationsRef.current.find((a) => a.id === annotation.id) ?? annotation;
  const hasPendingFeedbackRef = useRef(false);
  useLayoutEffect(() => {
    currentAnnotationsRef.current = annotations;
    // While the agent works on suggestions, the 10 s check also picks them up.
    hasPendingFeedbackRef.current = annotations.length > 0 || suggesting === "waiting" || suggesting === "taken";
  }, [annotations, suggesting]);

  const finishMarkerRemoval = useCallback((id: string) => {
    const wasClearing = clearingIds.current.has(id);
    if (wasClearing) {
      pendingClearIds.current.delete(id);
      if (pendingClearIds.current.size) return;
    }
    // Retain a clearing batch until its final visible exit. Numbers and the
    // badge then update once, instead of rolling on every individual finish.
    const removed = wasClearing ? new Set(clearingIds.current) : new Set([id]);
    if (wasClearing) {
      clearingIds.current.clear();
      finishClearBatch();
    }
    for (const removedId of removed) {
      markerKeys.current.delete(removedId);
      animatedMarkers.current.delete(removedId);
    }
    setAnnotations(previous => previous.filter(a => !removed.has(a.id)));
    setExitingMarkers(previous => new Set([...previous].filter(id => !removed.has(id))));
    const notes = wasClearing ? [] : currentAnnotationsRef.current;
    const index = notes.findIndex(a => a.id === id);
    if (index >= 0 && index < notes.length - 1) {
      setRenumberFrom(previous => previous === null ? index : Math.min(previous, index));
      if (renumberTimeoutRef.current) clearTimeout(renumberTimeoutRef.current);
      renumberTimeoutRef.current = setTimeout(() => setRenumberFrom(null), 200);
    }
  }, [finishClearBatch]);

  // Surfacent: undo previews of annotations the user removes.
  const revertAnnotationPreviews = useCallback((list: Annotation[]) => {
    for (const annotation of list) {
      if (!hasChanges(annotation.aspects)) continue;
      const element = findElement(annotation.selector);
      if (element) revertPreview(element);
    }
  }, []);

  // Surfacent: pending intents survive a reload as previews until the agent applies them.
  const restoredPreviews = useRef(new Set<string>());
  useEffect(() => {
    for (const annotation of annotations) {
      if (!hasChanges(annotation.aspects) || restoredPreviews.current.has(annotation.id)) continue;
      if (annotation.status === "resolved" || annotation.status === "dismissed") continue;
      const element = findElement(annotation.selector);
      if (!element) continue;
      restoredPreviews.current.add(annotation.id);
      previewChanges(element, annotation.aspects);
    }
  }, [annotations]);

  // Apply both live resolutions and statuses missed during a broken stream.
  useEffect(() => {
    if (!endpoint || !mounted || !currentSessionId) return;

    const remove = ({ id }: Annotation) => {
      // Trigger the marker's exit animation, then remove it.
      const resolved = currentAnnotationsRef.current.find(a => a.id === id);
      if (!resolved) return;
      // The agent applied the intent in source: keep it, drop the preview override.
      if (hasChanges(resolved.aspects)) {
        const element = findElement(resolved.selector);
        if (element) settlePreview(element);
      }
      setExitingMarkers((prev) => new Set(prev).add(id));
    };
    // An agent took the note: its marker shows that until it's resolved.
    const working = ({ id }: Annotation) => setAnnotations((list) =>
      list.some((a) => a.id === id && a.status !== "acknowledged")
        ? list.map((a) => (a.id === id ? { ...a, status: "acknowledged" } : a))
        : list);
    // Suggestion mode: the agent's suggestions, previewed until the person accepts or rejects them.
    const suggested = (incoming: Annotation) => {
      setSuggesting("idle");
      setAnnotations((list) => list.some((a) => a.id === incoming.id) ? list : [...list, { ...fromServerAnnotation(incoming), status: "suggested" }]);
    };
    const stop = subscribeSessionResolutions(endpoint, currentSessionId,
      () => hasPendingFeedbackRef.current,
      (annotation) => annotation.status === "suggested" ? suggested(annotation)
        : annotation.status === "acknowledged" ? working(annotation) : remove(annotation),
      () => setSuggesting((state) => (state === "waiting" ? "taken" : state)));
    return stop;
  }, [endpoint, mounted, currentSessionId]);


  // Back in touch with the server: rejoin, and take its word on the notes again.
  useEffect(() => {
    if (!endpoint || !mounted) return;
    const wasDisconnected = prevConnectionStatusRef.current === "disconnected";
    prevConnectionStatusRef.current = connectionStatus;
    if (!wasDisconnected || connectionStatus !== "connected") return;
    void routeTask(() => joinSession(currentSessionId ?? loadSessionId(pathname)).catch((error) => {
      console.warn("[surfacent] Failed to rejoin the session:", error);
    }));
  }, [connectionStatus, endpoint, mounted, currentSessionId, pathname, routeTask]);

  const hideToolbarTemporarily = useCallback(() => {
    if (isToolbarHiding) return;
    setIsToolbarHiding(true);
    setShowSettings(false);
    setIsActive(false);
    setTimeout(() => {
      saveToolbarHidden(true);
      setIsToolbarHidden(true);
      setIsToolbarHiding(false);
    }, 400);
  }, [isToolbarHiding]);

  // Track scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      updateFrameScroll(value => value + 1);
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    pageEvents.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => {
      pageEvents.removeEventListener("scroll", handleScroll, true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [pageEvents]);

  // Save annotations
  useEffect(() => {
    if (!mounted) return;
    const saved = annotations.filter(a => !exitingMarkers.has(a.id));
    if (saved.length > 0) saveAnnotations(pathname, saved);
    else localStorage.removeItem(getStorageKey(pathname));
  }, [annotations, pathname, mounted, isClearing, exitingMarkers]);

  // Deactivate toolbar
  const deactivate = useCallback(() => {
    const root = launcherRef.current?.getRootNode() as ShadowRoot | undefined;
    focusLauncherOnCloseRef.current = !!root?.activeElement &&
      !!portalWrapperRef.current?.contains(root.activeElement);
    if (focusLauncherOnCloseRef.current) (root?.activeElement as HTMLElement)?.blur();
    setShowSettings(false);
    setDesignPanel(null);
    setIsActive(false);
  }, []);

  // Reset state when deactivating
  useEffect(() => {
    if (!isActive) {
      setPendingAnnotation(null);
      setEditingAnnotation(null);
      setEditingTargetElement(null);
      setHoverInfo(null);
      setShowSettings(false); // Close settings when toolbar closes
    }
  }, [isActive]);

  // Custom cursor
  useEffect(() => {
    if (!isActive) return;

    const textElementsSelector = [
      "p", "span", "h1", "h2", "h3", "h4", "h5", "h6",
      "li", "td", "th", "label", "blockquote", "figcaption",
      "caption", "legend", "dt", "dd", "pre", "code",
      "em", "strong", "b", "i", "u", "s", "a",
      "time", "address", "cite", "q", "abbr", "dfn",
      "mark", "small", "sub", "sup", "[contenteditable]"
    ].join(", ");

    const style = document.createElement("style");
    style.id = "surfacent-cursor";
    // Text elements get text cursor (higher specificity with body prefix)
    // Everything else gets crosshair
    style.textContent = `
      body { cursor: crosshair !important; }
      body :is(${textElementsSelector}) { cursor: text !important; }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById("surfacent-cursor");
      if (existingStyle) existingStyle.remove();
    };
  }, [isActive]);


  // Re-evaluate the same point when the deep-selection modifier changes.
  useEffect(() => {
    if (!isActive || pendingAnnotation || editingAnnotation) return;
    let lastMouse: { x: number; y: number } | null = null;
    const evaluateHover = (x: number, y: number, piercing: boolean) => {
      const normalElement = deepElementFromPoint(x, y);
      const elementUnder = piercing ? pierceElementFromPoint(x, y) : normalElement;
      if (!elementUnder || closestCrossingShadow(elementUnder,
          "[data-feedback-toolbar], [data-annotation-popup], [data-annotation-marker]")) {
        setHoverInfo(null);
        return;
      }
      const { name, path } = identifyElement(elementUnder, attributeNames);
      setHoverInfo({ element: name, elementPath: path,
        rect: viewportRect(elementUnder),
        isPiercing: piercing && elementUnder !== normalElement });
      setHoverPosition({ x, y });
    };
    const handleMouseMove = (e: MouseEvent) => {
      const target = (e.composedPath()[0] || e.target) as HTMLElement;
      if (closestCrossingShadow(target,
          "[data-feedback-toolbar], [data-annotation-popup], [data-annotation-marker]")) {
        lastMouse = null;
        setHoverInfo(null);
        return;
      }
      lastMouse = { x: e.clientX, y: e.clientY };
      evaluateHover(e.clientX, e.clientY, isPierceModifier(e));
    };
    const handleKeyChange = (e: KeyboardEvent) => {
      if ((e.key === "Meta" || e.key === "Control") && lastMouse) {
        evaluateHover(lastMouse.x, lastMouse.y, isPierceModifier(e));
      }
    };
    const clearHover = () => { lastMouse = null; setHoverInfo(null); };
    pageEvents.addEventListener("mousemove", handleMouseMove);
    pageEvents.addEventListener("keydown", handleKeyChange);
    pageEvents.addEventListener("keyup", handleKeyChange);
    pageEvents.addEventListener("mouseleave", clearHover);
    window.addEventListener("blur", clearHover);
    return () => {
      pageEvents.removeEventListener("mousemove", handleMouseMove);
      pageEvents.removeEventListener("keydown", handleKeyChange);
      pageEvents.removeEventListener("keyup", handleKeyChange);
      pageEvents.removeEventListener("mouseleave", clearHover);
      window.removeEventListener("blur", clearHover);
    };
  }, [isActive, pendingAnnotation, editingAnnotation, attributeNames]);

  // React 19 only knows where an element was created in the module the dev
  // server transformed: map that back to the file's own line, then fill it in.
  const refineSource = useCallback((id: string, element: HTMLElement, source: SourceLocation | undefined) => {
    if (!source?.generatedUrl) return;
    void mapSourceLocation(source).then((mapped) => {
      const sourceFile = sourcePath(mapped);
      setPendingAnnotation((pending) =>
        pending && pending.id === id && pending.targetElement === element ? { ...pending, sourceFile } : pending);
      setAnnotations((list) => list.some((annotation) => annotation.id === id && annotation.sourceFile !== sourceFile)
        ? list.map((annotation) => (annotation.id === id ? { ...annotation, sourceFile } : annotation))
        : list);
    });
  }, []);

  // Surfacent: an element keeps one annotation. Selecting it again opens that
  // one, instead of a second annotation whose preview undoes the first.
  const annotationOn = useCallback((element: Element) => annotations.find((annotation) =>
    !!annotation.selector && !exitingMarkers.has(annotation.id) && !deletedIds.current.has(annotation.id)
    && findElement(annotation.selector) === element,
  ), [annotations, exitingMarkers]);

  // Start editing an annotation (right-click or click on drawing stroke).
  // Surfacent: `element` is the annotated element when it's known; the result
  // says whether the editor opened.
  const startEditAnnotation = useCallback((annotation: Annotation, trigger?: HTMLButtonElement, element?: HTMLElement) => {
    if (editingAnnotation && !editExiting) {
      editPopupRef.current?.shake();
      return false;
    }
    if (pendingAnnotation && !pendingExiting) {
      // Read the current field rather than mirroring its draft in toolbar state.
      const draft = portalWrapperRef.current?.querySelector<HTMLTextAreaElement>(
        "[data-annotation-popup]:not([data-annotation-card]) textarea",
      );
      if (draft?.value.trim()) {
        popupRef.current?.shake();
        return false;
      }
      setPendingExiting(true);
    }
    editingTriggerRef.current = trigger ?? null;
    editingFromKeyboardRef.current = trigger?.matches(":focus-visible") ?? false;
    setRestoreEditPreview(false);
    setEditExiting(false);
    setEditingAnnotation(annotation);
    setHoveredMarkerId(null);
    setHoveredTargetElement(null);

    // Find the annotated element for live tracking
    if (element) {
      setEditingTargetElement(element);
    } else if (annotation.boundingBox) {
      // Single element
      const bb = annotation.boundingBox;
      const centerX = bb.x + bb.width / 2;
      // Convert document coords to viewport coords (unless fixed)
      const centerY = annotation.isFixed
        ? bb.y + bb.height / 2
        : bb.y + bb.height / 2 - window.scrollY;
      const el = annotationElementFromPoint(centerX, centerY, bb);

      // Validate found element's size roughly matches stored bounding box
      if (el) {
        const elRect = viewportRect(el);
        const widthRatio = elRect.width / bb.width;
        const heightRatio = elRect.height / bb.height;
        if (widthRatio < 0.5 || heightRatio < 0.5) {
          setEditingTargetElement(null);
        } else {
          setEditingTargetElement(el);
        }
      } else {
        setEditingTargetElement(null);
      }
    } else {
      setEditingTargetElement(null);
    }
    return true;
  }, [pendingAnnotation, pendingExiting, editingAnnotation, editExiting]);

  // Handle click
  useEffect(() => {
    if (!isActive) return;

    const handleClick = (e: MouseEvent) => {
      // Use composedPath to get actual target inside shadow DOM, falling back to e.target
      const target = (e.composedPath()[0] || e.target) as HTMLElement;

      if (closestCrossingShadow(target, "[data-feedback-toolbar]")) return;
      if (closestCrossingShadow(target, "[data-annotation-popup]")) return;
      if (closestCrossingShadow(target, "[data-annotation-marker]")) return;

      // Picking blocks the page's own handlers. Stop propagation for every
      // target, not just native interactive elements: framework handlers
      // (e.g. a React onClick on a <tr>) are delegated to the root and would
      // otherwise still fire from this capture-phase listener.
      e.preventDefault();
      e.stopPropagation();

      if (pendingAnnotation && !pendingExiting) {
        // Surfacent: a picked intent is already visible, so clicking away applies it.
        if (hasChanges(pendingAnnotation.aspects)) popupRef.current?.submit();
        else popupRef.current?.shake();
        return;
      }

      if (editingAnnotation && !editExiting) {
        editPopupRef.current?.shake();
        return;
      }

      // ⌘-click picks through overlays, like the ⌘-hover highlight.
      const elementUnder = isPierceModifier(e)
        ? pierceElementFromPoint(e.clientX, e.clientY)
        : deepElementFromPoint(e.clientX, e.clientY);
      if (!elementUnder) return;

      const existing = annotationOn(elementUnder);
      if (existing) {
        setHoverInfo(null);
        startEditAnnotation(existing, undefined, elementUnder);
        return;
      }

      const { name, path } = identifyElement(elementUnder, attributeNames);
      const source = detectSource(elementUnder);
      const id = Date.now().toString();
      const rect = viewportRect(elementUnder);
      const x = (e.clientX / window.innerWidth) * 100;

      const isFixed = isElementFixed(elementUnder);
      const y = isFixed ? e.clientY : e.clientY + window.scrollY;

      const selection = elementUnder.ownerDocument.defaultView?.getSelection();
      let selectedText: string | undefined;
      if (selection && selection.toString().trim().length > 0) {
        selectedText = selection.toString().trim().slice(0, 500);
      }

      setPendingExiting(false);
      setPendingAnnotation({
        id,
        x,
        y,
        clientY: e.clientY,
        element: name,
        elementPath: path,
        selectedText,
        boundingBox: {
          x: rect.left,
          y: isFixed ? rect.top : rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        },
        nearbyText: getNearbyText(elementUnder),
        cssClasses: getElementClasses(elementUnder),
        isFixed,
        sourceFile: sourcePath(source),
        attributes: captureElementAttributes(elementUnder, attributeNames),
        frame: captureFrameContext(elementUnder, e.clientX, e.clientY),
        targetElement: elementUnder, // Store for live position queries
        selector: uniqueSelector(elementUnder),
      });
      refineSource(id, elementUnder, source);
      setHoverInfo(null);
    };

    // Use capture phase to intercept before element handlers
    pageEvents.addEventListener("click", handleClick, true);
    return () => pageEvents.removeEventListener("click", handleClick, true);
  }, [
    isActive,
    pendingAnnotation,
    pendingExiting,
    editingAnnotation,
    editExiting,
    attributeNames,
    annotationOn,
    startEditAnnotation,
    refineSource,
  ]);

  // Add annotation
  const addAnnotation = useCallback(
    (comment: string) => {
      if (!pendingAnnotation || pendingAnnotation.isSubmitted) return;

      const newAnnotation: Annotation = {
        id: pendingAnnotation.id,
        x: pendingAnnotation.x,
        y: pendingAnnotation.y,
        comment,
        element: pendingAnnotation.element,
        elementPath: pendingAnnotation.elementPath,
        timestamp: Date.now(),
        selectedText: pendingAnnotation.selectedText,
        boundingBox: pendingAnnotation.boundingBox,
        nearbyText: pendingAnnotation.nearbyText,
        cssClasses: pendingAnnotation.cssClasses,
        isFixed: pendingAnnotation.isFixed,
        sourceFile: pendingAnnotation.sourceFile,
        attributes: pendingAnnotation.attributes,
        frame: pendingAnnotation.frame,
        ...(hasChanges(pendingAnnotation.aspects) ? { aspects: pendingAnnotation.aspects } : {}),
        // Surfacent: finds the element again, to reopen this annotation when it's selected.
        ...(pendingAnnotation.selector ? { selector: pendingAnnotation.selector } : {}),
        // No status: it stays in the toolbar until it's sent.
      };

      setAnnotations((prev) => [...prev, newAnnotation]);
      setPendingAnnotation({ ...pendingAnnotation, isSubmitted: true });
      // Prevent immediate hover on newly added marker
      recentlyAddedIdRef.current = newAnnotation.id;

      // Fire callback
      onAnnotationAdd?.(newAnnotation);

      // Animate out the pending annotation UI
      setPendingExiting(true);

      window.getSelection()?.removeAllRanges();
    },
    [pendingAnnotation, onAnnotationAdd],
  );

  // Cancel annotation with exit animation
  const cancelAnnotation = useCallback(() => {
    if (pendingAnnotation?.targetElement) revertPreview(pendingAnnotation.targetElement);
    setPendingExiting(true);
  }, [pendingAnnotation]);

  // Surfacent: an intent picked in the popup shows on the element right away.
  const changePendingAspect = useCallback((key: string, value: string | null | undefined) => {
    if (!pendingAnnotation || pendingAnnotation.isSubmitted) return;
    const aspects = { ...pendingAnnotation.aspects };
    if (value === undefined) delete aspects[key];
    else aspects[key] = value;
    if (pendingAnnotation.targetElement) previewChanges(pendingAnnotation.targetElement, aspects);
    setPendingAnnotation({ ...pendingAnnotation, aspects });
  }, [pendingAnnotation]);

  // Surfacent: intents of a saved annotation change in place, previewed on its element.
  const saveAspects = useCallback((opened: Annotation, aspects: AspectChanges, element: Element | null) => {
    if (element) previewChanges(element, aspects);
    const annotation = live(opened);
    const updated: Annotation = {
      ...opened,
      status: annotation.status,
      ...reopened(annotation),
      aspects: hasChanges(aspects) ? aspects : undefined,
      selector: annotation.selector ?? (element ? uniqueSelector(element) : undefined),
    };
    setAnnotations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    onAnnotationUpdate?.(updated);
    if (endpoint && onServer(annotation)) {
      routeTask(() => updateAnnotationOnServer(endpoint, serverIds.current.get(updated.id) ?? updated.id, {
        ...serverFields(updated),
        ...reopened(annotation),
      })).catch((error) => {
        console.warn("[surfacent] Failed to update annotation on server:", error);
      });
    }
    return updated;
  }, [onAnnotationUpdate, endpoint, routeTask]);

  // Surfacent: surfaces are usually containers, so the selection can walk up
  // to the parent and back down the same path.
  const selectionTrail = useRef<{ id: string; children: HTMLElement[] }>({ id: "", children: [] });
  const retargetPending = useCallback((element: HTMLElement) => {
    if (!pendingAnnotation || pendingAnnotation.isSubmitted) return;
    // An element that has an annotation opens that one, with the intents picked so far.
    const existing = annotationOn(element);
    if (existing) {
      const picked = hasChanges(pendingAnnotation.aspects) ? { ...existing.aspects, ...pendingAnnotation.aspects } : null;
      if (!startEditAnnotation(picked ? { ...existing, aspects: picked } : existing, undefined, element)) return;
      if (pendingAnnotation.targetElement) revertPreview(pendingAnnotation.targetElement);
      if (picked) saveAspects(existing, picked, element);
      return;
    }
    if (pendingAnnotation.targetElement) revertPreview(pendingAnnotation.targetElement);
    if (hasChanges(pendingAnnotation.aspects)) previewChanges(element, pendingAnnotation.aspects);
    const { name, path } = identifyElement(element, attributeNames);
    const source = detectSource(element);
    const rect = viewportRect(element);
    const isFixed = isElementFixed(element);
    setPendingAnnotation({
      ...pendingAnnotation,
      element: name,
      elementPath: path,
      selectedText: undefined,
      boundingBox: {
        x: rect.left,
        y: isFixed ? rect.top : rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      },
      nearbyText: getNearbyText(element),
      cssClasses: getElementClasses(element),
      isFixed,
      sourceFile: sourcePath(source),
      attributes: captureElementAttributes(element, attributeNames),
      targetElement: element,
      selector: uniqueSelector(element),
    });
    refineSource(pendingAnnotation.id, element, source);
  }, [pendingAnnotation, attributeNames, annotationOn, startEditAnnotation, saveAspects, refineSource]);

  const pendingTarget = pendingAnnotation && !pendingAnnotation.isSubmitted ? pendingAnnotation.targetElement : undefined;
  if (pendingAnnotation && selectionTrail.current.id !== pendingAnnotation.id) {
    selectionTrail.current = { id: pendingAnnotation.id, children: [] };
  }
  const pendingParent = pendingTarget?.parentElement;
  const selectPendingParent = pendingTarget && pendingParent && pendingParent !== document.body && pendingParent !== document.documentElement
    ? () => {
        selectionTrail.current.children.push(pendingTarget);
        retargetPending(pendingParent);
      }
    : undefined;
  const selectPendingChild = pendingTarget && selectionTrail.current.children.length
    ? () => {
        const child = selectionTrail.current.children.pop();
        if (child?.isConnected) retargetPending(child);
      }
    : undefined;

  // Surfacent: measured popup height, to place it beside the selected element.
  const [pendingPopupHeight, setPendingPopupHeight] = useState(0);
  const pendingId = pendingAnnotation?.id;
  useLayoutEffect(() => {
    const element = popupRef.current?.getElement();
    if (!element) return;
    setPendingPopupHeight(element.offsetHeight);
    const observer = new ResizeObserver(() => setPendingPopupHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [pendingId]);

  // The popup keeps the side it opened on while the page scrolls; a new
  // selection (or walking to the parent) picks the side again.
  const popupSideRef = useRef<{ key: string; side: PopupSide; measured: boolean } | null>(null);
  const placePendingPopup = (target: HTMLElement) => {
    const rect = viewportRect(target);
    const key = `${pendingAnnotation?.id}:${pendingAnnotation?.selector}`;
    const current = popupSideRef.current;
    if (!current || current.key !== key || (!current.measured && pendingPopupHeight > 0)) {
      popupSideRef.current = { key, side: chooseSide(rect, pendingPopupHeight), measured: pendingPopupHeight > 0 };
    }
    return placeBesideElement(rect, pendingPopupHeight, popupSideRef.current!.side);
  };

  // Hovering an option previews it without picking it.
  const previewPendingAspect = useCallback((key: string, value: string | null | undefined, tried?: string) => {
    const target = pendingAnnotation?.targetElement;
    // A popup on its way out still gets a mouseout; it must not re-apply what cancel undid.
    if (!target || pendingExiting || pendingAnnotation.isSubmitted) return;
    const aspects = { ...pendingAnnotation.aspects };
    if (value !== undefined) aspects[key] = value;
    previewChanges(target, aspects);
    previewTry(target, value !== undefined ? key : undefined, value !== undefined ? tried : undefined);
  }, [pendingAnnotation, pendingExiting]);

  const finishPendingExit = useCallback(() => {
    setPendingAnnotation(null);
    setPendingExiting(false);
  }, []);

  // Delete annotation with exit animation
  const deleteAnnotation = useCallback(
    (id: string) => {
      if (deletedIds.current.has(id)) return;
      deletedIds.current.add(id);
      const deletedAnnotation = annotations.find(a => a.id === id);
      if (deletedAnnotation) revertAnnotationPreviews([deletedAnnotation]);

      // Close edit panel with exit animation if deleting the annotation being edited
      if (editingAnnotation?.id === id) {
        setRestoreEditPreview(false);
        setEditExiting(true);
      }

      setExitingMarkers((prev) => new Set(prev).add(id));

      // Fire callback
      if (deletedAnnotation) onAnnotationDelete?.(deletedAnnotation);

      // Sync delete to server (non-blocking)
      if (endpoint && deletedAnnotation && onServer(deletedAnnotation)) {
        routeTask(() => deleteAnnotationFromServer(endpoint, serverIds.current.get(id) ?? id)).catch((error) => {
          console.warn(
            "[surfacent] Failed to delete annotation from server:",
            error,
          );
        });
      }
    },
    [annotations, editingAnnotation, onAnnotationDelete, endpoint, routeTask],
  );

  // Handle marker hover - finds the element for live position tracking
  const handleMarkerHover = useCallback(
    (annotation: Annotation | null) => {
    if (!annotation) {
      setHoveredMarkerId(null);
      setHoveredTargetElement(null);
      return;
    }

    setHoveredMarkerId(annotation.id);

    // Find the element at the annotation's position for live tracking
    if (annotation.boundingBox) {
      // Single element
      const bb = annotation.boundingBox;
      const centerX = bb.x + bb.width / 2;
      const centerY = annotation.isFixed
        ? bb.y + bb.height / 2
        : bb.y + bb.height / 2 - window.scrollY;
      const el = annotationElementFromPoint(centerX, centerY, bb);

      // Validate found element's size roughly matches stored bounding box
      // (prevents using wrong child element when clicking center of a container)
      if (el) {
        const elRect = viewportRect(el);
        const widthRatio = elRect.width / bb.width;
        const heightRatio = elRect.height / bb.height;
        // If found element is much smaller than stored, it's probably a child - don't use it
        if (widthRatio < 0.5 || heightRatio < 0.5) {
          setHoveredTargetElement(null);
        } else {
          setHoveredTargetElement(el);
        }
      } else {
        setHoveredTargetElement(null);
      }
    } else {
      setHoveredTargetElement(null);
    }
    },
    [],
  );

  // Update annotation (edit mode submit)
  const updateAnnotation = useCallback(
    (newComment: string) => {
      if (!editingAnnotation) return;

      const current = live(editingAnnotation);
      const updatedAnnotation = { ...editingAnnotation, status: current.status, ...reopened(current), comment: newComment };
      setEditingAnnotation(updatedAnnotation);

      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === editingAnnotation.id ? updatedAnnotation : a,
        ),
      );

      // Fire callback
      onAnnotationUpdate?.(updatedAnnotation);

      // Sync update to server (non-blocking)
      if (endpoint && onServer(current)) {
        routeTask(() => updateAnnotationOnServer(endpoint, serverIds.current.get(editingAnnotation.id) ?? editingAnnotation.id, {
          ...serverFields(updatedAnnotation),
          ...reopened(current),
        })).catch((error) => {
          console.warn(
            "[surfacent] Failed to update annotation on server:",
            error,
          );
        });
      }

      // Return to the anchored preview when focus or the pointer belongs there.
      setRestoreEditPreview(editingFromKeyboardRef.current || !!editingTriggerRef.current?.matches(":hover"));
      setEditExiting(true);
    },
    [editingAnnotation, onAnnotationUpdate, endpoint, routeTask],
  );

  // Surfacent: intent changes on a saved annotation apply right away.
  const changeEditingAspect = useCallback((key: string, value: string | null | undefined) => {
    if (!editingAnnotation) return;
    const aspects: AspectChanges = { ...editingAnnotation.aspects };
    if (value === undefined) delete aspects[key];
    else aspects[key] = value;
    const element = editingTargetElement?.isConnected ? editingTargetElement : findElement(editingAnnotation.selector);
    setEditingAnnotation(saveAspects(editingAnnotation, aspects, element));
  }, [editingAnnotation, editingTargetElement, saveAspects]);

  const previewEditingAspect = useCallback((key: string, value: string | null | undefined, tried?: string) => {
    if (!editingAnnotation) return;
    const element = editingTargetElement?.isConnected ? editingTargetElement : findElement(editingAnnotation.selector);
    if (!element) return;
    const aspects: AspectChanges = { ...editingAnnotation.aspects };
    if (value !== undefined) aspects[key] = value;
    previewChanges(element, aspects);
    previewTry(element, value !== undefined ? key : undefined, value !== undefined ? tried : undefined);
  }, [editingAnnotation, editingTargetElement]);

  // Cancel editing with exit animation
  const cancelEditAnnotation = useCallback(() => {
    setRestoreEditPreview(editingFromKeyboardRef.current || !!editingTriggerRef.current?.matches(":hover"));
    setEditExiting(true);
  }, []);

  const finishEditExit = useCallback(() => {
    if (restoreEditPreview && editingAnnotation && !pendingAnnotation) setHoveredMarkerId(editingAnnotation.id);
    setEditingAnnotation(null);
    setEditingTargetElement(null);
    setEditExiting(false);
  }, [restoreEditPreview, editingAnnotation, pendingAnnotation]);

  // Clear the unsent notes, with staggered animation: an agent's are its own to resolve.
  const clearAll = useCallback(() => {
    if (!routeAlive.current) return;
    // A delayed copy completion owns only its original, unchanged notes.
    // `annotations` is the snapshot taken when the action ran; match it against
    // the live list by ID and comment rather than object identity, because a
    // server ID swap or session merge recreates the object. serverIds maps the
    // local ID the snapshot still holds to the ID the server assigned since.
    const live = new Map(currentAnnotationsRef.current.map(note => [note.id, note]));
    const batch: Annotation[] = [];
    for (const note of annotations) {
      const now = live.get(serverIds.current.get(note.id) ?? note.id) ?? live.get(note.id);
      if (now && !onServer(now) && now.comment === note.comment && !deletedIds.current.has(now.id) && !batch.includes(now)) batch.push(now);
    }
    if (batch.length === 0) return;
    // Clearing undoes what the notes previewed, however it was started.
    revertAnnotationPreviews(batch);
    for (const annotation of batch) {
      deletedIds.current.add(annotation.id);
      clearingIds.current.add(annotation.id);
      pendingClearIds.current.add(annotation.id);
    }
    setExitingMarkers(previous => new Set([...previous, ...batch.map(a => a.id)]));

    onAnnotationsClear?.(batch);

    setIsClearing(true);
    // Persistence effects save only feedback outside the exiting batch.

    // Visible markers report their actual exits. Hidden markers are completed
    // by the existing removal effect, so neither case needs a count-based wait.
    finishClearBatch();
  }, [annotations, onAnnotationsClear, finishClearBatch, revertAnnotationPreviews]);

  // Copy output
  const copyOutput = useCallback(async () => {
    const action = copyAction.start();
    const displayUrl =
      typeof window !== "undefined"
        ? window.location.pathname +
          window.location.search +
          window.location.hash
        : pathname;

    // What no agent has: the rest is its own to apply.
    const output = generateOutput(annotations.filter(isUnsent), displayUrl, { appName });
    if (!output) return;
    const copiedOk = !copyToClipboard || await copyTextToClipboard(output);

    // Preserve callback delivery even when the system clipboard is unavailable.
    onCopy?.(output);

    if (!copyAction.isCurrent(action)) return;
    setCopied(copiedOk);
    if (!copiedOk) return;
    copyAction.schedule(action, () => setCopied(false), 2000);

    if (settings.autoClearAfterCopy) {
      copyAction.schedule(action, clearAll, 500);
    }
  }, [
    annotations,
    pathname,
    settings.autoClearAfterCopy,
    clearAll,
    copyAction,
    copyToClipboard,
    appName,
    onCopy,
  ]);

  // Suggestion mode: the page's candidates go to the agent, which answers with
  // suggested notes, previewed on the page until the person accepts each one
  // (it becomes an ordinary note for the agent to apply) or rejects it.
  const canSuggest = !!endpoint && connectionStatus === "connected" && !!currentSessionId;
  const suggest = useCallback(async () => {
    if (!endpoint || !currentSessionId || suggesting !== "idle") return;
    setSuggestNotice(null);
    setSuggesting("scanning");
    try {
      const { candidates } = await findCandidates(attributeNames, (element) =>
        element.tagName === "SURFACENT-TOOLBAR" || !!element.closest("[data-feedback-toolbar]"));
      if (!candidates.length) {
        setSuggesting("idle");
        setSuggestNotice("Nothing left to suggest on this page.");
        return;
      }
      await requestSuggestions(endpoint, currentSessionId, { url: window.location.href, candidates });
      setSuggesting("waiting");
    } catch (error) {
      console.warn("[surfacent] Couldn't ask for suggestions:", error);
      setSuggesting("idle");
      setSuggestNotice("Couldn't reach the surfacent server.");
    }
  }, [endpoint, currentSessionId, suggesting, attributeNames]);
  useEffect(() => {
    if (!suggestNotice) return;
    const timer = setTimeout(() => setSuggestNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [suggestNotice]);

  const suggestions = annotations.filter((a) => a.status === "suggested" && !exitingMarkers.has(a.id) && !deletedIds.current.has(a.id));
  const suggestionKey = suggestions.map((a) => a.id).join(" ");

  // Accepting makes it the person's note, unsent like one made here: the
  // server's suggested copy goes first, so sending it starts afresh.
  const [released, setReleased] = useState(0);
  const acceptSuggestion = useCallback((annotation: Annotation, note?: string) => {
    const accepted = unsent({ ...annotation, comment: note ?? annotation.comment });
    setAnnotations((list) => list.map((a) => (a.id === annotation.id ? accepted : a)));
    onAnnotationUpdate?.(accepted);
    if (!endpoint) return;
    sendingIds.current.add(accepted.id);
    routeTask(() => deleteAnnotationFromServer(endpoint, serverIds.current.get(accepted.id) ?? accepted.id))
      .catch((error) => console.warn("[surfacent] Failed to accept the suggestion:", error))
      .finally(() => {
        sendingIds.current.delete(accepted.id);
        setReleased((count) => count + 1);
      });
  }, [endpoint, routeTask, onAnnotationUpdate]);

  // Sends notes to the agent: the server keeps them, and a listening agent takes them at once.
  const sendNotes = useCallback((list: Annotation[]) => {
    if (!endpoint || !currentSessionId) return;
    const batch = list.filter((a) => isUnsent(a) && !sendingIds.current.has(a.id) && !deletedIds.current.has(a.id));
    if (!batch.length) return;
    for (const note of batch) sendingIds.current.add(note.id);
    const url = window.location.href;
    void routeTask(async () => {
      const results = await Promise.allSettled(batch.map((note) =>
        syncPageAnnotation(endpoint, currentSessionId, { ...note, sessionId: currentSessionId, url: note.url ?? url })));
      const sent = new Map<string, Annotation>();
      results.forEach((result, index) => {
        const note = batch[index]!;
        sendingIds.current.delete(note.id);
        if (result.status === "fulfilled") sent.set(note.id, result.value);
        else console.warn("[surfacent] Couldn't send a note:", result.reason);
      });
      // The server's word, over the person's changes meanwhile; an agent may already have taken it.
      setAnnotations((current) => current.map((a) => {
        const saved = sent.get(a.id);
        return saved ? { ...a, sessionId: saved.sessionId, url: saved.url, status: a.status ?? saved.status } : a;
      }));
    });
  }, [endpoint, currentSessionId, routeTask]);

  const listening = connectionStatus === "connected" && agentListening && !!currentSessionId;
  const unsentNotes = annotations.filter((a) => isUnsent(a) && !exitingMarkers.has(a.id) && !deletedIds.current.has(a.id));
  const unsentKey = unsentNotes.map((a) => a.id).join(" ");
  // Auto send: while an agent listens, every note no agent has goes to it.
  useEffect(() => {
    if (settings.autoSend && listening) sendNotes(unsentNotes);
  }, [settings.autoSend, listening, unsentKey, released, sendNotes]);
  // Auto send off: the person sends them to the listening agent.
  const canSend = !settings.autoSend && listening && unsentNotes.length > 0;
  // Copy and Clear take the notes no agent has; with auto send on, a listening agent gets them all.
  const canCopy = !(settings.autoSend && listening) && unsentNotes.length > 0;

  // The page as it is, without the suggestions' previews, while the person compares.
  useEffect(() => {
    for (const note of currentAnnotationsRef.current) {
      if (note.status !== "suggested" || !hasChanges(note.aspects)) continue;
      const element = findElement(note.selector);
      if (!element) continue;
      if (showOriginal) revertPreview(element);
      else previewChanges(element, note.aspects);
    }
  }, [showOriginal, suggestionKey]);
  useEffect(() => {
    if (!suggestionKey) setShowOriginal(false);
    setReviewIndex((index) => Math.min(index, Math.max(0, suggestions.length - 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionKey]);

  // Walks through the suggestions: each step scrolls to the element and opens its card.
  const reviewSuggestion = useCallback((delta: number) => {
    if (!suggestions.length) return;
    const index = (reviewIndex + delta + suggestions.length) % suggestions.length;
    const note = suggestions[index]!;
    const element = findElement(note.selector) as HTMLElement | null;
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
    setReviewIndex(index);
    setShowOriginal(false);
    setEditExiting(false);
    setRestoreEditPreview(false);
    setHoveredMarkerId(null);
    setEditingTargetElement(element);
    setEditingAnnotation(note);
  }, [suggestions, reviewIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.altKey) return;
      // Document listeners see the shadow host as target. Inspect the original
      // element so typing in web components never triggers toolbar shortcuts.
      const target = (e.composedPath()[0] || e.target) as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        if (portalContainer && !pendingAnnotation && !editingAnnotation && (isActive || showSettings)) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (showSettings) {
          e.preventDefault();
          setShowSettings(false);
          settingsButtonRef.current?.focus();
          return;
        }
        if (showDesign) {
          e.preventDefault();
          setDesignPanel(null);
          return;
        }
        if (pendingAnnotation || editingAnnotation) {
          // Let popup handle
        } else if (isActive) {
          deactivate();
        }
      }

      // Cmd+Shift+F / Ctrl+Shift+F to toggle feedback mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        if (isActive) {
          deactivate();
        } else {
          launcherRef.current?.blur();
          focusControlsOnOpenRef.current = true;
          setIsActive(true);
        }
        return;
      }

      // Single-key shortcuts belong to the expanded toolbar. Skip them when
      // it is collapsed (the host page owns the keyboard then), when typing,
      // or when modifier keys are held.
      if (!isActive || isTyping || e.metaKey || e.ctrlKey) return;

      if (e.repeat) return;

      // "D" to toggle the design settings (their first panel, Surface)
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setShowSettings(false);
        setDesignPanel((open) => (open ? null : "surface"));
      }

      // "S" to ask the agent for suggestions
      if (e.key === "s" || e.key === "S") {
        if (canSuggest && suggesting === "idle") {
          e.preventDefault();
          void suggest();
        }
      }

      // "C" to copy output
      if (e.key === "c" || e.key === "C") {
        if (canCopy) {
          e.preventDefault();
          copyOutput();
        }
      }

      // "X" to clear all
      if (e.key === "x" || e.key === "X") {
        if (canCopy) {
          e.preventDefault();
          clearAll();
        }
      }
    };

    const capture = !!portalContainer;
    pageEvents.addEventListener("keydown", handleKeyDown, capture);
    return () => pageEvents.removeEventListener("keydown", handleKeyDown, capture);
  }, [
    enableKeyboardShortcuts,
    portalContainer,
    editingAnnotation,
    isActive,
    pendingAnnotation,
    canCopy,
    copyOutput,
    clearAll,
    showSettings,
    showDesign,
    deactivate,
    canSuggest,
    suggesting,
    suggest,
  ]);

  // Saved order owns numbering and the badge. Scrolling only changes visibility.
  const projectFrameAnnotation = createFrameProjector();
  const visibleAnnotations = annotations.flatMap((annotation, index) => {
    const projected = projectFrameAnnotation(annotation);
    return projected
      ? [{ annotation: projected, index }]
      : [];
  });
  const pendingMarker = pendingAnnotation && !pendingAnnotation.isSubmitted
    ? projectFrameAnnotation({ ...pendingAnnotation, comment: "", timestamp: 0 }) : null;
  const renderedMarkers = [
    ...(markersVisible ? visibleAnnotations.map(item => ({ ...item, pending: false })) : []),
    ...(pendingMarker ? [{ annotation: pendingMarker, index: annotations.length, pending: true }] : []),
  ];

  // Hidden markers have no animation to wait for (including offscreen frames).
  useEffect(() => {
    const renderedIds = new Set(markersVisible && !isToolbarHidden
      ? visibleAnnotations.map(({ annotation }) => annotation.id) : []);
    if (recentlyAddedIdRef.current && !renderedIds.has(recentlyAddedIdRef.current)) {
      recentlyAddedIdRef.current = null;
    }
    for (const id of exitingMarkers) {
      if (!renderedIds.has(id)) finishMarkerRemoval(id);
    }
  });
  useEffect(() => {
    if (editingAnnotation && exitingMarkers.has(editingAnnotation.id)) {
      setRestoreEditPreview(false);
      setEditExiting(true);
    }
  }, [editingAnnotation, exitingMarkers]);

  const handleMarkerEnter = useCallback((annotation: Annotation) => {
    if (!markersExiting && annotation.id !== recentlyAddedIdRef.current) {
      handleMarkerHover(annotation);
    }
  }, [markersExiting, handleMarkerHover]);
  const handleMarkerLeave = useCallback((id: string) => {
    // Blur from the previous focus target must not clear a newer pointer hover.
    if (hoveredMarkerId === id) handleMarkerHover(null);
  }, [hoveredMarkerId, handleMarkerHover]);
  const handleMarkerClick = useCallback((annotation: Annotation, trigger: HTMLButtonElement) => {
    if (editingAnnotation && !editExiting) {
      editPopupRef.current?.shake();
      return;
    }
    if (pendingExiting) finishPendingExit();
    startEditAnnotation(annotation, trigger);
  }, [startEditAnnotation, pendingExiting, finishPendingExit, editingAnnotation, editExiting]);

  const cardAnnotation = editingAnnotation ?? (shouldShowMarkers && !pendingAnnotation && !isClearing
    ? annotations.find(a => a.id === hoveredMarkerId && !exitingMarkers.has(a.id)) : null);

  const key = (shortcut: string) => (enableKeyboardShortcuts ? shortcut : undefined);
  const mcpState: McpState = !endpoint || connectionStatus !== "connected" ? "not-connected" : listening ? "listening" : "not-listening";
  const dockItems: DockItem[] = [
    ...(canSend
      ? [{
          id: "send",
          label: unsentNotes.length === 1 ? "Send the note to the agent" : `Send ${unsentNotes.length} notes to the agent`,
          icon: SendHorizontal,
          badge: unsentNotes.length,
          onPress: () => sendNotes(unsentNotes),
        }]
      : []),
    {
      id: "suggest",
      label: !canSuggest ? "Suggest intents (needs the MCP server)" : suggesting === "idle" ? "Suggest intents" : "Stop suggesting",
      icon: suggesting === "idle" ? ScanLine : WorkingIcon,
      shortcut: key("S"),
      pressed: suggesting !== "idle",
      disabled: !canSuggest,
      onPress: () => (suggesting === "idle" ? void suggest() : setSuggesting("idle")),
    },
    // The design settings, one panel per group of aspects.
    ...DESIGN_PANELS.map(
      (entry, index): DockItem => ({
        id: entry.id,
        label: entry.label,
        icon: DESIGN_PANEL_ICONS[entry.id],
        shortcut: index === 0 ? key("D") : undefined,
        panel: () => <DesignPanel panel={entry.id} />,
      }),
    ),
    {
      id: "settings",
      // Its dot, in words: what to fix to get notes to an agent.
      label: mcpAvailable ? `Settings · MCP: ${MCP_LABEL[mcpState]}` : "Settings",
      icon: Settings,
      indicator: mcpAvailable ? MCP_INDICATOR[mcpState] : undefined,
      panel: () => (
        <SettingsPanel
          settings={settings}
          onSettingsChange={updateSettings}
          colors={COLOR_OPTIONS}
          mcpState={mcpState}
          endpoint={endpoint}
          page={settingsPage}
          onPageChange={setSettingsPage}
          onHideToolbar={hideToolbarTemporarily}
        />
      ),
    },
    // The notes no agent has, in a group of their own.
    ...(canCopy
      ? [
          {
            id: "copy",
            label: "Copy feedback",
            icon: copied ? Check : Copy,
            shortcut: key("C"),
            separated: true,
            onPress: () => void copyOutput(),
          },
          {
            id: "clear",
            label: "Clear all",
            icon: Trash2,
            shortcut: key("X"),
            tone: "danger" as const,
            onPress: clearAll,
          },
        ]
      : []),
  ];

  // The outline around a picked or annotated element, at its live position when it's on the page.
  const outlineAt = (bb: { x: number; y: number; width: number; height: number }, className: string, fill = true) => (
    <div
      className={className}
      style={{
        left: bb.x,
        top: bb.y,
        width: bb.width,
        height: bb.height,
        borderColor: "color-mix(in srgb, var(--surfacent-color-accent) 60%, transparent)",
        // No fill on a pick: a previewed intent must show its true color.
        backgroundColor: fill ? "color-mix(in srgb, var(--surfacent-color-accent) 5%, transparent)" : "transparent",
      }}
    />
  );
  const liveBox = (element: HTMLElement | null | undefined) => {
    if (!element?.isConnected) return null;
    const rect = viewportRect(element);
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  };
  const storedBox = (annotation: Pick<Annotation, "boundingBox" | "isFixed">) => annotation.boundingBox && {
    x: annotation.boundingBox.x,
    y: annotation.isFixed ? annotation.boundingBox.y : annotation.boundingBox.y - scrollY,
    width: annotation.boundingBox.width,
    height: annotation.boundingBox.height,
  };

  if (!mounted) return null;
  if (isToolbarHidden) return null;

  const hoveredAnnotation = hoveredMarkerId && !pendingAnnotation
    ? annotations.find((a) => a.id === hoveredMarkerId) : undefined;
  const hoveredBox = hoveredAnnotation && (liveBox(hoveredTargetElement) ?? storedBox(hoveredAnnotation));
  const pendingBox = pendingAnnotation && (liveBox(pendingAnnotation.targetElement) ?? storedBox(pendingAnnotation));
  const editingBox = editingAnnotation && (liveBox(editingTargetElement) ?? storedBox(editingAnnotation));

  return (
    <ShadowRoot host="surfacent-toolbar" className={userClassName}>
      {/* The UI stylesheet comes first: it sets the layer order. */}
      <style data-surfacent-styles="ui">{uiCss}</style>
      <style data-surfacent-styles="toolbar">{`@layer legacy {\n${shadowCss}\n${surfacentColorTokensCss}\n}`}</style>
      <div ref={setPortalWrapper} className={styles.positionContext} style={{ display: "contents" }} data-surfacent-theme="dark" data-surfacent-accent={settings.annotationColorId} data-surfacent-root="">
          {/* Toolbar: the dock. Its buttons run the toolbar's actions, and some
              of them open panels (design settings, settings). */}
          {dockContainer && (
            <Dock
              label="Surfacent"
              storageKey="surfacent-dock-position"
              container={dockContainer}
              layer={100000}
              // The page's pointer and key handlers leave the toolbar alone.
              rootProps={{ "data-feedback-toolbar": true, "data-surfacent-toolbar": true }}
              expanded={isActive}
              onExpandedChange={(next) => {
                if (next) setIsActive(true);
                else deactivate();
              }}
              panel={designPanel ?? (showSettings ? "settings" : null)}
              onPanelChange={(next) => {
                if (next !== "settings") setSettingsPage("main");
                setDesignPanel(isDesignPanel(next) ? next : null);
                setShowSettings(next === "settings");
              }}
              badge={annotations.length}
              // The MCP state, seen with the toolbar closed: sending to an agent beats copying.
              indicator={mcpAvailable ? MCP_INDICATOR[mcpState] : undefined}
              items={dockItems}
              attached={
                <SuggestBar
                  state={suggesting}
                  count={suggestions.length}
                  index={reviewIndex}
                  agentListening={listening}
                  notice={suggestNotice}
                  showOriginal={showOriginal}
                  onPrevious={() => reviewSuggestion(-1)}
                  onNext={() => reviewSuggestion(1)}
                  onToggleOriginal={() => setShowOriginal((on) => !on)}
                  onAcceptAll={() => suggestions.forEach((note) => acceptSuggestion(note))}
                  onRejectAll={() => suggestions.forEach((note) => deleteAnnotation(note.id))}
                  onStop={() => setSuggesting("idle")}
                />
              }
            />
          )}

          {/* Markers layer - normal scrolling markers */}
          <div className={styles.markersLayer} data-feedback-toolbar>
            {renderedMarkers
                .filter(({ annotation }) => !annotation.isFixed)
                .map(({ annotation, index, pending }, layerIndex, arr) => (
                  <AnnotationMarker
                    key={markerKeys.current.get(annotation.id) ?? annotation.id}
                    annotation={annotation}
                    pending={pending}
                    globalIndex={index}
                    layerIndex={layerIndex}
                    layerSize={arr.length}
                    isExiting={pending ? pendingExiting : markersExiting}
                    isClearing={clearingIds.current.has(annotation.id)}
                    isAnimated={animatedMarkers.current.has(annotation.id)}
                    isNew={recentlyAddedIdRef.current === annotation.id}
                    onEnterComplete={handleMarkerEntered}
                    isHovered={!markersExiting && hoveredMarkerId === annotation.id}
                    isRemoving={exitingMarkers.has(annotation.id)}
                    onRemoveComplete={finishMarkerRemoval}
                    isEditingAny={!!editingAnnotation}
                    renumberFrom={renumberFrom}
                    onHoverEnter={handleMarkerEnter}
                    onHoverLeave={handleMarkerLeave}
                    onClick={handleMarkerClick}
                  />
                ))}
          </div>

          {/* Fixed markers layer */}
          <div className={styles.fixedMarkersLayer} data-feedback-toolbar>
            {renderedMarkers
                .filter(({ annotation }) => annotation.isFixed)
                .map(({ annotation, index, pending }, layerIndex, arr) => (
                  <AnnotationMarker
                    key={markerKeys.current.get(annotation.id) ?? annotation.id}
                    annotation={annotation}
                    pending={pending}
                    globalIndex={index}
                    layerIndex={layerIndex}
                    layerSize={arr.length}
                    isExiting={pending ? pendingExiting : markersExiting}
                    isClearing={clearingIds.current.has(annotation.id)}
                    isAnimated={animatedMarkers.current.has(annotation.id)}
                    isNew={recentlyAddedIdRef.current === annotation.id}
                    onEnterComplete={handleMarkerEntered}
                    isHovered={!markersExiting && hoveredMarkerId === annotation.id}
                    isRemoving={exitingMarkers.has(annotation.id)}
                    onRemoveComplete={finishMarkerRemoval}
                    isEditingAny={!!editingAnnotation}
                    renumberFrom={renumberFrom}
                    onHoverEnter={handleMarkerEnter}
                    onHoverLeave={handleMarkerLeave}
                    onClick={handleMarkerClick}
                  />
                ))}
          </div>

          {/* Labels sit above saved markers, independently of the highlight layer. */}
          {isActive && hoverInfo && !pendingAnnotation && !editingAnnotation && !isScrolling && (
            <HoverTooltip
              x={hoverPosition.x}
              y={hoverPosition.y}
              elementName={hoverInfo.element}
            />
          )}

          {/* Interactive overlay */}
          {isActive && (
            <div
              className={styles.overlay}
              data-feedback-toolbar
              // Sharing the toolbar layer puts this later sibling above it,
              // including when consumers override className z-index.
              style={
                pendingAnnotation || editingAnnotation
                  ? { zIndex: "inherit" }
                  : undefined
              }
            >
              {/* Hover highlight */}
              {hoverInfo?.rect &&
                !pendingAnnotation &&
                !isScrolling && (
                  <div
                    className={`${styles.hoverHighlight} ${styles.enter}`}
                    style={{
                      left: hoverInfo.rect.left,
                      top: hoverInfo.rect.top,
                      width: hoverInfo.rect.width,
                      height: hoverInfo.rect.height,
                    borderColor: "color-mix(in srgb, var(--surfacent-color-accent) 50%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--surfacent-color-accent) 4%, transparent)",
                    ...(hoverInfo.isPiercing ? { borderStyle: "dashed" } : {}),
                    }}
                  />
                )}

              {/* Marker hover outline (shows the box of the hovered annotation) */}
              {hoveredBox && outlineAt(hoveredBox, `${styles.singleSelectOutline} ${styles.enter}`)}

              {/* Pending annotation outline + popup */}
              {pendingAnnotation && (
                <>
                  {pendingBox && outlineAt(pendingBox,
                    `${styles.singleSelectOutline} ${pendingExiting ? styles.exit : styles.enter}`,
                    !pendingAnnotation.targetElement?.isConnected)}

                  {(() => {
                    // Use stored coordinates - they match what will be saved
                    const positioned = projectFrameAnnotation(pendingAnnotation) ?? pendingAnnotation;
                    const markerX = positioned.x;
                    const markerY = positioned.isFixed
                      ? positioned.y
                      : positioned.y - scrollY;

                    return (
                      <AnnotationPopupCSS
                        key={pendingAnnotation.id}
                        ref={popupRef}
                        element={pendingAnnotation.element}
                        selectedText={pendingAnnotation.selectedText}
                        onOpenSource={onOpenSource && pendingAnnotation.sourceFile
                          ? () => onOpenSource(pendingAnnotation.sourceFile!) : undefined}
                        placeholder="What should change?"
                        onSubmit={addAnnotation}
                        submitLabel={hasChanges(pendingAnnotation.aspects) ? "Apply" : "Add"}
                        onExitComplete={finishPendingExit}
                        onCancel={cancelAnnotation}
                        aspectElement={pendingAnnotation.targetElement}
                        aspectChanges={pendingAnnotation.aspects ?? {}}
                        onAspectChange={pendingAnnotation.targetElement ? changePendingAspect : undefined}
                        onAspectPreview={previewPendingAspect}
                        onSelectParent={selectPendingParent}
                        onSelectChild={selectPendingChild}
                        isExiting={pendingExiting}
                        accentColor="var(--surfacent-color-accent)"
                        style={
                          // Surfacent: beside the selected element, so its preview stays visible.
                          pendingAnnotation.targetElement?.isConnected
                            ? placePendingPopup(pendingAnnotation.targetElement)
                            : {
                                // Popup is 280px wide, centered with translateX(-50%), so 140px each side
                                // Clamp so popup stays 20px from viewport edges
                                left: Math.max(
                                  160,
                                  Math.min(
                                    window.innerWidth - 160,
                                    (markerX / 100) * window.innerWidth,
                                  ),
                                ),
                                // Position popup above or below marker to keep marker visible
                                ...(markerY > window.innerHeight - 290
                                  ? { bottom: window.innerHeight - markerY + 20 }
                                  : { top: markerY + 20 }),
                              }
                        }
                      />
                    );
                  })()}
                </>
              )}

              {/* Edit annotation outline */}
              {editingBox && outlineAt(editingBox, `${styles.singleSelectOutline} ${styles.enter}`)}
            </div>
          )}
          <AnnotationCard
            ref={editPopupRef}
            annotation={cardAnnotation ? projectFrameAnnotation(cardAnnotation) ?? editingAnnotation : null}
            editing={!!editingAnnotation}
            exiting={editExiting}
            restorePreview={restoreEditPreview}
            scrollY={scrollY}
            onExited={finishEditExit}
            editorProps={cardAnnotation ? {
              element: cardAnnotation.element,
              selectedText: cardAnnotation.selectedText,
              onOpenSource: onOpenSource && cardAnnotation.sourceFile
                ? () => onOpenSource(cardAnnotation.sourceFile!) : undefined,
              placeholder: cardAnnotation.status === "suggested" ? "Why (optional)" : "Edit your feedback...",
              initialValue: cardAnnotation.comment,
              // A suggestion is accepted, with any change made here, or rejected.
              submitLabel: cardAnnotation.status === "suggested" ? "Accept" : "Save",
              onSubmit: cardAnnotation.status === "suggested"
                ? (note: string) => {
                    acceptSuggestion(editingAnnotation ?? cardAnnotation, note);
                    setEditExiting(true);
                  }
                : updateAnnotation,
              onCancel: cancelEditAnnotation,
              onDelete: () => deleteAnnotation(cardAnnotation.id),
              deleteLabel: cardAnnotation.status === "suggested" ? "Reject" : undefined,
              aspectElement: editingTargetElement ?? findElement(cardAnnotation.selector),
              aspectChanges: cardAnnotation.aspects ?? {},
              onAspectChange: changeEditingAspect,
              onAspectPreview: previewEditingAspect,
              accentColor: "var(--surfacent-color-accent)",
            } : undefined}
          />

      </div>
    </ShadowRoot>
  );
}
