import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@ui-sdk/react/accordion"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { EDIT_SECTIONS, type EditSection } from "../../lib/edit-sections"
import { triggerClass } from "./styles"

/**
 * The Edit page: one accordion section per part of the theme. Headings are
 * nav links; panels open with the accordion easing (300ms).
 */
export function EditSections({
  sections = EDIT_SECTIONS,
  value,
  defaultValue,
  onValueChange,
  disabled,
  renderPanel,
  force,
}: {
  sections?: EditSection[]
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  disabled?: boolean | ((id: string) => boolean)
  renderPanel?: (section: EditSection) => ReactNode
  force?: { id: string; state: string }
}) {
  return (
    <Accordion
      multiple
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (next) => onValueChange(next as string[]) : undefined}
      className="flex flex-col"
    >
      {sections.map((section) => {
        const Icon = section.icon
        const off = typeof disabled === "function" ? disabled(section.id) : disabled
        return (
          <AccordionItem
            key={section.id}
            value={section.id}
            disabled={off}
            className="[&+&]:mt-2 [&+&]:border-t [&+&]:border-chrome-divider [&+&]:pt-2"
          >
            <AccordionHeader className="m-0">
              <AccordionTrigger
                data-force={force?.id === section.id ? force.state : undefined}
                className={triggerClass}
              >
                <Icon
                  aria-hidden="true"
                  absoluteStrokeWidth
                  strokeWidth={1.5}
                  className="size-4 shrink-0 text-chrome-faint transition-colors duration-150 group-hov:text-chrome-text group-data-open:text-chrome-text"
                />
                <span className="min-w-0 flex-1 truncate">{section.label}</span>
                <ChevronRight
                  aria-hidden="true"
                  absoluteStrokeWidth
                  strokeWidth={1.5}
                  className="size-4 shrink-0 text-chrome-faint transition-[rotate,color] duration-250 ease-out-expo group-hov:text-chrome-text group-data-open:rotate-90"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-300 ease-out-expo data-starting-style:h-0 data-ending-style:h-0 motion-reduce:transition-none">
              <div className="flex flex-col gap-2 pt-2 pb-1">
                {renderPanel?.(section)}
              </div>
            </AccordionPanel>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
