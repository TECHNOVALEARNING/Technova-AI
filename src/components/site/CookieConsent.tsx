import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { OPEN_CONSENT_EVENT, readConsent, saveConsent } from "@/lib/consent";
import { isSiteLang, type SiteLang } from "@/lib/i18n";

const copy = {
  fr: {
    title: "Votre vie privée compte", text: "TechNova utilise des cookies et un stockage local strictement nécessaires au fonctionnement du site (connexion, sécurité). Avec votre accord, nous mémorisons aussi vos préférences : langue, thème, disposition et modèles choisis. Aucun cookie publicitaire ni de mesure d'audience.",
    reject: "Tout refuser", customize: "Personnaliser", accept: "Tout accepter", save: "Enregistrer mes choix", policy: "Politique de cookies",
    settings: "Préférences cookies", settingsSub: "Choisissez ce que TechNova peut conserver dans votre navigateur. Vous pouvez changer d'avis à tout moment depuis le lien « Préférences cookies » en bas de page.",
    always: "Toujours actifs", unused: "Non utilisés",
    cats: [["Strictement nécessaires", "Session de connexion, sécurité, mémorisation de ce choix, achat en cours et actions que vous lancez. Sans eux, le site ne peut pas fonctionner."], ["Préférences", "Langue, thème clair ou sombre, menu réduit, mode et modèles du chat, devise affichée, rappels d'interface. Refusés, ils sont oubliés à la fin de la visite."], ["Mesure d'audience", "Statistiques de fréquentation. TechNova n'en utilise aucune aujourd'hui."], ["Publicité", "Ciblage et suivi publicitaire. TechNova n'en utilise aucun et ne vend pas vos données."]],
  },
  en: {
    title: "Your privacy matters", text: "TechNova uses cookies and local storage that are strictly necessary for the site to work (sign-in, security). With your consent, we also remember your preferences: language, theme, layout and chosen models. No advertising or audience-measurement cookies.",
    reject: "Reject all", customize: "Customize", accept: "Accept all", save: "Save my choices", policy: "Cookie policy",
    settings: "Cookie preferences", settingsSub: "Choose what TechNova may keep in your browser. You can change your mind at any time from the “Cookie preferences” link at the bottom of the page.",
    always: "Always on", unused: "Not used",
    cats: [["Strictly necessary", "Sign-in session, security, remembering this choice, a purchase in progress and actions you start. The site cannot work without them."], ["Preferences", "Language, light or dark theme, collapsed menu, chat mode and models, displayed currency, interface reminders. If refused, they are forgotten at the end of the visit."], ["Audience measurement", "Traffic statistics. TechNova uses none today."], ["Advertising", "Ad targeting and tracking. TechNova uses none and does not sell your data."]],
  },
  es: {
    title: "Tu privacidad importa", text: "TechNova usa cookies y almacenamiento local estrictamente necesarios para el funcionamiento del sitio (sesión, seguridad). Con tu consentimiento, también recordamos tus preferencias: idioma, tema, disposición y modelos elegidos. Ninguna cookie publicitaria ni de medición de audiencia.",
    reject: "Rechazar todo", customize: "Personalizar", accept: "Aceptar todo", save: "Guardar mis opciones", policy: "Política de cookies",
    settings: "Preferencias de cookies", settingsSub: "Elige lo que TechNova puede guardar en tu navegador. Puedes cambiar de opinión en cualquier momento desde el enlace «Preferencias de cookies» al pie de página.",
    always: "Siempre activas", unused: "No utilizadas",
    cats: [["Estrictamente necesarias", "Sesión, seguridad, recordar esta elección, compra en curso y acciones que inicias. Sin ellas, el sitio no puede funcionar."], ["Preferencias", "Idioma, tema claro u oscuro, menú reducido, modo y modelos del chat, moneda mostrada, recordatorios de interfaz. Si las rechazas, se olvidan al final de la visita."], ["Medición de audiencia", "Estadísticas de visitas. TechNova no utiliza ninguna hoy."], ["Publicidad", "Segmentación y seguimiento publicitario. TechNova no utiliza ninguno y no vende tus datos."]],
  },
  pt: {
    title: "A sua privacidade importa", text: "A TechNova usa cookies e armazenamento local estritamente necessários ao funcionamento do site (login, segurança). Com o seu consentimento, também memorizamos as suas preferências: idioma, tema, disposição e modelos escolhidos. Nenhum cookie publicitário ou de medição de audiência.",
    reject: "Recusar tudo", customize: "Personalizar", accept: "Aceitar tudo", save: "Salvar minhas escolhas", policy: "Política de cookies",
    settings: "Preferências de cookies", settingsSub: "Escolha o que a TechNova pode guardar no seu navegador. Você pode mudar de ideia a qualquer momento pelo link «Preferências de cookies» no rodapé.",
    always: "Sempre ativos", unused: "Não utilizados",
    cats: [["Estritamente necessários", "Sessão de login, segurança, memorização desta escolha, compra em curso e ações que você inicia. Sem eles, o site não funciona."], ["Preferências", "Idioma, tema claro ou escuro, menu recolhido, modo e modelos do chat, moeda exibida, lembretes de interface. Se recusados, são esquecidos no fim da visita."], ["Medição de audiência", "Estatísticas de visitas. A TechNova não usa nenhuma hoje."], ["Publicidade", "Segmentação e rastreamento publicitário. A TechNova não usa nenhum e não vende os seus dados."]],
  },
} satisfies Record<SiteLang, unknown>;

/** The page language (set by the site and dashboard), else the browser language. */
function useDocLang(): SiteLang {
  const [lang, setLang] = useState<SiteLang>("fr");
  useEffect(() => {
    const read = () => {
      const doc = document.documentElement.lang.slice(0, 2);
      const nav = navigator.language.slice(0, 2);
      setLang(isSiteLang(doc) ? doc : isSiteLang(nav) ? nav : "fr");
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => obs.disconnect();
  }, []);
  return lang;
}

/** Consent banner on first visit (and every 6 months), plus the settings dialog opened from the footer. */
export function CookieConsent() {
  const lang = useDocLang(); const t = copy[lang];
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [banner, setBanner] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);

  useEffect(() => {
    setBanner(!readConsent());
    const show = () => { setPrefs(readConsent()?.preferences ?? false); setOpen(true); };
    window.addEventListener(OPEN_CONSENT_EVENT, show);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, show);
  }, []);

  const decide = (preferences: boolean) => { saveConsent(preferences); setBanner(false); setOpen(false); };
  // Sites users publish under /s/ are their own pages: TechNova's banner stays out of them.
  if (path.startsWith("/s/")) return null;

  const pill = "h-10 flex-1 rounded-full px-5 text-sm font-medium sm:flex-none";
  return <>
    {banner && !open && <div role="region" aria-label={t.settings} className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-5">
      <div className="mx-auto max-w-4xl rounded-[24px] border border-border bg-card/95 p-5 text-card-foreground shadow-2xl backdrop-blur-md sm:p-6">
        <div className="flex gap-4">
          <span className="hidden size-10 shrink-0 place-items-center rounded-2xl bg-secondary sm:grid"><Cookie className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold">{t.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.text} <a href="/cookies" className="font-medium text-foreground underline underline-offset-2">{t.policy}</a></p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" className={pill} onClick={() => decide(false)}>{t.reject}</Button>
          <Button variant="outline" className={pill} onClick={() => { setPrefs(false); setOpen(true); }}>{t.customize}</Button>
          <Button className={pill} onClick={() => decide(true)}>{t.accept}</Button>
        </div>
      </div>
    </div>}

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{t.settings}</DialogTitle><DialogDescription>{t.settingsSub}</DialogDescription></DialogHeader>
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {t.cats.map(([name, body], i) => <li key={name} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0"><p id={`cookie-cat-${i}`} className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></div>
            {i === 1
              ? <Switch aria-labelledby={`cookie-cat-${i}`} checked={prefs} onCheckedChange={setPrefs} className="mt-0.5 shrink-0" />
              : <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{i === 0 ? t.always : t.unused}</span>}
          </li>)}
        </ul>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <a href="/cookies" className="self-center text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">{t.policy}</a>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => decide(false)}>{t.reject}</Button>
            <Button variant="outline" className="rounded-full" onClick={() => decide(true)}>{t.accept}</Button>
            <Button className="rounded-full" onClick={() => decide(prefs)}>{t.save}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
