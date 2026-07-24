import type { NextConfig } from "next";

// Third parties the app actually loads (verified in code, not guessed):
// - GA4 gtag         script: googletagmanager.com   beacon/img: google-analytics.com
// - Turnstile        script + iframe + worker: challenges.cloudflare.com
// - Supabase         REST/auth/storage/realtime: *.supabase.co (+ wss)   storage images: *.supabase.co
// - Product Hunt      featured badge image: api.producthunt.com
// Fonts are self-hosted by next/font/google, so no external font host is needed.
const isProd = process.env.NODE_ENV === "production";

// script-src carries 'unsafe-inline' because Next injects inline hydration scripts and the GA4
// init is an inline <Script>. A nonce-based policy would drop it but needs per-request middleware
// and forces every route dynamic; the audit found no XSS sink, so this is an accepted ceiling.
// ponytail: move to a nonce if a user/LLM-content HTML renderer is ever added.
// Dev-only: Turbopack HMR needs 'unsafe-eval' and a localhost websocket; upgrade-insecure-requests
// is prod-only or it would force the http://localhost dev server to https and break the preview.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"} https://www.googletagmanager.com https://challenges.cloudflare.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://*.supabase.co https://api.producthunt.com https://www.googletagmanager.com https://www.google-analytics.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com ${isProd ? "" : "ws://localhost:* http://localhost:*"}`,
  `worker-src 'self' blob:`,
  `frame-src https://challenges.cloudflare.com`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  isProd ? `upgrade-insecure-requests` : "",
]
  .filter(Boolean)
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
