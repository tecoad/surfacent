import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cx, iconButtonClass } from "surfacent-ui";
import type { McpSetup } from "./mcp-setup";

const hint = "m-0 text-ag-xs font-light text-chrome-muted";
const caption = "text-ag-xs font-medium text-chrome-soft";

/** How to start surfacent's MCP server, on the toolbar's MCP settings page. While it runs, only how to connect an agent. */
export function McpStart({ setup, running }: { setup?: McpSetup; running: boolean }) {
  const commands = setup?.commands;
  if (!commands) {
    return (
      <p className={hint}>
        Add <code className="font-mono text-chrome-soft">npx -y surfacent mcp</code> to your agent's MCP servers: the
        agent starts it, and the toolbar connects to it on port 4848.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className={caption}>Connect Claude Code, once</span>
      <Command text={commands.agent} />
      {!running && (
        <>
          <p className={hint}>New sessions start the server, and the toolbar connects by itself.</p>
          <span className={cx(caption, "mt-1")}>Without an agent</span>
          <Command text={commands.server} />
        </>
      )}
    </div>
  );
}

/** A command to paste in a terminal, with a copy button. */
function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-1 rounded-md border border-chrome-border bg-white/[0.03] py-1 pr-1 pl-2">
      <code className="min-w-0 flex-1 py-0.5 font-mono text-[11px]/4 break-all text-chrome-soft select-all">{text}</code>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy command"}
        title={copied ? "Copied" : "Copy"}
        className={iconButtonClass}
        onClick={() => {
          // The command stays selectable when the page can't write the clipboard.
          navigator.clipboard.writeText(text).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => undefined,
          );
        }}
      >
        {copied ? (
          <Check aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 text-chrome-green" />
        ) : (
          <Copy aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5" />
        )}
      </button>
    </div>
  );
}
