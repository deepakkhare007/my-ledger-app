import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Left off deliberately: every route in this app is signed-in and reads
  // per-user data (no public/marketing page would benefit from Cache
  // Components' static-shell caching), and Supabase's auth client's own
  // internal Date.now() checks aren't reconcilable with it without the
  // Suspense + "use cache: private" restructuring described in
  // node_modules/next/dist/docs/.../authentication-with-cache-components.md
  // — not worth doing for a stack with no static shell to speed up.
  // Revisit if a public landing page is ever added to this app.
  cacheComponents: false,
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
