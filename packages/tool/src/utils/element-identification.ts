import { isShadowRoot, parentFrame } from "./frame-dom";
import { identifyingAttributeSelector } from "./element-attributes";

// =============================================================================
// Element Identification Utilities
// =============================================================================

// =============================================================================
// Shadow DOM Helpers
// =============================================================================

/**
 * Gets the parent element, crossing shadow DOM boundaries.
 * When inside a shadow root with no parentElement, returns the shadow host.
 */
function getParentElement(element: Element): Element | null {
  if (element.parentElement) {
    return element.parentElement;
  }
  const root = element.getRootNode();
  if (isShadowRoot(root)) {
    return root.host;
  }
  return null;
}

/**
 * Finds the closest ancestor matching a selector, crossing shadow DOM boundaries.
 */
export function closestCrossingShadow(element: Element, selector: string): Element | null {
  let current: Element | null = element;
  while (current) {
    if (current.matches(selector)) return current;
    current = getParentElement(current);
  }
  return null;
}

/**
 * Checks if an element is inside a shadow DOM
 */
export function isInShadowDOM(element: Element): boolean {
  return isShadowRoot(element.getRootNode());
}

/**
 * Gets the shadow host for an element, or null if not in shadow DOM
 */
export function getShadowHost(element: Element): Element | null {
  const root = element.getRootNode();
  if (isShadowRoot(root)) {
    return root.host;
  }
  return null;
}

// =============================================================================
// Element Path Utilities
// =============================================================================

/**
 * Gets a readable path for an element (e.g., "article > section > p")
 * Supports elements inside shadow DOM by crossing shadow boundaries.
 */
export function getElementPath(target: HTMLElement, maxDepth = 4, attributeNames?: readonly string[]): string {
  const parts: string[] = [];
  let current: HTMLElement | null = target;
  let depth = 0;

  while (current && depth < maxDepth) {
    const tag = current.tagName.toLowerCase();

    // Omit generic ancestors, but keep a path when the page itself is picked.
    if (tag === "html" || tag === "body") {
      if (parts.length === 0) parts.push(tag);
      break;
    }

    // Get identifier
    let identifier = tag;
    if (current.id) {
      identifier = `#${current.id}`;
    } else if (current.className && typeof current.className === "string") {
      const meaningfulClass = current.className
        .split(/\s+/)
        .find(c => c.length > 2 && !c.match(/^[a-z]{1,2}$/) && !c.match(/[A-Z0-9]{5,}/));
      if (meaningfulClass) {
        identifier = `.${meaningfulClass.split("_")[0]}`;
      }
    }

    identifier += identifyingAttributeSelector(current, attributeNames);

    // Mark shadow boundary crossings
    const nextParent = getParentElement(current);
    if (!current.parentElement && nextParent) {
      identifier = `⟨shadow⟩ ${identifier}`;
    }

    parts.unshift(identifier);
    current = nextParent as HTMLElement | null;
    depth++;
  }

  const frame = parentFrame(target.ownerDocument);
  return (frame ? getElementPath(frame, 2) + " > ⟨iframe⟩ " : "") + parts.join(" > ");
}

/**
 * Gets concatenated direct text node content from an element.
 * Only includes immediate text nodes, not text from child elements.
 */
function getDirectTextContent(el: HTMLElement): string {
  let text = "";
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent?.trim();
      if (t) text += (text ? " " : "") + t;
    }
  }
  return text;
}

/**
 * Identifies an element and returns a human-readable name + path
 */
export function identifyElement(target: HTMLElement, attributeNames?: readonly string[]): { name: string; path: string } {
  const path = getElementPath(target, 4, attributeNames);

  if (target.dataset.element) {
    return { name: target.dataset.element, path };
  }

  const tag = target.tagName.toLowerCase();

  // SVG elements
  if (["path", "circle", "rect", "line", "g"].includes(tag)) {
    // Try to find parent SVG context (crossing shadow boundaries)
    const svg = closestCrossingShadow(target, "svg");
    if (svg) {
      const parent = getParentElement(svg);
      if (parent?.namespaceURI === "http://www.w3.org/1999/xhtml") {
        const parentName = identifyElement(parent as HTMLElement).name;
        return { name: `graphic in ${parentName}`, path };
      }
    }
    return { name: "graphic element", path };
  }
  if (tag === "svg") {
    const parent = getParentElement(target);
    if (parent?.tagName.toLowerCase() === "button") {
      const btnText = parent.textContent?.trim();
      return { name: btnText ? `icon in "${btnText}" button` : "button icon", path };
    }
    return { name: "icon", path };
  }

  // Interactive elements
  if (tag === "button") {
    const text = target.textContent?.trim();
    const ariaLabel = target.getAttribute("aria-label");
    if (ariaLabel) return { name: `button [${ariaLabel}]`, path };
    return { name: text ? `button "${text.slice(0, 25)}"` : "button", path };
  }
  if (tag === "a") {
    const text = target.textContent?.trim();
    const href = target.getAttribute("href");
    if (text) return { name: `link "${text.slice(0, 25)}"`, path };
    if (href) return { name: `link to ${href.slice(0, 30)}`, path };
    return { name: "link", path };
  }
  if (tag === "input") {
    const type = target.getAttribute("type") || "text";
    const placeholder = target.getAttribute("placeholder");
    const name = target.getAttribute("name");
    if (placeholder) return { name: `input "${placeholder}"`, path };
    if (name) return { name: `input [${name}]`, path };
    return { name: `${type} input`, path };
  }

  // Headings
  if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
    const text = target.textContent?.trim();
    return { name: text ? `${tag} "${text.slice(0, 35)}"` : tag, path };
  }

  // Text elements
  if (tag === "p") {
    const text = target.textContent?.trim();
    if (text) return { name: `paragraph: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`, path };
    return { name: "paragraph", path };
  }
  if (tag === "span" || tag === "label") {
    const text = target.textContent?.trim();
    if (text && text.length < 40) return { name: `"${text}"`, path };
    return { name: tag, path };
  }
  if (tag === "li") {
    const text = target.textContent?.trim();
    if (text && text.length < 40) return { name: `list item: "${text.slice(0, 35)}"`, path };
    return { name: "list item", path };
  }
  if (tag === "blockquote") return { name: "blockquote", path };
  if (tag === "code") {
    const text = target.textContent?.trim();
    if (text && text.length < 30) return { name: `code: \`${text}\``, path };
    return { name: "code", path };
  }
  if (tag === "pre") return { name: "code block", path };

  // Media
  if (tag === "img") {
    const alt = target.getAttribute("alt");
    return { name: alt ? `image "${alt.slice(0, 30)}"` : "image", path };
  }
  if (tag === "video") return { name: "video", path };

  // Containers - try to infer meaningful name
  if (["div", "section", "article", "nav", "header", "footer", "aside", "main"].includes(tag)) {
    const className = target.className;
    const role = target.getAttribute("role");
    const ariaLabel = target.getAttribute("aria-label");

    if (ariaLabel) return { name: `${tag} [${ariaLabel}]`, path };
    if (role) return { name: `${role}`, path };

    // Prefer direct text content over class names — "$54" is more useful than "styles productPrice"
    const directText = getDirectTextContent(target);
    if (directText && directText.length < 50) {
      return { name: `"${directText}"`, path };
    }

    if (typeof className === "string" && className) {
      const words = className
        .split(/[\s_-]+/)
        .map((c) => c.replace(/[A-Z0-9]{5,}.*$/, "")) // Remove CSS module hashes
        .filter((c) => c.length > 2 && !/^[a-z]{1,2}$/.test(c))
        .slice(0, 2);
      if (words.length > 0) return { name: words.join(" "), path };
    }

    return { name: tag === "div" ? "container" : tag, path };
  }

  return { name: tag, path };
}

/**
 * Gets text content from element and siblings for context
 */
export function getNearbyText(element: HTMLElement): string {
  const texts: string[] = [];

  // Own text
  const ownText = element.textContent?.trim();
  if (ownText && ownText.length < 100) {
    texts.push(ownText);
  }

  // Previous sibling text
  const prev = element.previousElementSibling;
  if (prev) {
    const prevText = prev.textContent?.trim();
    if (prevText && prevText.length < 50) {
      texts.unshift(`[before: "${prevText.slice(0, 40)}"]`);
    }
  }

  // Next sibling text
  const next = element.nextElementSibling;
  if (next) {
    const nextText = next.textContent?.trim();
    if (nextText && nextText.length < 50) {
      texts.push(`[after: "${nextText.slice(0, 40)}"]`);
    }
  }

  return texts.join(" ");
}

/**
 * Gets CSS class names from an element (cleaned of module hashes)
 */
export function getElementClasses(target: HTMLElement): string {
  const className = target.className;
  if (typeof className !== "string" || !className) return "";

  // Split and clean class names (remove module hashes like _abc123)
  const classes = className
    .split(/\s+/)
    .filter(c => c.length > 0)
    .map(c => {
      // Keep the meaningful part before the hash
      const match = c.match(/^([a-zA-Z][a-zA-Z0-9_-]*?)(?:_[a-zA-Z0-9]{5,})?$/);
      return match ? match[1] : c;
    })
    .filter((c, i, arr) => arr.indexOf(c) === i); // dedupe

  return classes.join(", ");
}
