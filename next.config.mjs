/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' https://payment-wrapper.liteapi.travel; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-src 'self' https://payment-wrapper.liteapi.travel https://js.stripe.com https://hooks.stripe.com;"
  }
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
