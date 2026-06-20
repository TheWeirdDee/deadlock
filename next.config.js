/** @type {import("next").NextConfig} */
const path = require('path');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.mainnet.hiro.so https://api.testnet.hiro.so https://api.hiro.so wss://api.mainnet.hiro.so wss://api.testnet.hiro.so https://*.blockstack.org https://*.stacks.co https://*.ingest.sentry.io https://plausible.io",
      "frame-src 'self' https://wallet.hiro.so https://app.blockstack.org",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig = {
  // Strict mode disabled: avoids double useEffect mounts during dev
  // which would cause duplicate on-chain read calls to the Hiro API.
  reactStrictMode: false,

  // Transpile Stacks SDK packages — required because they are ESM-only
  // and Next.js SSR (Node.js) requires CJS. Without this, imports fail.
  transpilePackages: [
    '@stacks/connect',
    '@stacks/connect-react',
    '@stacks/network',
    '@stacks/transactions',
    '@stacks/auth',
    '@stacks/profile',
  ],

  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

let finalConfig = nextConfig;
try {
  const { withSentryConfig } = require('@sentry/nextjs');
  finalConfig = withSentryConfig(nextConfig, { silent: true });
} catch {}

module.exports = finalConfig;