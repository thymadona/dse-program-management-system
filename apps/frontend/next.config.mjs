/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Workspace packages ship raw TS/TSX — let Next transpile them.
  transpilePackages: ["@dse-pms/ui", "@dse-pms/shared-types"],
};

export default config;
