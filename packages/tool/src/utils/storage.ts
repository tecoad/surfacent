// =============================================================================
// Storage Utilities
// =============================================================================
//
// TODO: Abstract this to accept a StorageAdapter interface for custom storage
// (IndexedDB, API backend, etc.)
//

import type { Annotation } from "../types";

const STORAGE_PREFIX = "feedback-annotations-";
const DEFAULT_RETENTION_DAYS = 7;

export function getStorageKey(pathname: string): string {
  return `${STORAGE_PREFIX}${pathname}`;
}

export function loadAnnotations<T = Annotation>(pathname: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(getStorageKey(pathname));
    if (!stored) return [];
    const data = JSON.parse(stored);
    const cutoff = Date.now() - DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return data.filter((a: { timestamp?: number }) => !a.timestamp || a.timestamp > cutoff);
  } catch {
    return [];
  }
}

export function saveAnnotations<T = Annotation>(pathname: string, annotations: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(pathname), JSON.stringify(annotations));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Load all annotations from localStorage across all pages.
 * Returns a map of pathname -> annotations.
 */
export function loadAllAnnotations<T = Annotation>(): Map<string, T[]> {
  const result = new Map<string, T[]>();
  if (typeof window === "undefined") return result;

  try {
    const cutoff = Date.now() - DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const pathname = key.slice(STORAGE_PREFIX.length);
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          const filtered = data.filter(
            (a: { timestamp?: number }) => !a.timestamp || a.timestamp > cutoff
          );
          if (filtered.length > 0) {
            result.set(pathname, filtered);
          }
        }
      }
    }
  } catch {
    // ignore errors
  }

  return result;
}

// =============================================================================
// Session Storage
// =============================================================================

const SESSION_PREFIX = "surfacent-session-";

function getSessionStorageKey(pathname: string): string {
  return `${SESSION_PREFIX}${pathname}`;
}

export function loadSessionId(pathname: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(getSessionStorageKey(pathname));
  } catch {
    return null;
  }
}

export function saveSessionId(pathname: string, sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getSessionStorageKey(pathname), sessionId);
  } catch {
    // localStorage might be full or disabled
  }
}

export function clearSessionId(pathname: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getSessionStorageKey(pathname));
  } catch {
    // ignore
  }
}

// =============================================================================
// Toolbar Visibility (per-tab session)
// =============================================================================

const TOOLBAR_HIDDEN_SESSION_KEY = `${SESSION_PREFIX}toolbar-hidden`;

export function loadToolbarHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(TOOLBAR_HIDDEN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveToolbarHidden(hidden: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (hidden) {
      sessionStorage.setItem(TOOLBAR_HIDDEN_SESSION_KEY, "1");
    } else {
      sessionStorage.removeItem(TOOLBAR_HIDDEN_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}
