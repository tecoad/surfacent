import { Button } from "@ui-sdk/react/button"
import { FileInput, FileInputDropzone, FileInputTrigger } from "@ui-sdk/react/file-input"
import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from "@ui-sdk/react/popover"
import { FileUp, FolderOpen, X } from "lucide-react"
import { useState, type SVGProps } from "react"
import { cx } from "../../lib/cx"
import { iconButtonClass } from "../panel/styles"
import { ScrollArea } from "../ScrollArea"
import { closeButton, panelBody, panelPopup, popupHeader, popupTitle } from "./styles"

/** The tray-with-arrow glyph on the Edit page's header. */
export function ImportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M21.25 8.75V16.25C21.25 17.9069 19.9069 19.25 18.25 19.25H5.75C4.09315 19.25 2.75 17.9069 2.75 16.25V7.75C2.75 6.09315 4.09315 4.75 5.75 4.75H8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.25 4.75H17C14.2386 4.75 12 6.98858 12 9.75V15M12 15L8.25 11.25M12 15L15.75 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A dashed drop target (canvasToggle): 8px corners, a faint wash on hover. */
const dashed = cx(
  "group flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-chrome-border",
  "font-chrome text-chrome-text/60 transition-[background-color,border-color,color] duration-150",
  "hov:border-white/15 hov:bg-white/[0.04] hov:text-chrome-text/80",
  "outline-chrome-focus fv:outline-2 fv:outline-offset-2"
)

/** Drop zone and pickers that bring a theme back from GUI.md or a folder. */
export function ImportPanel({ forceDrop }: { forceDrop?: string }) {
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <>
      <header className="grid">
        <div className={popupHeader}>
          <PopoverTitle className={popupTitle}>Import theme</PopoverTitle>
          <PopoverClose aria-label="Close import theme" className={closeButton}>
            <X aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />
          </PopoverClose>
        </div>
        <p className="m-0 mt-0.5 text-ag-xs font-light text-chrome-muted">
          Restore a theme from GUI.md or an older Graphical folder or ZIP.
        </p>
      </header>
      <FileInput accept=".md,.zip,.json" onValueChange={(files) => setPicked(files[0]?.name ?? null)}>
        <FileInputDropzone
          data-force={forceDrop}
          className={cx(dashed, "min-h-24 flex-col px-3 py-4 text-ag data-dragging:border-chrome-accent data-dragging:bg-chrome-accent/10")}
        >
          <FileUp aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4 text-chrome-text/35" />
          <span className="text-chrome-text/85">{picked ?? "Drop a file or folder"}</span>
        </FileInputDropzone>
        <div className="mt-2 flex gap-1.5">
          <FileInputTrigger className={cx(dashed, "min-h-7 flex-1 px-2 py-1 text-ag-sm")}>
            <FileUp aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 text-chrome-text/35" />
            Choose file
          </FileInputTrigger>
          <FileInput directory onValueChange={(files) => setPicked(files[0]?.webkitRelativePath.split("/")[0] || null)}>
            <FileInputTrigger className={cx(dashed, "min-h-7 flex-1 px-2 py-1 text-ag-sm")}>
              <FolderOpen aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-3.5 text-chrome-text/35" />
              Choose folder
            </FileInputTrigger>
          </FileInput>
        </div>
      </FileInput>
      {picked && (
        <div className="flex justify-end gap-1.5">
          <Button
            className="inline-flex min-h-[30px] items-center rounded-2xl px-3.5 py-1.5 text-ag-sm font-medium text-chrome-muted transition-colors duration-150 hov:bg-chrome-hover hov:text-chrome-text/80 outline-chrome-focus fv:outline-2 fv:outline-offset-2"
            onClick={() => setPicked(null)}
          >
            Cancel
          </Button>
          <Button
            className="inline-flex min-h-[30px] items-center rounded-2xl bg-chrome-accent px-3.5 py-1.5 text-ag-sm font-medium text-white transition-[filter] duration-150 hov:brightness-90 outline-chrome-focus fv:outline-2 fv:outline-offset-2"
            onClick={() => setPicked(null)}
          >
            Apply
          </Button>
        </div>
      )}
    </>
  )
}

/** The header button that opens Import theme to its left. */
export function ImportThemeButton({ pinnedOpen, force }: { pinnedOpen?: boolean; force?: string }) {
  return (
    <Popover open={pinnedOpen || undefined} onOpenChange={pinnedOpen ? (_open, details) => details.cancel() : undefined}>
      <PopoverTrigger
        aria-label="Import theme"
        data-force={force}
        className={cx("-mr-1 ml-auto", iconButtonClass, "data-open:bg-chrome-hover data-open:text-chrome-text/80")}
      >
        <ImportIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={20}
        inline={pinnedOpen}
        className={cx(panelPopup, pinnedOpen && "absolute top-0 right-[calc(100%+20px)] z-10")}
      >
        <ScrollArea contentClassName={panelBody}>
          <ImportPanel />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
