import type { ReactNode } from "react";
import { AudioLines, Bell, Brain, Clock, Coins, FileCheck2, Globe, KeyRound, Link2, Lock, PenLine, RefreshCw, Scale, ShieldCheck, Upload, Wand2, Zap } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";
import { chatTierCredits } from "@/lib/chat-modes";
import { FLAGSHIP_MODELS } from "@/lib/flagship-models";
import { ModelLogo } from "@/components/dashboard/ModelLogo";
import { WEB_SEARCH_FEE } from "@/lib/fresh-info";
import {
  AUDIO_CHUNK_MINUTES, AUDIO_CREDITS_PER_MINUTE, AUDIO_MAX_MINUTES, AUDIO_MIN_CREDITS,
  audioSummaryTypes, humanizeCredits, humanizeFormats, humanizeLengths, humanizeTones,
} from "@/lib/text-tools";

// Feature guides, part 4: the chat modes and flagship models, news questions (date + web search, backup engines),
// the "Humaniser un texte" and "Résumé d'un audio" journeys, and security & data protection. Written from what the
// product does today (chat-modes.ts, flagship-models.ts, fresh-info.ts, text-tools.ts, files.server.ts, the
// privacy policy). Prices come from the code itself. The dashboard speaks French or English, so the option labels
// shown here are French for French readers and English otherwise, as on screen.

const e1 = chatTierCredits("eclair", false, 1), e1f = chatTierCredits("eclair", true, 1);
const b1 = chatTierCredits("equilibre", false, 1), b1f = chatTierCredits("equilibre", true, 1);
const x2 = chatTierCredits("expert", false, 2), x3 = chatTierCredits("expert", false, 3);
const h1 = humanizeCredits(1), h2 = humanizeCredits(1501);
const newsEclair = e1 + WEB_SEARCH_FEE;

type Guide4 = {
  modes: { title: string; intro: string; list: [string, string][]; smart: string; flagTitle: string; flag: string[]; costLabel: string };
  news: { title: string; intro: string[]; how: string[]; price: string; busyTitle: string; busy: string };
  humanize: { title: string; intro: string; steps: string[]; optsTitle: string; opts: [string, string][]; price: string; note: string };
  audio: { title: string; intro: string; steps: string[]; typesTitle: string; price: string; privacy: string };
  security: { title: string; intro: string; items: [string, string][]; breach: string };
};

const g4: Record<SiteLang, Guide4> = {
  fr: {
    modes: {
      title: "Le chat : modes et modèles phares",
      intro: "Dans le chat, vous choisissez un mode plutôt qu'un modèle. TechNova sélectionne le moteur adapté côté serveur, et chaque message coûte un prix fixe et connu d'avance.",
      list: [["Éclair", `Réponses rapides du quotidien : ${e1} crédit par message (${e1f} avec un fichier). C'est le mode par défaut.`], ["Équilibré", `Code, analyse, documents, textes longs : ${b1} crédits (${b1f} avec un fichier).`], ["Expert", `Travaux techniques lourds, réflexion plus profonde : ${x2} crédits avec Creator, ${x3} avec Pro (moteur plus puissant).`]],
      smart: "TechNova Smart choisit le mode pour chaque message : Éclair par défaut, Équilibré pour le code, l'analyse, les fichiers ou les longs messages, Expert seulement pour un vrai travail technique lourd. Si une réponse coûte réellement plus que le prix du mode, c'est le coût réel qui est facturé.",
      flagTitle: "Modèles phares (Creator et Pro)",
      flag: ["Avec les forfaits Creator et Pro, une section « Modèles phares » apparaît sous les modes : vous pouvez choisir un grand modèle nommé pour vos messages.", "Chaque message est facturé à son coût réel. Le nombre de points indique le coût relatif (● économique, ●●● le plus cher)."],
      costLabel: "Coût",
    },
    news: {
      title: "Questions d'actualité",
      intro: ["Les modèles d'IA n'apprennent le monde que jusqu'à une certaine date. TechNova leur donne donc la date du jour à chaque message, et leur demande de ne jamais présenter une information ancienne comme actuelle.", "Quand votre question porte clairement sur l'actualité (« aujourd'hui », « actualité », un match, une élection, le pape, un prix du jour, une année récente…), une recherche web est faite automatiquement avant la réponse."],
      how: ["Posez votre question normalement dans le chat, sans rien activer.", "La réponse s'appuie sur des sources récentes et donne les dates.", "Les sources consultées sont listées sous la réponse, avec leurs liens.", "Pour une enquête plus poussée sur un sujet, utilisez « Recherche approfondie »."],
      price: `Une question d'actualité coûte le prix du mode + ${WEB_SEARCH_FEE} crédits pour la recherche web, soit ${newsEclair} crédits en Éclair. Les mots du quotidien (« dernier », « résultat », « info »…) ne déclenchent pas de recherche : une question ordinaire garde son prix normal, et une question de code n'en déclenche jamais.`,
      busyTitle: "Quand le service est très sollicité",
      busy: "Si le moteur habituel est saturé, votre message est envoyé aussitôt à un moteur de secours d'un autre fournisseur, sans rien vous demander. Si tous sont saturés, un message vous invite à renvoyer dans quelques secondes, et aucun crédit n'est prélevé.",
    },
    humanize: {
      title: "Humaniser un texte",
      intro: "Le bouton « Humaniser un texte », sous la zone de message du chat, réécrit un texte généré par une IA pour qu'il sonne naturel, dans le ton et le format de votre choix, sans changer les faits ni la langue.",
      steps: ["Cliquez sur « Humaniser un texte » sous la zone de message.", "Collez le texte à réécrire.", "Choisissez le ton, le format et la longueur ; précisez le lecteur si vous le souhaitez (ex. « des parents d'élèves »).", "Cliquez sur « Humaniser » : le résultat arrive dans une nouvelle conversation, prêt à être copié ou téléchargé (Word, PDF…)."],
      optsTitle: "Les options",
      opts: [["Ton", humanizeTones.map((o) => o.fr).join(", ")], ["Format", humanizeFormats.map((o) => o.fr).join(", ")], ["Longueur", humanizeLengths.map((o) => o.fr).join(", ")]],
      price: `${h1} crédits jusqu'à 1 500 mots, ${h2} crédits au-delà (le coût réel s'il est plus élevé). Le prix est affiché avant de valider.`,
      note: "Les chiffres, les noms et les sources du texte d'origine sont conservés : l'outil change la façon de dire, pas ce qui est dit.",
    },
    audio: {
      title: "Résumé d'un audio",
      intro: "Le bouton « Résumé d'un audio », sous la zone de message du chat, transforme l'enregistrement d'une réunion, d'un cours ou d'un entretien en compte rendu prêt à partager.",
      steps: ["Cliquez sur « Résumé d'un audio » et déposez votre fichier : tous les formats que votre navigateur sait lire sont acceptés (MP3, M4A, WAV, OGG, OPUS, AAC, WEBM, la piste audio d'une vidéo MP4…).", `Votre navigateur prépare l'audio (version légère, par morceaux de ${AUDIO_CHUNK_MINUTES} minutes) avant l'envoi : même un long enregistrement part vite.`, "Choisissez le type de résumé, le niveau de détail, la langue du résultat et, si vous voulez, un contexte (sujet, noms des participants).", "Suivez l'avancement en direct ; le résultat arrive dans le chat et se télécharge en Word, PDF, Markdown…"],
      typesTitle: "Types de résumé",
      price: `${AUDIO_CREDITS_PER_MINUTE} crédits par minute d'audio commencée, ${AUDIO_MIN_CREDITS} crédits minimum, jusqu'à ${AUDIO_MAX_MINUTES / 60} heures par fichier. Si rien n'a pu être compris dans l'audio, les crédits ne sont pas prélevés.`,
      privacy: "Les morceaux audio sont supprimés de nos serveurs dès que le résumé est terminé, qu'il ait réussi ou non. Seul le texte du résumé reste dans votre conversation.",
    },
    security: {
      title: "Sécurité et protection des données",
      intro: "Ce que TechNova fait concrètement pour protéger votre compte, vos documents et vos conversations.",
      items: [
        ["Pas d'entraînement sur vos données", "Chaque demande envoyée aux modèles exige des fournisseurs qui ne stockent pas vos contenus et ne s'en servent pas pour entraîner leurs modèles ; les autres ne reçoivent rien."],
        ["Comptes cloisonnés", "Chaque compte ne voit que ses propres conversations, fichiers, agents et bases de connaissances : la règle est appliquée par la base de données elle-même."],
        ["Clés et jetons protégés", "Les clés API sont hachées et montrées une seule fois ; les jetons des services connectés (GitHub, Notion, Supabase…) sont chiffrés et lus uniquement par le serveur. Une clé API ne sert qu'à l'API de chat et ne dépense que les crédits de son compte."],
        ["Fichiers contrôlés", "Chaque fichier importé est vérifié avant d'être lu : vrai type de fichier, archives piégées (bombes zip, chemins détournés), macros Office signalées. Les fichiers refusés sont supprimés aussitôt."],
        ["Documents traités comme des données", "Le contenu de vos documents, des pages web et de votre base de données est donné aux modèles entre des balises, comme une information à consulter : les instructions qu'il contiendrait ne sont jamais suivies."],
        ["Sites publiés isolés", "Les sites créés avec le Studio s'affichent dans un cadre isolé, sans accès à votre compte ; ils sont analysés avant publication (secrets oubliés, hameçonnage)."],
        ["Limites et journal de sécurité", "Des limites d'usage freinent les abus sur le moment ; un journal de sécurité garde la trace des actions refusées et sensibles pour repérer les abus qui se répètent."],
        ["Connexion", "Erreurs de connexion volontairement neutres, pause après cinq échecs, mots de passe d'au moins 8 caractères avec lettres et chiffres, déconnexion après 7 jours sans activité."],
      ],
      breach: "En cas de violation de données, l'autorité compétente (APDP au Bénin, ou l'autorité du pays pour l'Union européenne) est prévenue dans les 72 heures, et les personnes concernées sont prévenues par e-mail lorsque le risque est élevé. Chaque incident est consigné dans un registre. Le détail figure dans notre politique de confidentialité.",
    },
  },
  en: {
    modes: {
      title: "The chat: modes and flagship models",
      intro: "In the chat you pick a mode rather than a model. TechNova selects the right engine on the server, and each message has a fixed price known in advance.",
      list: [["Flash (Éclair)", `Quick everyday answers: ${e1} credit per message (${e1f} with a file). This is the default.`], ["Balanced (Équilibré)", `Code, analysis, documents, long texts: ${b1} credits (${b1f} with a file).`], ["Expert", `Heavy technical work, deeper thinking: ${x2} credits with Creator, ${x3} with Pro (stronger engine).`]],
      smart: "TechNova Smart picks the mode for each message: Flash by default, Balanced for code, analysis, files or long messages, Expert only for genuinely heavy technical work. If an answer really costs more than the mode's price, the real cost is billed.",
      flagTitle: "Flagship models (Creator and Pro)",
      flag: ["With the Creator and Pro plans, a \"Flagship models\" section appears under the modes: you can choose a named top model for your messages.", "Each message is billed at its real cost. The dots show the relative cost (● affordable, ●●● most expensive)."],
      costLabel: "Cost",
    },
    news: {
      title: "News questions",
      intro: ["AI models only know the world up to a certain date. TechNova therefore gives them today's date with every message and asks them never to present old information as current.", "When your question is clearly about current events (\"today\", \"news\", a match, an election, the pope, today's price, a recent year…), a web search runs automatically before the answer."],
      how: ["Ask your question normally in the chat, nothing to switch on.", "The answer relies on recent sources and gives dates.", "The sources used are listed under the answer, with their links.", "For a deeper investigation of a topic, use \"Deep research\"."],
      price: `A news question costs the mode's price + ${WEB_SEARCH_FEE} credits for the web search, so ${newsEclair} credits in Flash. Everyday words ("last", "result", "info"…) do not trigger a search: an ordinary question keeps its normal price, and a code question never triggers one.`,
      busyTitle: "When the service is very busy",
      busy: "If the usual engine is saturated, your message is sent at once to a backup engine from another provider, without asking you anything. If all of them are saturated, a message asks you to resend in a few seconds, and no credit is charged.",
    },
    humanize: {
      title: "Humanize a text",
      intro: "The \"Humanize a text\" button under the chat box rewrites AI-generated text so it sounds natural, in the tone and format you choose, without changing the facts or the language.",
      steps: ["Click \"Humanize a text\" under the message box.", "Paste the text to rewrite.", "Choose the tone, format and length; name the reader if you wish (e.g. \"students' parents\").", "Click \"Humanize\": the result arrives in a new conversation, ready to copy or download (Word, PDF…)."],
      optsTitle: "Options",
      opts: [["Tone", humanizeTones.map((o) => o.en).join(", ")], ["Format", humanizeFormats.map((o) => o.en).join(", ")], ["Length", humanizeLengths.map((o) => o.en).join(", ")]],
      price: `${h1} credits up to 1,500 words, ${h2} credits above (the real cost if higher). The price is shown before you confirm.`,
      note: "Figures, names and sources of the original text are kept: the tool changes how things are said, not what is said.",
    },
    audio: {
      title: "Audio summary",
      intro: "The \"Summarize an audio\" button under the chat box turns a recording of a meeting, a lecture or an interview into minutes ready to share.",
      steps: ["Click \"Summarize an audio\" and drop your file: every format your browser can play is accepted (MP3, M4A, WAV, OGG, OPUS, AAC, WEBM, the audio track of an MP4 video…).", `Your browser prepares the audio (a light version, in ${AUDIO_CHUNK_MINUTES}-minute pieces) before sending it: even a long recording uploads fast.`, "Choose the summary type, the level of detail, the output language and, if you like, some context (topic, participants' names).", "Follow the progress live; the result arrives in the chat and downloads as Word, PDF, Markdown…"],
      typesTitle: "Summary types",
      price: `${AUDIO_CREDITS_PER_MINUTE} credits per started minute of audio, ${AUDIO_MIN_CREDITS} credits minimum, up to ${AUDIO_MAX_MINUTES / 60} hours per file. If nothing could be understood in the audio, no credit is charged.`,
      privacy: "The audio pieces are deleted from our servers as soon as the summary is finished, whether it succeeded or not. Only the summary text stays in your conversation.",
    },
    security: {
      title: "Security and data protection",
      intro: "What TechNova actually does to protect your account, your documents and your conversations.",
      items: [
        ["No training on your data", "Every request sent to the models requires providers that neither store your content nor use it to train their models; the others receive nothing."],
        ["Separated accounts", "Each account only sees its own conversations, files, agents and knowledge bases: the rule is enforced by the database itself."],
        ["Protected keys and tokens", "API keys are hashed and shown once; tokens of connected services (GitHub, Notion, Supabase…) are encrypted and read only by the server. An API key only works with the chat API and only spends its own account's credits."],
        ["Checked files", "Every imported file is checked before it is read: real file type, booby-trapped archives (zip bombs, path tricks), Office macros flagged. Refused files are deleted at once."],
        ["Documents treated as data", "The content of your documents, of web pages and of your database is given to the models between markers, as information to consult: any instructions inside it are never followed."],
        ["Isolated published sites", "Sites built with the Studio run in an isolated frame with no access to your account; they are scanned before publishing (forgotten secrets, phishing)."],
        ["Limits and security log", "Usage limits slow down abuse on the spot; a security log keeps track of refused and sensitive actions to spot repeated abuse."],
        ["Sign-in", "Deliberately neutral sign-in errors, a pause after five failures, passwords of at least 8 characters with letters and digits, sign-out after 7 days without activity."],
      ],
      breach: "In case of a data breach, the competent authority (APDP in Benin, or the national authority for the European Union) is informed within 72 hours, and the people concerned are informed by e-mail when the risk is high. Every incident is recorded in a register. Details are in our privacy policy.",
    },
  },
  es: {
    modes: {
      title: "El chat: modos y modelos insignia",
      intro: "En el chat eliges un modo en lugar de un modelo. TechNova selecciona el motor adecuado en el servidor y cada mensaje tiene un precio fijo conocido de antemano.",
      list: [["Flash (Éclair)", `Respuestas rápidas del día a día: ${e1} crédito por mensaje (${e1f} con un archivo). Es el modo por defecto.`], ["Equilibrado (Équilibré)", `Código, análisis, documentos, textos largos: ${b1} créditos (${b1f} con un archivo).`], ["Expert", `Trabajos técnicos pesados, reflexión más profunda: ${x2} créditos con Creator, ${x3} con Pro (motor más potente).`]],
      smart: "TechNova Smart elige el modo para cada mensaje: Flash por defecto, Equilibrado para código, análisis, archivos o mensajes largos, Expert solo para un trabajo técnico realmente pesado. Si una respuesta cuesta de verdad más que el precio del modo, se factura el coste real.",
      flagTitle: "Modelos insignia (Creator y Pro)",
      flag: ["Con los planes Creator y Pro aparece una sección «Modelos insignia» bajo los modos: puedes elegir un gran modelo con nombre para tus mensajes.", "Cada mensaje se factura a su coste real. Los puntos indican el coste relativo (● económico, ●●● el más caro)."],
      costLabel: "Coste",
    },
    news: {
      title: "Preguntas de actualidad",
      intro: ["Los modelos de IA solo conocen el mundo hasta una fecha determinada. Por eso TechNova les da la fecha del día en cada mensaje y les pide no presentar nunca una información antigua como actual.", "Cuando tu pregunta trata claramente de la actualidad («hoy», «noticias», un partido, unas elecciones, el papa, un precio del día, un año reciente…), se hace automáticamente una búsqueda web antes de responder."],
      how: ["Haz tu pregunta normalmente en el chat, sin activar nada.", "La respuesta se basa en fuentes recientes e indica las fechas.", "Las fuentes consultadas aparecen bajo la respuesta, con sus enlaces.", "Para una investigación más a fondo, usa «Investigación profunda»."],
      price: `Una pregunta de actualidad cuesta el precio del modo + ${WEB_SEARCH_FEE} créditos por la búsqueda web, es decir ${newsEclair} créditos en Flash. Las palabras cotidianas («último», «resultado», «info»…) no activan la búsqueda: una pregunta normal mantiene su precio, y una pregunta de código nunca la activa.`,
      busyTitle: "Cuando el servicio está muy solicitado",
      busy: "Si el motor habitual está saturado, tu mensaje se envía en el acto a un motor de respaldo de otro proveedor, sin pedirte nada. Si todos están saturados, un mensaje te invita a reenviar en unos segundos y no se cobra ningún crédito.",
    },
    humanize: {
      title: "Humanizar un texto",
      intro: "El botón «Humanizar un texto», bajo la zona de mensaje del chat, reescribe un texto generado por IA para que suene natural, con el tono y el formato que elijas, sin cambiar los hechos ni el idioma.",
      steps: ["Haz clic en «Humanizar un texto» bajo la zona de mensaje.", "Pega el texto que quieres reescribir.", "Elige el tono, el formato y la longitud; indica el lector si quieres (p. ej. «padres de alumnos»).", "Haz clic en «Humanizar»: el resultado llega en una nueva conversación, listo para copiar o descargar (Word, PDF…)."],
      optsTitle: "Opciones (tal como aparecen en el panel)",
      opts: [["Tono", humanizeTones.map((o) => o.en).join(", ")], ["Formato", humanizeFormats.map((o) => o.en).join(", ")], ["Longitud", humanizeLengths.map((o) => o.en).join(", ")]],
      price: `${h1} créditos hasta 1.500 palabras, ${h2} créditos por encima (el coste real si es mayor). El precio se muestra antes de confirmar.`,
      note: "Se conservan las cifras, los nombres y las fuentes del texto original: la herramienta cambia la forma de decir, no lo que se dice.",
    },
    audio: {
      title: "Resumen de un audio",
      intro: "El botón «Resumen de un audio», bajo la zona de mensaje del chat, convierte la grabación de una reunión, una clase o una entrevista en un acta lista para compartir.",
      steps: ["Haz clic en «Resumen de un audio» y suelta tu archivo: se aceptan todos los formatos que tu navegador puede leer (MP3, M4A, WAV, OGG, OPUS, AAC, WEBM, la pista de audio de un vídeo MP4…).", `Tu navegador prepara el audio (versión ligera, en trozos de ${AUDIO_CHUNK_MINUTES} minutos) antes del envío: incluso una grabación larga se sube rápido.`, "Elige el tipo de resumen, el nivel de detalle, el idioma del resultado y, si quieres, un contexto (tema, nombres de los participantes).", "Sigue el avance en directo; el resultado llega al chat y se descarga en Word, PDF, Markdown…"],
      typesTitle: "Tipos de resumen (tal como aparecen en el panel)",
      price: `${AUDIO_CREDITS_PER_MINUTE} créditos por minuto de audio empezado, ${AUDIO_MIN_CREDITS} créditos como mínimo, hasta ${AUDIO_MAX_MINUTES / 60} horas por archivo. Si no se pudo entender nada del audio, no se cobra ningún crédito.`,
      privacy: "Los trozos de audio se borran de nuestros servidores en cuanto termina el resumen, haya funcionado o no. Solo el texto del resumen queda en tu conversación.",
    },
    security: {
      title: "Seguridad y protección de datos",
      intro: "Lo que TechNova hace en concreto para proteger tu cuenta, tus documentos y tus conversaciones.",
      items: [
        ["Sin entrenamiento con tus datos", "Cada solicitud enviada a los modelos exige proveedores que no almacenan tus contenidos ni los usan para entrenar sus modelos; los demás no reciben nada."],
        ["Cuentas separadas", "Cada cuenta solo ve sus propias conversaciones, archivos, agentes y bases de conocimiento: la regla la aplica la propia base de datos."],
        ["Claves y tokens protegidos", "Las claves API se guardan con hash y se muestran una sola vez; los tokens de los servicios conectados (GitHub, Notion, Supabase…) están cifrados y solo los lee el servidor. Una clave API solo sirve para la API de chat y solo gasta los créditos de su cuenta."],
        ["Archivos controlados", "Cada archivo importado se verifica antes de leerlo: tipo real, archivos comprimidos trampa (bombas zip, rutas desviadas), macros de Office señaladas. Los archivos rechazados se borran en el acto."],
        ["Documentos tratados como datos", "El contenido de tus documentos, de las páginas web y de tu base de datos se entrega a los modelos entre marcadores, como información para consultar: nunca se siguen las instrucciones que contenga."],
        ["Sitios publicados aislados", "Los sitios creados con el Studio se muestran en un marco aislado, sin acceso a tu cuenta; se analizan antes de publicarse (secretos olvidados, phishing)."],
        ["Límites y registro de seguridad", "Los límites de uso frenan los abusos en el momento; un registro de seguridad guarda la huella de las acciones rechazadas y sensibles para detectar abusos repetidos."],
        ["Inicio de sesión", "Errores de conexión neutros a propósito, pausa tras cinco fallos, contraseñas de al menos 8 caracteres con letras y cifras, cierre de sesión tras 7 días sin actividad."],
      ],
      breach: "En caso de violación de datos, se avisa a la autoridad competente (APDP en Benín, o la autoridad del país en la Unión Europea) en un plazo de 72 horas, y a las personas afectadas por correo electrónico cuando el riesgo es alto. Cada incidente se anota en un registro. El detalle figura en nuestra política de privacidad.",
    },
  },
  pt: {
    modes: {
      title: "O chat: modos e modelos de destaque",
      intro: "No chat você escolhe um modo em vez de um modelo. A TechNova seleciona o motor adequado no servidor, e cada mensagem tem um preço fixo conhecido de antemão.",
      list: [["Flash (Éclair)", `Respostas rápidas do dia a dia: ${e1} crédito por mensagem (${e1f} com um arquivo). É o modo padrão.`], ["Equilibrado (Équilibré)", `Código, análise, documentos, textos longos: ${b1} créditos (${b1f} com um arquivo).`], ["Expert", `Trabalhos técnicos pesados, reflexão mais profunda: ${x2} créditos com Creator, ${x3} com Pro (motor mais potente).`]],
      smart: "O TechNova Smart escolhe o modo para cada mensagem: Flash por padrão, Equilibrado para código, análise, arquivos ou mensagens longas, Expert só para um trabalho técnico realmente pesado. Se uma resposta custar de fato mais que o preço do modo, é cobrado o custo real.",
      flagTitle: "Modelos de destaque (Creator e Pro)",
      flag: ["Com os pacotes Creator e Pro, uma seção «Modelos de destaque» aparece sob os modos: você pode escolher um grande modelo com nome para as suas mensagens.", "Cada mensagem é cobrada pelo custo real. Os pontos indicam o custo relativo (● econômico, ●●● o mais caro)."],
      costLabel: "Custo",
    },
    news: {
      title: "Perguntas de atualidade",
      intro: ["Os modelos de IA só conhecem o mundo até uma certa data. Por isso a TechNova lhes dá a data do dia em cada mensagem e pede que nunca apresentem uma informação antiga como atual.", "Quando a sua pergunta trata claramente da atualidade («hoje», «notícias», uma partida, uma eleição, o papa, um preço do dia, um ano recente…), uma pesquisa na web é feita automaticamente antes da resposta."],
      how: ["Faça a sua pergunta normalmente no chat, sem ativar nada.", "A resposta se apoia em fontes recentes e indica as datas.", "As fontes consultadas aparecem sob a resposta, com os seus links.", "Para uma investigação mais aprofundada, use «Pesquisa aprofundada»."],
      price: `Uma pergunta de atualidade custa o preço do modo + ${WEB_SEARCH_FEE} créditos pela pesquisa na web, ou seja ${newsEclair} créditos no Flash. Palavras do dia a dia («último», «resultado», «info»…) não disparam a pesquisa: uma pergunta comum mantém o preço normal, e uma pergunta de código nunca a dispara.`,
      busyTitle: "Quando o serviço está muito solicitado",
      busy: "Se o motor habitual estiver saturado, a sua mensagem é enviada na hora a um motor de reserva de outro fornecedor, sem lhe pedir nada. Se todos estiverem saturados, uma mensagem convida a reenviar em alguns segundos, e nenhum crédito é cobrado.",
    },
    humanize: {
      title: "Humanizar um texto",
      intro: "O botão «Humanizar um texto», sob a área de mensagem do chat, reescreve um texto gerado por IA para que soe natural, no tom e no formato que você escolher, sem mudar os fatos nem o idioma.",
      steps: ["Clique em «Humanizar um texto» sob a área de mensagem.", "Cole o texto a reescrever.", "Escolha o tom, o formato e o tamanho; indique o leitor se quiser (ex.: «pais de alunos»).", "Clique em «Humanizar»: o resultado chega numa nova conversa, pronto para copiar ou baixar (Word, PDF…)."],
      optsTitle: "Opções (como aparecem no painel)",
      opts: [["Tom", humanizeTones.map((o) => o.en).join(", ")], ["Formato", humanizeFormats.map((o) => o.en).join(", ")], ["Tamanho", humanizeLengths.map((o) => o.en).join(", ")]],
      price: `${h1} créditos até 1.500 palavras, ${h2} créditos acima disso (o custo real se for maior). O preço aparece antes de confirmar.`,
      note: "Os números, os nomes e as fontes do texto original são mantidos: a ferramenta muda a forma de dizer, não o que é dito.",
    },
    audio: {
      title: "Resumo de um áudio",
      intro: "O botão «Resumo de um áudio», sob a área de mensagem do chat, transforma a gravação de uma reunião, de uma aula ou de uma entrevista numa ata pronta para compartilhar.",
      steps: ["Clique em «Resumo de um áudio» e solte o seu arquivo: todos os formatos que o seu navegador sabe ler são aceitos (MP3, M4A, WAV, OGG, OPUS, AAC, WEBM, a faixa de áudio de um vídeo MP4…).", `O seu navegador prepara o áudio (versão leve, em pedaços de ${AUDIO_CHUNK_MINUTES} minutos) antes do envio: até uma gravação longa sobe rápido.`, "Escolha o tipo de resumo, o nível de detalhe, o idioma do resultado e, se quiser, um contexto (assunto, nomes dos participantes).", "Acompanhe o andamento ao vivo; o resultado chega ao chat e pode ser baixado em Word, PDF, Markdown…"],
      typesTitle: "Tipos de resumo (como aparecem no painel)",
      price: `${AUDIO_CREDITS_PER_MINUTE} créditos por minuto de áudio iniciado, ${AUDIO_MIN_CREDITS} créditos no mínimo, até ${AUDIO_MAX_MINUTES / 60} horas por arquivo. Se nada pôde ser compreendido no áudio, nenhum crédito é cobrado.`,
      privacy: "Os pedaços de áudio são apagados dos nossos servidores assim que o resumo termina, tenha dado certo ou não. Só o texto do resumo fica na sua conversa.",
    },
    security: {
      title: "Segurança e proteção de dados",
      intro: "O que a TechNova faz concretamente para proteger a sua conta, os seus documentos e as suas conversas.",
      items: [
        ["Sem treino com os seus dados", "Cada pedido enviado aos modelos exige fornecedores que não armazenam os seus conteúdos nem os usam para treinar os seus modelos; os outros não recebem nada."],
        ["Contas separadas", "Cada conta só vê as suas próprias conversas, arquivos, agentes e bases de conhecimento: a regra é aplicada pelo próprio banco de dados."],
        ["Chaves e tokens protegidos", "As chaves de API são guardadas com hash e mostradas uma única vez; os tokens dos serviços conectados (GitHub, Notion, Supabase…) são cifrados e lidos só pelo servidor. Uma chave de API só serve para a API de chat e só gasta os créditos da sua conta."],
        ["Arquivos verificados", "Cada arquivo importado é verificado antes de ser lido: tipo real, arquivos compactados armadilhados (bombas zip, caminhos desviados), macros do Office sinalizadas. Os arquivos recusados são apagados na hora."],
        ["Documentos tratados como dados", "O conteúdo dos seus documentos, das páginas web e do seu banco de dados é entregue aos modelos entre marcadores, como informação a consultar: as instruções que ele contenha nunca são seguidas."],
        ["Sites publicados isolados", "Os sites criados com o Studio aparecem num quadro isolado, sem acesso à sua conta; são analisados antes da publicação (segredos esquecidos, phishing)."],
        ["Limites e registro de segurança", "Limites de uso freiam os abusos no momento; um registro de segurança guarda o rastro das ações recusadas e sensíveis para detectar abusos repetidos."],
        ["Login", "Erros de login neutros de propósito, pausa após cinco falhas, senhas de pelo menos 8 caracteres com letras e números, saída após 7 dias sem atividade."],
      ],
      breach: "Em caso de violação de dados, a autoridade competente (APDP no Benim, ou a autoridade do país na União Europeia) é avisada em até 72 horas, e as pessoas afetadas são avisadas por e-mail quando o risco é alto. Cada incidente é anotado num registro. O detalhe está na nossa política de privacidade.",
    },
  },
};

const sub = "mt-6 font-display text-lg font-semibold";
const p = "mt-3 leading-relaxed text-muted-foreground";
const Steps = ({ items }: { items: string[] }) => <ol className="mt-3 space-y-2">{items.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-ink-foreground">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>;
const Card = ({ icon: I, title, children }: { icon: typeof Zap; title: string; children: ReactNode }) => <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
  <div className="flex items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary"><I className="size-4" /></span><p className="font-semibold">{title}</p></div>
  <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{children}</div>
</div>;
const Note = ({ icon: I, children }: { icon: typeof Zap; children: ReactNode }) => <p className={`${p} flex gap-2 text-sm`}><I className="mt-0.5 size-4 shrink-0" /><span>{children}</span></p>;

export function featureGuideBlocks4(lang: SiteLang): { id: string; title: string; body: ReactNode }[] {
  const { modes: m, news: n, humanize: h, audio: a, security: s } = g4[lang];
  const ui = lang === "fr" ? "fr" : "en";
  const modeIcons = [Zap, Scale, Brain];
  const secIcons = [Lock, ShieldCheck, KeyRound, FileCheck2, FileCheck2, Globe, Bell, KeyRound];
  return [
    { id: "modes-chat", title: m.title, body: <>
      <p className={p}>{m.intro}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">{m.list.map(([t, d], i) => <Card key={t} icon={modeIcons[i] ?? Zap} title={t}>{d}</Card>)}</div>
      <Note icon={Wand2}>{m.smart}</Note>
      <h3 className={sub}>{m.flagTitle}</h3>
      {m.flag.map((x) => <p key={x} className={p}>{x}</p>)}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">{FLAGSHIP_MODELS.map((f) => <li key={f.name} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm">
        <ModelLogo label={f.label} /><span className="min-w-0 flex-1"><b>{f.label}</b><span className="block text-xs text-muted-foreground">{f[ui]}</span></span>
        <span className="shrink-0 font-mono text-xs" aria-label={`${m.costLabel} ${f.cost}/3`}>{"●".repeat(f.cost)}<span className="opacity-25">{"●".repeat(3 - f.cost)}</span></span>
      </li>)}</ul>
    </> },
    { id: "actualite", title: n.title, body: <>
      {n.intro.map((x) => <p key={x} className={p}>{x}</p>)}
      <Steps items={n.how} />
      <Note icon={Coins}>{n.price}</Note>
      <h3 className={sub}>{n.busyTitle}</h3>
      <Note icon={RefreshCw}>{n.busy}</Note>
    </> },
    { id: "humaniser", title: h.title, body: <>
      <p className={p}>{h.intro}</p>
      <Steps items={h.steps} />
      <h3 className={sub}>{h.optsTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">{h.opts.map(([t, d]) => <Card key={t} icon={PenLine} title={t}>{d}</Card>)}</div>
      <Note icon={Coins}>{h.price}</Note>
      <Note icon={ShieldCheck}>{h.note}</Note>
    </> },
    { id: "resume-audio", title: a.title, body: <>
      <p className={p}>{a.intro}</p>
      <Steps items={a.steps} />
      <h3 className={sub}>{a.typesTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">{audioSummaryTypes.map((t) => <Card key={t.id} icon={AudioLines} title={t[ui]}>{ui === "fr" ? t.hintFr : t.hintEn}</Card>)}</div>
      <Note icon={Clock}>{a.price}</Note>
      <Note icon={Upload}>{a.privacy}</Note>
    </> },
    { id: "securite", title: s.title, body: <>
      <p className={p}>{s.intro}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{s.items.map(([t, d], i) => <Card key={t} icon={secIcons[i] ?? ShieldCheck} title={t}>{d}</Card>)}</div>
      <Note icon={Link2}>{s.breach}</Note>
    </> },
  ];
}
