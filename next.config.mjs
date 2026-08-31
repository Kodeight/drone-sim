/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  // assetPrefix './' breaks dev/preview nested routes (/preview/ -> /preview/_next/* 404)
  // keep relative prefix only for static file:// export, use absolute for dev/build
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
