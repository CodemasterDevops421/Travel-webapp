/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; img-src 'self' https: data: blob:; script-src 'self' https://payment-wrapper.liteapi.travel https://js.stripe.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-src 'self' https://payment-wrapper.liteapi.travel https://js.stripe.com https://hooks.stripe.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
  }
];

const nextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.liteapi.travel' },
      { protocol: 'https', hostname: '*.googleapis.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' }
    ]
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
