// A tab opened before a deployment keeps the previous build: its page files (hashed chunks) and
// server-function ids no longer exist on the server. This module notices it and moves the tab to the
// new build without showing an error: a full page load on the next internal link, or one reload.

declare const __BUILD_ID__: string;

export const BUILD_ID: string = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";

const RELOAD_KEY = "tn-stale-reload-at";
/** Two automatic reloads closer than this would be a loop (the file is really missing): show the error instead. */
const RELOAD_GAP_MS = 20_000;
const CHECK_EVERY_MS = 3 * 60_000;

export const STALE_BUILD_RE = /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading (CSS )?chunk|Unable to preload CSS|error loading dynamically imported/i;

let stale = false;
let lastCheck = 0;
let installed = false;

const listeners = new Set<() => void>();

export const isStaleBuild = () => stale;
export function markStaleBuild() {
  if (stale) return;
  stale = true;
  listeners.forEach((l) => l());
}
/** Runs once when the tab learns it is on an old build (immediately if it already knows). */
export function onStaleBuild(listener: () => void) {
  if (stale) listener(); else listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Reloads the page unless it was already reloaded for this reason a moment ago. Returns whether it reloads. */
export function reloadForNewBuild(): boolean {
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch { /* storage blocked */ }
  if (Date.now() - last < RELOAD_GAP_MS) return false;
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* storage blocked: reload anyway */ }
  window.location.reload();
  return true;
}

async function checkBuild() {
  if (stale || BUILD_ID === "dev" || Date.now() - lastCheck < CHECK_EVERY_MS) return;
  lastCheck = Date.now();
  try {
    const res = await fetch("/api/public/version", { cache: "no-store" });
    if (!res.ok) return;
    const { build } = (await res.json()) as { build?: string };
    if (build && build !== BUILD_ID) markStaleBuild();
  } catch { /* offline: try again later */ }
}

/** Call once in the browser (root component). */
export function installStaleBuildGuard() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // A page file of the old build failed to load (often while preloading a link on hover).
  window.addEventListener("vite:preloadError", () => markStaleBuild());
  // A server function of the old build no longer exists on the server (404): same diagnosis.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await nativeFetch(...args);
    try {
      const target = args[0];
      const href = typeof target === "string" ? target : target instanceof URL ? target.href : target.url;
      if (res.status === 404 && new URL(href, window.location.href).pathname.startsWith("/_serverFn")) { lastCheck = 0; void checkBuild(); }
    } catch { /* never break a request for this */ }
    return res;
  };
  // Coming back to a tab left open: has a new version been deployed meanwhile?
  const onWake = () => { if (document.visibilityState === "visible") void checkBuild(); };
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
  // Once the build is known to be old, internal links load the page from the server (new build)
  // instead of asking the router for files that are gone.
  document.addEventListener("click", (event) => {
    if (!stale || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return; // in-page anchor
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(url.href);
  }, true);
}
