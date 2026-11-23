/** Where themed settings switch to their `-dark` value: a `dark` class or `data-theme="dark"` on <html>. */
export const DARK_SELECTOR = ':root:where(.dark, [data-theme="dark"])';

/** Whether the document currently renders the dark theme. Browser only. */
export function isDarkTheme(doc: Document = document): boolean {
  const root = doc.documentElement;
  return root.classList.contains("dark") || root.dataset.theme === "dark";
}
