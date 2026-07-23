/** The FormData field Turnstile's implicit rendering injects into the enclosing form. */
export const CAPTCHA_FIELD = "cf-turnstile-response";

/**
 * Supabase surfaces captcha rejections as raw provider text ("captcha protection: request
 * disallowed (invalid-input-response)"). Real people hit this on an expired or reused token,
 * and that string tells them nothing they can act on — the retry is the whole message.
 */
export function humanizeAuthError(message: string): string {
  return /captcha/i.test(message)
    ? "That verification didn't go through — please try again."
    : message;
}
