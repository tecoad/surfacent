import { useEffect, useRef, useState } from "react"

/** For pages without the async clipboard (plain http, an unfocused document). */
function copyWithSelection(text: string) {
  const area = document.createElement("textarea")
  area.value = text
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.append(area)
  area.select()
  const copied = document.execCommand("copy")
  area.remove()
  return copied
}

/** Copies text to the clipboard and reports "copied" for a moment. */
export function useCopy(duration = 1500) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async (text: string) => {
    let done = false
    try {
      await navigator.clipboard.writeText(text)
      done = true
    } catch {
      done = copyWithSelection(text)
    }
    if (!done) return
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), duration)
  }
  return { copied, copy }
}
