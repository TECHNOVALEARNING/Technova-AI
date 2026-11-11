import type { ReactNode } from "react";
import { ArrowRight, Bot, Brain, Check, Clock3, Coins, FileSearch, FileText, Globe, Layers, Lock, MessageCircle, Scissors, Search, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";

// Feature guides of the public documentation: AI agents and knowledge bases, what they do, how they are used
// and where they can be used — written from what the product does today (src/routes/api/chat.ts,
// files.server.ts, AgentsPage, KnowledgePage); the illustrations are drawn in code so they follow the theme.

type Guide = {
  agents: { title: string; intro: string[]; anatomyTitle: string; parts: [string, string][]; flowTitle: string; flow: string[]; useTitle: string; use: string[]; tools: { title: string; on: string[]; soon: string[]; note: string; locked: string[]; onLabel: string; soonLabel: string; lockedLabel: string }; plans: string };
  knowledge: { title: string; intro: string[]; pipeTitle: string; pipe: [string, string][]; useTitle: string; use: string[]; formats: string; privacy: string; cost: string };
  where: { title: string; intro: string; cols: [string, string]; rows: [string, boolean, boolean][]; yes: string; no: string; later: string[] };
};

const guide: Record<SiteLang, Guide> = {
  fr: {
    agents: {
      title: "Agents IA",
      intro: ["Un agent IA est un assistant que vous configurez une fois pour une tâche précise : service client, rédaction, veille, support technique… Il garde son rôle, son ton et ses règles d'une conversation à l'autre, au lieu de tout réexpliquer à chaque message.", "Vous le créez dans le tableau de bord, rubrique Agents IA, puis vous discutez avec lui dans le chat de TechNova."],
      anatomyTitle: "De quoi est fait un agent",
      parts: [["Instructions", "Son rôle, son ton et ses règles (jusqu'à 8 000 caractères)."], ["Mémoire", "Les informations qu'il doit toujours garder en tête : votre entreprise, vos offres, vos contacts."], ["Modèle", "TechNova Smart (le moins cher qui convient) ou un modèle précis du catalogue."], ["Budget", "Un plafond de crédits par réponse : l'agent ne dépense jamais plus."], ["Outils", "Recherche web, lecture d'une page web… désactivés tant que vous ne les cochez pas."], ["Connaissances", "Vos bases de documents, pour répondre à partir de vos propres sources."]],
      flowTitle: "Ce qui se passe quand vous lui écrivez",
      flow: ["Votre message", "Instructions + mémoire de l'agent", "Outils autorisés et passages de vos connaissances", "Le modèle rédige", "Réponse, dans la limite du budget"],
      useTitle: "Comment l'utiliser",
      use: ["Créez l'agent : nom, description, instructions, mémoire.", "Choisissez le modèle et le budget par réponse.", "Cochez les outils utiles et attachez vos bases de connaissances.", "Cliquez sur « Discuter » : la conversation s'ouvre dans le chat avec cet agent.", "Modifiez-le quand vous voulez : chaque modification crée une nouvelle version."],
      tools: { title: "Les outils", on: ["Recherche web", "Lire une page web", "Lire des fichiers", "Lire une base de données"], soon: [], note: "Lire des fichiers : l'agent lit vos fichiers déjà déposés (dans le chat ou vos connaissances) — ceux que vous nommez dans le message, sinon les plus récents. Lire une base de données : il consulte en lecture seule le projet Supabase connecté dans vos Paramètres (pack Pro) — la liste des tables et colonnes, et jusqu'à 20 lignes des tables que vous nommez. Il ne modifie jamais rien.", locked: ["Exécuter du code", "Écrire en base", "Envoyer des e-mails", "Paiements"], onLabel: "Actifs", soonLabel: "Pas encore actifs", lockedLabel: "Verrouillés par sécurité" },
      plans: "Les agents sont inclus à partir du pack Creator ; le budget par réponse se règle librement avec le pack Pro (20 crédits par défaut sinon).",
    },
    knowledge: {
      title: "Bases de connaissances",
      intro: ["Une base de connaissances regroupe vos documents (catalogue, procédures, contrats, cours, FAQ…) pour que l'IA réponde à partir de vos informations plutôt que de ses connaissances générales.", "Vous la créez dans la rubrique Connaissances, vous y déposez vos fichiers, et TechNova les prépare pour la recherche."],
      pipeTitle: "Ce que fait TechNova avec vos fichiers",
      pipe: [["Dépôt", "Vous déposez vos fichiers dans un stockage privé."], ["Vérification", "Format, taille et analyse de sécurité."], ["Extraction", "Le texte est lu, même dans les PDF et documents Word."], ["Découpage", "Le texte est coupé en passages courts."], ["Indexation", "Chaque passage est indexé pour être retrouvé par le sens, pas seulement par les mots."], ["Réponse", "À chaque question, les passages les plus utiles sont donnés à l'IA."]],
      useTitle: "Comment l'utiliser",
      use: ["Créez une base et donnez-lui un nom clair (ex. « Catalogue 2026 »).", "Déposez vos documents ; suivez l'état de chaque fichier (en cours, prêt, erreur).", "Testez la recherche directement sur la page pour voir les passages trouvés.", "Dans le chat, choisissez la base au moment d'écrire : la réponse s'appuie sur vos documents.", "Ou attachez-la à un agent : il la consulte à chaque réponse."],
      formats: "Formats acceptés : PDF, Word, Excel, CSV, PowerPoint, texte, Markdown, HTML, JSON, fichiers de code, images, audio (MP3, WAV), vidéo (MP4, MOV) et ZIP — jusqu'à 25 Mo selon le type.",
      privacy: "Vos fichiers restent privés : vous seul pouvez les lire, et le contenu des documents est traité comme une information à consulter, jamais comme des ordres donnés à l'IA.",
      cost: "La préparation des documents est facturée en crédits à son coût réel ; supprimer une source la retire aussitôt de la base.",
    },
    where: {
      title: "Où les utiliser",
      intro: "Aujourd'hui, agents et bases de connaissances s'utilisent à l'intérieur de TechNova.",
      cols: ["Agents IA", "Bases de connaissances"],
      rows: [["Dans le chat de TechNova", true, true], ["Attachées à un agent", true, true], ["Depuis l'API publique (autre application)", false, false], ["Téléchargement / export", false, false]],
      yes: "Disponible", no: "Pas encore",
      later: ["Pour réutiliser un agent ailleurs aujourd'hui, copiez ses instructions dans l'autre outil ; vos fichiers d'origine restent les vôtres.", "L'API publique donne déjà accès à tous les modèles de texte : vous pouvez y envoyer les instructions de votre agent comme message système."],
    },
  },
  en: {
    agents: {
      title: "AI agents",
      intro: ["An AI agent is an assistant you set up once for a specific job: customer service, writing, research, technical support… It keeps its role, tone and rules from one conversation to the next, so you don't explain everything again in each message.", "You create it in the dashboard, under AI agents, then chat with it in the TechNova chat."],
      anatomyTitle: "What an agent is made of",
      parts: [["Instructions", "Its role, tone and rules (up to 8,000 characters)."], ["Memory", "What it must always keep in mind: your company, offers, contacts."], ["Model", "TechNova Smart (the cheapest suitable one) or a specific model from the catalogue."], ["Budget", "A credit ceiling per reply: the agent never spends more."], ["Tools", "Web search, reading a web page… off until you tick them."], ["Knowledge", "Your document bases, to answer from your own sources."]],
      flowTitle: "What happens when you write to it",
      flow: ["Your message", "Agent instructions + memory", "Allowed tools and passages from your knowledge", "The model writes", "Reply, within the budget"],
      useTitle: "How to use it",
      use: ["Create the agent: name, description, instructions, memory.", "Pick the model and the budget per reply.", "Tick the useful tools and attach your knowledge bases.", "Click \"Chat\": the conversation opens in the chat with this agent.", "Edit it any time: each change creates a new version."],
      tools: { title: "Tools", on: ["Web search", "Read a web page", "Read files", "Read a database"], soon: [], note: "Read files: the agent reads the files you already added (in the chat or your knowledge) — the ones you name in the message, otherwise the most recent. Read a database: it looks, read-only, at the Supabase project connected in your Settings (Pro pack) — the list of tables and columns, and up to 20 rows of the tables you name. It never changes anything.", locked: ["Run code", "Write to a database", "Send emails", "Payments"], onLabel: "Active", soonLabel: "Not active yet", lockedLabel: "Locked for safety" },
      plans: "Agents come with the Creator pack and above; the budget per reply is free to set with the Pro pack (20 credits by default otherwise).",
    },
    knowledge: {
      title: "Knowledge bases",
      intro: ["A knowledge base gathers your documents (catalogue, procedures, contracts, courses, FAQ…) so the AI answers from your information rather than its general knowledge.", "You create it under Knowledge, add your files, and TechNova prepares them for search."],
      pipeTitle: "What TechNova does with your files",
      pipe: [["Upload", "You add your files to private storage."], ["Checks", "Format, size and a security scan."], ["Extraction", "The text is read, even in PDF and Word files."], ["Splitting", "The text is cut into short passages."], ["Indexing", "Each passage is indexed to be found by meaning, not only by words."], ["Answer", "For each question, the most useful passages are given to the AI."]],
      useTitle: "How to use it",
      use: ["Create a base and give it a clear name (e.g. \"2026 catalogue\").", "Add your documents; follow each file's status (processing, ready, error).", "Try the search right on the page to see the passages found.", "In the chat, pick the base when you write: the answer relies on your documents.", "Or attach it to an agent: it checks it for every reply."],
      formats: "Accepted formats: PDF, Word, Excel, CSV, PowerPoint, text, Markdown, HTML, JSON, code files, images, audio (MP3, WAV), video (MP4, MOV) and ZIP — up to 25 MB depending on the type.",
      privacy: "Your files stay private: only you can read them, and document content is treated as information to consult, never as orders given to the AI.",
      cost: "Preparing documents is billed in credits at its real cost; deleting a source removes it from the base at once.",
    },
    where: {
      title: "Where to use them",
      intro: "Today, agents and knowledge bases are used inside TechNova.",
      cols: ["AI agents", "Knowledge bases"],
      rows: [["In the TechNova chat", true, true], ["Attached to an agent", true, true], ["From the public API (another app)", false, false], ["Download / export", false, false]],
      yes: "Available", no: "Not yet",
      later: ["To reuse an agent elsewhere today, copy its instructions into the other tool; your original files remain yours.", "The public API already gives access to every text model: you can send your agent's instructions there as a system message."],
    },
  },
  es: {
    agents: {
      title: "Agentes de IA",
      intro: ["Un agente de IA es un asistente que configuras una vez para una tarea concreta: atención al cliente, redacción, vigilancia, soporte técnico… Conserva su rol, su tono y sus reglas de una conversación a otra, sin que tengas que explicarlo todo en cada mensaje.", "Lo creas en el panel, sección Agentes de IA, y luego conversas con él en el chat de TechNova."],
      anatomyTitle: "De qué está hecho un agente",
      parts: [["Instrucciones", "Su rol, su tono y sus reglas (hasta 8.000 caracteres)."], ["Memoria", "Lo que siempre debe tener presente: tu empresa, tus ofertas, tus contactos."], ["Modelo", "TechNova Smart (el más económico adecuado) o un modelo concreto del catálogo."], ["Presupuesto", "Un tope de créditos por respuesta: el agente nunca gasta más."], ["Herramientas", "Búsqueda web, lectura de una página… desactivadas hasta que las marques."], ["Conocimiento", "Tus bases de documentos, para responder con tus propias fuentes."]],
      flowTitle: "Qué pasa cuando le escribes",
      flow: ["Tu mensaje", "Instrucciones + memoria del agente", "Herramientas permitidas y pasajes de tu conocimiento", "El modelo redacta", "Respuesta, dentro del presupuesto"],
      useTitle: "Cómo usarlo",
      use: ["Crea el agente: nombre, descripción, instrucciones, memoria.", "Elige el modelo y el presupuesto por respuesta.", "Marca las herramientas útiles y adjunta tus bases de conocimiento.", "Pulsa «Conversar»: la conversación se abre en el chat con este agente.", "Modifícalo cuando quieras: cada cambio crea una nueva versión."],
      tools: { title: "Las herramientas", on: ["Búsqueda web", "Leer una página web", "Leer archivos", "Leer una base de datos"], soon: [], note: "Leer archivos: el agente lee los archivos que ya añadiste (en el chat o en tu conocimiento) — los que nombras en el mensaje, si no los más recientes. Leer una base de datos: consulta, en solo lectura, el proyecto Supabase conectado en tus Ajustes (pack Pro) — la lista de tablas y columnas, y hasta 20 filas de las tablas que nombras. Nunca modifica nada.", locked: ["Ejecutar código", "Escribir en base de datos", "Enviar correos", "Pagos"], onLabel: "Activas", soonLabel: "Aún no activas", lockedLabel: "Bloqueadas por seguridad" },
      plans: "Los agentes se incluyen desde el pack Creator; el presupuesto por respuesta se ajusta libremente con el pack Pro (20 créditos por defecto si no).",
    },
    knowledge: {
      title: "Bases de conocimiento",
      intro: ["Una base de conocimiento reúne tus documentos (catálogo, procedimientos, contratos, cursos, FAQ…) para que la IA responda con tu información en lugar de sus conocimientos generales.", "La creas en la sección Conocimiento, añades tus archivos y TechNova los prepara para la búsqueda."],
      pipeTitle: "Qué hace TechNova con tus archivos",
      pipe: [["Subida", "Añades tus archivos a un almacenamiento privado."], ["Verificación", "Formato, tamaño y análisis de seguridad."], ["Extracción", "Se lee el texto, incluso en PDF y Word."], ["Segmentación", "El texto se corta en pasajes cortos."], ["Indexación", "Cada pasaje se indexa para encontrarlo por su sentido, no solo por las palabras."], ["Respuesta", "En cada pregunta, se dan a la IA los pasajes más útiles."]],
      useTitle: "Cómo usarla",
      use: ["Crea una base y dale un nombre claro (ej. «Catálogo 2026»).", "Añade tus documentos; sigue el estado de cada archivo (en curso, listo, error).", "Prueba la búsqueda en la misma página para ver los pasajes encontrados.", "En el chat, elige la base al escribir: la respuesta se apoya en tus documentos.", "O adjúntala a un agente: la consultará en cada respuesta."],
      formats: "Formatos aceptados: PDF, Word, Excel, CSV, PowerPoint, texto, Markdown, HTML, JSON, archivos de código, imágenes, audio (MP3, WAV), vídeo (MP4, MOV) y ZIP — hasta 25 MB según el tipo.",
      privacy: "Tus archivos son privados: solo tú puedes leerlos, y el contenido de los documentos se trata como información que consultar, nunca como órdenes para la IA.",
      cost: "La preparación de documentos se factura en créditos a su coste real; eliminar una fuente la retira de la base al instante.",
    },
    where: {
      title: "Dónde usarlos",
      intro: "Hoy, los agentes y las bases de conocimiento se usan dentro de TechNova.",
      cols: ["Agentes de IA", "Bases de conocimiento"],
      rows: [["En el chat de TechNova", true, true], ["Adjuntas a un agente", true, true], ["Desde la API pública (otra aplicación)", false, false], ["Descarga / exportación", false, false]],
      yes: "Disponible", no: "Aún no",
      later: ["Para reutilizar un agente en otro lugar hoy, copia sus instrucciones en la otra herramienta; tus archivos originales siguen siendo tuyos.", "La API pública ya da acceso a todos los modelos de texto: puedes enviar ahí las instrucciones de tu agente como mensaje de sistema."],
    },
  },
  pt: {
    agents: {
      title: "Agentes de IA",
      intro: ["Um agente de IA é um assistente que você configura uma vez para uma tarefa específica: atendimento, redação, pesquisa, suporte técnico… Ele mantém seu papel, seu tom e suas regras de uma conversa para outra, sem que você precise explicar tudo a cada mensagem.", "Você o cria no painel, seção Agentes de IA, e depois conversa com ele no chat do TechNova."],
      anatomyTitle: "Do que um agente é feito",
      parts: [["Instruções", "Seu papel, seu tom e suas regras (até 8.000 caracteres)."], ["Memória", "O que ele deve sempre ter em mente: sua empresa, suas ofertas, seus contatos."], ["Modelo", "TechNova Smart (o mais barato adequado) ou um modelo específico do catálogo."], ["Orçamento", "Um teto de créditos por resposta: o agente nunca gasta mais."], ["Ferramentas", "Pesquisa na web, leitura de uma página… desativadas até você marcá-las."], ["Conhecimento", "Suas bases de documentos, para responder com suas próprias fontes."]],
      flowTitle: "O que acontece quando você escreve para ele",
      flow: ["Sua mensagem", "Instruções + memória do agente", "Ferramentas permitidas e trechos do seu conhecimento", "O modelo redige", "Resposta, dentro do orçamento"],
      useTitle: "Como usar",
      use: ["Crie o agente: nome, descrição, instruções, memória.", "Escolha o modelo e o orçamento por resposta.", "Marque as ferramentas úteis e anexe suas bases de conhecimento.", "Clique em «Conversar»: a conversa abre no chat com este agente.", "Edite quando quiser: cada alteração cria uma nova versão."],
      tools: { title: "As ferramentas", on: ["Pesquisa na web", "Ler uma página web", "Ler arquivos", "Ler um banco de dados"], soon: [], note: "Ler arquivos: o agente lê os arquivos que você já enviou (no chat ou no seu conhecimento) — os que você cita na mensagem, senão os mais recentes. Ler um banco de dados: ele consulta, somente leitura, o projeto Supabase conectado nas suas Configurações (pacote Pro) — a lista de tabelas e colunas, e até 20 linhas das tabelas que você cita. Ele nunca altera nada.", locked: ["Executar código", "Gravar no banco", "Enviar e-mails", "Pagamentos"], onLabel: "Ativas", soonLabel: "Ainda não ativas", lockedLabel: "Bloqueadas por segurança" },
      plans: "Os agentes vêm a partir do pacote Creator; o orçamento por resposta é livre com o pacote Pro (20 créditos por padrão caso contrário).",
    },
    knowledge: {
      title: "Bases de conhecimento",
      intro: ["Uma base de conhecimento reúne seus documentos (catálogo, procedimentos, contratos, cursos, FAQ…) para que a IA responda com suas informações em vez do conhecimento geral dela.", "Você a cria na seção Conhecimento, envia seus arquivos e o TechNova os prepara para a busca."],
      pipeTitle: "O que o TechNova faz com seus arquivos",
      pipe: [["Envio", "Você envia seus arquivos para um armazenamento privado."], ["Verificação", "Formato, tamanho e análise de segurança."], ["Extração", "O texto é lido, mesmo em PDF e Word."], ["Divisão", "O texto é cortado em trechos curtos."], ["Indexação", "Cada trecho é indexado para ser encontrado pelo sentido, não só pelas palavras."], ["Resposta", "A cada pergunta, os trechos mais úteis são dados à IA."]],
      useTitle: "Como usar",
      use: ["Crie uma base e dê um nome claro (ex. «Catálogo 2026»).", "Envie seus documentos; acompanhe o estado de cada arquivo (em andamento, pronto, erro).", "Teste a busca na própria página para ver os trechos encontrados.", "No chat, escolha a base ao escrever: a resposta se apoia nos seus documentos.", "Ou anexe-a a um agente: ele a consulta a cada resposta."],
      formats: "Formatos aceitos: PDF, Word, Excel, CSV, PowerPoint, texto, Markdown, HTML, JSON, arquivos de código, imagens, áudio (MP3, WAV), vídeo (MP4, MOV) e ZIP — até 25 MB conforme o tipo.",
      privacy: "Seus arquivos ficam privados: só você pode lê-los, e o conteúdo dos documentos é tratado como informação a consultar, nunca como ordens dadas à IA.",
      cost: "A preparação dos documentos é cobrada em créditos pelo custo real; excluir uma fonte a retira da base na hora.",
    },
    where: {
      title: "Onde usar",
      intro: "Hoje, agentes e bases de conhecimento são usados dentro do TechNova.",
      cols: ["Agentes de IA", "Bases de conhecimento"],
      rows: [["No chat do TechNova", true, true], ["Anexadas a um agente", true, true], ["Pela API pública (outro aplicativo)", false, false], ["Download / exportação", false, false]],
      yes: "Disponível", no: "Ainda não",
      later: ["Para reutilizar um agente em outro lugar hoje, copie as instruções dele para a outra ferramenta; seus arquivos originais continuam seus.", "A API pública já dá acesso a todos os modelos de texto: você pode enviar as instruções do seu agente como mensagem de sistema."],
    },
  },
};

const sub = "mt-6 font-display text-lg font-semibold";
const p = "mt-3 leading-relaxed text-muted-foreground";

/** Illustration: the six parts around the agent. */
function AgentAnatomy({ parts }: { parts: [string, string][] }) {
  const icons = [FileText, Brain, Sparkles, Coins, Globe, Layers];
  return <div className="relative mt-4 overflow-hidden rounded-[22px] border border-border bg-secondary/40 p-4 sm:p-6" aria-hidden="false">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_50%_at_50%_50%,color-mix(in_oklab,var(--iris-2)_22%,transparent),transparent)]" />
    <div className="relative grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
      <div className="grid gap-3">{parts.slice(0, 3).map(([t, d], i) => { const I = icons[i]!; return <div key={t} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary"><I className="size-4" /></span><div><p className="text-sm font-semibold">{t}</p><p className="text-xs leading-relaxed text-muted-foreground">{d}</p></div></div>; })}</div>
      <div className="mx-auto my-2 grid size-28 place-items-center rounded-full bg-ink text-ink-foreground shadow-lift md:my-0"><div className="text-center"><Bot className="mx-auto size-8" /><p className="mt-1 text-xs font-semibold">Agent</p></div></div>
      <div className="grid gap-3">{parts.slice(3).map(([t, d], i) => { const I = icons[i + 3]!; return <div key={t} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary"><I className="size-4" /></span><div><p className="text-sm font-semibold">{t}</p><p className="text-xs leading-relaxed text-muted-foreground">{d}</p></div></div>; })}</div>
    </div>
  </div>;
}

/** Illustration: a left-to-right (top-to-bottom on phones) flow of numbered steps. */
function Flow({ steps, icons }: { steps: string[]; icons: typeof MessageCircle[] }) {
  return <ol className="mt-4 grid gap-2 md:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ ["--n" as string]: steps.length }}>
    {steps.map((s, i) => { const I = icons[i] ?? Check; return <li key={s} className="relative flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm md:flex-col md:items-start md:text-left">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-ink-foreground"><I className="size-4" /></span>
      <span className="text-sm"><span className="mr-1 font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>{s}</span>
      {i < steps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-background text-muted-foreground md:block" />}
    </li>; })}
  </ol>;
}

function Steps({ items }: { items: string[] }) {
  return <ol className="mt-3 space-y-2">{items.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-ink-foreground">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>;
}

export function featureGuideBlocks(lang: SiteLang): { id: string; title: string; body: ReactNode }[] {
  const g = guide[lang];
  const a = g.agents, k = g.knowledge, w = g.where;
  const chip = "rounded-full border px-2.5 py-1 text-xs";
  return [
    { id: "agents", title: a.title, body: <>
      {a.intro.map((x) => <p key={x} className={p}>{x}</p>)}
      <h3 className={sub}>{a.anatomyTitle}</h3>
      <AgentAnatomy parts={a.parts} />
      <h3 className={sub}>{a.flowTitle}</h3>
      <Flow steps={a.flow} icons={[MessageCircle, Bot, Search, Sparkles, ShieldCheck]} />
      <h3 className={sub}>{a.useTitle}</h3>
      <Steps items={a.use} />
      <h3 className={sub}>{a.tools.title}</h3>
      <div className="mt-3 space-y-2 text-sm">
        <p className="flex flex-wrap items-center gap-1.5"><span className="mr-1 font-medium">{a.tools.onLabel} :</span>{a.tools.on.map((x) => <span key={x} className={`${chip} border-supabase/40 bg-supabase/10`}><Check className="mr-1 inline size-3" />{x}</span>)}</p>
        {a.tools.soon.length > 0 && <p className="flex flex-wrap items-center gap-1.5"><span className="mr-1 font-medium">{a.tools.soonLabel} :</span>{a.tools.soon.map((x) => <span key={x} className={`${chip} border-border text-muted-foreground`}><Clock3 className="mr-1 inline size-3" />{x}</span>)}</p>}
        <p className="flex flex-wrap items-center gap-1.5"><span className="mr-1 font-medium">{a.tools.lockedLabel} :</span>{a.tools.locked.map((x) => <span key={x} className={`${chip} border-border text-muted-foreground`}><Lock className="mr-1 inline size-3" />{x}</span>)}</p>
      </div>
      <p className={`${p} text-sm`}>{a.tools.note}</p>
      <p className={`${p} text-sm`}>{a.plans}</p>
    </> },
    { id: "connaissances", title: k.title, body: <>
      {k.intro.map((x) => <p key={x} className={p}>{x}</p>)}
      <h3 className={sub}>{k.pipeTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{k.pipe.map(([t, d], i) => { const I = [Upload, ShieldCheck, FileSearch, Scissors, Layers, MessageCircle][i]!; return <div key={t} className="relative rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-ink text-ink-foreground"><I className="size-4" /></span><p className="font-semibold"><span className="mr-1.5 font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>{t}</p></div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d}</p>
      </div>; })}</div>
      <h3 className={sub}>{k.useTitle}</h3>
      <Steps items={k.use} />
      <ul className="mt-4 space-y-2 text-sm">{[k.formats, k.privacy, k.cost].map((x) => <li key={x} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-iris" /><span>{x}</span></li>)}</ul>
    </> },
    { id: "hors-technova", title: w.title, body: <>
      <p className={p}>{w.intro}</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2 pr-3 font-medium" />{w.cols.map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}</tr></thead>
        <tbody>{w.rows.map(([label, ag, kb]) => <tr key={label} className="border-t border-border">
          <td className="py-3 pr-3">{label}</td>
          {[ag, kb].map((ok, i) => <td key={i} className="px-3 py-3">{ok ? <span className="inline-flex items-center gap-1.5 rounded-full bg-supabase/10 px-2.5 py-1 text-xs font-medium text-supabase"><Check className="size-3.5" />{w.yes}</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"><X className="size-3.5" />{w.no}</span>}</td>)}
        </tr>)}</tbody>
      </table></div>
      <ul className="mt-4 space-y-2 text-sm">{w.later.map((x) => <li key={x} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-iris" /><span>{x}</span></li>)}</ul>
    </> },
  ];
}
