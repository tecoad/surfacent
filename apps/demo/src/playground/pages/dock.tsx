import { ThemeDock } from "surfacent-ui"
import { AreaPage } from "../shell/AreaPage"
import type { PageProps } from "../shell/types"
import { jsx, ui } from "../snippet"

const TRY = [
  ["Drag", "Press the launcher, or the open toolbar's background, and move it anywhere. It stays 20px inside the window and remembers where you left it."],
  ["Open near an edge", "If the open toolbar wouldn't fit, it glides back inside."],
  ["Rest on an icon", "Its panel opens above the toolbar; near the top of the window, below it. The next icon takes the same surface over: it resizes to the new panel while the content slides toward the icon (Stripe's menu), and a pill glides behind the icons."],
  ["Keep a panel", "One the pointer opened closes when the pointer leaves. Pressing its icon, or using the panel, keeps it until Esc, its ×, or a press outside."],
  ["Shrink the window", "A panel taller than the room it has shrinks to fit, 12px from the edges, and scrolls inside."],
  ["Keys", "Arrows move between icons. Esc closes the panel; a second Esc closes the toolbar."],
] as const

/** The whole panel, as a toolbar floating over the window. */
export function PanelPage(props: PageProps) {
  return (
    <AreaPage
      {...props}
      code={{ imports: [ui("ThemeDock")], jsx: jsx("ThemeDock") }}
      floating={<ThemeDock />}
    >
      <div className="flex flex-col gap-6">
        <p className="m-0 max-w-xl text-[13px]/5 text-pg-muted">
          The toolbar floats over the whole window. Mount it once, anywhere: it renders into the page's body.
        </p>
        <dl className="m-0 grid grid-cols-[minmax(120px,auto)_minmax(0,1fr)] gap-x-6 gap-y-3 text-[13px]/5">
          {TRY.map(([name, text]) => (
            <div key={name} className="contents">
              <dt className="font-medium text-pg-text">{name}</dt>
              <dd className="m-0 text-pg-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </AreaPage>
  )
}
