import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@app/types", "@app/ui", "@app/validation"],
};

export default nextConfig;
