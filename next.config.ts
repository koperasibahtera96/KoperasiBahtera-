import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["picsum.photos", "res.cloudinary.com", "ik.imagekit.io", "api.qrserver.com"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "ik.imagekit.io", pathname: "/**" },
      { protocol: "https", hostname: "api.qrserver.com", pathname: "/**" },
    ],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
  },

  // ⬇️ Tambahkan ini agar unggah video tidak 413
  experimental: {
    // Limit body untuk Server Actions & Route Handlers (app router)
    serverActions: {
      bodySizeLimit: "100mb", // naikkan sesuai kebutuhan (mis. 200mb)
    },

    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "recharts",
    ],
    optimizeCss: true,
  },

  // Jika Anda masih punya API di /pages/api, ini akan mengatur limitnya juga
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  poweredByHeader: false,
  compress: true,

  // Bundle analyzer (opsional) di dev
  ...(process.env.ANALYZE === "true" && {
    webpack: (config: any) => {
      config.plugins.push(
        new (require("@next/bundle-analyzer")({
          enabled: true,
        }))()
      );
      return config;
    },
  }),
};

export default nextConfig;
