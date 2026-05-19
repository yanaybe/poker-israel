// TODO [HIGH][Security]:
// No HTTP security headers configured. Missing headers expose the platform to:
//   - Clickjacking (missing X-Frame-Options / CSP frame-ancestors)
//   - MIME sniffing (missing X-Content-Type-Options)
//   - Information leakage (missing Referrer-Policy)
//   - Feature abuse (missing Permissions-Policy)
// Fix: Add `headers()` config below returning security headers on all routes.
// Risk: Platform vulnerable to clickjacking attacks; browser security features disabled.

// TODO [HIGH][Performance]:
// No image optimization configured. Profile images are stored as base64 strings
// in the DB (not CDN-served), so Next.js Image optimization cannot be applied.
// Once migrated to Cloudinary/S3, update remotePatterns to include the CDN domain.
// Fix: Add Cloudinary/S3 domain to remotePatterns after image storage migration.
// Risk: Images are not optimized, compressed, or served from CDN — slow load times.

// TODO [MEDIUM][Performance]:
// No bundle analysis configured. Cannot identify which libraries are bloating
// the JavaScript bundle.
// Fix: Add @next/bundle-analyzer:
//   const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' })
// Risk: Unknown bundle size contributors causing slow page loads on mobile.

// TODO [MEDIUM][DevOps]:
// No environment variable validation on startup. If NEXTAUTH_SECRET or DATABASE_URL
// are missing/wrong, the server starts successfully but crashes on first request.
// Fix: Add startup validation using `zod` or `@t3-oss/env-nextjs`:
//   const env = createEnv({ server: { DATABASE_URL: z.string().url() ... } })
// Risk: Misconfigured deployments that appear healthy but fail silently.

// TODO [LOW][Performance]:
// Google Fonts (Heebo) loaded from external Google CDN. This:
//   1. Creates a dependency on Google's servers
//   2. Sends user IPs to Google without explicit consent (GDPR concern)
//   3. Adds external DNS resolution latency
// Fix: Self-host the Heebo font using next/font/local with the font files.
// Risk: GDPR non-compliance; external font dependency causes load failures if Google is slow.

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // TODO [HIGH][Performance]: Add Cloudinary/S3 domain after image storage migration:
      // { protocol: 'https', hostname: 'res.cloudinary.com' },
      // { protocol: 'https', hostname: 'your-bucket.s3.amazonaws.com' },
    ],
  },
  // TODO [HIGH][Security]: Add security headers configuration:
  // async headers() {
  //   return [{
  //     source: '/(.*)',
  //     headers: [
  //       { key: 'X-Frame-Options', value: 'DENY' },
  //       { key: 'X-Content-Type-Options', value: 'nosniff' },
  //       { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  //       { key: 'Permissions-Policy', value: 'geolocation=(self), camera=()' },
  //       { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
  //     ]
  //   }]
  // }
}

module.exports = nextConfig
