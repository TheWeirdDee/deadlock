/** @type {import("next").NextConfig} */

/**
 * Next.js application configuration for the Deadlock dApp.
 *
 * reactStrictMode: disabled to prevent double-invocation of useEffect hooks
 * during development — important because contract read calls fire on mount
 * and double-firing causes unnecessary Hiro API requests.
 *
 * transpilePackages: the @stacks/* SDK packages ship as ESM-only modules.
 * Next.js requires them to be explicitly listed here so webpack can
 * correctly transpile them into CommonJS for SSR compatibility.
 */
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
};

module.exports = nextConfig;