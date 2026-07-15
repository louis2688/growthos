import "server-only";
import { createClient } from "@supabase/supabase-js";

// ponytail: untyped client + hand-written row types in lib/types.ts;
// switch to generated Database types if the schema grows.
export function supabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
