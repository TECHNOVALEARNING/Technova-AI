import type { ReactNode } from "react";
import { Check, Clock3, Copy, Database, Download, Eye, GitFork, Globe2, Heart, KeyRound, Library, Lock, Plug, ShieldCheck, Wand2 } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";

// Feature guides, part 2: the Registry and Connections, written from what the product does today
// (RegistryPage, ConnectionsPage, connectors.ts, publishing and Supabase OAuth); illustrations drawn in code.

type Guide2 = {
  registry: { title: string; intro: string[]; catsTitle: string; cats: string[]; actionsTitle: string; actions: [string, string][]; ownTitle: string; own: string[]; access: string };
  connections: { title: string; intro: string[]; hubTitle: string; services: [string, string, "on" | "connect" | "soon"][]; on: string; connect: string; soon: string; howTitle: string; how: string[]; sitesTitle: string; sites: string; supaTitle: string; supa: string[]; security: string };
};

const g2: Record<SiteLang, Guide2> = {
  fr: {
    registry: {
      title: "Registry",
      intro: ["Le Registry est une bibliothèque de ressources prêtes à l'emploi : pages complètes, consoles, kits d'interface, composants, animations, polices, prompts et workflows. Il sert à démarrer plus vite : au lieu de partir d'une page blanche, vous partez d'une ressource éprouvée.", "On y trouve les modèles officiels TechNova, et vos propres ressources, que vous pouvez garder privées ou partager."],
      catsTitle: "Ce qu'on y trouve",
      cats: ["Landing pages", "Consoles", "Kits UI & UX", "Modèles", "Composants", "Animations", "Polices", "Prompts", "Workflows"],
      actionsTitle: "Ce que vous pouvez faire avec une ressource",
      actions: [["Aperçu", "La voir en direct, sur ordinateur ou sur mobile, dans un cadre isolé et sécurisé."], ["Code", "Lire et copier son code ou son texte."], ["Télécharger", "Récupérer le fichier sur votre ordinateur."], ["Utiliser", "L'envoyer au Studio (mode Créer) pour bâtir votre site à partir d'elle, ou utiliser un prompt directement dans le chat."], ["Remixer", "En faire votre propre copie modifiable, si sa licence le permet."], ["Favoris et partage", "La garder en favori ou copier un lien pour la partager."]],
      ownTitle: "Ajouter vos propres ressources",
      own: ["Cliquez sur « Ajouter » : titre, description, catégorie et contenu (code, prompt, texte…).", "Choisissez le format (TXT, Markdown, HTML, CSS, JS, TSX, JSON, SQL) et la licence (TechNova, CC0, MIT, CC BY, CC BY-SA, OFL ou tous droits réservés).", "Une ressource est privée par défaut. Pour la rendre publique, sa licence doit autoriser la redistribution."],
      access: "Les modèles officiels TechNova sont inclus avec les packs Creator et Pro ; les packs Starter et Essential ont accès au modèle offert « Halo » et voient les autres en aperçu verrouillé. Vos propres ressources restent accessibles avec tous les packs.",
    },
    connections: {
      title: "Connexions",
      intro: ["Les connexions relient votre compte TechNova à vos propres services, pour envoyer ce que vous créez là où vous travaillez déjà. Chaque connexion se fait par une fenêtre officielle du service : vous autorisez l'accès, sans jamais donner votre mot de passe à TechNova."],
      hubTitle: "Les services",
      services: [["GitHub", "Envoyer les sites générés par le Studio dans vos dépôts.", "on"], ["Supabase", "Relier votre base de données (dans Paramètres) : le Studio prépare le SQL, vos agents peuvent la lire.", "on"], ["Google Drive", "Compte connectable ; l'import de documents dans le chat arrive.", "connect"], ["Notion", "Compte connectable ; l'utilisation de vos pages comme contexte arrive.", "connect"], ["Vercel", "Déployer un site du Studio sur votre compte Vercel (bouton « Déployer sur Vercel » de la fenêtre Publier).", "on"], ["Netlify", "Déployer un site du Studio sur votre compte Netlify (bouton « Déployer sur Netlify » de la fenêtre Publier).", "on"], ["Stripe", "Créer en un clic un lien de paiement Stripe pour votre page de vente (étape Paiement).", "on"]],
      on: "Utilisable", connect: "Connexion seulement", soon: "Bientôt",
      howTitle: "Comment connecter un service",
      how: ["Ouvrez Connexions dans le tableau de bord (Supabase : dans Paramètres).", "Cliquez sur « Connecter » : une fenêtre du service s'ouvre (autorisez les fenêtres pop-up).", "Acceptez l'accès demandé ; la fenêtre se ferme et le service apparaît « Connecté ».", "Pour Supabase, choisissez ensuite le projet à utiliser.", "Déconnectez quand vous voulez : l'accès est supprimé aussitôt."],
      sitesTitle: "Vos sites publiés",
      sites: "La page Connexions liste aussi les sites que vous avez publiés depuis le Studio (adresse technovaihub.com/s/…), avec la date de mise à jour, et permet de dépublier un site en un clic.",
      supaTitle: "Supabase en détail",
      supa: ["Le Studio génère le SQL de votre base pour que vous le relisiez et le copiiez : rien n'est exécuté automatiquement sur votre projet.", "Un agent avec l'outil « Lire une base de données » consulte ce projet en lecture seule : tables, colonnes et quelques lignes des tables que vous nommez."],
      security: "Les accès sont chiffrés et stockés côté serveur ; ils ne sont jamais lisibles depuis le navigateur. GitHub et Supabase demandent le pack Pro ; la publication de sites et les déploiements Netlify et Vercel, le pack Creator ; Stripe, le pack Essential.",
    },
  },
  en: {
    registry: {
      title: "Registry",
      intro: ["The Registry is a library of ready-to-use resources: full pages, consoles, UI kits, components, animations, fonts, prompts and workflows. It helps you start faster: instead of a blank page, you start from a proven resource.", "It holds the official TechNova designs and your own resources, which you can keep private or share."],
      catsTitle: "What you will find",
      cats: ["Landing pages", "Consoles", "UI & UX kits", "Templates", "Components", "Animations", "Fonts", "Prompts", "Workflows"],
      actionsTitle: "What you can do with a resource",
      actions: [["Preview", "See it live, on desktop or mobile, in an isolated, secure frame."], ["Code", "Read and copy its code or text."], ["Download", "Save the file to your computer."], ["Use", "Send it to the Studio (Create mode) to build your site from it, or use a prompt right in the chat."], ["Remix", "Make your own editable copy, if its license allows it."], ["Favorites and sharing", "Keep it as a favorite or copy a link to share it."]],
      ownTitle: "Add your own resources",
      own: ["Click \"Add\": title, description, category and content (code, prompt, text…).", "Pick the format (TXT, Markdown, HTML, CSS, JS, TSX, JSON, SQL) and the license (TechNova, CC0, MIT, CC BY, CC BY-SA, OFL or all rights reserved).", "A resource is private by default. To make it public, its license must allow redistribution."],
      access: "Official TechNova designs come with the Creator and Pro packs; Starter and Essential get the free \"Halo\" design and see the others as locked previews. Your own resources stay available with every pack.",
    },
    connections: {
      title: "Connections",
      intro: ["Connections link your TechNova account to your own services, to send what you create where you already work. Each connection goes through the service's official window: you grant access without ever giving TechNova your password."],
      hubTitle: "Services",
      services: [["GitHub", "Push sites generated by the Studio to your repositories.", "on"], ["Supabase", "Link your database (in Settings): the Studio prepares the SQL, your agents can read it.", "on"], ["Google Drive", "Account can be connected; importing documents into the chat is coming.", "connect"], ["Notion", "Account can be connected; using your pages as context is coming.", "connect"], ["Vercel", "Deploy a Studio site to your Vercel account (“Deploy to Vercel” in the Publish window).", "on"], ["Netlify", "Deploy a Studio site to your Netlify account (“Deploy to Netlify” in the Publish window).", "on"], ["Stripe", "Create a Stripe payment link for your sales page in one click (Payment step).", "on"]],
      on: "Usable", connect: "Connection only", soon: "Coming soon",
      howTitle: "How to connect a service",
      how: ["Open Connections in the dashboard (Supabase: in Settings).", "Click \"Connect\": a window from the service opens (allow pop-ups).", "Accept the requested access; the window closes and the service shows \"Connected\".", "For Supabase, then choose the project to use.", "Disconnect any time: access is removed at once."],
      sitesTitle: "Your published sites",
      sites: "The Connections page also lists the sites you published from the Studio (technovaihub.com/s/… address) with their update date, and lets you unpublish a site in one click.",
      supaTitle: "Supabase in detail",
      supa: ["The Studio generates your database SQL for you to review and copy: nothing runs automatically on your project.", "An agent with the \"Read a database\" tool looks at that project read-only: tables, columns and a few rows of the tables you name."],
      security: "Access tokens are encrypted and stored server-side; they are never readable from the browser. GitHub and Supabase need the Pro pack; site publishing and Netlify and Vercel deploys, the Creator pack; Stripe, the Essential pack.",
    },
  },
  es: {
    registry: {
      title: "Registry",
      intro: ["El Registry es una biblioteca de recursos listos para usar: páginas completas, consolas, kits de interfaz, componentes, animaciones, fuentes, prompts y workflows. Sirve para empezar más rápido: en lugar de una página en blanco, partes de un recurso probado.", "Contiene los modelos oficiales de TechNova y tus propios recursos, que puedes mantener privados o compartir."],
      catsTitle: "Qué encontrarás",
      cats: ["Landing pages", "Consolas", "Kits UI y UX", "Plantillas", "Componentes", "Animaciones", "Fuentes", "Prompts", "Workflows"],
      actionsTitle: "Qué puedes hacer con un recurso",
      actions: [["Vista previa", "Verlo en vivo, en ordenador o móvil, en un marco aislado y seguro."], ["Código", "Leer y copiar su código o texto."], ["Descargar", "Guardar el archivo en tu ordenador."], ["Usar", "Enviarlo al Studio (modo Crear) para construir tu sitio a partir de él, o usar un prompt directamente en el chat."], ["Remix", "Crear tu propia copia editable, si su licencia lo permite."], ["Favoritos y compartir", "Guardarlo en favoritos o copiar un enlace para compartirlo."]],
      ownTitle: "Añadir tus propios recursos",
      own: ["Pulsa «Añadir»: título, descripción, categoría y contenido (código, prompt, texto…).", "Elige el formato (TXT, Markdown, HTML, CSS, JS, TSX, JSON, SQL) y la licencia (TechNova, CC0, MIT, CC BY, CC BY-SA, OFL o todos los derechos reservados).", "Un recurso es privado por defecto. Para hacerlo público, su licencia debe permitir la redistribución."],
      access: "Los modelos oficiales de TechNova se incluyen con los packs Creator y Pro; Starter y Essential tienen el modelo gratuito «Halo» y ven los demás como vista previa bloqueada. Tus propios recursos siguen disponibles con todos los packs.",
    },
    connections: {
      title: "Conexiones",
      intro: ["Las conexiones vinculan tu cuenta de TechNova con tus propios servicios, para enviar lo que creas allí donde ya trabajas. Cada conexión pasa por la ventana oficial del servicio: autorizas el acceso sin dar nunca tu contraseña a TechNova."],
      hubTitle: "Los servicios",
      services: [["GitHub", "Enviar los sitios generados por el Studio a tus repositorios.", "on"], ["Supabase", "Vincular tu base de datos (en Ajustes): el Studio prepara el SQL y tus agentes pueden leerla.", "on"], ["Google Drive", "Cuenta conectable; la importación de documentos al chat llegará pronto.", "connect"], ["Notion", "Cuenta conectable; el uso de tus páginas como contexto llegará pronto.", "connect"], ["Vercel", "Desplegar un sitio del Studio en tu cuenta de Vercel (botón «Desplegar en Vercel» de la ventana Publicar).", "on"], ["Netlify", "Desplegar un sitio del Studio en tu cuenta de Netlify (botón «Desplegar en Netlify» de la ventana Publicar).", "on"], ["Stripe", "Crear con un clic un enlace de pago de Stripe para tu página de venta (paso Pago).", "on"]],
      on: "Utilizable", connect: "Solo conexión", soon: "Próximamente",
      howTitle: "Cómo conectar un servicio",
      how: ["Abre Conexiones en el panel (Supabase: en Ajustes).", "Pulsa «Conectar»: se abre una ventana del servicio (permite las ventanas emergentes).", "Acepta el acceso solicitado; la ventana se cierra y el servicio aparece «Conectado».", "Para Supabase, elige después el proyecto que usar.", "Desconecta cuando quieras: el acceso se elimina al instante."],
      sitesTitle: "Tus sitios publicados",
      sites: "La página Conexiones también lista los sitios que publicaste desde el Studio (dirección technovaihub.com/s/…), con la fecha de actualización, y permite despublicar un sitio en un clic.",
      supaTitle: "Supabase en detalle",
      supa: ["El Studio genera el SQL de tu base para que lo revises y lo copies: nada se ejecuta automáticamente en tu proyecto.", "Un agente con la herramienta «Leer una base de datos» consulta ese proyecto en solo lectura: tablas, columnas y algunas filas de las tablas que nombras."],
      security: "Los accesos se cifran y se guardan en el servidor; nunca se pueden leer desde el navegador. GitHub y Supabase requieren el pack Pro; la publicación de sitios y los despliegues en Netlify y Vercel, el pack Creator; Stripe, el pack Essential.",
    },
  },
  pt: {
    registry: {
      title: "Registry",
      intro: ["O Registry é uma biblioteca de recursos prontos para usar: páginas completas, consoles, kits de interface, componentes, animações, fontes, prompts e workflows. Ele ajuda a começar mais rápido: em vez de uma página em branco, você parte de um recurso testado.", "Ele reúne os modelos oficiais do TechNova e os seus próprios recursos, que você pode manter privados ou compartilhar."],
      catsTitle: "O que você encontra",
      cats: ["Landing pages", "Consoles", "Kits UI e UX", "Modelos", "Componentes", "Animações", "Fontes", "Prompts", "Workflows"],
      actionsTitle: "O que você pode fazer com um recurso",
      actions: [["Pré-visualizar", "Ver ao vivo, no computador ou no celular, num quadro isolado e seguro."], ["Código", "Ler e copiar seu código ou texto."], ["Baixar", "Salvar o arquivo no seu computador."], ["Usar", "Enviá-lo ao Studio (modo Criar) para construir seu site a partir dele, ou usar um prompt direto no chat."], ["Remixar", "Fazer sua própria cópia editável, se a licença permitir."], ["Favoritos e compartilhamento", "Guardar nos favoritos ou copiar um link para compartilhar."]],
      ownTitle: "Adicionar seus próprios recursos",
      own: ["Clique em «Adicionar»: título, descrição, categoria e conteúdo (código, prompt, texto…).", "Escolha o formato (TXT, Markdown, HTML, CSS, JS, TSX, JSON, SQL) e a licença (TechNova, CC0, MIT, CC BY, CC BY-SA, OFL ou todos os direitos reservados).", "Um recurso é privado por padrão. Para torná-lo público, a licença deve permitir a redistribuição."],
      access: "Os modelos oficiais do TechNova vêm com os pacotes Creator e Pro; Starter e Essential têm o modelo gratuito «Halo» e veem os outros como pré-visualização bloqueada. Seus próprios recursos ficam disponíveis em todos os pacotes.",
    },
    connections: {
      title: "Conexões",
      intro: ["As conexões ligam sua conta TechNova aos seus próprios serviços, para enviar o que você cria para onde você já trabalha. Cada conexão passa pela janela oficial do serviço: você autoriza o acesso sem nunca dar sua senha ao TechNova."],
      hubTitle: "Os serviços",
      services: [["GitHub", "Enviar os sites gerados pelo Studio para os seus repositórios.", "on"], ["Supabase", "Ligar seu banco de dados (em Configurações): o Studio prepara o SQL e seus agentes podem lê-lo.", "on"], ["Google Drive", "Conta conectável; a importação de documentos no chat chega em breve.", "connect"], ["Notion", "Conta conectável; o uso das suas páginas como contexto chega em breve.", "connect"], ["Vercel", "Publicar um site do Studio na sua conta Vercel (botão «Implantar na Vercel» da janela Publicar).", "on"], ["Netlify", "Publicar um site do Studio na sua conta Netlify (botão «Implantar na Netlify» da janela Publicar).", "on"], ["Stripe", "Criar com um clique um link de pagamento Stripe para a sua página de vendas (etapa Pagamento).", "on"]],
      on: "Utilizável", connect: "Só conexão", soon: "Em breve",
      howTitle: "Como conectar um serviço",
      how: ["Abra Conexões no painel (Supabase: em Configurações).", "Clique em «Conectar»: abre-se uma janela do serviço (permita pop-ups).", "Aceite o acesso pedido; a janela fecha e o serviço aparece «Conectado».", "Para o Supabase, escolha em seguida o projeto a usar.", "Desconecte quando quiser: o acesso é removido na hora."],
      sitesTitle: "Seus sites publicados",
      sites: "A página Conexões também lista os sites que você publicou pelo Studio (endereço technovaihub.com/s/…), com a data de atualização, e permite despublicar um site com um clique.",
      supaTitle: "Supabase em detalhe",
      supa: ["O Studio gera o SQL do seu banco para você revisar e copiar: nada é executado automaticamente no seu projeto.", "Um agente com a ferramenta «Ler um banco de dados» consulta esse projeto somente leitura: tabelas, colunas e algumas linhas das tabelas que você cita."],
      security: "Os acessos são criptografados e guardados no servidor; nunca podem ser lidos pelo navegador. GitHub e Supabase exigem o pacote Pro; a publicação de sites e as implantações na Netlify e na Vercel, o pacote Creator; Stripe, o pacote Essential.",
    },
  },
};

const sub = "mt-6 font-display text-lg font-semibold";
const p = "mt-3 leading-relaxed text-muted-foreground";
const Steps = ({ items }: { items: string[] }) => <ol className="mt-3 space-y-2">{items.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-ink-foreground">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>;

/** Illustration: a small library shelf of resource cards. */
function Shelf({ cats }: { cats: string[] }) {
  return <div className="relative mt-4 overflow-hidden rounded-[22px] border border-border bg-secondary/40 p-4">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_80%_20%,color-mix(in_oklab,var(--iris-1)_22%,transparent),transparent)]" />
    <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-3">{cats.map((c, i) => <div key={c} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="h-12" style={{ background: `linear-gradient(135deg, oklch(.78 .1 ${(i * 40) % 360}), oklch(.6 .12 ${(i * 40 + 60) % 360}))` }} />
      <p className="px-2.5 py-2 text-xs font-medium">{c}</p>
    </div>)}</div>
  </div>;
}

/** Illustration: TechNova at the centre, linked to each service with its status. */
function Hub({ services, labels }: { services: [string, string, "on" | "connect" | "soon"][]; labels: Record<"on" | "connect" | "soon", string> }) {
  const tone = { on: "border-supabase/40 bg-supabase/10 text-supabase", connect: "border-border bg-secondary text-foreground", soon: "border-border bg-card text-muted-foreground" } as const;
  const icon = { on: Check, connect: Plug, soon: Clock3 } as const;
  return <div className="relative mt-4 overflow-hidden rounded-[22px] border border-border bg-secondary/40 p-4 sm:p-6">
    <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground shadow-lift"><img src="/favicon.svg" alt="" className="size-5 rounded" />TechNova</div>
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{services.map(([name, desc, st]) => { const I = icon[st]; return <div key={name} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2"><p className="font-semibold">{name}</p><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${tone[st]}`}><I className="size-3" />{labels[st]}</span></div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>; })}</div>
  </div>;
}

export function featureGuideBlocks2(lang: SiteLang): { id: string; title: string; body: ReactNode }[] {
  const { registry: r, connections: c } = g2[lang];
  const actionIcons = [Eye, Copy, Download, Wand2, GitFork, Heart];
  return [
    { id: "registry", title: r.title, body: <>
      {r.intro.map((x) => <p key={x} className={p}>{x}</p>)}
      <h3 className={sub}>{r.catsTitle}</h3>
      <Shelf cats={r.cats} />
      <h3 className={sub}>{r.actionsTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{r.actions.map(([t, d], i) => { const I = actionIcons[i] ?? Library; return <div key={t} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-ink text-ink-foreground"><I className="size-4" /></span><p className="font-semibold">{t}</p></div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d}</p>
      </div>; })}</div>
      <h3 className={sub}>{r.ownTitle}</h3>
      <Steps items={r.own} />
      <p className={`${p} flex gap-2 text-sm`}><Lock className="mt-1 size-3.5 shrink-0" />{r.access}</p>
    </> },
    { id: "connexions", title: c.title, body: <>
      {c.intro.map((x) => <p key={x} className={p}>{x}</p>)}
      <h3 className={sub}>{c.hubTitle}</h3>
      <Hub services={c.services} labels={{ on: c.on, connect: c.connect, soon: c.soon }} />
      <h3 className={sub}>{c.howTitle}</h3>
      <Steps items={c.how} />
      <h3 className={sub}>{c.supaTitle}</h3>
      <ul className="mt-3 space-y-2 text-sm">{c.supa.map((x, i) => { const I = [Database, KeyRound][i] ?? Database; return <li key={x} className="flex gap-2.5"><I className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{x}</span></li>; })}</ul>
      <h3 className={sub}>{c.sitesTitle}</h3>
      <p className={`${p} flex gap-2`}><Globe2 className="mt-1 size-4 shrink-0" />{c.sites}</p>
      <p className={`${p} flex gap-2 text-sm`}><ShieldCheck className="mt-0.5 size-4 shrink-0" />{c.security}</p>
    </> },
  ];
}
