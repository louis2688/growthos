import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ponytail: HTTP Basic Auth gate — free stand-in for Vercel's paid production
// protection. Unset APP_PASSWORD (local dev) = open. Real auth is a v2 item.
export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const expected = "Basic " + btoa(`growthos:${password}`);
  if (req.headers.get("authorization") === expected) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="GrowthOS"' },
  });
}
