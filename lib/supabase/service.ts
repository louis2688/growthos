import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASSES RLS. Server-only; never import this into a client
 * component or pass its results to one. Use it only for an operation you have already
 * authorized some other way.
 *
 * Sole use today: the image upload in runTodoTool. That path is gated by the RLS-scoped todo
 * read at the top of the action (a user can only reach it for a todo they own) and writes to
 * a storage path built from that todo's own ids — so a caller can only ever write their own
 * campaign's object.
 *
 * Why not the request-scoped user client: @supabase/ssr attaches the user's JWT to postgrest
 * (database) requests but not to storage requests, so an authenticated upload is rejected by
 * the bucket's RLS as if it were anonymous. Rather than depend on that internal behavior, the
 * upload runs as service-role with authorization enforced in application code above it.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
