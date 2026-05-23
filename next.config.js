/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@stacks/connect', '@stacks/connect-react', '@stacks/network', '@stacks/transactions', '@stacks/auth', '@stacks/profile'],
};
module.exports = nextConfig;