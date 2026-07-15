import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Real auth replaces the old Basic Auth gate: unauthenticated requests are
// redirected to /login, and every request refreshes the Supabase session.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
