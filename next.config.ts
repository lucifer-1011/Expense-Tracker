import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * `'unsafe-inline'` for styles is required: Next.js and the Tailwind/base-ui
 * component layer both emit inline <style> during SSR and hydration. Scripts
 * need `'unsafe-inline'` too because Next inlines its bootstrap/flight
 * payload without a nonce unless middleware generates one per request --
 * worth doing later, but it needs the nonce threaded through the whole
 * render path, so it is deliberately not bundled into a security fix pass.
 *
 * `connect-src` has to allow the Supabase project (REST + realtime over
 * wss). Everything else is locked to same-origin, and `frame-ancestors
 * 'none'` + `object-src 'none'` remove the clickjacking and legacy-plugin
 * surface entirely.
 */
const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_WS_ORIGIN = SUPABASE_ORIGIN.replace(/^https:/, "wss:");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN}`.trim(),
  // Deliberately no `upgrade-insecure-requests`. It rewrites every http://
  // request to https://, and Safari/WebKit applies that to http://localhost
  // as well (Chromium exempts localhost as a trustworthy origin), so every
  // asset on a local server fails with a TLS error -- it broke `next dev`
  // and `next start` in Safari. It bought nothing in return: deployments are
  // HTTPS-only and already carry HSTS below, which enforces HTTPS far more
  // strongly, and every subresource here is same-origin or already https.
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Defence in depth for browsers that honour the older header;
          // frame-ancestors above is the modern equivalent.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Every authenticated view renders per-user financial data. Nothing
        // here should ever land in a shared/CDN cache.
        source: "/((?!_next/static|_next/image).*)",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
