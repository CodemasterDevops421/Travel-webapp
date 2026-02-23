/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  "script-src 'self' 'unsafe-inline' https://payment-wrapper.liteapi.travel https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.liteapi.travel https://book.liteapi.travel https://*.supabase.co https://api.stripe.com",
  "frame-src 'self' https://payment-wrapper.liteapi.travel https://js.stripe.com https://hooks.stripe.com",
  'upgrade-insecure-requests'
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy }
];

const nextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  },
  async headers() {
    return [
      {
        source: '/((?!api/).*)',
        headers: securityHeaders
      },
      {
        source: '/api/:path*',
        headers: [...securityHeaders, { key: 'Cache-Control', value: 'no-store' }]
      }
    ];
  }
};

export default nextConfig;
