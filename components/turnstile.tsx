"use client";

import Script from "next/script";
import { useEffect } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: { reset: (widget?: string) => void };
  }
}

/**
 * Cloudflare Turnstile on the public auth forms — the bot control for signup-form abuse
 * (scripted signups burn the transactional-email quota and mail strangers who never asked,
 * which is what costs us sender reputation).
 *
 * Implicit rendering: the script finds .cf-turnstile and injects a hidden input named
 * cf-turnstile-response into the enclosing form, so the server action just reads it off
 * FormData — no token state threaded through React.
 *
 * Renders nothing when no site key is configured, so local dev and previews keep working.
 * Supabase only demands a token when captcha is enabled on the project, so the two switch
 * on together: turn the project setting on only once a key is deployed here.
 */
export default function Turnstile({ resetOn }: { resetOn?: unknown }) {
  // Tokens are single-use. After a rejected submit the widget must mint a fresh one, or the
  // retry fails the captcha instead of the credentials and the user is stuck in a loop.
  useEffect(() => {
    if (resetOn) window.turnstile?.reset();
  }, [resetOn]);

  if (!SITE_KEY) return null;

  return (
    <>
      {/* interaction-only: invisible for humans, challenges only when the visitor looks scripted */}
      <div className="cf-turnstile" data-sitekey={SITE_KEY} data-appearance="interaction-only" />
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" />
    </>
  );
}
