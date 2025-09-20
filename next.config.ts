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

  // For App Router, bodyParser is now controlled by serverActions.bodySizeLimit
  // api configuration removed as it's not supported in Next.js App Router

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  poweredByHeader: false,
  compress: true,

  // Bundle analyzer (opsional) di dev - commented out to fix ESLint issues
  // If you need bundle analyzer, uncomment and install @next/bundle-analyzer
  /*
  ...(process.env.ANALYZE === "true" && {
    webpack: async (config: any) => {
      // Dynamic import for ESLint compatibility
      const { default: BundleAnalyzerPlugin } = await import('@next/bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          enabled: true,
        })()
      );
      return config;
    },
  }),
  */
};

export default nextConfig;
