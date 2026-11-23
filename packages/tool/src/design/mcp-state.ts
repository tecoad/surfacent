// The MCP side as the toolbar shows it: one state, one name and one color
// wherever it appears (the dock's Settings dot, the settings' badge).

import type { DockItem } from "surfacent-ui";

/**
 * No server; a server and no agent listening; an agent in listening mode
 * (surfacent_listen). Each one that falls short names what's missing: a server
 * alone isn't the goal, an agent listening is.
 */
export type McpState = "not-connected" | "not-listening" | "listening";

export const MCP_LABEL: Record<McpState, string> = {
  "not-connected": "Not connected",
  "not-listening": "Not listening",
  listening: "Listening",
};

/** The dot on the dock's Settings button and closed launcher: red, yellow, the agent's purple. */
export const MCP_INDICATOR: Record<McpState, NonNullable<DockItem["indicator"]>> = {
  "not-connected": "off",
  "not-listening": "waiting",
  listening: "live",
};
