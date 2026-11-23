import type { ComponentType } from "react"
import { PanelPage } from "./pages/dock"
import {
  AddColorPage,
  ColorSelectPage,
  EditSectionsPage,
  FontPage,
  HexFieldPage,
  ImportThemePage,
  MotionPage,
  NumberFieldPage,
  SegmentedPage,
  ShadowPage,
  SliderPage,
  TokenSelectPage,
} from "./pages/edit"
import { TokensPage } from "./pages/foundation"
import { ButtonsPage, ChipsPage, SwatchSelectPage, ToggleRowPage } from "./pages/toolbar"
import {
  BackButtonPage,
  CharacterPage,
  ColorPage,
  CycleRowPage,
  EditButtonPage,
  LicensePage,
  ProjectNamePage,
  SwitchRowPage,
  ThemePickerPage,
} from "./pages/panel"
import type { PageMeta, PageProps } from "./shell/types"

/** Sidebar groups, by where the element lives in the panel. Pages without a group sit above them. */
export const GROUPS = ["Foundation", "Main page", "Edit page", "Edit fields", "Toolbar"] as const

export type PageEntry = PageMeta & { component: ComponentType<PageProps> }

/** Every element, in sidebar order. Prev/next follow this order. */
export const PAGES: PageEntry[] = [
  {
    id: "panel",
    title: "Panel",
    description: "The whole panel as a toolbar floating over the window: a launcher you drag anywhere, icons with tooltips, and a panel for each.",
    component: PanelPage,
  },
  {
    id: "tokens",
    group: "Foundation",
    title: "Tokens",
    description: "The panel's colors, type, corners and timings.",
    component: TokensPage,
  },
  {
    id: "edit-button",
    group: "Main page",
    title: "Edit button",
    description: "Opens the Edit page. A ui-sdk Button styled as a header button.",
    component: EditButtonPage,
  },
  {
    id: "name",
    group: "Main page",
    title: "Project name",
    description: "Renamed in place, with an async save. A custom primitive built on createInlineEdit.",
    component: ProjectNamePage,
  },
  {
    id: "theme",
    group: "Main page",
    title: "Theme",
    description: "The row that opens the Themes popover. ui-sdk Popover + Toggle Group.",
    component: ThemePickerPage,
  },
  {
    id: "character",
    group: "Main page",
    title: "Character",
    description: "A point on two axes: Quiet→Bold and Compact→Airy. A custom primitive built on createArea.",
    component: CharacterPage,
  },
  {
    id: "cycle",
    group: "Main page",
    title: "Motion and Neutrals",
    description: "A cycle button: each press steps to the next value.",
    component: CycleRowPage,
  },
  {
    id: "color",
    group: "Main page",
    title: "Color",
    description: "The endless strip of brand colors and the hex field. A custom primitive + ui-sdk Field, Input and Button.",
    component: ColorPage,
  },
  {
    id: "switch",
    group: "Main page",
    title: "Switch rows",
    description: "Primary action, Typography and Icons: two-state rows (ui-sdk Switch).",
    component: SwitchRowPage,
  },
  {
    id: "license",
    group: "Main page",
    title: "License details",
    description: "The (i) on Typography and Icons, and what it reveals. ui-sdk Collapsible.",
    component: LicensePage,
  },
  {
    id: "back-button",
    group: "Edit page",
    title: "Back button",
    description: "Returns from the Edit page to the main page.",
    component: BackButtonPage,
  },
  {
    id: "import",
    group: "Edit page",
    title: "Import theme",
    description: "The import button in the Edit header and its popover. ui-sdk Popover + FileInput.",
    component: ImportThemePage,
  },
  {
    id: "sections",
    group: "Edit page",
    title: "Edit sections",
    description: "The ten sections of the Edit page. ui-sdk Accordion.",
    component: EditSectionsPage,
  },
  {
    id: "number",
    group: "Edit fields",
    title: "Number field",
    description: "A value with a unit, steppers and compact cells. ui-sdk NumberInput.",
    component: NumberFieldPage,
  },
  {
    id: "slider",
    group: "Edit fields",
    title: "Slider",
    description: "A field with discrete stops and the value inside the thumb. ui-sdk Slider.",
    component: SliderPage,
  },
  {
    id: "segmented",
    group: "Edit fields",
    title: "Segmented control",
    description: "Options with a pill that slides to the checked one. ui-sdk SegmentedControl.",
    component: SegmentedPage,
  },
  {
    id: "select",
    group: "Edit fields",
    title: "Token select",
    description: "Family, Position, Style: the whole row opens the menu. ui-sdk Select.",
    component: TokenSelectPage,
  },
  {
    id: "hex",
    group: "Edit fields",
    title: "Hex field",
    description: "Palette colors and the picker they open. ui-sdk Popover + ColorPicker.",
    component: HexFieldPage,
  },
  {
    id: "add-color",
    group: "Edit fields",
    title: "Add color",
    description: "Adds a color to the palette, up to eight.",
    component: AddColorPage,
  },
  {
    id: "color-opacity",
    group: "Edit fields",
    title: "Color + opacity",
    description: "A color select joined to an opacity select, for Fill, Stroke and Shadow. ui-sdk Select.",
    component: ColorSelectPage,
  },
  {
    id: "font",
    group: "Edit fields",
    title: "Font",
    description: "Each role opens a menu with search and every family rendered in its own face. ui-sdk Combobox, Select, FileInput and Collapsible.",
    component: FontPage,
  },
  {
    id: "shadow",
    group: "Edit fields",
    title: "Shadow",
    description: "Each shadow's row and the popover it opens.",
    component: ShadowPage,
  },
  {
    id: "motion",
    group: "Edit fields",
    title: "Motion",
    description: "Easing with a draggable curve, or Spring with Bounce. A custom easing-curve primitive.",
    component: MotionPage,
  },
  {
    id: "toggle-row",
    group: "Toolbar",
    title: "Toggle row",
    description: "A setting that's on or off: its label, its help behind a ?, and a switch. ui-sdk Switch and Tooltip.",
    component: ToggleRowPage,
  },
  {
    id: "swatch-select",
    group: "Toolbar",
    title: "Swatch select",
    description: "Picks a color from swatches: the color menu of Color + opacity on its own, for marker colors and the Color aspect. ui-sdk Select.",
    component: SwatchSelectPage,
  },
  {
    id: "chips",
    group: "Toolbar",
    title: "Chips",
    description: "Options that each switch on and off: the states an element responds to, a text's modifiers. ui-sdk Toggle Group.",
    component: ChipsPage,
  },
  {
    id: "buttons",
    group: "Toolbar",
    title: "Buttons",
    description: "Primary, secondary, danger and text actions: the class strings the toolbar's panels use.",
    component: ButtonsPage,
  },
]

/** The pages at the top of the sidebar, outside the groups. */
export const TOP_PAGES = PAGES.filter((page) => !page.group)

export function findPage(id: string | null) {
  return PAGES.find((page) => page.id === id)
}

export function neighbors(id: string) {
  const index = PAGES.findIndex((page) => page.id === id)
  return { previous: PAGES[index - 1], next: PAGES[index + 1] }
}
