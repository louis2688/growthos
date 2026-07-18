import Link from "next/link";
import {
  ArrowRight,
  Check,
  Database,
  MessageSquareX,
  PencilOff,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import LandingPreview from "@/components/landing-preview";
import { BrandLockup, BrandMark } from "@/components/brand-mark";

// The public marketing homepage, shown by app/page.tsx to logged-out visitors (the proxy exempts
// "/"). Built from docs/plans/copywriting.md, minus the parts the product's own honesty guardrails
// forbid: no invented testimonials or metrics, no "auto-publish" claim. Pricing + the full FAQ live
// on /pricing; this links there rather than duplicating them.

const pains = [
  {
    icon: PencilOff,
    title: "Solopreneur paralysis",
    copy: "You know where your users are, but not what to write. You stare at a blinking cursor drafting a Reddit post, give up, and go back to writing code.",
  },
  {
    icon: ShieldAlert,
    title: "“Sleazy” marketing anxiety",
    copy: "You fear being flagged as a spammer. Most AI copy tools write generic, hype-filled posts that break community rules and get you banned from the subreddits you needed.",
  },
  {
    icon: MessageSquareX,
    title: "The ChatGPT graveyard",
    copy: "A chatbot dumps a wall of flat text. You paste it into a notes app, lose track of what's next, and your marketing momentum dies in a forgotten thread.",
  },
];

const steps = [
  {
    n: "1",
    title: "Describe your product & goal",
    copy: "Plain English. “Get the first 50 beta testers for a Next.js boilerplate,” or “launch on Product Hunt.” The AI derives your audience and KPIs — you review them.",
  },
  {
    n: "2",
    title: "AI scans the live web",
    copy: "No stale lists. Agents run real-time web search to find the subreddits, communities, and niche directories where your audience is active right now.",
  },
  {
    n: "3",
    title: "Run a structured playbook",
    copy: "A persistent dashboard of goals, channels, plans, and prioritized todos. Every drafting todo produces native, value-first copy checked by the compliance evals.",
  },
];

const features = [
  {
    icon: Database,
    title: "Structured, not a wall of text",
    copy: "GrowthOS writes your campaign into a real hierarchy — Goal → Channels → Plans → Todos — saved to a dashboard you track, check off, and return to. Not a chat log you lose.",
  },
  {
    icon: ShieldCheck,
    title: "Adversarial evals keep you safe",
    copy: "Every copywriting prompt is battle-tested against an adversarial eval suite: does the output disclose you built the product, avoid fabricated stats and fake testimonials, lead with value? We re-run it whenever the prompts change.",
  },
  {
    icon: Wrench,
    title: "Tools built into your todos",
    copy: "Generate UTM links, write image prompts, or get the best posting window — right from the todo you're working on. You still post it yourself; GrowthOS never auto-publishes.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center">
            <BrandLockup />
          </Link>
          <nav className="flex items-center gap-1.5">
            <a
              href="#how"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
            >
              How it works
            </a>
            <Link
              href="/pricing"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
            >
              Pricing
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Log in
            </Link>
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Start free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[12px] font-semibold text-primary">
              AI-powered distribution for indie hackers
            </span>
            <h1 className="mt-4 text-balance font-heading text-4xl font-bold leading-[1.1] sm:text-5xl">
              From a raw goal to a live growth playbook, in minutes.
            </h1>
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
              Stop marketing into the void. GrowthOS runs live web search to find the communities your
              audience is actually in, structures the work on a dashboard you can track, and drafts
              native, value-first copy that passes strict community guardrails.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Build your first campaign — free <ArrowRight className="ml-1.5 size-4" aria-hidden />
              </Link>
              <Link
                href="/tools/subreddit-finder"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <Search className="mr-1.5 size-4" aria-hidden /> Try the free Finder
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[
                "No credit card required",
                "Community-compliant copy, checked by evals",
                "Free Subreddit & Community Finder",
              ].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 flex-none text-primary" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* The interactive preview (roadmap #61): the real agents, rate-limited, no signup. */}
          <LandingPreview />
        </div>
      </section>

      {/* Pain */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold">
            You spent months building it. Why launch it to zero views?
          </h2>
          <p className="mt-3 text-balance text-sm text-muted-foreground">
            Writing code is easy. Distribution is hard. “Growth-hack your way to success” leaves you
            with empty spreadsheets and blank-page syndrome.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pains.map((p) => (
            <div key={p.title} className="glass rounded-2xl border p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-primary/[0.03]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-heading text-3xl font-bold">Three steps to your first users.</h2>
            <p className="mt-3 text-balance text-sm text-muted-foreground">
              GrowthOS turns a high-level goal into a structured, trackable workspace of
              research-validated campaigns.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="glass rounded-2xl border p-5">
                <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-pink font-heading font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-heading text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold">No fluff. Just structured execution.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl border p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contrast: spambot vs value-first */}
      <section className="border-y bg-primary/[0.03]">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-heading text-3xl font-bold">How to promote without getting banned.</h2>
            <p className="mt-3 text-balance text-sm text-muted-foreground">
              Same product, same subreddit. The difference is what gets you upvoted versus removed by
              a moderator.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="glass rounded-2xl border border-destructive/30 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-destructive">
                Generic AI · removed by automod
              </p>
              <p className="mt-3 rounded-lg border bg-background/50 p-3 text-sm leading-relaxed text-muted-foreground">
                Hey React Native devs! 🚀 Check out this AMAZING starter kit that will make your life
                10x easier!!! Hundreds of developers already love it. Trust me, it&apos;s a
                game-changer! Go to StarterKit.io now! 🔥
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Reads like a spambot, invents &ldquo;hundreds of developers,&rdquo; offers zero value,
                drowns in emoji.
              </p>
            </div>
            <div className="glass rounded-2xl border border-primary/40 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                GrowthOS · upvoted &amp; approved
              </p>
              <p className="mt-3 rounded-lg border bg-background/50 p-3 text-sm leading-relaxed">
                Hey everyone — I&apos;m the builder of StarterKit. I spent last month wiring up auth,
                Supabase, and Tailwind for my React Native projects, and bundled it into a template so
                I&apos;d stop redoing it. I&apos;m looking for 10 builders to try it free and tell me
                where it breaks. Architecture details below if you want to inspect it first.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Discloses who built it, explains the problem, offers real value, invites honest
                feedback — no fake claims.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-balance font-heading text-3xl font-bold sm:text-4xl">
          Your product deserves to be heard.
        </h2>
        <p className="mx-auto mt-3 max-w-prose text-balance text-sm text-muted-foreground">
          Free while we&apos;re in early access — no card, no catch. Type a goal and see where your
          audience is in the next few minutes.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Build your first campaign — free <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
            See pricing &amp; FAQ
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <Link href="/" className="flex items-center gap-2.5 font-heading font-bold">
            <BrandMark />
            GrowthOS
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/tools/subreddit-finder" className="hover:text-foreground">
              Subreddit Finder
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
          </nav>
          {/* The © line lives in the global sticky SiteFooter — not duplicated here. */}
        </div>
      </footer>
    </div>
  );
}
