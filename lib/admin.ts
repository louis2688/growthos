import "server-only";

/**
 * Founder allow-list for the /admin page. Hardcoded on purpose: two known admins, private
 * repo, zero deploy configuration. ponytail: move to an ADMIN_EMAILS env var (or a real
 * roles column) the day a third admin exists.
 */
const ADMIN_EMAILS = new Set(["louismadrigal26@gmail.com", "johndavedecano@gmail.com"]);

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}
