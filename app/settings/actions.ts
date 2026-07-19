"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { IMAGE_BUCKET, purgeCampaignImages } from "@/lib/agents/image-generator";

export type SettingsState = { error: string } | { ok: true } | null;

export async function updateName(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name." };
  if (name.length > 80) return { error: "Keep it under 80 characters." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (error) return { error: error.message };

  revalidatePath("/", "layout"); // the sidebar shows this name
  return { ok: true };
}

export async function changePassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  // Same accepted posture as the reset flow (app/login/actions.ts): any authenticated session
  // may set a password; the platform control for "require recent login" is Supabase Auth's
  // "Secure password change" dashboard setting. For Google-only accounts this SETS a password,
  // which is a feature — it adds an email/password login alongside Google.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteAccount(): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  // RLS-scoped read authorizes the service-role work below: these are provably the caller's
  // campaigns. throwOnError shape kept explicit — a failed read must abort, not delete blind.
  const { data: campaigns, error: readError } = await supabase.from("campaigns").select("id");
  if (readError) return { error: readError.message };

  // Purge generated images BEFORE deleting the user. Unlike deleteCampaign this is fail-closed:
  // after auth.admin.deleteUser there is no owner left to retry, so a storage blip here would
  // orphan public-by-URL images forever — against the privacy policy's deletion promise.
  // A retry is safe: already-purged campaign folders just list empty.
  const service = createServiceClient();
  const storage = service.storage.from(IMAGE_BUCKET);
  for (const campaign of campaigns ?? []) {
    const { error: purgeError } = await purgeCampaignImages(storage, campaign.id);
    if (purgeError) return { error: "Couldn't remove your generated images — try again." };
  }

  // campaigns.user_id references auth.users on delete cascade, and child tables cascade from
  // campaigns — deleting the auth user removes every row the account owns.
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
