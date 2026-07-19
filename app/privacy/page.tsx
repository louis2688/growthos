import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — GrowthOS",
  description: "What GrowthOS collects, how it's used, and who processes it.",
};

// Source: docs/plans/privacy-policy.md (Dave's draft), reconciled against actual data practices —
// notably: Cloudflare Workers AI and Resend added as subprocessors, IP-based rate limiting and
// anonymous tool inputs disclosed, public image bucket noted, and no in-app account deletion.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="July 19, 2026">
      <section>
        <h2>1. What we collect</h2>
        <p>
          <strong>Account data</strong> (via Supabase Auth): your email address and password
          (stored hashed by Supabase — we never see it), or your Google account email and profile
          name if you sign in with Google, plus account creation and login timestamps.
        </p>
        <p>
          <strong>Campaign data you provide:</strong> business goals, product names and
          descriptions, target metrics, channel selections, and any edits you make to generated
          plans and todos.
        </p>
        <p>
          <strong>AI-generated data:</strong> campaign plans, channel research results, todo
          lists, copy drafts, generated images, and agent-run metadata (which model ran, token
          counts, web-search request counts) tied to your account.
        </p>
        <p>
          <strong>Anonymous tool inputs:</strong> the free tools on our site (the homepage
          preview and the Subreddit Finder) work without an account. The product description and
          goal you type there are sent to our AI providers to generate your result, and are not
          saved to a profile — there is no account to attach them to.
        </p>
        <p>
          <strong>IP addresses:</strong> we record client IP addresses to enforce daily
          rate limits on the free tools and on password-reset emails. These are stored as daily
          counters and serve no other purpose.
        </p>
        <p>
          <strong>Page analytics:</strong> we use Vercel Web Analytics (Vercel is already a
          listed subprocessor) to count page visits and referrers. It is cookieless and does not
          track you across sites. We run no advertising trackers.
        </p>
        <p>
          We do not collect payment card data. If paid plans go live, billing will be handled by a
          PCI-compliant payment processor and this policy will be updated first.
        </p>
      </section>

      <section>
        <h2>2. How we use it</h2>
        <ul>
          <li>To generate and store your campaigns, plans, todos, drafts, and images.</li>
          <li>
            To operate authentication and access control — database row-level security ensures
            only your authenticated account can read or write your campaigns.
          </li>
          <li>To show you your own AI usage on the Activity page, and to enforce fair daily usage caps.</li>
          <li>
            To improve prompt quality and honesty guardrails. Our evaluations run on fixed
            test fixtures — not on your private campaign content.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Who processes it (subprocessors)</h2>
        <p>Your inputs are sent to the following providers strictly to deliver the service:</p>
        <ul>
          <li>
            <strong>Cloudflare</strong> (Workers AI) — runs most of our AI generation (campaign
            plans, copy drafts, tool suggestions) and image generation. Receives your campaign
            inputs and generation prompts.
          </li>
          <li>
            <strong>Anthropic</strong> (Claude API) — runs channel research and launch-timing
            recommendations, including live web search. Receives your campaign goal, product
            description, and related prompts.
          </li>
          <li>
            <strong>Supabase</strong> — authentication, Postgres database, and file storage.
            Holds account credentials and all campaign data.
          </li>
          <li>
            <strong>Resend</strong> — delivers our authentication emails (signup confirmation,
            password reset). Receives your email address.
          </li>
          <li>
            <strong>Vercel</strong> — application hosting. Processes standard request data (IP
            address, request logs) as part of serving the app.
          </li>
        </ul>
        <p>
          We don&apos;t sell your data and don&apos;t share it with advertisers. We&apos;ll update
          this list before adding a new subprocessor.
        </p>
      </section>

      <section>
        <h2>4. Storage, retention &amp; deletion</h2>
        <ul>
          <li>Campaign data is retained for as long as your account is active.</li>
          <li>
            <strong>Generated images are served from a public-URL bucket</strong> — anyone who
            has an image&apos;s exact link can view it while it exists. Discarding a todo&apos;s
            image output deletes the image, and deleting a campaign deletes all of its images.
          </li>
          <li>
            Deleting a campaign removes its goals, channels, plans, todos, and generated images
            (cascading delete), subject to provider backups that age out on standard rotation.
          </li>
          <li>
            There is no in-app account deletion yet — email{" "}
            <a href="mailto:hello@launchlift.app" className="text-primary hover:underline">
              hello@launchlift.app
            </a>{" "}
            and we&apos;ll delete your account and its data.
          </li>
          <li>
            Rate-limit counters (including IPs) are keyed by day and automatically purged after 7
            days.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Your rights</h2>
        <p>
          Depending on your jurisdiction, you may have the right to access, correct, export, or
          delete your personal data. Contact{" "}
          <a href="mailto:hello@launchlift.app" className="text-primary hover:underline">
            hello@launchlift.app
          </a>{" "}
          to exercise these rights; we respond within the timeframe applicable law requires.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <ul>
          <li>
            Access to campaigns is enforced by database-level row-level security — only your
            authenticated user can read or write your data.
          </li>
          <li>Credentials are never stored in plaintext (handled by Supabase Auth).</li>
          <li>
            No system is 100% secure; we can&apos;t guarantee absolute security of data
            transmitted to the service.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Children&apos;s privacy</h2>
        <p>
          GrowthOS is not directed at children under 16, and we don&apos;t knowingly collect
          their data.
        </p>
      </section>

      <section>
        <h2>8. International transfers</h2>
        <p>
          Our subprocessors may process data in the United States or other countries. By using
          GrowthOS you consent to this transfer, subject to the safeguards those providers
          maintain.
        </p>
      </section>

      <section>
        <h2>9. Changes</h2>
        <p>
          We&apos;ll update this policy as the product evolves — for example when payment
          processing or product-email notifications go live. Material changes get a new effective
          date at the top of this page.
        </p>
      </section>
    </LegalPage>
  );
}
