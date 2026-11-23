import { Layers2, Palette, Ruler, Shapes, Spline, SwatchBook, Type } from "lucide-react"
import {
  BordersSection,
  ColorsSection,
  CornersSection,
  FieldGroup,
  FontsSection,
  IconsSection,
  LetterSpacingSection,
  MotionSection,
  ShadowsSection,
  SpacingSection,
  TypeScaleSection,
} from "../edit/sections"
import { ThemePanel } from "../panel/ThemePanel"
import { Dock, type DockItem } from "./Dock"
import { DockCard } from "./DockCard"
import type { DockPosition } from "./geometry"

/** The theme's tools: the whole Theme panel, then one panel per part of the Edit page. */
const ITEMS: DockItem[] = [
  {
    id: "theme",
    label: "Theme",
    icon: SwatchBook,
    // The panel brings its own card and pages; it fits the room the window leaves.
    panel: () => <ThemePanel variant="project" height="min(640px, var(--panel-max))" />,
  },
  {
    id: "colors",
    label: "Colors",
    icon: Palette,
    panel: () => (
      <DockCard title="Colors">
        <ColorsSection />
      </DockCard>
    ),
  },
  {
    id: "typography",
    label: "Typography",
    icon: Type,
    panel: () => (
      <DockCard title="Typography">
        <FieldGroup legend="Fonts">
          <FontsSection />
        </FieldGroup>
        <FieldGroup legend="Type scale">
          <TypeScaleSection />
        </FieldGroup>
      </DockCard>
    ),
  },
  {
    id: "layout",
    label: "Spacing and shape",
    icon: Ruler,
    panel: () => (
      <DockCard title="Spacing and shape">
        <FieldGroup legend="Spacing">
          <SpacingSection />
        </FieldGroup>
        <FieldGroup legend="Letter spacing">
          <LetterSpacingSection />
        </FieldGroup>
        <FieldGroup legend="Corners">
          <CornersSection />
        </FieldGroup>
        <FieldGroup legend="Borders">
          <BordersSection />
        </FieldGroup>
      </DockCard>
    ),
  },
  {
    id: "shadows",
    label: "Shadows",
    icon: Layers2,
    panel: () => (
      <DockCard title="Shadows">
        <ShadowsSection />
      </DockCard>
    ),
  },
  {
    id: "icons",
    label: "Icons",
    icon: Shapes,
    panel: () => (
      <DockCard title="Icons">
        <IconsSection />
      </DockCard>
    ),
  },
  {
    id: "motion",
    label: "Motion",
    icon: Spline,
    panel: () => (
      <DockCard title="Motion">
        <MotionSection />
      </DockCard>
    ),
  },
]

/**
 * The theme editor as a toolbar floating over the window: drag
 * the launcher anywhere, open it, and pick a panel.
 */
export function ThemeDock({
  defaultPosition,
  defaultExpanded,
}: {
  defaultPosition?: DockPosition
  defaultExpanded?: boolean
}) {
  return (
    <Dock
      items={ITEMS}
      label="Theme tools"
      storageKey="pg-theme-dock:window"
      defaultPosition={defaultPosition}
      defaultExpanded={defaultExpanded}
    />
  )
}
