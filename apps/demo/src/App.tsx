import {
  Activity,
  ArrowUpRight,
  Bell,
  Box,
  Check,
  ChevronDown,
  CircleDot,
  Command,
  CreditCard,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Layers,
  Moon,
  MoreHorizontal,
  Plus,
  Rocket,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ColorLab } from "./ColorLab";
import { CornersLab } from "./CornersLab";
import { DensityLab } from "./DensityLab";
import { DsToolSections } from "./DsToolSections";
import { StatesLab } from "./StatesLab";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  SectionTitle,
  Segmented,
  Select,
  Switch,
  Textarea,
  ToneReadout,
  cx,
} from "./ui";

const deployments = [
  { id: "dpl_8f2k", branch: "main", commit: "Tune surface tones", author: "Ana Lima", status: "Ready", env: "Production", time: "2m" },
  { id: "dpl_7c1x", branch: "feat/corners", commit: "Concentric radius draft", author: "Rafael Souza", status: "Building", env: "Preview", time: "9m" },
  { id: "dpl_6b0q", branch: "fix/ink-contrast", commit: "Raise ink floor on mid tones", author: "Júlia Rocha", status: "Ready", env: "Preview", time: "1h" },
  { id: "dpl_5a9z", branch: "main", commit: "Spacing scale tokens", author: "Matt Silva", status: "Failed", env: "Production", time: "3h" },
  { id: "dpl_4z8y", branch: "chore/deps", commit: "Bump tailwindcss", author: "Ana Lima", status: "Ready", env: "Preview", time: "1d" },
] as const;

const statusTone = { Ready: "success", Building: "warning", Failed: "danger" } as const;

const activity = [
  { who: "Ana Lima", what: "promoted dpl_8f2k to Production", when: "2 min ago" },
  { who: "Rafael Souza", what: "commented on Concentric radius draft", when: "12 min ago" },
  { who: "Júlia Rocha", what: "invited 2 people to Design Systems", when: "1 h ago" },
  { who: "Matt Silva", what: "rolled back dpl_5a9z", when: "3 h ago" },
];

const lanes = [
  {
    title: "Backlog",
    cards: [
      { title: "Corners: concentric nesting", tag: "corners", people: ["Rafael Souza"] },
      { title: "Spacing density per surface", tag: "spacing", people: ["Ana Lima", "Matt Silva"] },
    ],
  },
  {
    title: "In progress",
    cards: [
      { title: "Surface picker hover preview", tag: "surface", people: ["Matt Silva"] },
      { title: "Dark ground calibration", tag: "surface", people: ["Júlia Rocha"] },
      { title: "Agent prompt rules", tag: "agent", people: ["Ana Lima"] },
    ],
  },
  {
    title: "Done",
    cards: [{ title: "Tailwind plugin options", tag: "plugin", people: ["Rafael Souza", "Júlia Rocha"] }],
  },
];

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Deployments", icon: Rocket },
  { label: "Projects", icon: FolderKanban },
  { label: "Activity", icon: Activity },
  { label: "Team", icon: Users },
  { label: "Billing", icon: CreditCard },
  { label: "Settings", icon: Settings },
];

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return [dark, () => document.documentElement.classList.toggle("dark")] as const;
}

export default function App() {
  const [dark, toggleTheme] = useTheme();
  const [active, setActive] = useState("Overview");
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div data-text="label" className="flex min-h-dvh">
      <Sidebar active={active} onSelect={setActive} />

      <main data-surface="raised" data-corner="1" className="my-2 mr-2 min-w-0 flex-1">
        {/* Same plane as main: no surface, just its paint (bg-surface) so content scrolls under it. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 rounded-t-(--corner-r) border-b border-edge bg-surface px-5">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
            <Input placeholder="Search deployments, projects…" className="pl-9" />
            <kbd className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-edge px-1 text-[10px] text-ink-faint">
              <Command className="size-3" />K
            </kbd>
          </div>
          <div data-density="tight" className="ml-auto flex items-center gap-2">
            <Button variant="ghost" aria-label="Toggle theme" onClick={toggleTheme}>
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="ghost" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
            <Button variant="flat">
              <Users className="size-3.5" /> Share
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" /> New project
            </Button>
          </div>
        </header>

        <div data-corner="concentric" className="mx-auto grid max-w-6xl gap-6 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p data-text="caption faint" className="font-medium">Acme / Design Systems</p>
              <h1 data-text="display" className="mt-1">Overview</h1>
            </div>
            <Segmented label="Range" options={["24h", "7d", "30d"] as const} value={range} onChange={setRange} />
          </div>

          <ColorLab />

          <StatesLab />

          <CornersLab />

          <DensityLab />

          <Stats />

          <div className="grid gap-6 lg:grid-cols-3">
            <Deployments onDeploy={(id) => setToast(`Redeploying ${id}…`)} />
            <ActivityFeed />
          </div>

          <Board />

          <div className="grid gap-6 lg:grid-cols-2">
            <ProjectSettings onSave={() => setToast("Settings saved")} />
            <div className="grid content-start gap-6">
              <ElevationStack />
            </div>
          </div>

          {/* ds-tool's components with none of its constants: this page's world decides. */}
          <div className="grid gap-20 pt-10">
            <header className="grid max-w-2xl gap-1.5">
              <h2 data-text="title">ds-tool, in this page’s world</h2>
       <p data-text="body muted">
                The components of ds-tool’s page, with this page’s settings: its ground, its step, its radius and density. Only the intents
                are ds-tool’s.
              </p>
            </header>
            <DsToolSections />
          </div>
        </div>
      </main>

      {dialogOpen && <NewProjectDialog onClose={() => setDialogOpen(false)} onCreate={() => setToast("Project created")} />}
      {toast &&
        createPortal(
          <div
            data-surface="raised"
            role="status"
            className="fixed bottom-5 left-5 z-40 flex items-center gap-2.5 rounded-xl py-2.5 pr-3 pl-3.5"
          >
            <Check data-color="green" className="size-4" />
            <span data-text="label">{toast}</span>
            <button className="ml-2 text-ink-faint hover:text-ink" aria-label="Dismiss" onClick={() => setToast(null)}>
              <X className="size-3.5" />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Sidebar({ active, onSelect }: { active: string; onSelect: (label: string) => void }) {
  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col gap-4 p-3">
      <button data-surface="flat" data-response="hover click" data-corner="1" className="flex h-11 items-center gap-2.5 px-2.5 text-left">
        <span data-surface="raised" data-color="accent" className="grid size-7 place-items-center">
          <Box className="size-4" />
        </span>
        <span className="grid leading-tight">
          <span className="font-semibold">Acme</span>
     <span data-text="caption faint">Pro workspace</span>
        </span>
        <ChevronDown className="ml-auto size-4 text-ink-faint" />
      </button>

      <nav className="grid gap-0.5">
        {nav.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => onSelect(label)}
            data-surface={label === active ? "raised" : undefined}
            data-response={label === active ? "hover click" : undefined}
            aria-current={label === active ? "page" : undefined}
            data-text={label === active ? "label" : "label muted"}
            className={cx(
              "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-left",
              label === active ? "font-medium" : "hover:bg-ink/5 hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="grid gap-1">
        <p data-text="caption faint" className="px-2.5 font-semibold tracking-wide uppercase">Projects</p>
        {["Marketing site", "Console", "Docs"].map((project, index) => (
          <button
            key={project}
            data-text="label muted"
            className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-left hover:bg-ink/5 hover:text-ink"
          >
            <CircleDot data-color={["green", "blue", "yellow"][index]} className="size-3.5" />
            {project}
          </button>
        ))}
      </div>

      <div data-surface="sunken" data-corner="1" className="mt-auto grid gap-2 p-3">
        <div data-text="caption" className="flex items-center justify-between">
          <span className="font-medium">Build minutes</span>
          <span className="text-ink-faint">72%</span>
        </div>
        <div data-surface="sunken" data-corner="pill" className="h-1.5 overflow-hidden">
          <div data-surface="flat" data-color="accent" className="h-full w-[72%]" />
        </div>
    <p data-text="caption muted">Resets in 9 days.</p>
      </div>

      <div className="flex items-center gap-2.5 px-1">
        <Avatar name="Matt Silva" />
        <div className="grid leading-tight">
          <span className="font-medium">Matt Silva</span>
     <span data-text="caption faint">Owner</span>
        </div>
      </div>
    </aside>
  );
}

function Stats() {
  const stats = [
    { label: "Deployments", value: "1,284", delta: "+12%", bars: [4, 6, 5, 8, 7, 9, 12] },
    { label: "Success rate", value: "98.2%", delta: "+0.4%", bars: [9, 9, 8, 10, 9, 10, 10] },
    { label: "Build time", value: "48s", delta: "−6s", bars: [10, 9, 9, 8, 7, 7, 6] },
    { label: "Active previews", value: "37", delta: "+5", bars: [3, 4, 4, 6, 5, 7, 8] },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="grid gap-3 p-4">
          <div className="flex items-center justify-between">
            <span data-text="caption muted" className="font-medium">{stat.label}</span>
            <Badge tone="success">
              <ArrowUpRight className="size-3" />
              {stat.delta}
            </Badge>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span data-text="figure" className="tabular-nums">{stat.value}</span>
            <div data-surface="sunken" className="flex h-9 items-end gap-0.5 rounded-md p-1">
              {stat.bars.map((height, index) => (
                <span key={index} className="w-1.5 rounded-sm bg-accent/80" style={{ height: `${height * 8}%` }} />
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Deployments({ onDeploy }: { onDeploy: (id: string) => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  return (
    <Card className="grid content-start gap-4 p-5 lg:col-span-2">
      <SectionTitle
        title="Deployments"
        description="Latest builds across every environment."
        action={
          <div data-density="tight" className="flex items-center gap-2">
            <Input placeholder="Filter…" className="w-40" />
            <Button variant="flat">
              <SlidersHorizontal className="size-3.5" /> Filters
            </Button>
          </div>
        }
      />
      <div className="divide-y divide-edge">
        {deployments.map((deployment) => (
          <div key={deployment.id} className="relative flex items-center gap-3 py-2.5">
            <Avatar name={deployment.author} />
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate font-medium">{deployment.commit}</span>
              <span data-text="caption faint" className="flex items-center gap-1 truncate">
                <GitBranch className="size-3" /> {deployment.branch} · {deployment.id}
              </span>
            </div>
            <Badge tone="neutral">{deployment.env}</Badge>
            <Badge tone={statusTone[deployment.status]}>{deployment.status}</Badge>
            <span data-text="caption faint" className="w-8 text-right tabular-nums">{deployment.time}</span>
            <Button
              variant="ghost"
              data-density="tight"
              aria-label="More"
              aria-expanded={menu === deployment.id}
              onClick={() => setMenu(menu === deployment.id ? null : deployment.id)}
            >
              <MoreHorizontal className="size-4" />
            </Button>
            {menu === deployment.id && (
              <div data-surface="raised" data-corner="1" role="menu" className="absolute top-11 right-0 z-20 grid w-44 gap-0.5 p-1">
                {["Redeploy", "Promote to production", "Copy URL"].map((item) => (
                  <button
                    key={item}
                    role="menuitem"
                    onClick={() => {
                      setMenu(null);
                      if (item === "Redeploy") onDeploy(deployment.id);
                    }}
                    data-corner="concentric"
                    className="h-8 px-2.5 text-left hover:bg-ink/6"
                  >
                    {item}
                  </button>
                ))}
                <div className="my-1 border-t border-edge" />
                <button role="menuitem" data-color="red" data-corner="concentric"
                  className="h-8 px-2.5 text-left hover:bg-rose-500/10">
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActivityFeed() {
  return (
    <Card className="grid content-start gap-4 p-5">
      <SectionTitle title="Activity" description="What your team did today." />
      <ul className="grid gap-3">
        {activity.map((item) => (
          <li key={item.what} className="flex gap-2.5">
            <Avatar name={item.who} data-density="tight" />
            <div className="leading-snug">
              <p>
                <span className="font-medium">{item.who}</span> <span className="text-ink-muted">{item.what}</span>
              </p>
       <p data-text="caption faint">{item.when}</p>
            </div>
          </li>
        ))}
      </ul>
      <div data-surface="sunken" className="rounded-lg p-3 font-mono text-[11px] leading-relaxed">
        <p className="text-ink-faint">$ acme deploy --prod</p>
        <p>✓ Built in 41s</p>
        <p>✓ Uploaded 128 assets</p>
        <p data-color="green">✓ Ready: acme.app</p>
      </div>
    </Card>
  );
}

function Board() {
  return (
    <Card className="grid gap-4 p-5">
      <SectionTitle
        title="Roadmap"
        description="Lanes are sunken, cards are raised from the lane."
        action={
          <Button variant="flat" data-density="tight">
            <Plus className="size-3.5" /> Add task
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {lanes.map((lane) => (
          <div key={lane.title} data-surface="sunken" data-corner="1" className="grid content-start gap-2 p-2.5">
            <div className="flex items-center justify-between px-1 pb-1">
              <span data-text="caption" className="font-semibold">{lane.title}</span>
              <span data-text="caption faint" className="tabular-nums">{lane.cards.length}</span>
            </div>
            {lane.cards.map((card) => (
              <div key={card.title} data-surface="raised" data-response="hover" className="grid gap-2.5 p-3">
                <span className="font-medium">{card.title}</span>
                <div className="flex items-center justify-between">
                  <Badge tone={card.tag === "surface" ? "info" : "neutral"}>{card.tag}</Badge>
                  <div data-density="tight" className="flex -space-x-1.5">
                    {card.people.map((person) => (
                      <Avatar key={person} name={person} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button data-surface="flat" data-response="hover click" data-text="caption muted" className="flex h-8 items-center justify-center gap-1">
              <Plus className="size-3.5" /> Add card
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProjectSettings({ onSave }: { onSave: () => void }) {
  const [previews, setPreviews] = useState(true);
  const [protect, setProtect] = useState(false);
  const [plan, setPlan] = useState("Pro");
  const [concurrency, setConcurrency] = useState(4);
  return (
    <Card className="grid content-start gap-5 p-5">
      <SectionTitle title="Project settings" description="Inputs are sunken into the card they sit on." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name">
          <Input defaultValue="design-systems" />
        </Field>
        <Field label="Framework">
          <Select defaultValue="vite">
            <option value="vite">Vite</option>
            <option value="next">Next.js</option>
            <option value="astro">Astro</option>
          </Select>
        </Field>
      </div>
      <Field label="Description" hint="Shown on the project card.">
        <Textarea rows={3} defaultValue="Surfaces, corners and spacing, decided by intent." />
      </Field>

      <div className="grid gap-2">
        <span className="font-medium">Plan</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { name: "Hobby", price: "$0" },
            { name: "Pro", price: "$20" },
            { name: "Team", price: "$48" },
          ].map((option) => (
            <button
              key={option.name}
              role="radio"
              aria-checked={plan === option.name}
              onClick={() => setPlan(option.name)}
              data-surface={plan === option.name ? "raised" : "flat"}
              data-response="hover click"
              className={cx("grid gap-0.5 rounded-lg p-3 text-left", plan === option.name && "ring-2 ring-accent")}
            >
              <span className="font-medium">{option.name}</span>
       <span data-text="caption muted">{option.price}/mo</span>
            </button>
          ))}
        </div>
      </div>

      <div data-surface="sunken" className="grid gap-3 rounded-xl p-3.5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Preview deployments</p>
      <p data-text="caption muted">Every branch gets its own URL.</p>
          </div>
          <Switch label="Preview deployments" checked={previews} onChange={setPreviews} />
        </div>
        <div className="border-t border-edge" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Password protection</p>
      <p data-text="caption muted">Ask for a password on previews.</p>
          </div>
          <Switch label="Password protection" checked={protect} onChange={setProtect} />
        </div>
      </div>

      <Field label={`Concurrent builds: ${concurrency}`}>
        <input
          type="range"
          min={1}
          max={12}
          value={concurrency}
          onChange={(event) => setConcurrency(Number(event.target.value))}
          className="accent-accent"
        />
      </Field>

      <label className="flex items-center gap-2">
        <input type="checkbox" defaultChecked className="size-4 accent-accent" /> Notify me when builds fail
      </label>

      <div className="flex justify-end gap-2 border-t border-edge pt-4">
        <Button variant="flat">Cancel</Button>
        <Button variant="primary" onClick={onSave}>
          Save changes
        </Button>
      </div>
    </Card>
  );
}

function ElevationStack() {
  return (
    <Card className="grid gap-4 p-5">
      <SectionTitle
        title="Elevation stack"
        description="Each level only says how it sits on its parent. Tones come from Ground and Step."
        action={<Layers className="size-4 text-ink-faint" />}
      />
      <div data-surface="sunken" data-corner="1" className="grid gap-3 p-3">
        <div data-text="caption" className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            sunken <Badge tone="accent">New</Badge>
          </span>
          <ToneReadout />
        </div>
        <div data-surface="raised" className="grid gap-3 p-3">
          <div data-text="caption" className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              raised <Badge tone="accent">New</Badge>
            </span>
            <ToneReadout />
          </div>
          <div data-surface="sunken" className="grid gap-3 p-3">
            <div data-text="caption" className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                sunken <Badge tone="accent">New</Badge>
              </span>
              <ToneReadout />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["raised", "flat", "ground"] as const).map((surface) => (
                <div key={surface} data-surface={surface} className="grid justify-items-start gap-1.5 p-2">
                  <span data-text="caption" className="font-medium">{surface}</span>
                  <Badge tone="accent">New</Badge>
                  <ToneReadout />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function NewProjectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div data-surface="raised" data-text="label" role="dialog" aria-modal="true" aria-labelledby="new-project-title" className="relative grid w-full max-w-md gap-5 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="new-project-title" data-text="title">
              New project
            </h2>
            <p data-text="body muted" className="mt-0.5">Dialogs are raised from the ground, wherever they render.</p>
          </div>
          <Button variant="ghost" data-density="tight" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <Field label="Name">
          <Input autoFocus placeholder="my-app" />
        </Field>
        <Field label="Repository">
          <Select defaultValue="acme/console">
            <option>acme/console</option>
            <option>acme/marketing</option>
          </Select>
        </Field>
        <div data-surface="sunken" className="flex items-center gap-3 rounded-xl p-3">
          <GitBranch className="size-4 text-ink-faint" />
          <span className="flex-1">Deploy on every push to main</span>
          <Badge tone="info">Recommended</Badge>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="flat" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onCreate();
              onClose();
            }}
          >
            Create project
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
