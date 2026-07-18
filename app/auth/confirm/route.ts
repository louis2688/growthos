import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Only same-origin paths: a template/link can't turn this into an open redirect. */
function safePath(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

/**
 * Email-link landing (signup confirmation, password recovery). Verifies the token_hash
 * server-side via verifyOtp — unlike the OAuth code exchange in ../callback, this needs no PKCE
 * verifier cookie, so links work from ANY browser or device, not just the one that requested
 * the email (request reset on desktop, tap the email on your phone — that must work).
 * The Supabase email templates are configured to point here with token_hash + type + next.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safePath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Expired or already-used link: recovery flows get sent to request a fresh one.
  return NextResponse.redirect(
    `${origin}${type === "recovery" ? "/login/forgot" : "/login"}?error=auth`,
  );
}
