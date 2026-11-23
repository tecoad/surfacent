import { createAgent } from "@ui-sdk/react/agent"

/**
 * ui-sdk's agent bridge. Every panel control registers with it, including
 * the custom primitives, so the page can be driven from the console:
 *
 *   agent.snapshot()
 *   await agent.act({ steps: [{ ref: "Motion", action: "next" }] })
 */
const agent = createAgent()

Object.assign(window, { agent })


