import { useSyncExternalStore } from "react"

/** Where the playground is: `#/<page>/<state>`. */
export type Route = { page: string | null; state: string | null }

const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "")
  const [page, state] = hash.replace(/^#\/?/, "").split("/")
  return {
    page: page ? decodeURIComponent(page) : null,
    state: state ? decodeURIComponent(state) : null,
  }
}

export function pageHref(page: string, state?: string) {
  return `#/${encodeURIComponent(page)}${state ? `/${encodeURIComponent(state)}` : ""}`
}

/** Picks a state without adding a history entry. */
export function replaceState(page: string, state: string) {
  window.history.replaceState(null, "", pageHref(page, state))
  window.dispatchEvent(new HashChangeEvent("hashchange"))
}
