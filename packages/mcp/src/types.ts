// The wire format, an annotation format other tools can read too: an
// annotation's id, comment, elementPath, timestamp, x, y and element, some
// recommended and optional fields, and a lifecycle the server sets. Extra
// fields are allowed, so ours (marked Surfacent below) travel with the rest.

/** `suggested`: proposed by an agent in suggestion mode, waiting for the person to accept (pending) or reject it. */
type Status = "suggested" | "pending" | "acknowledged" | "resolved" | "dismissed";

export interface ThreadMessage {
  id: string;
  role: "human" | "agent";
  content: string;
  timestamp: number;
}

export interface Annotation {
  // Required
  id: string;
  comment: string;
  elementPath: string;
  timestamp: number;
  x: number;
  y: number;
  element: string;

  // Recommended and optional (the toolbar sends more; they're kept as they come)
  url?: string;
  sourceFile?: string;
  cssClasses?: string;
  nearbyText?: string;
  intent?: "fix" | "change" | "question" | "approve";
  severity?: "blocking" | "important" | "suggestion";

  // Lifecycle, set by the server
  sessionId?: string;
  status?: Status;
  thread?: ThreadMessage[];
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolvedBy?: "human" | "agent";

  /** Surfacent: the intent changes on the element, by aspect (`data-<aspect>`); `null` removes the attribute. */
  intents?: Record<string, string | null>;
  /** Surfacent: what the CSS can't see around the element, from the toolbar's checks, as instructions. */
  notes?: string[];
  /** Surfacent: the person's own words; `comment` holds the composed instruction. */
  note?: string;
  /** Surfacent: "suggestion" when an agent proposed it in suggestion mode. */
  origin?: string;
  /** Notes from the toolbar's removed layout mode ("placement", "rearrange") are dropped on load. */
  kind?: string;

  [field: string]: unknown;
}

export interface Session {
  id: string;
  url: string;
  status: "active" | "approved" | "closed";
  createdAt: string;
  updatedAt?: string;
}

export interface SessionWithAnnotations extends Session {
  annotations: Annotation[];
}

/**
 * Suggestion mode: an element the toolbar found on a page that may need an
 * intent, with what an agent needs to judge it and where its note goes.
 */
export interface Candidate {
  /** Unique within its request. */
  id: string;
  /** How the toolbar names it, e.g. `button "Deploy"`. */
  element: string;
  elementPath: string;
  /** Finds it again on the page, for its preview. */
  selector: string;
  tag: string;
  role?: string;
  text?: string;
  classes?: string;
  /** Computed styles that tell what it looks like now: background, border, radius, shadow, font. */
  styles?: Record<string, string>;
  size?: { width: number; height: number };
  sourceFile?: string;
  /** The candidate it sits in, by id. */
  parent?: string;
  /** Intents its ancestors already have, by aspect: what it sits in. */
  context?: Record<string, string>;
  /** Intents it already has, by aspect. */
  current?: Record<string, string>;
  /** Why the toolbar picked it, e.g. "bg-white, shadow-sm (surface)". */
  reasons?: string[];
  // Where its note goes on the page, as for any annotation.
  x: number;
  y: number;
  isFixed?: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

/** Suggestion mode: a page's candidates, waiting for an agent to propose intents. */
export interface SuggestionRequest {
  id: string;
  sessionId: string;
  url: string;
  /** open → taken (surfacent_listen handed it out) → answered. */
  status: "open" | "taken" | "answered";
  candidates: Candidate[];
  createdAt: string;
}

/** An agent's proposal for one candidate. */
export interface Suggestion {
  candidateId: string;
  intents: Record<string, string | null>;
  reason: string;
}

/** The event envelope, as the toolbar reads it from a session's event stream. */
export interface SurfacentEvent {
  type: "annotation.created" | "annotation.updated" | "annotation.deleted" | "session.created" | "suggest.requested" | "suggest.taken";
  timestamp: string;
  sessionId: string;
  sequence: number;
  payload: Annotation | Session | SuggestionRequest | { id: string };
}
