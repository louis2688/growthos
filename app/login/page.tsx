import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="glass grid w-full max-w-4xl overflow-hidden rounded-2xl border shadow-xl shadow-primary/10 md:grid-cols-[1.05fr_1fr]">
        {/* Brand panel — the pitch, per design-system/ui-mockups.html */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-primary via-brand-indigo to-brand-pink p-10 text-white md:flex">
          <span className="flex items-center gap-2.5 font-heading text-lg font-bold">
            <span className="grid size-8 place-items-center rounded-lg bg-white/20">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </span>
            GrowthOS
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

        <LoginForm />
      </div>
    </main>
  );
}
