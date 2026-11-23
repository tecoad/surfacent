import type { SVGProps } from "react"

/** The sliders glyph beside "Edit". */
export function SlidersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15 10C16.6575 10 18 8.6575 18 7C18 5.3425 16.6575 4 15 4C13.3425 4 12 5.3425 12 7C12 8.6575 13.3425 10 15 10Z"
        />
        <path d="M12 7H4M20 7H18" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 20C10.6575 20 12 18.6575 12 17C12 15.3425 10.6575 14 9 14C7.3425 14 6 15.3425 6 17C6 18.6575 7.3425 20 9 20Z"
        />
        <path d="M6 17H4M20 17H12.5" />
      </g>
    </svg>
  )
}

/** The up/down chevrons on rows that step through values. */
export function UpDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 8.99989L11.4697 5.53022C11.7626 5.23732 12.2374 5.23732 12.5303 5.53022L16 8.99989" />
      <path d="M8 15L11.4697 18.4697C11.7626 18.7626 12.2374 18.7626 12.5303 18.4697L16 15" />
    </svg>
  )
}
