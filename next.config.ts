import type { NextConfig } from "next";

const nextConfig = {
  images: {
    domains: ["picsum.photos", "res.cloudinary.com", "ik.imagekit.io"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "ik.imagekit.io", pathname: "/**" },
    ],
  },
};

export default nextConfig;
