import type { CSSProperties } from "react";

const POPUP_WIDTH = 280;
const GAP = 12;
const MARGIN = 8;
// Room the floating toolbar takes at the bottom of the viewport.
const TOOLBAR_CLEARANCE = 72;

export type PopupSide = "below" | "above" | "right" | "left" | "top" | "bottom";

/** Which side has room for the popup, in order: below, above, right, left. Too big for any: over its smaller half. */
export function chooseSide(rect: DOMRect, popupHeight: number): PopupSide {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const height = popupHeight || 320;
  if (vh - rect.bottom >= height + GAP + TOOLBAR_CLEARANCE) return "below";
  if (rect.top >= height + GAP + MARGIN) return "above";
  if (vw - rect.right >= POPUP_WIDTH + GAP + MARGIN) return "right";
  if (rect.left >= POPUP_WIDTH + GAP + MARGIN) return "left";
  const visibleMiddle = (Math.max(rect.top, 0) + Math.min(rect.bottom, vh)) / 2;
  return visibleMiddle > vh / 2 ? "top" : "bottom";
}

/**
 * Places the popup on `side` of the selected element, so a picked intent is
 * visible the moment it's previewed. The side is chosen once per selection
 * and kept while the page scrolls; the position follows the element and stays
 * inside the viewport. The popup is centered on `left` (it translates by -50%).
 */
export function placeBesideElement(rect: DOMRect, popupHeight: number, side: PopupSide): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const half = POPUP_WIDTH / 2;
  const height = popupHeight || 320;
  const maxTop = Math.max(MARGIN, vh - height - TOOLBAR_CLEARANCE);
  const clampTop = (top: number) => Math.max(MARGIN, Math.min(maxTop, top));
  const centerX = Math.max(half + MARGIN, Math.min(vw - half - MARGIN, rect.left + rect.width / 2));

  switch (side) {
    case "below":
      return { left: centerX, top: clampTop(rect.bottom + GAP) };
    case "above":
      return { left: centerX, top: clampTop(rect.top - GAP - height) };
    case "right":
      return { left: Math.min(vw - half - MARGIN, rect.right + GAP + half), top: clampTop(rect.top) };
    case "left":
      return { left: Math.max(half + MARGIN, rect.left - GAP - half), top: clampTop(rect.top) };
    case "top":
      return { left: centerX, top: MARGIN };
    case "bottom":
      return { left: centerX, top: maxTop };
  }
}
