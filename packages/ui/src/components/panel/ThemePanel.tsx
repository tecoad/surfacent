import { useContext, useRef, useState, type ReactNode } from "react"
import { cx } from "../../lib/cx"
import { DockStageContext, dockSurface } from "../dock/stage"
import {
  ICONS,
  MOTION_OPTIONS,
  NEUTRAL_OPTIONS,
  PREVIEW_SETTINGS,
  PRIMARY_ACTION,
  PROJECT_SETTINGS,
  TYPOGRAPHY,
  themeName,
  type PanelSettings,
} from "../../lib/data"
import type { EditSection } from "../../lib/edit-sections"
import { ICON_LICENSES, TYPOGRAPHY_LICENSES } from "../../lib/licenses"
import { ImportThemeButton } from "../edit/ImportTheme"
import { EditSectionBody } from "../edit/sections"
import { ScrollArea } from "../ScrollArea"
import { CharacterPad } from "./CharacterPad"
import { ColorControl } from "./ColorControl"
import { EditSections } from "./EditSections"
import {
  BackButton,
  EditButton,
  PanelHeader,
  PanelTitle,
  ProjectName,
} from "./header"
import { CycleRow, Group, SwitchRow } from "./rows"
import { ThemePicker } from "./ThemePicker"
import { PanelFooter, UseThemeButton } from "./UseTheme"

type Page = "theme" | "edit"

/** The settings pages: the leaving page slides 24px and fades, 200ms ease. */
const page = "absolute inset-0 flex min-w-0 flex-col transition-[transform,opacity] duration-200 ease-[ease]"


/**
 * The full Theme panel: the main page, the Edit page that slides in from the
 * right, and (for projects) the editable name and "Use theme". A dark
 * settings panel: #1a1a1a, 16px corners, 12px of vertical padding.
 */
export function ThemePanel({
  variant = "preview",
  initial = variant === "project" ? PROJECT_SETTINGS : PREVIEW_SETTINGS,
  defaultPage = "theme",
  height = 640,
  editPanel,
  editDisabled,
  className,
}: {
  /** "preview" titles the panel "Theme"; "project" shows the name and "Use theme". */
  variant?: "preview" | "project"
  initial?: PanelSettings
  defaultPage?: Page
  height?: number | string
  /** Content of each Edit section. Projects default to the real controls. */
  editPanel?: (section: EditSection) => ReactNode
  /** The public preview locks the Edit sections; projects open them. */
  editDisabled?: boolean | ((id: string) => boolean)
  className?: string
}) {
  const [settings, setSettings] = useState(initial)
  const [current, setCurrent] = useState<Page>(defaultPage)
  const [name, setName] = useState("Untitled")
  const editRef = useRef<HTMLButtonElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const project = variant === "project"
  const sectionBody = editPanel ?? (project ? (section: EditSection) => <EditSectionBody id={section.id} /> : undefined)
  const sectionsLocked = editDisabled ?? !project

  const set = <K extends keyof PanelSettings>(key: K, value: PanelSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const go = (next: Page) => {
    setCurrent(next)
    // Move focus with the page, once it has slid in.
    requestAnimationFrame(() =>
      (next === "edit" ? backRef : editRef).current?.focus({ preventScroll: true })
    )
  }

  // On a dock's stage the stage draws the surface.
  const onStage = useContext(DockStageContext)
  const shown = (which: Page, away: string) =>
    current === which ? { transform: "none", opacity: 1 } : { transform: away, opacity: 0 }

  return (
    <aside
      aria-label="Style inspector"
      style={{ height }}
      className={cx(
        "ag-chrome relative flex w-[280px] shrink-0 flex-col overflow-hidden py-3",
        !onStage && dockSurface,
        className
      )}
    >
      <div className="relative min-h-0 flex-1">
        {/* Main page */}
        <div inert={current !== "theme"} className={page} style={shown("theme", "translateX(-24px)")}>
          <PanelHeader>
            {project ? (
              <div className="min-w-0 flex-1">
                <ProjectName value={name} onValueChange={setName} />
              </div>
            ) : (
              <PanelTitle>Theme</PanelTitle>
            )}
            <EditButton buttonRef={editRef} onClick={() => go("edit")} />
          </PanelHeader>
          {/* Each page's body scrolls under the edge fades; revealed content clears them. */}
          <ScrollArea data-panel-scroll="" className="-my-1.5 flex-1" contentClassName="px-4 py-1.5">
            <Group>
              <ThemePicker value={settings.theme} onValueChange={(theme) => set("theme", theme)} />
            </Group>

            <Group label="Character">
              <CharacterPad
                value={settings.character}
                onValueChange={(character) => set("character", character)}
              />
              <CycleRow
                label="Motion"
                items={MOTION_OPTIONS}
                value={settings.motion}
                onValueChange={(motion) => set("motion", motion)}
              />
            </Group>

            <Group label="Color">
              <ColorControl
                colors={settings.colors}
                value={settings.color}
                onValueChange={(color) => set("color", color)}
                onColorsChange={(colors, color) => setSettings((prev) => ({ ...prev, colors, color }))}
              />
              <CycleRow
                label="Neutrals"
                items={NEUTRAL_OPTIONS}
                value={settings.neutrals}
                onValueChange={(neutrals) => set("neutrals", neutrals)}
              />
              <SwitchRow
                {...PRIMARY_ACTION}
                checked={settings.primaryBrand}
                onCheckedChange={(on) => set("primaryBrand", on)}
              />
            </Group>

            <Group label="Typography">
              <SwitchRow
                {...TYPOGRAPHY}
                info={project ? TYPOGRAPHY_LICENSES : undefined}
                infoLabel="About typography licensing"
                checked={settings.typographyLicensed}
                onCheckedChange={(on) => set("typographyLicensed", on)}
              />
            </Group>

            <Group label="Icons">
              <SwitchRow
                {...ICONS}
                info={project ? ICON_LICENSES : undefined}
                infoLabel="About icons licensing"
                checked={settings.iconsLicensed}
                onCheckedChange={(on) => set("iconsLicensed", on)}
              />
            </Group>
          </ScrollArea>
        </div>

        {/* Edit page */}
        <div inert={current !== "edit"} className={page} style={shown("edit", "translateX(24px)")}>
          <PanelHeader>
            <BackButton buttonRef={backRef} onClick={() => go("theme")} />
            <PanelTitle>{`Edit ${project ? name : themeName(settings.theme)}`}</PanelTitle>
            {project && <ImportThemeButton />}
          </PanelHeader>
          <ScrollArea data-panel-scroll="" className="-my-1.5 flex-1" contentClassName="px-4 py-1.5">
            <EditSections disabled={sectionsLocked} renderPanel={sectionBody} />
          </ScrollArea>
        </div>
      </div>

      {project && (
        <PanelFooter>
          <UseThemeButton />
        </PanelFooter>
      )}
    </aside>
  )
}
