import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/site/CookieConsent";
import { ConfirmHost } from "@/components/ConfirmHost";
import { publicEnvScript } from "@/lib/public-env";
import { registerServiceWorker } from "@/lib/pwa";
import { STALE_BUILD_RE, installStaleBuildGuard, markStaleBuild, onStaleBuild, reloadForNewBuild } from "@/lib/stale-build";
import { toast } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(error);
  const message = error instanceof Error ? error.message : String(error ?? "");
  // After a deployment, a tab opened on the previous version asks for files that no longer exist:
  // reload to pick up the new version instead of showing the error (at most once every 20 s, so a
  // file that is really missing still ends on this page rather than in a reload loop).
  const staleBuild = STALE_BUILD_RE.test(message);
  const [updating, setUpdating] = useState(staleBuild);
  useEffect(() => {
    if (!staleBuild) return;
    markStaleBuild();
    if (!reloadForNewBuild()) setUpdating(false);
  }, [staleBuild]);

  if (updating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4" role="status">
        <p className="text-sm text-muted-foreground">Mise à jour de TechNova… / Updating TechNova…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page ne s’est pas chargée
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {staleBuild
            ? "Une nouvelle version de TechNova vient d’être mise en ligne. Rechargez la page pour continuer."
            : "Un problème est survenu de notre côté. Rechargez la page ou revenez à l’accueil."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              // A real reload: re-rendering in place repeats the same failure (missing file after a deployment, broken state).
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Recharger
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Accueil
          </a>
        </div>
        {message && !staleBuild && <p className="mt-6 break-words font-mono text-[11px] text-muted-foreground/80">{message.slice(0, 300)}</p>}
      </div>
    </div>
  );
}

const OG_IMAGE = "https://www.technovaihub.com/media/technova-hero-poster.jpg";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TechNova AI Hub" },
      { name: "description", content: "Tous les meilleurs modèles d'IA en un seul hub." },
      { name: "format-detection", content: "telephone=no" },
      { name: "author", content: "TechNova" },
      { property: "og:title", content: "TechNova AI Hub" },
      { property: "og:description", content: "Tous les meilleurs modèles d'IA en un seul hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // Link previews (WhatsApp, Facebook, LinkedIn, X) need an absolute, large image to stay sharp.
      { property: "og:site_name", content: "TechNova AI Hub" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1440" },
      { property: "og:image:height", content: "1080" },
      { property: "og:image:alt", content: "TechNova AI Hub" },
      { name: "twitter:image", content: OG_IMAGE },
      // Installable app (PWA)
      { name: "theme-color", content: "#14161a" },
      { name: "application-name", content: "TechNova" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "TechNova" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: publicEnvScript() }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    registerServiceWorker();
    installStaleBuildGuard();
    // A newer version is online: offer the reload instead of letting an action fail later.
    return onStaleBuild(() => {
      const en = document.documentElement.lang === "en";
      toast(en ? "A new version of TechNova is available." : "Une nouvelle version de TechNova est disponible.", {
        id: "tn-new-build", duration: Infinity,
        action: { label: en ? "Reload" : "Recharger", onClick: () => window.location.reload() },
      });
    });
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
      <CookieConsent />
      <ConfirmHost />
    </QueryClientProvider>
  );
}
