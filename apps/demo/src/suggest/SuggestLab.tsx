// A small screen as an app has it before moving to surfacent: plain Tailwind
// classes for backgrounds, borders, shadows, radii, text sizes and grays, and
// no data attributes. About twenty elements, for trying suggestion mode (S in
// the toolbar) without the demo page's hundreds of candidates.

const INVOICES = [
  { date: "Nov 12, 2026", amount: "$24.00" },
  { date: "Oct 12, 2026", amount: "$24.00" },
  { date: "Sep 12, 2026", amount: "$19.00" },
];

export default function SuggestLab() {
  return (
    <div data-surface="ground" data-text="label" className="min-h-screen px-6 py-10 font-sans">
      <header className="mx-auto mb-6 flex max-w-2xl items-center justify-between">
        <h1 data-text="display">Billing</h1>
        <button type="button" data-surface="raised" data-response="hover click" className="rounded-lg px-3 py-2 font-medium">
          Export
        </button>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-4">
        <section data-surface="raised" data-color="purple" data-corner="1" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 data-text="heading">Pro plan</h2>
              <p data-text="body muted" className="mt-1">Renews on December 12, 2026.</p>
            </div>
            <span data-surface="flat" data-color="green tint" data-corner="pill" data-text="caption" className="px-2.5 py-0.5 font-medium">Active</span>
          </div>
          <p data-text="figure" className="mt-4">
            $24<span data-text="label muted" className="font-normal">/month</span>
          </p>
          <div className="mt-6 flex gap-2">
            <button type="button" data-surface="raised" data-color="accent" data-response="hover click" className="rounded-lg px-4 py-2 font-medium">
              Upgrade
            </button>
            <button type="button" data-color="red" data-response="hover click" className="rounded-lg px-4 py-2 font-medium">
              Cancel plan
            </button>
          </div>
        </section>

        <section data-corner="1" className="p-6">
          <h2 data-text="heading">Billing email</h2>
          <p data-text="body muted" className="mt-1">Invoices go to this address.</p>
          <div className="mt-4 flex gap-2">
            <input
              aria-label="Billing email"
              defaultValue="team@acme.dev"
              data-surface="sunken"
              data-response="focus"
              className="w-full rounded-lg px-3 py-2"
            />
            <button type="button" data-surface="raised" data-color="accent" data-response="hover click" className="rounded-lg px-3 py-2 font-medium">
              Save
            </button>
          </div>
        </section>

        <section data-surface="raised" data-corner="1">
          <h2 data-text="heading" className="px-6 pt-5">Invoices</h2>
          <ul className="mt-3 divide-y divide-edge">
            {INVOICES.map((invoice) => (
              <li key={invoice.date} className="flex items-center justify-between px-6 py-3">
                <span>{invoice.date}</span>
                <span data-text="label muted">{invoice.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
