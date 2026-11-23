import { createContext, useContext } from "react";

/** surfacent's MCP server as the dev server sees it (`/__surfacent/mcp`, from the Vite plugin). */
export interface McpSetup {
  /** Where the toolbar reaches the server. */
  url: string;
  running: boolean;
  /** Commands that start it on this machine, when the dev server finds surfacent-mcp. */
  commands?: { agent: string; server: string };
}

export const McpSetupContext = createContext<McpSetup | undefined>(undefined);

/** What the dev server reported about the MCP server; undefined without the Vite plugin. */
export const useMcpSetup = () => useContext(McpSetupContext);
