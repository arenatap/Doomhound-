import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizeCss: true,
  },
  // NFT metadata API: contract returns baseURI + tokenId + ".json"
  // Rewrite /api/nft/metadata/{id}.json → /api/nft/metadata/{id}
  async rewrites() {
    return [
      {
        source: "/api/nft/metadata/:id(\\d+).json",
        destination: "/api/nft/metadata/:id",
      },
    ];
  },
};

export default nextConfig;
