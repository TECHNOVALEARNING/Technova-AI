// Public (browser-safe) configuration delivered by the server at request time, so the
// app works even when VITE_* variables were missing during the build.
// Never put secrets here: everything in it is readable by every visitor.

export type PublicEnv = { supabaseUrl: string; supabaseKey: string };

declare global {
  interface Window {
    __TECHNOVA_ENV__?: PublicEnv;
  }
}

export function readPublicEnv(): PublicEnv {
  if (typeof window !== "undefined") return window.__TECHNOVA_ENV__ ?? { supabaseUrl: "", supabaseKey: "" };
  return {
    supabaseUrl: process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "",
    supabaseKey: process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
  };
}

/** Inline script for <head>; identical on server and client so hydration matches. */
export function publicEnvScript(): string {
  const json = JSON.stringify(readPublicEnv()).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return `window.__TECHNOVA_ENV__=${json};`;
}
