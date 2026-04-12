/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@jampika/shared'],
  experimental: {
    typedRoutes: false,
  },
}

module.exports = nextConfig
