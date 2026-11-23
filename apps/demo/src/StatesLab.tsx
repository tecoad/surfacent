import type { Ref } from "react";
import { Lab, type Sample } from "./Lab";

const SAMPLES: Sample[] = [
  {
    name: "Button · raised",
    code: 'data-response="hover focus click"',
    render: (ref, tried) => (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        data-surface="raised"
        data-response="hover focus click"
        data-design-try={tried}
        data-text="label" className="h-9 rounded-lg px-4 font-medium"
      >
        Deploy
      </button>
    ),
  },
  {
    name: "Ghost button · no surface",
    code: 'data-response="hover focus click"',
    render: (ref, tried) => (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        data-response="hover focus click"
        data-design-try={tried}
        data-text="label" className="h-9 rounded-lg px-4 font-medium"
      >
        Share
      </button>
    ),
  },
  {
    name: "Chip · flat",
    code: 'data-response="hover click"',
    render: (ref, tried) => (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        data-surface="flat"
        data-response="hover click"
        data-design-try={tried}
        data-text="caption" className="h-8 rounded-full px-3 font-medium"
      >
        Filter
      </button>
    ),
  },
  {
    name: "List row · no surface",
    code: 'data-response="hover click"',
    render: (ref, tried) => (
      <div data-surface="flat" className="grid w-48 gap-0.5 rounded-lg p-1">
        <button
          ref={ref as Ref<HTMLButtonElement>}
          data-response="hover click"
          data-design-try={tried}
          data-text="label" className="flex h-8 items-center rounded-md px-2 text-left"
        >
          Inbox
        </button>
        <button data-response="hover click" data-text="label" className="flex h-8 items-center rounded-md px-2 text-left">
          Drafts
        </button>
      </div>
    ),
  },
  {
    name: "Input · sunken",
    code: 'data-response="focus"',
    render: (ref, tried) => (
      <input
        ref={ref as Ref<HTMLInputElement>}
        data-surface="sunken"
        data-response="focus"
        data-design-try={tried}
        placeholder="Search…"
        data-text="label" className="h-9 w-48 rounded-lg px-3 placeholder:text-ink-faint outline-none"
      />
    ),
  },
  {
    name: "Card · raised",
    code: 'data-response="hover"',
    render: (ref, tried) => (
      <div
        ref={ref as Ref<HTMLDivElement>}
        role="button"
        tabIndex={0}
        data-surface="raised"
        data-response="hover"
        data-design-try={tried}
        className="grid w-48 gap-0.5 rounded-xl p-3 text-left"
      >
        <span data-text="label" className="font-medium">Card</span>
    <span data-text="caption muted">Open project</span>
      </div>
    ),
  },
];

/**
 * Prototype for the response hypothesis: an element that imitates the
 * physical world answers hover, focus and press only by changing level.
 * Elements that don't answer to the held state stay at rest.
 */
export function StatesLab() {
  return (
    <Lab
      title="States lab"
      description="One law for everything: attention brings an element closer, a press pushes it in. Hold a state to see every element in it, or pick Off and use the mouse."
      samples={SAMPLES}
    />
  );
}
