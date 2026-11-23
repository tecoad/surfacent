import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

export type Surface = "raised" | "flat" | "sunken" | "ground";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

/**
 * One size. Density scales it: the region it sits in, or data-density on the
 * button itself to make one stand out (loose) or recede (tight) in its context.
 */
export function Button({
  variant = "raised",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: "raised" | "flat" | "ghost" | "primary" }) {
  const base = cx(
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 font-medium whitespace-nowrap select-none disabled:opacity-50",
    focusRing,
  );
  if (variant === "primary") {
    return (
      <button data-surface="raised" data-color="accent" data-response="hover click" data-text="label" className={cx(base, className)} {...props} />
    );
  }
  if (variant === "ghost") {
    return <button data-text="label muted" className={cx(base, "hover:bg-ink/5 hover:text-ink", className)} {...props} />;
  }
  return <button data-surface={variant} data-response="hover click" data-text="label" className={cx(base, className)} {...props} />;
}

export function Card({ surface = "flat", className, ...props }: ComponentProps<"div"> & { surface?: Surface }) {
  return <div data-surface={surface} data-corner="1" className={className} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-surface="sunken"
      data-response="focus"
      data-text="label"
      className={cx("h-9 w-full rounded-lg px-3 placeholder:text-ink-faint", focusRing, className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-surface="sunken"
      data-response="focus"
      data-text="label"
      className={cx("w-full resize-none rounded-lg px-3 py-2 placeholder:text-ink-faint", focusRing, className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select data-surface="sunken" data-response="focus" data-text="label" className={cx("h-9 w-full rounded-lg px-2.5", focusRing, className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span data-text="label" className="font-medium">{label}</span>
      {children}
   {hint && <span data-text="caption faint">{hint}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      data-surface="sunken"
      data-color={checked ? "accent" : undefined}
      data-corner="pill"
      className={cx("relative h-5 w-9 shrink-0 transition-colors", focusRing)}
    >
      <span
        data-surface="raised"
        data-color="neutral"
        className={cx("absolute top-0.5 left-0.5 size-4 transition-transform", checked && "translate-x-4")}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div data-surface="sunken" role="tablist" aria-label={label} className="inline-flex gap-1 p-1">
      {options.map((option) => (
        <button
          key={option}
          role="tab"
          aria-selected={option === value}
          data-surface={option === value ? "raised" : undefined}
          data-response="hover click"
          data-text={option === value ? "caption" : "caption muted"}
          onClick={() => onChange(option)}
          className={cx("h-7 min-w-11 px-2.5 font-medium", focusRing, option !== value && "hover:text-ink")}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

// Fill, ink and edge come from data-color: statuses are hue colors as a tint,
// the accent badge is solid. Only the neutral badge is a plain wash.
const badgeColors = {
  success: "green tint",
  warning: "yellow tint",
  danger: "red tint",
  info: "blue tint",
  accent: "accent",
  neutral: undefined,
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeColors; children: ReactNode }) {
  const color = badgeColors[tone];
  return (
    <span
      data-surface={color ? "flat" : undefined}
      data-color={color}
      data-text={color ? "caption" : "caption muted"}
      className={cx("inline-flex h-5 items-center gap-1 rounded-md px-1.5 font-medium", !color && "bg-ink/6")}
    >
      {children}
    </span>
  );
}

/** One size, like every component: density scales it (data-density="tight" for a small one). */
export function Avatar({ name, className, ...props }: ComponentProps<"span"> & { name: string }) {
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      data-text="caption"
      className={cx("inline-grid size-7 shrink-0 place-items-center rounded-full font-semibold text-white", className)}
      style={{ background: `oklch(0.62 0.12 ${hue})` }}
      aria-hidden
      {...props}
    >
      {initials}
    </span>
  );
}

/** Live readout of the tone (OKLCH lightness) the nearest surface resolved to. */
export function ToneReadout({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [tone, setTone] = useState("");
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const read = () => {
      const value = Number.parseFloat(getComputedStyle(element).getPropertyValue("--surface-l"));
      setTone(Number.isFinite(value) ? value.toFixed(3) : "");
    };
    read();
    const timer = setInterval(read, 300);
    return () => clearInterval(timer);
  }, []);
  return (
    <span ref={ref} className={cx("font-mono text-[10px] text-ink-faint tabular-nums", className)}>
      L {tone}
    </span>
  );
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 data-text="heading">{title}</h2>
        {description && <p data-text="body muted" className="mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
