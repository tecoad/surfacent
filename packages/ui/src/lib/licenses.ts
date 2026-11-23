/** What the info button under Typography and Icons says, for each side of the switch. */

export type License = {
  family?: string
  rows: { label: string; value: string; title?: string }[]
  link: { label: string; href: string }
}

const WEB_LICENSE = "Web · Up to 50k monthly visitors · S/M/L included"

export const TYPOGRAPHY_LICENSES: { on: License; off: License } = {
  on: {
    family: "GT Standard M · Standard",
    rows: ["Regular", "Medium", "Bold"].map((label) => ({ label, value: "From $100 USD", title: WEB_LICENSE })),
    link: { label: "Buy at Grilli Type", href: "https://www.grillitype.com/shops/gt-standard" },
  },
  off: {
    family: "Geist",
    rows: [{ label: "Variable font", value: "Free", title: "Includes all weights" }],
    link: { label: "Get Geist", href: "https://vercel.com/font" },
  },
}

export const ICON_LICENSES: { on: License; off: License } = {
  on: {
    rows: [{ label: "Outline", value: "From $79 USD" }],
    link: {
      label: "Buy Central",
      href: "https://iconists.lemonsqueezy.com/checkout/buy/05dceada-ddef-4e99-b8aa-0130f2b60662",
    },
  },
  off: {
    rows: [{ label: "Outline", value: "Free" }],
    link: { label: "Lucide license", href: "https://lucide.dev/license" },
  },
}
