import {
  Layers2,
  MoveHorizontal,
  Palette,
  Radius,
  Scaling,
  Shapes,
  Spline,
  Square,
  Type,
  type LucideIcon,
} from "lucide-react"

export type EditSection = { id: string; label: string; icon: LucideIcon }

/** The Edit page's sections, with the icons Graphical uses. */
export const EDIT_SECTIONS: EditSection[] = [
  { id: "colors", label: "Colors", icon: Palette },
  { id: "fonts", label: "Fonts", icon: Type },
  { id: "scale", label: "Type Scale", icon: Scaling },
  { id: "spacing", label: "Spacing", icon: MoveHorizontal },
  { id: "letterSpacing", label: "Letter spacing", icon: MoveHorizontal },
  { id: "corners", label: "Corners", icon: Radius },
  { id: "borders", label: "Borders", icon: Square },
  { id: "shadows", label: "Shadows", icon: Layers2 },
  { id: "icons", label: "Icons", icon: Shapes },
  { id: "motion", label: "Motion", icon: Spline },
]
