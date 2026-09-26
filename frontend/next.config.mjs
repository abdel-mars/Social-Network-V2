/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle in .next/standalone, so the runtime
  // image can ship just the app plus its node_modules instead of all of them.
  output: "standalone",
};

export default nextConfig;
