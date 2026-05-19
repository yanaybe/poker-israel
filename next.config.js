/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Add Cloudinary/S3 domains after image storage migration:
      // { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking — page cannot be embedded in iframes
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing — browser must use declared content-type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Limit referrer info sent to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict which browser features can be used
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
          // Enforce HTTPS for 1 year (HSTS)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // DNS prefetch control
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
