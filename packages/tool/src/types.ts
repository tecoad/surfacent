// =============================================================================
// Shared Types
// =============================================================================

export type Annotation = {
  id: string;
  x: number; // % of viewport width
  y: number; // px from top of document (absolute) OR viewport (if isFixed)
  comment: string;
  element: string;
  elementPath: string;
  timestamp: number;
  selectedText?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  nearbyText?: string;
  cssClasses?: string;
  isFixed?: boolean; // true if element has fixed/sticky positioning (marker stays fixed)
  sourceFile?: string; // Source file path from React _debugSource (dev mode only, e.g. "src/Button.tsx:42")
  attributes?: Record<string, string>; // Explicit identifying attributes captured at selection time
  frame?: {
    path: Array<{ index: number; id?: string; url: string }>;
    x: number; y: number; fixed: boolean;
    boundingBox: { x: number; y: number; width: number; height: number };
  };

  // Surfacent: intent changes by aspect key (surface, corners, spacing…).
  // `null` removes the attribute. The synced comment carries the instruction.
  aspects?: Record<string, string | null> | null;
  // Sent to the server as extra annotation fields: the same changes as `intents`, and
  // what the toolbar's checks found around the element as `notes`; `null`
  // clears them. `note` is the person's own words, apart from the composed
  // instruction in `comment`.
  intents?: Record<string, string | null> | null;
  notes?: string[] | null;
  note?: string;
  // Unique selector of the target, used to restore previews after a reload.
  selector?: string;
  // "suggestion" when an agent proposed it in suggestion mode.
  origin?: "suggestion";

  // Layout notes ("placement", "rearrange") came from the removed layout mode;
  // old ones are skipped when loading.
  kind?: "feedback" | "placement" | "rearrange";

  // Protocol fields (added when syncing to server)
  sessionId?: string;
  url?: string;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
  status?: AnnotationStatus;
  thread?: ThreadMessage[];
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolvedBy?: "human" | "agent";
  authorId?: string;

  // Local-only sync tracking (not sent to server)
  _syncedTo?: string; // Session ID this annotation was synced to
};

// -----------------------------------------------------------------------------
// Annotation Enums
// -----------------------------------------------------------------------------

type AnnotationIntent = "fix" | "change" | "question" | "approve";
type AnnotationSeverity = "blocking" | "important" | "suggestion";
// `suggested`: proposed by an agent in suggestion mode, previewed until the person accepts it (pending) or rejects it.
type AnnotationStatus = "suggested" | "pending" | "acknowledged" | "resolved" | "dismissed";

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------

export type Session = {
  id: string;
  url: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
};

type SessionStatus = "active" | "approved" | "closed";

export type SessionWithAnnotations = Session & {
  annotations: Annotation[];
};

// -----------------------------------------------------------------------------
// Thread Messages
// -----------------------------------------------------------------------------

type ThreadMessage = {
  id: string;
  role: "human" | "agent";
  content: string;
  timestamp: number;
};
