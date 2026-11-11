import { createFileRoute } from "@tanstack/react-router";
import { BUILD_ID } from "@/lib/stale-build";

// Public: the build currently deployed, so a tab left open can tell that a newer version is online.
export const Route = createFileRoute("/api/public/version")({
  server: { handlers: { GET: async () => Response.json({ build: BUILD_ID }, { headers: { "Cache-Control": "no-store" } }) } },
});
