import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Nitro picks its deployment preset from the environment: "vercel" on Vercel
// (VERCEL=1), node-server locally. Force one with NITRO_PRESET if needed.
export default defineConfig(({ command }) => ({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    tanstackStart({ server: { entry: "server" } }),
    ...(command === "build"
      ? [
          nitro({
            vercel: {
              // Studio builds stream for several minutes; 300 s is the default ceiling on every plan.
              functions: { maxDuration: 300 },
              // Safety net for the daily media purge (needs CRON_SECRET in Vercel env).
              config: { version: 3, crons: [{ path: "/api/public/media-purge", schedule: "17 3 * * *" }] },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  server: { port: 3000 },
}));
