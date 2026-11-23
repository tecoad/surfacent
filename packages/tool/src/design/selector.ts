/**
 * A selector that finds this exact element again after a reload: the nearest
 * unique id, then a `tag:nth-of-type()` path. Stable as long as the structure
 * above the element doesn't change, which is enough to restore previews.
 */
export function uniqueSelector(element: Element): string {
  const doc = element.ownerDocument;
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node !== doc.documentElement) {
    if (node.id) {
      const id = `#${CSS.escape(node.id)}`;
      if (doc.querySelectorAll(id).length === 1) {
        parts.unshift(id);
        break;
      }
    }
    const tag = node.tagName.toLowerCase();
    const parent: Element | null = node.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const sameTag = Array.from(parent.children).filter((child) => child.tagName === node!.tagName);
    parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(node) + 1})` : tag);
    node = parent;
  }
  return parts.join(" > ");
}
