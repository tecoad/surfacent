/// <reference path="./globals.d.ts" />
/// <reference path="./scss.d.ts" />
// =============================================================================
// Surfacent
// =============================================================================
//
// A floating toolbar to pick an element and state its intent (surface, color,
// corners, density, text), previewed live and sent to coding agents.
//
// Usage:
//   import { Surfacent } from "surfacent";
//   <Surfacent />
//
// =============================================================================

// Main components
// CSS-only version (default - zero runtime deps)
export { Surfacent } from "./design/surfacent";
export { aspects, settings, settingGroups, type Aspect, type AspectSetting, type AspectChanges } from "./design/aspects";
export { PageFeedbackToolbarCSS } from "./components/page-toolbar-css";
export type { SurfacentProps } from "./components/page-toolbar-css";

// Shared components (for building custom UIs)
export { AnnotationPopupCSS } from "./components/annotation-popup-css";
export type {
  AnnotationPopupCSSProps,
  AnnotationPopupCSSHandle,
} from "./components/annotation-popup-css";

// Utilities (for building custom UIs)
export {
  identifyElement,
  getElementPath,
  getNearbyText,
  getElementClasses,
  // Shadow DOM support
  isInShadowDOM,
  getShadowHost,
  closestCrossingShadow,
} from "./utils/element-identification";

export {
  loadAnnotations,
  saveAnnotations,
  getStorageKey,
} from "./utils/storage";

// Types
export type { Annotation } from "./types";
