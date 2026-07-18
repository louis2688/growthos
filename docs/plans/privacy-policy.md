# Privacy Policy

**Effective date:** [YYYY-MM-DD]
**Entity:** [Legal entity name] ("GrowthOS", "we", "us")
**Contact:** [privacy/support email]

> Placeholders above need real values before this is published.

## 1. What We Collect

**Account data** (via Supabase Auth)
- Email address, password (hashed by Supabase Auth), account creation/login timestamps.

**Campaign data you provide**
- Business goals, product descriptions, target metrics, channel selections, and any edits you make
  to generated plans/todos.

**AI-generated data**
- Campaign plans, channel research results, todo lists, copy drafts, generated images, and
  agent-run metadata (token counts, cost estimates, web search request counts) tied to your account.

**Usage data**
- Basic application usage needed to operate the product (e.g., which pages/campaigns you access).
  GrowthOS does not currently run third-party analytics or advertising trackers.

We do not collect payment card data directly — if/when paid plans go live, billing details are
handled by a PCI-compliant processor, not stored on our servers.

## 2. How We Use It

- To generate and store your campaigns, plans, todos, and drafts.
- To operate account authentication and access control (row-level security ensures you only see
  your own campaigns).
- To measure and display AI usage/cost against your plan's credits.
- To improve prompt quality and guardrails (see the "Guardrail Evals" in the project README) —
  this uses aggregated evaluation of agent behavior, not your private campaign content, unless you
  explicitly opt in to sharing examples.

## 3. Who We Share It With (Subprocessors)

Your inputs are sent to the following providers strictly to deliver the service:

| Provider | Purpose | What's shared |
|---|---|---|
| **Anthropic** (Claude API) | AI generation, live web search for channel research | Your campaign goal, product description, and generation prompts |
| **Supabase** | Authentication, Postgres database, storage | Account credentials, all campaign/plan/todo data, generated images |
| **Vercel** | Application hosting | Standard request data (IP, request logs) as part of serving the app |

We don't sell your data. We don't share it with advertisers. We only add a new subprocessor after
updating this list.

## 4. Data Retention & Deletion

- Campaign data is retained as long as your account is active.
- You can delete a campaign or your account; deletion removes the associated goals, channels,
  plans, and todos from our database (cascading delete via foreign keys), subject to backups
  which age out on a standard rotation.
- Agent-run usage records (token/cost metadata) may be retained longer for billing history, where
  applicable.

## 5. Your Rights

Depending on your jurisdiction, you may have the right to access, correct, export, or delete your
personal data. Contact [privacy/support email] to exercise these rights. We respond within the
timeframe required by applicable law (e.g., 30 days under GDPR).

## 6. Security

- Access to your campaigns is enforced by database-level row-level security (Supabase RLS) — only
  your authenticated user can read or write your data.
- Credentials are never stored in plaintext (handled by Supabase Auth).
- No system is 100% secure; we can't guarantee absolute security of data transmitted to the service.

## 7. Children's Privacy

GrowthOS is not directed at children under 16. We don't knowingly collect data from children.

## 8. International Transfers

Our subprocessors (Anthropic, Supabase, Vercel) may process data in the United States or other
countries. By using GrowthOS you consent to this transfer, subject to the safeguards those
providers maintain.

## 9. Changes to This Policy

We may update this policy as the product evolves (e.g., when payment processing or new
integrations, like email or CRM tools mentioned in the product roadmap, go live). Material changes
will be posted with a new effective date.

## 10. Contact

Privacy questions or data requests: [privacy/support email].

---

See also: [Terms of Service](./terms-of-service.md), [Refund Policy](./refund-policy.md).
