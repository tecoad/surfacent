import { Surfacent } from "surfacent-tool";

/**
 * The toolbar on the demo's pages. It finds surfacent's MCP server through the
 * Vite plugin and connects once it runs. How to start it: settings → MCP.
 */
export function DemoToolbar({ appName }: { appName: string }) {
  return <Surfacent appName={appName} onCopy={(prompt) => console.debug("[surfacent] copied prompt\n\n" + prompt)} />;
}
