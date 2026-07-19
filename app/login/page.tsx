import LoginForm from "./login-form";
import { BrandMark } from "@/components/brand-mark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="glass grid w-full max-w-4xl overflow-hidden rounded-2xl border shadow-xl shadow-primary/10 md:grid-cols-[1.05fr_1fr]">
        {/* Brand panel — the pitch, per design-system/ui-mockups.html */}
        <div className="hidden flex-col justify-between bg-[#0a1317] p-10 text-white md:flex">
          {/* Manual lockup: the shared one uses theme muted-foreground, unreadable on this
              gradient — the house line needs white here. */}
          <span className="flex items-center gap-2.5">
            <BrandMark className="size-9" />
            <span className="flex flex-col justify-center">
              <span className="font-heading text-lg font-bold leading-tight">GrowthOS</span>
              <span className="text-[10px] font-medium leading-none tracking-wide text-white/70">
                by LaunchLift
              </span>
            </span>
          </span>

          <div className="py-10">
            <h1 className="max-w-[17ch] font-heading text-4xl font-bold leading-[1.15]">
              Type a goal. Get a growth campaign.
            </h1>
            <p className="mt-3.5 max-w-[40ch] text-[15px] leading-relaxed text-white/85">
              AI turns &ldquo;1,000 signups in 45 days&rdquo; into channels, prioritized todos, and
              tool picks — in about two minutes.
            </p>
          </div>

          <div className="rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur">
            <strong className="font-heading text-xl">20 todos · 5 channels</strong>
            <p className="text-[13px] text-white/85">
              generated for &ldquo;Launch PitchPolish&rdquo; — from goal to plan in 1m 48s
            </p>
          </div>
        </div>

        <LoginForm initialMode={mode === "signup" ? "signup" : "signin"} />
      </div>
    </main>
  );
}
