# Marketing, SEO & GEO Optimization

Audit of `www.launchlift.app` — technical SEO/GEO findings plus a copy audit against `.agents/product-marketing.md` and the copywriting skill's principles. Source of truth for positioning: [`.agents/product-marketing.md`](../.agents/product-marketing.md).

**Date:** 2026-07-19

---

## 1. Technical SEO/GEO

### Critical — robots.txt / sitemap.xml / llms.txt all broken

All three return `307 → /login` instead of a real file:

```
curl -I https://www.launchlift.app/robots.txt  → 307, location: /login
curl -I https://www.launchlift.app/sitemap.xml → 307, location: /login
curl -I https://www.launchlift.app/llms.txt    → 307, location: /login
```

Root cause: auth middleware catches every unmatched route and redirects to `/login`; no explicit route exists for these paths. Crawlers (Googlebot, Bingbot, GPTBot) fetch login-page HTML instead of crawl directives or a sitemap.

**Fix:** exclude `robots.txt`, `sitemap.xml`, `llms.txt` from the auth-redirect matcher — one change in middleware, not per-file.

### Already working

- Homepage is server-rendered and ungated at `/` — real title, meta description, OG/Twitter tags present.
- Single clean H1 → H2 → H3 hierarchy, no skipped levels.
- Apex domain `launchlift.app` 308-redirects to `www` — no duplicate-content split.
- No stray `noindex` / `X-Robots-Tag` blocking indexing.
- `/pricing` and `/tools/subreddit-finder` have unique, keyword-relevant titles and descriptions, not templated duplicates.

### GEO gaps (AI answer engines: ChatGPT, Perplexity, AI Overviews)

- **Zero JSON-LD structured data** anywhere (checked homepage + tool page). No `Organization` / `SoftwareApplication` / `FAQPage` schema. AI engines lean on structured data + clear entity facts (pricing, category, audience) to cite a source confidently.
- `llms.txt` doesn't resolve (same middleware bug as above).
- Homepage `<title>` is brand-only (`GrowthOS`) — no category or audience keyword, which weakens how both search and AI engines classify the entity. See §3 below — same fix serves SEO and GEO at once.
- **`og:image` / `twitter:image` are a generated placeholder card** (`/opengraph-image?...`, text-on-background), not a real product screenshot. Real UI screenshots outperform generated cards on link-preview CTR, and give multimodal crawlers/answer engines actual product imagery instead of a text graphic. Real screenshots already exist at `docs/marketing/screenshots/` (`GrowthOS.png` through `GrowthOS (5).png`) — pick the clearest dashboard/campaign view and use it (or a cropped/resized version) as the `og:image`/`twitter:image` for the homepage and relevant subpages, instead of the auto-generated one.

### Minor

- Title says "GrowthOS," domain is `launchlift.app`, shown as "GrowthOS by LaunchLift." Fine for humans; a search for "LaunchLift" gets no exact title match. Low priority, likely a deliberate branding call.
- Logo `alt=""` — correctly marked decorative (`aria-hidden`), not a real gap.

---

## 2. Copy audit vs `.agents/product-marketing.md`

### Working well

- "How to promote without getting banned" section: real bad-example vs good-example copy block — Show over Tell, not just a claim. Matches the doc's #1 objection response almost verbatim.
- Zero "words to avoid" violations (game-changer, synergy, revolutionizing) in actual brand copy — the one instance of "game-changer" appears only inside the intentionally-bad example, which is correct use.
- Homepage voice matches the doc's verbatim customer language closely (eyebrow, H1, pain points — "blinking cursor," "ChatGPT graveyard").
- Primary CTA "Preview my campaign — free" follows the [Action] + [What they get] + [Qualifier] formula.

### Gaps

1. **Growth/Product Marketer persona is absent from the page.** The doc defines two personas; the homepage speaks only to persona 1 (Solopreneur/Developer Founder). Nothing addresses persona 2's stated concerns (experiment speed, workflow integration, rapid channel testing). Either add a section for that persona or drop it from the doc if it isn't a real current target.

2. **Testimonial in the doc, missing on the page.** The doc has a ready quote ("launched my micro-SaaS in a weekend... first 10 customers in 48 hours") and a proof metric. The homepage has no Social Proof section at all — the "20 todos · 5 channels... 1m 48s" card is a demo stat, not proof.

3. **Objection #3 unanswered live.** Doc's top-3 objections include "Can I customize the plans or do I have to do exactly what the AI says?" with a scripted answer. The live `/pricing` FAQ has 5 questions (ChatGPT-wrapper, banned, credit card, usage limits, public sharing) — customization isn't one of them.

4. **Terminology drift.** Doc's word list says "value-first promotion." Page body consistently says "value-first copy" (5 occurrences). The homepage `<meta name="description">` instead says "community-safe copy" — a third variant for the same concept. Standardize on "value-first" everywhere.

---

## 3. Where SEO/GEO and copy meet

Homepage `<title>` is `GrowthOS` — brand only, no keyword. Doc's product category is "AI Marketing Strategist / Growth Campaign Platform," audience is "indie hackers." Neither appears in the title tag. This is a single fix that helps three things at once — SEO ranking (category keyword), GEO entity classification (title + H1 read together), and brand clarity — no tradeoff between them:

```
GrowthOS — AI Growth Marketing Platform for Indie Hackers
```

Adding `SoftwareApplication` JSON-LD is a similar dual-purpose fix: it's the natural place to surface the doc's proof metric ("under 2 minutes" goal-to-playbook) as structured data, serving GEO citation and rich-result eligibility together.

---

## 4. Priority order

1. Fix middleware route exclusion for `robots.txt` / `sitemap.xml` / `llms.txt` — unblocks crawl discovery entirely, single change.
2. Rewrite homepage `<title>` to include category + audience keyword.
3. Swap the generated `og:image`/`twitter:image` placeholder for a real product screenshot from `docs/marketing/screenshots/`.
4. Add `SoftwareApplication` + `Organization` JSON-LD to homepage.
5. Add one testimonial/social-proof block to homepage.
6. Decide: give the Growth/Product Marketer persona a homepage section, or remove it from `.agents/product-marketing.md`.
7. Standardize "value-first" wording across meta description and body copy.
8. Add or swap one `/pricing` FAQ item to cover the customization objection.
