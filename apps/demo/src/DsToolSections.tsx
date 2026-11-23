// ds-tool's components (its "Laws of this interface" page), rebuilt with our
// aspects. Copy and layout classes are ds-tool's; what ds-tool's laws derive
// comes from our aspects: sheets are surfaces, their corners concentric, text
// sizes roles, and its sm/lg controls density steps. They run on whatever
// settings the page they sit in has.

import { useState, type ComponentProps, type CSSProperties, type ElementType, type ReactNode } from "react";
import { Button as BaseButton, Input, Segmented, cx } from "./ui";

type Inset = "sm" | "md" | "lg";
type Elevation = "raised" | "flat" | "sunken" | "ground";
type Size = "sm" | "md" | "lg";

const INSET: Record<Inset, string> = { sm: "p-1", md: "p-3", lg: "p-4" };
/** ds-tool's control sizes, as density steps of the one size our controls have. */
const SIZE: Record<Size, string | undefined> = { sm: "tight", md: undefined, lg: "loose" };

/** A sheet: a surface that holds other things. Its padding is ds-tool's inset constants. */
function Sheet({
  as: Tag = "div",
  inset = "md",
  border,
  elevation = "raised",
  className,
  ...rest
}: ComponentProps<"div"> & { as?: ElementType; inset?: Inset; border?: boolean; elevation?: Elevation }) {
  return (
    <Tag
      data-sheet=""
      data-surface={elevation}
      className={cx(INSET[inset], border && "border border-edge", className)}
      {...rest}
    />
  );
}

/** ds-tool's button kinds on our one Button: primary is the ink of what it sits on, accent the brand color. */
function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: "secondary" | "primary" | "accent" | "ghost"; size?: Size }) {
  const kind = variant === "accent" ? "primary" : variant === "ghost" ? "ghost" : "raised";
  return (
    <BaseButton
      variant={kind}
      data-density={SIZE[size]}
      className={cx(variant === "primary" && "bg-ink text-surface", className)}
      {...rest}
    />
  );
}

const PHOTOS = {
  dusk: "linear-gradient(160deg, #f6d3a1 0%, #efa77e 34%, #c9788a 62%, #5d6fa3 100%)",
  night: "linear-gradient(200deg, #2a2f52 0%, #54406b 40%, #b0566a 78%, #e69a6b 100%)",
};

function Photo({ tone, label }: { tone: keyof typeof PHOTOS; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      data-corner="concentric"
      className="relative aspect-[16/9] overflow-hidden outline-1 -outline-offset-1 outline-black/10"
      style={{ background: PHOTOS[tone] }}
    >
      <div className="absolute -inset-x-[10%] -bottom-[46%] h-4/5 rounded-[50%] bg-black/45" />
    </div>
  );
}

const HUES = ["bg-amber-200 text-amber-900", "bg-sky-200 text-sky-900", "bg-emerald-200 text-emerald-900", "bg-rose-200 text-rose-900", "bg-violet-200 text-violet-900"];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  const hue = HUES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % HUES.length];
  return (
    <span aria-hidden data-corner="concentric" data-text="caption" className={cx("grid size-9 shrink-0 place-items-center font-semibold", hue)}>
      {initials}
    </span>
  );
}

function Section({ index, title, lede, children }: { index: string; title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <section className="grid min-w-0 gap-6">
      <header className="grid max-w-2xl gap-1.5">
        <p data-text="caption muted" className="font-mono tabular-nums">
          {index}
        </p>
        <h2 data-text="title" className="text-balance">
          {title}
        </h2>
        <p data-text="body muted" className="text-pretty">
          {lede}
        </p>
      </header>
      {children}
    </section>
  );
}

function Caption({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p data-text="caption muted" className="px-1">
      <span className="font-medium text-ink">{label}</span> {children}
    </p>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} data-text="caption muted" className="flex items-center gap-3 font-mono">
      <span aria-hidden>{label}</span>
      <span className="inline-flex items-center gap-2.5">{children}</span>
    </div>
  );
}

function MetaButton({ label, pressed, disabled, onClick, children }: { label?: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onClick()}
      className={cx(
        "relative cursor-pointer underline decoration-dotted underline-offset-4 outline-offset-4",
        "before:absolute before:-inset-x-1.5 before:-inset-y-2.5",
        "focus-visible:outline-2 aria-disabled:cursor-default aria-disabled:opacity-50",
        pressed && "font-medium text-ink decoration-solid",
      )}
    >
      {children}
    </button>
  );
}

function MetaChoice<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return (
    <>
      {options.map((option) => (
        <MetaButton key={option} label={`${name}: ${option}`} pressed={option === value} onClick={() => onChange(option)}>
          {option}
        </MetaButton>
      ))}
    </>
  );
}

// 01 ---------------------------------------------------------------------------

function EventCard({ tone, title, detail, decline, accept, size = "md" }: { tone: keyof typeof PHOTOS; title: string; detail: string; decline: string; accept: string; size?: Size }) {
  return (
    <Sheet as="article">
      <Photo tone={tone} label={`${title}, cover photo`} />
      <div className="grid gap-0.5 px-2 pt-3.5 pb-4">
        <h3 data-text="heading">{title}</h3>
    <p data-text="label muted">
          {detail}
        </p>
      </div>
      <div className="grid grid-cols-[1fr_1.5fr] items-center gap-2">
        <Button size={size}>{decline}</Button>
        <Button variant="primary" size={size}>
          {accept}
        </Button>
      </div>
    </Sheet>
  );
}

function Directions() {
  const [anchor, setAnchor] = useState<"card" | "button">("button");
  const [size, setSize] = useState<Size>("md");
  return (
    <Section
      index="01"
      title="One relation, two directions"
      lede="Both cards are the same component. On the left the card is the anchor: its radius is a constant, and the photo and the buttons derive from it. On the right one button carries the anchor, so the card and the photo derive from the button instead."
    >
      <div className="grid items-start gap-x-8 gap-y-10 md:grid-cols-2">
        <div className="grid gap-3">
          <EventCard tone="dusk" title="Design offsite, Lisbon" detail="12 to 14 June · 9 of 12 going" decline="Maybe" accept="I’m in" />
          <Caption label="Anchor: the card.">Its radius is the constant. The photo and both buttons follow.</Caption>
        </div>
        <div className="grid gap-3">
          <EventCard tone="night" size={size} title="Launch dinner" detail="Thursday 20:30 · 14 seats" decline="Can’t make it" accept="Reserve a seat" />
          <Caption label={anchor === "button" ? "Anchor: the Reserve a seat button." : "Anchor: the card."}>
            {anchor === "button" ? "Change its size and the card follows." : "Now it behaves exactly like the card on the left."}
          </Caption>
          <div className="grid gap-2 px-1">
            <Meta label="anchor">
              <MetaChoice name="Anchor" value={anchor} options={["card", "button"] as const} onChange={setAnchor} />
            </Meta>
            <Meta label="size">
              <MetaChoice name="Size of the anchor button" value={size} options={["sm", "md", "lg"] as const} onChange={setSize} />
            </Meta>
          </div>
        </div>
      </div>
    </Section>
  );
}

// 02 ---------------------------------------------------------------------------

function Parts() {
  const [range, setRange] = useState<"Day" | "Week" | "Month">("Week");
  const options = ["Day", "Week", "Month"] as const;
  return (
    <Section
      index="02"
      title="A control made of parts"
      lede="A segmented control is a small sheet with its segments on it. Standing on its own, its track should fit the segments, not the page, so here every segment carries the anchor. Several elements may share it when they agree: same size, nested the same way."
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-end gap-6">
          <Segmented label="Range, small" options={options} value={range} onChange={setRange} />
          <div data-density="loose">
            <Segmented label="Range, medium" options={options} value={range} onChange={setRange} />
          </div>
          <div data-density="looser">
            <Segmented label="Range, large" options={options} value={range} onChange={setRange} />
          </div>
        </div>
        <Caption label="Anchor: the segments.">Three sizes of control, three track radii, one relation. None of them reads the sheet radius.</Caption>
      </div>
    </Section>
  );
}

// 03 ---------------------------------------------------------------------------

const LEVELS = [
  { kind: "Workspace", name: "Acme Inc.", meta: "4 projects" },
  { kind: "Project", name: "Mobile app", meta: "2 boards" },
  { kind: "Board", name: "Sprint 14", meta: "9 tasks" },
  { kind: "Task", name: "Fix the login redirect", meta: "Due Friday" },
  { kind: "Subtask", name: "Reproduce on iOS 26", meta: "Lena" },
  { kind: "Checklist", name: "Attach a screen recording", meta: "Optional" },
  { kind: "Note", name: "Blocked by the auth migration", meta: "Yesterday" },
];

function Level({ depth, max }: { depth: number; max: number }) {
  const level = LEVELS[depth - 1]!;
  return (
    <Sheet inset="sm" elevation={depth % 2 ? "raised" : "sunken"}>
      <div className="flex items-center justify-between gap-3 px-2.5 pt-1.5 pb-2">
        <p data-text="label" className="min-w-0 truncate">
          <span className="text-ink-muted">{level.kind}</span> <span className="font-medium">{level.name}</span>
        </p>
        <p data-text="caption muted" className="shrink-0 tabular-nums">
          {level.meta}
        </p>
      </div>
      {depth === max ? (
        <div className="flex justify-end">
          <Button size="sm" variant="primary">
            Open
          </Button>
        </div>
      ) : (
        <Level depth={depth + 1} max={max} />
      )}
    </Sheet>
  );
}

function Depth() {
  const [depth, setDepth] = useState(4);
  return (
    <Section
      index="03"
      title="Sheets on sheets"
      lede="Each sheet takes the radius of the one it sits on, minus the gap between them, down to a floor, and a tone one step lighter or darker than it. Nothing here knows how deep it is: add a level and every corner and every tone is re-derived by the browser."
    >
      <div className="grid max-w-2xl min-w-0 gap-3">
        <div className="min-w-0">
          <Level depth={1} max={depth} />
        </div>
        <Caption label={`${depth} ${depth === 1 ? "level" : "levels"}.`}>The innermost button is derived too.</Caption>
        <div className="px-1">
          <Meta label="levels">
            <MetaButton label="Remove a level" onClick={() => setDepth((d) => Math.max(1, d - 1))} disabled={depth === 1}>
              remove
            </MetaButton>
            <span className="text-ink tabular-nums">{depth}</span>
            <MetaButton label="Add a level" onClick={() => setDepth((d) => Math.min(LEVELS.length, d + 1))} disabled={depth === LEVELS.length}>
              add
            </MetaButton>
          </Meta>
        </div>
      </div>
    </Section>
  );
}

// 04 ---------------------------------------------------------------------------

const MEMBERS = [
  { name: "Lena Fischer", email: "lena@acme.com", role: "Owner" },
  { name: "Tomás Ribeiro", email: "tomas@acme.com", role: "Editor" },
];
const POOL = [
  { name: "Aiko Tanaka", email: "aiko@acme.com", role: "Editor" },
  { name: "Samir Haddad", email: "samir@acme.com", role: "Viewer" },
  { name: "Nora Lindqvist", email: "nora@acme.com", role: "Editor" },
  { name: "Diego Morales", email: "diego@acme.com", role: "Viewer" },
];

function Team() {
  const [members, setMembers] = useState(MEMBERS);
  const next = POOL.find((person) => !members.some((member) => member.email === person.email));
  return (
    <Section
      index="04"
      title="Things that arrive later"
      lede="The compiled CSS is formulas, not values, so the browser evaluates them for whatever shows up. Add a member: the new row and everything on it are concentric the moment they mount. This card also has a border, which the law counts as part of the gap."
    >
      <div className="grid max-w-2xl gap-3">
        <Sheet as="article" border>
          <div className="flex items-baseline justify-between gap-3 px-2 pt-1 pb-3">
            <h3 data-text="label" className="font-semibold">
              Members
            </h3>
            <p data-text="caption muted" className="tabular-nums">
              {members.length} of {MEMBERS.length + POOL.length}
            </p>
          </div>
          <ul className="grid gap-1.5">
            {members.map((member) => (
              <Sheet as="li" elevation="sunken" inset="sm" key={member.email} className="flex items-center gap-3">
                <Avatar name={member.name} />
                <div className="grid min-w-0 flex-1">
                  <p data-text="label" className="truncate font-medium">
                    {member.name}
                  </p>
                  <p data-text="caption muted" className="truncate">
                    {member.email}
                  </p>
                </div>
                <p data-text="caption muted" className="hidden sm:block">
                  {member.role}
                </p>
                <Button
                  variant="ghost"
                  aria-label={`Remove ${member.name}`}
                  disabled={member.role === "Owner"}
                  onClick={() => setMembers((list) => list.filter((item) => item.email !== member.email))}
                >
                  Remove
                </Button>
              </Sheet>
            ))}
          </ul>
          <form className="pt-1.5" onSubmit={(event) => event.preventDefault()}>
            <Sheet elevation="sunken" inset="sm" className="flex items-center gap-1.5">
              <Input type="email" placeholder="name@acme.com" aria-label="Invite by email" className="min-w-0" />
              <Button variant="primary" type="submit">
                Send invite
              </Button>
            </Sheet>
          </form>
        </Sheet>
        <Caption label="Anchor: the card.">Its border is one pixel of gap, so each row is one pixel tighter than it would be without it.</Caption>
        <div className="px-1">
          <Meta label="members">
            <MetaButton label="Remove a member" onClick={() => setMembers((list) => list.slice(0, -1))} disabled={members.length <= 1}>
              remove
            </MetaButton>
            <span className="text-ink tabular-nums">{members.length}</span>
            <MetaButton label="Add a member" onClick={() => next && setMembers((list) => [...list, next])} disabled={!next}>
              add
            </MetaButton>
          </Meta>
        </div>
      </div>
    </Section>
  );
}

// 05 ---------------------------------------------------------------------------

function Breaking() {
  const [broken, setBroken] = useState<"off" | "on">("off");
  return (
    <Section
      index="05"
      title="Breaking the law"
      lede="The laws sit below utilities in the cascade on purpose. A hard-coded radius still wins on screen, and that is exactly what the audit is for: it compares what the browser shows with what the law predicts, and it also notices a hard-coded value that happens to match."
    >
      <div className="grid max-w-2xl gap-3">
        <Sheet as="article">
          <div className="grid gap-1 px-2 pt-1.5 pb-3.5">
            <h3 data-text="label" className="font-semibold">
              Team plan
            </h3>
      <p data-text="label muted">
              Billed yearly. Renews on 1 March.
            </p>
          </div>
          <Sheet elevation="sunken" inset="sm" className="flex flex-wrap items-center gap-1.5">
            <Button data-corner={broken === "on" ? "0" : undefined}>Change plan</Button>
            <Button>Download invoices</Button>
            <Button variant="primary" data-corner="pill" className="ml-auto">
              Upgrade
            </Button>
          </Sheet>
        </Sheet>
        <Caption label="No violations.">The pill is a recorded exception, so it is reported but does not fail the audit.</Caption>
        <div className="px-1">
          <Meta label="hard-coded radius">
            <MetaChoice name="Hard-coded radius" value={broken} options={["off", "on"] as const} onChange={setBroken} />
          </Meta>
        </div>
      </div>
    </Section>
  );
}

// 06 ---------------------------------------------------------------------------

const ELEVATIONS = [
  { elevation: "raised", label: "Raised.", says: "One tone-step lighter than the page, so white, and it casts." },
  { elevation: "flat", label: "Flat.", says: "The tone of the page itself: only its hairline sets it apart." },
  { elevation: "sunken", label: "Sunken.", says: "One tone-step darker than the page, with a border one step darker still." },
] as const;

function Invoice({ elevation }: { elevation: Elevation }) {
  return (
    <Sheet as="article" elevation={elevation} border inset="lg">
      <div className="flex items-start justify-between gap-3">
        <p data-text="caption faint" className="pt-0.5 pl-1 font-mono">
          INV-2041
        </p>
        <span data-surface="sunken" data-text="caption" className="px-2 py-0.5 font-medium">
          Unpaid
        </span>
      </div>
      <div className="grid gap-0.5 px-1 pt-3">
        <h3 data-text="heading">Acme Studio</h3>
    <p data-text="label muted">
          Design retainer, November
        </p>
      </div>
      <p data-text="figure" className="px-1 pt-5 tabular-nums">
        €1,240.00
      </p>
      <p data-text="caption faint" className="px-1 pt-1 pb-5">
        Due 1 December · billing@acme.com
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm">Download PDF</Button>
        <Button size="sm" variant="primary">
          Pay invoice
        </Button>
      </div>
    </Sheet>
  );
}

function Elevations() {
  return (
    <Section
      index="06"
      title="Raised, flat, sunken"
      lede="Every surface publishes one number, its tone, and every colour on it is worked out from that number. Raised is one tone-step lighter than what it sits on, flat is the same tone, sunken one step darker. Where tone alone cannot set a card apart, the law draws its edge: here a border, because each card asks for one."
    >
      <div className="grid gap-3">
        <div className="grid items-start gap-x-4 gap-y-8 md:grid-cols-3">
          {ELEVATIONS.map(({ elevation, label, says }) => (
            <div key={elevation} className="grid gap-3">
              <Invoice elevation={elevation} />
              <Caption label={label}>{says}</Caption>
            </div>
          ))}
        </div>
        <div className="max-w-2xl">
          <Caption label="Inverse.">
            The primary is the ink of what it sits on: #2b2c2e on white, #000000 on grey. That is why the primary buttons on this page are not all the same black.
          </Caption>
        </div>
      </div>
    </Section>
  );
}

// 07 ---------------------------------------------------------------------------

const LIGHTNESS = ["0.50", "0.55", "0.60", "0.64"] as const;

function Checkout() {
  return (
    <Sheet as="article" inset="lg">
      <div className="grid gap-0.5 px-1 pb-5">
        <h3 data-text="heading">Acme Studio · INV-2041</h3>
    <p data-text="label faint">
          Card ending 4410
        </p>
      </div>
      <div className="grid grid-cols-[1fr_1.6fr] gap-2">
        <Button>Pay later</Button>
        <Button variant="accent">Pay €1,240.00</Button>
      </div>
    </Sheet>
  );
}

function Label() {
  const [lightness, setLightness] = useState<(typeof LIGHTNESS)[number] | null>(null);
  return (
    <Section
      index="07"
      title="A label nobody chose"
      lede="The accent is three constants. The label on it is not a fourth: it is the ink of the accent's own tone, whichever reads there, never under 4.5:1. Lighten the accent and the label turns from white to black by itself."
    >
      <div className="grid items-start gap-x-8 gap-y-10 md:grid-cols-2">
        <div className="grid gap-3">
          <div style={lightness ? ({ "--accent-tone": lightness } as CSSProperties) : undefined}>
            <Checkout />
          </div>
          <Caption label="accent-l 1.00.">
            The law gives a dark grey label (#342e2c), at 13.35:1. Between 0.56 and 0.565 the label flips: white at 4.67:1, then black at 4.62:1.
          </Caption>
          <div className="px-1">
            <Meta label="accent-l">
              {LIGHTNESS.map((option) => (
                <MetaButton key={option} label={`Accent lightness: ${option}`} pressed={option === lightness} onClick={() => setLightness(option)}>
                  {option}
                </MetaButton>
              ))}
            </Meta>
          </div>
        </div>
      </div>
    </Section>
  );
}

// 08 ---------------------------------------------------------------------------

function Thread() {
  return (
    <Sheet as="article">
      <div className="flex items-start gap-3">
        <Avatar name="Lena Fischer" />
        <div className="grid min-w-0 gap-0.5 pt-0.5">
          <p data-text="label">
            <span className="font-semibold">Lena Fischer</span> commented on INV-2041
          </p>
     <p data-text="caption faint">
            2 hours ago
          </p>
        </div>
      </div>
      <Sheet as="blockquote" elevation="sunken" inset="sm" className="mt-3 grid justify-items-start gap-2">
        <p data-text="label" className="px-1.5 pt-1">
          Could we split this one into two payments?
        </p>
        <span data-surface="sunken" data-text="caption" className="px-2 py-0.5 font-mono">
          INV-2041 · €620.00 × 2
        </span>
      </Sheet>
      <form className="flex items-center gap-2 pt-3" onSubmit={(event) => event.preventDefault()}>
        <Input placeholder="Reply to Lena…" aria-label="Reply to Lena" className="min-w-0" />
        <Button>Cancel</Button>
        <Button variant="primary" type="submit">
          Send
        </Button>
      </form>
    </Sheet>
  );
}

function Worlds() {
  return (
    <Section
      index="08"
      title="A comment thread"
      lede="An avatar, a quote and a reply field on one card. Each corner follows the card's, and each tone is one step from what it sits on."
    >
      <div className="grid max-w-2xl gap-3">
        <Thread />
      </div>
    </Section>
  );
}

// 09 ---------------------------------------------------------------------------

function BreakingColour() {
  const [broken, setBroken] = useState<"off" | "palette" | "copied">("off");
  return (
    <Section
      index="09"
      title="Breaking colour"
      lede="Colour breaks the way radius does, and is caught the same way. A grey written by hand is a colour no law gives. A copy of the lawful value passes at rest, so the full check moves every colour constant at once and reports whatever stays where it was."
    >
      <div className="grid max-w-2xl gap-3">
        <Sheet as="article" inset="lg">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1 px-1 pt-0.5 pb-5">
              <h3 data-text="label" className="font-semibold">
                Team plan
              </h3>
              <p data-text={broken === "palette" ? "label" : "label muted"} className={broken === "palette" ? "text-neutral-500" : undefined}>
                Billed yearly. Renews on 1 March.
              </p>
            </div>
            <span data-surface="raised" data-color="red" data-text="caption" className="px-2 py-0.5 font-medium">
              Overdue
            </span>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button>Update card</Button>
            <Button variant="primary">Retry payment</Button>
          </div>
        </Sheet>
        <Caption label="No violations.">
          The red Overdue badge is a recorded exception: status colours are not a law yet, so the audit reports it and does not fail.
        </Caption>
        <div className="px-1">
          <Meta label="hard-coded colour">
            <MetaChoice name="Hard-coded colour" value={broken} options={["off", "palette", "copied"] as const} onChange={setBroken} />
          </Meta>
        </div>
      </div>
    </Section>
  );
}

// All of them -------------------------------------------------------------------

/** ds-tool's nine sections: its components, as they sit wherever they're placed. */
export function DsToolSections() {
  return (
    <>
      <Directions />
      <Parts />
      <Depth />
      <Team />
      <Breaking />
      <Elevations />
      <Label />
      <Worlds />
      <BreakingColour />
    </>
  );
}
