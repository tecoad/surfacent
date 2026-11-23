const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** "#F50", "ff5500" or "#FF5500" → "#ff5500"; anything else → null. */
export function normalizeHex(text: string) {
  const match = HEX.exec(text.trim())
  if (!match) return null
  const digits =
    match[1].length === 3
      ? [...match[1]].map((digit) => digit + digit).join("")
      : match[1]
  return `#${digits.toLowerCase()}`
}
