// The toolbar's settings, as a dock panel: the markers, the migration prompt,
// and a page for the MCP server.

import { Check, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  BackButton,
  ColorControl,
  cx,
  DockCard,
  Group,
  labelClass,
  rowClass,
  secondaryButton,
  ToggleRow,
} from "surfacent-ui";
import { copyTextToClipboard } from "../utils/clipboard";
import { loadAllAnnotations } from "../utils/storage";
import type { Annotation } from "../types";
import { composeComment } from "./prompt";
import { isDarkTheme, migrationPrompt, settings as designSettings, type AspectSetting } from "./aspects";
import { readVars } from "./setting-values";
import type { ToolbarSettings } from "../components/page-toolbar-css";
import { McpStart } from "./mcp-start";
import { useMcpSetup } from "./mcp-setup";
import { MCP_LABEL, type McpState } from "./mcp-state";

type SettingsPage = "main" | "mcp";

export type SettingsPanelProps = {
  settings: ToolbarSettings;
  onSettingsChange: (patch: Partial<ToolbarSettings>) => void;
  /** Marker colors: id, label and the color itself. */
  colors: { id: string; label: string; srgb: string }[];
  mcpState: McpState;
  endpoint?: string;
  page: SettingsPage;
  onPageChange: (page: SettingsPage) => void;
  onHideToolbar: () => void;
};

/**
 * Suggestions the person accepted and no agent has applied yet, on every page
 * this browser kept notes for: the migration prompt lists them as decided.
 */
function acceptedSuggestions() {
  return [...loadAllAnnotations<Annotation>()].flatMap(([page, notes]) =>
    notes
      .filter((note) => note.origin === "suggestion" && note.status !== "suggested")
      .map((note) => ({ page, element: note.element, source: note.sourceFile, instruction: composeComment(note) })),
  );
}

/**
 * The prompt an app's agent follows to move to surfacent: install, the design
 * settings on the page (both themes' when it's dark), how its classes become
 * attributes, and the suggestions accepted so far.
 */
function MigrateButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const values = readVars();
    const themed = (setting: AspectSetting) => setting.darkDefault !== undefined;
    const pick = (keep: (setting: AspectSetting) => boolean) =>
      Object.fromEntries(designSettings.filter(keep).map((setting) => [setting.key, values[setting.key]!]));
    const current = isDarkTheme() ? { settings: pick((setting) => !themed(setting)), dark: pick(themed) } : { settings: values };
    await copyTextToClipboard(migrationPrompt({ ...current, elements: acceptedSuggestions() }));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" className={cx(secondaryButton, "self-start bg-white/5")} onClick={copy}>
      {copied && <Check aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 text-chrome-green" />}
      {copied ? "Prompt copied" : "Copy migration prompt"}
    </button>
  );
}

/** The MCP side's state, as the dock's dot shows it: red, yellow, the agent's purple. */
function StatusBadge({ state }: { state: McpState }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-1.5 text-ag-xs font-medium text-chrome-soft",
        state === "not-connected" ? "bg-chrome-red/15" : state === "not-listening" ? "bg-chrome-yellow/15" : "bg-chrome-agent/25",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "size-1.5 shrink-0 rounded-full",
          state === "not-connected" ? "bg-chrome-red" : state === "not-listening" ? "bg-chrome-yellow" : "bg-chrome-agent",
        )}
      />
      {MCP_LABEL[state]}
    </span>
  );
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  colors,
  mcpState,
  endpoint,
  page,
  onPageChange,
  onHideToolbar,
}: SettingsPanelProps) {
  const mcpSetup = useMcpSetup();
  const running = mcpState !== "not-connected";

  if (page === "mcp") {
    return (
      <DockCard title="MCP" leading={<BackButton onClick={() => onPageChange("main")} />}>
        <Group label="MCP connection">
          <div className={rowClass}>
            <span className={labelClass}>Status</span>
            <StatusBadge state={mcpState} />
          </div>
          <p className="m-0 text-ag-xs font-light text-chrome-muted">
            Your notes go to an agent while it listens: ask yours to listen (surfacent_listen). Until one does, they stay
            here, to copy or send later.{" "}
            {running && endpoint ? `Running on ${endpoint.replace(/^https?:\/\//, "")}.` : null}
          </p>
          <McpStart setup={mcpSetup} running={running} />
        </Group>
      </DockCard>
    );
  }

  return (
    <DockCard title="Surfacent" subtitle={`v${__VERSION__}`}>
      <Group>
        <ToggleRow
          label="Hide until restart"
          help="Hides the toolbar until you open a new tab."
          checked={false}
          onCheckedChange={(hide) => hide && onHideToolbar()}
        />
      </Group>
      <Group label="Markers">
        {/* The kit's color strip, its colors fixed: the marker color glides to the picked one. */}
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Color</span>
          <ColorControl
            label="Marker color"
            colors={colors.map((color) => color.srgb)}
            labels={colors.map((color) => color.label)}
            value={Math.max(0, colors.findIndex((color) => color.id === settings.annotationColorId))}
            onValueChange={(index) => onSettingsChange({ annotationColorId: colors[index]!.id })}
          />
        </div>
        <ToggleRow
          label="Clear on copy"
          checked={settings.autoClearAfterCopy}
          onCheckedChange={(autoClearAfterCopy) => onSettingsChange({ autoClearAfterCopy })}
        />
      </Group>
      <Group label="Migrate an app">
        <p className="m-0 text-ag-xs font-light text-chrome-muted">
          The prompt an app's agent follows to move to surfacent: install, the design settings on this page, and how its
          classes become attributes.
        </p>
        <MigrateButton />
      </Group>
      <Group label="Agent">
        <button
          type="button"
          onClick={() => onPageChange("mcp")}
          className={cx(
            rowClass,
            "group -mx-1.5 w-[calc(100%+12px)] rounded-md px-1.5 text-left transition-colors duration-150",
            "hov:bg-white/5 outline-chrome-focus fv:outline-2 fv:outline-offset-1",
          )}
        >
          <span className={labelClass}>MCP</span>
          <span className="flex items-center gap-1.5">
            {(endpoint || mcpSetup) && <StatusBadge state={mcpState} />}
            <ChevronRight
              aria-hidden="true"
              absoluteStrokeWidth
              strokeWidth={1.5}
              className="size-4 text-chrome-faint transition-transform duration-150 group-hov:translate-x-0.5"
            />
          </span>
        </button>
        <ToggleRow
          label="Auto send"
          help="Notes go to a listening agent as you make them. Off, the dock's Send button sends them."
          checked={settings.autoSend}
          onCheckedChange={(autoSend) => onSettingsChange({ autoSend })}
        />
      </Group>
    </DockCard>
  );
}
