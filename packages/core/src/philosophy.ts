// What surfacent believes, for agents: the reason behind every intent. The
// suggestion guide and the migration prompt open with it, so an agent judges
// an element by the same ideas the aspects were built on.

/** The product's philosophy, as the opening of agent-facing guides. */
export const PHILOSOPHY = `## The idea

Surfacent styles an interface by intent, not by value. An element says what it is and how it behaves (a raised card, a sunken field, a heading, a tight toolbar) and the CSS derives its colors, radii, spacing and type from where it sits. Nothing renders a fixed color or size: a raised card inside a dialog is one step above the dialog, not the same gray as a card on the page.

- **Context over tokens.** Every intent is relative to the nearest ancestor in the same aspect. Judge an element by what it sits on and what it holds, never in isolation.
- **One physical world.** Light comes from above: what's raised catches more of it, what's sunken less. Attention brings an element closer; a press pushes it in.
- **Opinions are features.** How a surface relates to what's on it, ink to its surface, a press to a hover: these are decided once, by the aspects. An element only states its role.
- **Sameness is the default; depth is a choice.** Most elements need no intent: they inherit their context. Add one only where an element has a role of its own: a new material, a new level, a text role, a region with its own density.
- **Low effort, high adaptability.** Defaults cover the common case. An intent is how an element departs from it, not something every element carries.
`;

/** How to answer a suggestion request: which intents to propose for the candidates on a page. */
const HOW_TO_SUGGEST = `## How to suggest

You get candidates from one page: elements that still carry classes an aspect replaces, and interactive elements without a response. Each comes with its tag, role, text, classes, computed styles, size, source location and what it sits in: the intents its ancestors already have and the candidate that contains it. Decide each one's role from all of that, the way a designer would read the page.

- Propose only what the element needs. Leave out an aspect when the context already gives the right result, and leave out a candidate that needs nothing: an empty answer for it is a good answer.
- surface: judge the level relative to what it sits on, not to the page. A card on the page is raised, a field inside it sunken, a row inside a list flat or nothing.
- response: add it to what people point at or press. Buttons usually take "hover click", fields "focus", clickable cards and rows "hover".
- text: pick the role by what the text is, then its ink (muted, faint) by how much it should stand out.
- density: set it on regions (a toolbar, a sidebar, a form), never on each control inside them.
- color: only for meaning: the accent for the main action, hues for status. Never decoration.
- corner: leave it unset unless a shape starts a tree of its own.
- Keep each reason to one line: what the element is, and why these intents fit it.

Answer with surfacent_suggest: the request's id and, for each candidate you keep, { candidateId, intents: { <aspect>: <value> }, reason }. Nothing changes in the code: the person sees your suggestions as previews on the page, and accepts or rejects each one.
`;

export function howToSuggest(): string {
  return HOW_TO_SUGGEST;
}
