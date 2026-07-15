import { WIZARD_STEPS } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 5-step wizard progress (campaign-creation.html): Goal, Analysis, Channels, Review, Created. */
export function WizardStepper({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <ol className="glass mb-6 flex overflow-hidden rounded-xl border" aria-label="Campaign setup progress">
      {WIZARD_STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex flex-1 items-center gap-2 border-r px-3 py-2.5 text-[11px] uppercase tracking-wider last:border-r-0",
              active ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-[18px] flex-none items-center justify-center rounded-full border text-[10px] tabular-nums",
                active && "border-transparent bg-primary text-primary-foreground",
                done && "border-transparent bg-emerald-600 text-white",
              )}
            >
              {done ? "✓" : n}
            </span>
            <span className="truncate">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
