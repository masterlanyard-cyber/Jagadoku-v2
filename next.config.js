/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Run in default Next.js mode to enable server-side features (API routes).
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;