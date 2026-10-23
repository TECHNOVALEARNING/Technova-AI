import { useEffect, useState } from "react";

// Installable app (PWA): service worker registration and the browser's install prompt.

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Chrome/Edge/Android fire this once, possibly before React mounts: keep it at module level.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallPromptEvent; notify(); });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !import.meta.env.PROD) return;
  const register = () => { void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* app works without it */ }); };
  // React often mounts after the load event has already fired.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

const isStandalone = () => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

/** "prompt": the browser can install now · "ios": show Share → Add to Home Screen · "none": already installed or unsupported. */
export function useInstallApp() {
  const [mode, setMode] = useState<"prompt" | "ios" | "none">("none");
  useEffect(() => {
    const update = () => setMode(isStandalone() ? "none" : deferred ? "prompt" : isIos() ? "ios" : "none");
    update();
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);
  async function install() {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null; notify();
    return outcome === "accepted";
  }
  return { mode, install };
}
