/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["faiss-node"],
  },
};

export default nextConfig;
