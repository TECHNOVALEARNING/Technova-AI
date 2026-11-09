import { createFileRoute, redirect } from "@tanstack/react-router";

// The developer guide now lives inside /documentation (examples, use cases, production checklist).
export const Route = createFileRoute("/developpeurs")({
  beforeLoad: () => { throw redirect({ to: "/documentation", hash: "exemples", statusCode: 301 }); },
});
