import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand-mark";

export const metadata: Metadata = {
  title: "Pricing — GrowthOS",
  description:
    "GrowthOS is free during early access. See the plans we're building toward — a free Indie tier and a $29/mo Growth tier — and what's live today.",
};

// Public marketing page: allow-listed in lib/supabase/proxy.ts so prospects see it before signup.
// Honesty: billing isn't built yet, so this shows PLANNED pricing under a beta banner and every
// CTA is "Start free" — there is no charge, trial, or paywall to send anyone to.

type Tier = {
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
  features: string[];
  highlighted?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Indie",
    price: "$0",
    cadence: "free forever",
    blurb: "For builders planning their first launch.",
    features: [
      "1 active campaign",
      "Full campaign generation — goal → channels → plan → todos",
      "The copywriting + tool suite (posts, SEO, UTM, email, launch timing, image prompts)",
      "The public Subreddit & Community Finder",
    ],
  },
  {
    name: "Growth",
    price: "$29",
    cadence: "per month",
    blurb: "For founders running several products and channels.",
    highlighted: true,
    features: [
      "Everything in Indie",
      "Unlimited active campaigns",
      "More live web-search runs",
      "Launch-timing recommendations (best posting windows — you post it; GrowthOS never auto-publishes)",
      "Priority support (planned)",
    ],
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Is GrowthOS just a wrapper around ChatGPT?",
    a: "No. A generic chatbot doesn't know which communities are active right now, and it dumps a wall of text you lose in a chat thread. GrowthOS runs live web search to find real, currently-active communities, and writes everything into a persistent structure — Goal → Channels → Plans → Todos — you actually work through.",
  },
  {
    q: "Will using GrowthOS copy get me banned?",
    a: "The prompts are built to do the opposite, and it's enforced: every draft passes an adversarial eval that flags hype, forces you to disclose you built the product, and refuses to fabricate stats or testimonials. You get value-first posts that read like a person, not a spambot.",
  },
  {
    q: "Do I need a credit card?",
    a: "No — and there's nothing to pay yet. GrowthOS is free during early access: create campaigns, find communities, and generate todos and copy without a card. When paid plans launch we'll make it obvious well before anything charges.",
  },
  {
    q: "Can I customize the plans, or do I have to do what the AI says?",
    a: "Everything is editable. Plans and todos are yours to change — edit titles and descriptions, add your own todos, reassign tools, change priorities and due dates, or delete what doesn't fit. Regenerate rebuilds the plans from your selected channels whenever you want a fresh take. The AI drafts; you decide.",
  },
  {
    q: "How much can I generate during early access?",
    a: "Every account gets 500 AI credits a month while early access lasts — far more than typical use. Generating a campaign costs 10, launch timing 5, regenerating or images 2, the copywriting tools 1, and the UTM builder is free. Credits are returned if a run fails. Your balance lives in Settings and resets on the 1st; fair daily caps also apply.",
  },
  {
    q: "Can I share my campaign roadmap publicly?",
    a: "Not yet. Public, read-only campaign sharing is on the roadmap, not live today — so we won't pretend it is. Your campaign data stays private to your workspace; the one exception is generated images, which are served by public (unguessable) links while they exist — see the Privacy Policy.",
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-14">
      <div className="mb-8 flex justify-center">
        <Link href="/" className="flex items-center">
          <BrandLockup />
        </Link>
      </div>

      <div className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Pricing</p>
        <h1 className="mt-2 text-balance font-heading text-3xl font-medium sm:text-4xl">
          Simple pricing. Free while we build.
        </h1>
        <p className="mx-auto mt-3 max-w-prose text-balance text-sm text-muted-foreground">
          These are the plans we&apos;re building toward. Right now GrowthOS is in early access and
          everything is free — the prices below are the direction, not a bill.
        </p>
      </div>

      {/* Honesty banner: no billing exists yet. Stated plainly rather than hidden. */}
      <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-balance text-center text-sm">
        <span className="font-medium">Early access — everything is free today.</span>{" "}
        <span className="text-muted-foreground">
          There&apos;s no billing in the product yet, so nothing here can charge you. We&apos;ll say
          so clearly before that ever changes.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`glass relative flex flex-col rounded-2xl border p-6 ${
              t.highlighted ? "border-primary shadow-lg shadow-primary/10" : ""
            }`}
          >
            {t.highlighted && (
              <span className="absolute -top-2.5 right-5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white">
                Planned
              </span>
            )}
            <h2 className="font-heading text-lg font-semibold">{t.name}</h2>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-medium tabular-nums">{t.price}</span>
              {t.cadence && <span className="text-sm text-muted-foreground">{t.cadence}</span>}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 flex-none text-primary" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/login?mode=signup"
              className={`${buttonVariants({ variant: t.highlighted ? "default" : "outline" })} mt-6`}
            >
              Start free →
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-4 text-balance text-center text-xs text-muted-foreground">
        Agency and team plans are on the way — nothing to buy yet.
      </p>

      <section className="mt-14">
        <h2 className="mb-4 text-center font-heading text-2xl font-medium">Frequently asked</h2>
        <div className="mx-auto max-w-2xl space-y-2.5">
          {faqs.map((f) => (
            <details key={f.q} className="glass group rounded-xl border p-4">
              <summary className="cursor-pointer list-none font-medium marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
