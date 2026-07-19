import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { creditStatus } from "@/lib/credits";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const email = data.user.email ?? "";
  // Same fallback the sidebar uses (app/layout.tsx) — the field is captioned "Shown in the
  // sidebar", so it must show what the sidebar actually shows.
  const name = (data.user.user_metadata?.full_name as string) ?? email.split("@")[0];
  const credits = await creditStatus(data.user.id);

  return <SettingsForm email={email} name={name} credits={credits} />;
}
