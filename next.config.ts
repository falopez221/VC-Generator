import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The standalone output is used by the editable Windows installer. Sites
  // continues to use the Vinext/Vite build configured in vite.config.ts.
  output: "standalone",
};

export default nextConfig;
