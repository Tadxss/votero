/** @type {import('next').NextConfig} */
const nextConfig = {
  // @repo/shared and @repo/types are raw TS source (no build step) — Next needs to
  // transpile them itself rather than treating them as pre-built node_modules.
  transpilePackages: ["@repo/shared", "@repo/types"],
};

export default nextConfig;
