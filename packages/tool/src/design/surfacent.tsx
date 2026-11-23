// The toolbar, plus surfacent's dev server: in development the Vite plugin
// (`surfacent()` from `surfacent/vite`) reports whether surfacent's MCP
// server is running and how to start it on this machine. The toolbar connects
// as soon as the server runs, without a reload, and its MCP page shows the
// commands until then. An `endpoint` prop skips the discovery.

import { useEffect, useState } from "react";
import { PageFeedbackToolbarCSS, type SurfacentProps } from "../components/page-toolbar-css";
import { McpSetupContext, type McpSetup } from "./mcp-setup";

const SETUP_URL = "/__surfacent/mcp";

export function Surfacent(props: SurfacentProps) {
  const [setup, setSetup] = useState<McpSetup>();
  // Kept once the server ran: if it restarts, the toolbar reconnects by itself.
  const [found, setFound] = useState<string>();
  const explicit = props.endpoint !== undefined;

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const next = await fetch(SETUP_URL)
        .then((response) => (response.ok ? (response.json() as Promise<McpSetup>) : undefined))
        .catch(() => undefined);
      // No dev server route (a production build, another bundler): nothing to find.
      if (stopped || !next?.url) return;
      setSetup(next);
      if (next.running) setFound((current) => current ?? next.url);
      else if (!explicit) timer = setTimeout(check, 2000);
    };
    void check();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [explicit]);

  return (
    <McpSetupContext.Provider value={setup}>
      <PageFeedbackToolbarCSS {...props} endpoint={props.endpoint ?? found} />
    </McpSetupContext.Provider>
  );
}
