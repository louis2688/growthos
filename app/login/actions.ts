"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { consumeResetQuota } from "@/lib/rate-limit";

export type AuthState = { error: string; email: string; name: string } | { sent: string } | null;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const mode = String(formData.get("mode") ?? "signin");
  if (!email || !password) return { error: "Enter your email and password.", email, name };

  const supabase = await createClient();
  const { error } =
    mode === "signup"
      ? // full_name lands in user_metadata — the app shell already displays it (falling back to
        // the email prefix when absent, e.g. for Google sign-ins that don't provide one).
        await supabase.auth.signUp({
          email,
          password,
          options: name ? { data: { full_name: name } } : undefined,
        })
      : await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message, email, name };

  // Supabase requires email confirmation on sign-up unless disabled in project settings.
  if (mode === "signup") {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { sent: email };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
  redirect(data.url);
}

export type ResetRequestState = { error: string; email: string } | { sent: string } | null;

export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email.", email };

  // App-level cap before Supabase's: this public form sends email, and unmetered it could bomb
  // one inbox or drain the project's shared email quota (starving signup confirmations too).
  // The message talks about the REQUESTER's rate, so it leaks nothing about account existence.
  try {
    if (!(await consumeResetQuota())) {
      return { error: "Too many reset requests — please try again later.", email };
    }
  } catch {
    return { error: "Password reset is briefly unavailable — please try again shortly.", email };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  // The email link lands on /auth/callback, which exchanges the code for a (recovery) session
  // and forwards to the update-password form.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/login/reset`,
  });

  // Rate limiting is worth surfacing honestly; any other outcome gets the same "sent" message
  // whether or not the account exists, so this form can't be used to enumerate users.
  if (error && error.status === 429) {
    return { error: "Too many reset requests — please try again in a little while.", email };
  }
  return { sent: email };
}

export type UpdatePasswordState = { error: string } | null;

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  // Known hardening gap, accepted for now: this accepts ANY authenticated session, not only a
  // recovery one — Supabase's canonical reset pattern. The marginal risk is that someone already
  // holding a session (shared machine, stolen cookie) can also set a new password; they already
  // hold the account either way. The platform's intended control is Supabase Auth's "Secure
  // password change" setting (requires a recent login) — enable it in the dashboard rather than
  // betting this flow on unverified JWT-claim shapes here.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    // Reached without the recovery session (direct nav, or an expired link).
    return { error: "This reset link has expired or was already used — request a new one below." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
