import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['snowflake-sdk'],
  // Render injecte PORT dynamiquement
  ...(process.env.PORT ? { env: { PORT: process.env.PORT } } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
