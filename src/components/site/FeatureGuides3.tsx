import type { ReactNode } from "react";
import { Banknote, Bell, Bot, Check, Coins, CreditCard, Download, FileSpreadsheet, FileText, Hammer, Inbox, Link2, Lock, LogOut, MessageCircle, Package, Palette, Presentation, Puzzle, Rocket, ShieldCheck, Slash, Smartphone, Truck } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";
import { plugins } from "@/lib/plugins";
import { STUDIO_COST } from "@/lib/studio";
import { DEFAULT_AGENT_BUDGET } from "@/lib/plans";

// Feature guides, part 3: Plugins, the "Page de vente pro" journey, downloading a reply as a file and the
// everyday workspace (credits counter, inbox, account menu, session expiry). Written from what the product
// does today (src/lib/plugins.ts, SalesPageWizard, export-reply.ts, TopActions, Inbox, session-guard).
// Update with those files; illustrations are drawn in code.

const studioTotal = STUDIO_COST.questions + STUDIO_COST.plan + STUDIO_COST.build;

type Guide3 = {
  plugins: { title: string; intro: string[]; catalogTitle: string; names: string[]; installTitle: string; install: string[]; slashTitle: string; slash: string[]; slashDemo: string; plansTitle: string; plans: string[]; safety: string };
  sales: { title: string; intro: string[]; stepsTitle: string; steps: [string, string][]; payTitle: string; pay: [string, string][]; costTitle: string; cost: string; honest: string };
  exports: { title: string; intro: string; formatsTitle: string; formats: [string, string][]; howTitle: string; how: string[]; privacy: string };
  space: { title: string; intro: string; items: [string, string][] };
};

const g3: Record<SiteLang, Guide3> = {
  fr: {
    plugins: {
      title: "Plugins",
      intro: ["Un plugin ajoute un métier complet à votre espace en un clic : un agent spécialisé déjà réglé et des commandes « / » — des modèles de demandes prêts à remplir dans le chat.", "Les plugins officiels sont conçus par TechNova. Vous les trouvez dans le tableau de bord, menu « Plus » → Plugins."],
      catalogTitle: "Les dix plugins officiels",
      names: ["Commercial", "Juriste", "Prof particulier", "Community manager", "Développeur web", "Analyste Excel", "Ressources humaines", "Gestion & compta PME", "Vendeur en ligne", "Rédacteur & SEO"],
      installTitle: "Installer, désactiver, désinstaller",
      install: ["Ouvrez Plugins, cliquez sur une carte pour voir sa fiche : ce qui sera installé et les accès demandés.", "Cliquez sur « Installer » : l'agent rejoint vos Agents IA et les commandes deviennent disponibles dans le chat.", "Depuis « Gérer », désactivez le plugin pour masquer ses commandes sans le perdre.", "« Désinstaller » retire ses commandes et supprime uniquement l'agent qu'il avait créé ; vos autres agents ne changent pas."],
      slashTitle: "Utiliser une commande « / »",
      slash: ["Dans la zone de message, tapez « / » : la liste des commandes de vos plugins actifs apparaît. Continuez à taper pour filtrer (« /de » → /devis).", "Flèches haut/bas pour choisir, Entrée ou Tab pour insérer : la demande se place dans la zone de message avec le premier passage entre crochets sélectionné, prêt à être remplacé.", "Complétez les [crochets] puis envoyez. Échap ferme la liste."],
      slashDemo: "Prépare un devis clair pour [client] : [prestations et quantités]…",
      plansTitle: "Forfaits et coût",
      plans: ["L'installation est gratuite. Les commandes fonctionnent avec tous les forfaits et coûtent le prix normal du mode choisi.", "Les agents demandent le forfait Creator : en dessous, seules les commandes s'installent.", `Chaque réponse d'agent est plafonnée à ${DEFAULT_AGENT_BUDGET} crédits (budget réglable avec Pro).`],
      safety: "Les agents des plugins n'ont que des accès en lecture (recherche web, lecture de pages, lecture de vos fichiers prêts) affichés avant l'installation. Ils ne peuvent ni payer, ni envoyer d'e-mails, ni écrire dans une base de données.",
    },
    sales: {
      title: "Page de vente pro",
      intro: ["Le bouton « Page de vente pro », sous la zone de message du chat, ouvre un parcours guidé qui va de votre offre à une page de vente en ligne, reliée à vos moyens de paiement.", "TechNova Studio construit la page à partir de vos réponses : héros, bénéfices, détails, garantie, FAQ, prix, boutons d'achat et barre d'achat fixe sur mobile."],
      stepsTitle: "Le parcours",
      steps: [["Offre", "Produit, type d'offre, description, public, prix et devise, bénéfices, bonus, garantie, vrais témoignages."], ["Style", "Ton de la page (premium, chaleureux, énergique, sobre) et couleur principale, avec un aperçu."], ["Paiement", "Au moins un moyen de paiement : chaque bouton « Acheter » y mène."], ["Construction", "Studio pose 2 ou 3 questions s'il manque un détail, montre le plan à valider, puis construit la page."], ["Publication", "Bouton « Publier » du panneau : la page est en ligne à l'adresse technovaihub.com/s/…"]],
      payTitle: "Moyens de paiement",
      pay: [["Mobile Money", "Votre numéro et l'opérateur (MTN, Moov, Orange, Wave…) avec un bouton « Copier le numéro » et les étapes pour envoyer la preuve."], ["Commande WhatsApp", "Le client vous écrit avec un message de commande déjà rempli (produit et prix)."], ["Lien de paiement", "Un bouton « Payer maintenant » vers votre lien https (FeexPay, Stripe, PayPal, Wave…)."], ["Paiement à la livraison", "Les zones livrées sont affichées ; le client paie à la réception."]],
      costTitle: "Coût et forfaits",
      cost: `Environ ${studioTotal} crédits, prélevés étape par étape : questions ${STUDIO_COST.questions}, plan ${STUDIO_COST.plan}, construction ${STUDIO_COST.build}. La construction demande au moins le forfait Essential ; la mise en ligne en un clic, le forfait Creator.`,
      honest: "TechNova n'invente rien : pas de faux avis, pas de faux compte à rebours, pas de faux stock. Les témoignages et l'ancien prix n'apparaissent que si vous les donnez.",
    },
    exports: {
      title: "Télécharger une réponse",
      intro: "Chaque réponse de l'IA dans le chat a un bouton de téléchargement à côté de « Copier ». Il crée un nouveau fichier à partir de la réponse : rapport, tableau, présentation…",
      formatsTitle: "Formats disponibles",
      formats: [["Word (.docx)", "Titres, paragraphes, listes, tableaux et code, mis en page."], ["Excel (.xlsx)", "Une feuille par tableau de la réponse ; les nombres restent des nombres."], ["PowerPoint (.pptx)", "Une diapositive de couverture puis une diapositive par titre."], ["PDF", "Une page propre ouverte dans la boîte d'impression : choisissez « Enregistrer en PDF »."], ["Markdown, HTML", "Le texte brut ou une page web autonome."], ["CSV", "Les tableaux de la réponse, à ouvrir dans un tableur."]],
      howTitle: "Comment faire",
      how: ["Survolez (ou touchez) la réponse, puis cliquez sur l'icône de téléchargement.", "Choisissez le format : le fichier se télécharge aussitôt."],
      privacy: "Le fichier est fabriqué dans votre navigateur : rien n'est envoyé ailleurs et aucun crédit n'est consommé. Pour retravailler un document que vous avez joint, demandez la nouvelle version dans le chat puis téléchargez-la.",
    },
    space: {
      title: "Votre espace",
      intro: "Quelques repères du tableau de bord au quotidien.",
      items: [["Crédits restants", "Dans le chat (accueil et conversations), votre solde disponible s'affiche en haut à droite, à côté de « Obtenir l'appli ». Il se met à jour après chaque réponse ; un clic mène à Tarifs et crédits."], ["Menu du compte", "Cliquez sur votre profil en bas de la barre latérale : forfait, boîte de réception, paramètres, connexions, utilisation, API, thèmes, aide et déconnexion."], ["Boîte de réception", "Conseils et alertes : créations qui expirent bientôt (conservation 14 jours), solde bas, prix des créations. Un compteur signale les messages non lus."], ["Application", "« Obtenir l'appli » installe TechNova sur votre ordinateur ou votre téléphone (sur iPhone : Partager → Sur l'écran d'accueil)."], ["Sécurité de la session", "Après 7 jours sans activité, vous êtes déconnecté automatiquement et invité à vous reconnecter."]],
    },
  },
  en: {
    plugins: {
      title: "Plugins",
      intro: ["A plugin adds a complete skill to your workspace in one click: a ready-configured specialised agent and “/” commands — request templates ready to fill in the chat.", "Official plugins are made by TechNova. Find them in the dashboard, “More” menu → Plugins."],
      catalogTitle: "The ten official plugins",
      names: ["Sales rep", "Legal assistant", "Private tutor", "Community manager", "Web developer", "Excel analyst", "HR assistant", "SME accounting", "Online seller", "Writer & SEO"],
      installTitle: "Install, disable, uninstall",
      install: ["Open Plugins and click a card to see its sheet: what will be installed and the accesses requested.", "Click “Install”: the agent joins your AI Agents and the commands become available in the chat.", "From “Manage”, disable the plugin to hide its commands without losing it.", "“Uninstall” removes its commands and deletes only the agent it created; your other agents are untouched."],
      slashTitle: "Using a “/” command",
      slash: ["In the message box, type “/”: the commands of your active plugins appear. Keep typing to filter (“/de” → /devis).", "Up/down arrows to choose, Enter or Tab to insert: the request goes into the message box with its first bracketed part selected, ready to replace.", "Fill in the [brackets] and send. Escape closes the list."],
      slashDemo: "Prepare a clear quote for [client]: [services and quantities]…",
      plansTitle: "Plans and cost",
      plans: ["Installing is free. Commands work with every plan and cost the normal price of the chosen mode.", "Agents need the Creator plan: below it, only the commands are installed.", `Each agent reply is capped at ${DEFAULT_AGENT_BUDGET} credits (adjustable budget with Pro).`],
      safety: "Plugin agents only get read access (web search, reading pages, reading your ready files), shown before installing. They can never pay, send emails or write to a database.",
    },
    sales: {
      title: "Pro sales page",
      intro: ["The “Pro sales page” button under the chat message box opens a guided journey from your offer to an online sales page wired to your payment methods.", "TechNova Studio builds the page from your answers: hero, benefits, details, guarantee, FAQ, price, buy buttons and a sticky buy bar on mobile."],
      stepsTitle: "The journey",
      steps: [["Offer", "Product, offer type, description, audience, price and currency, benefits, bonus, guarantee, real testimonials."], ["Style", "Page tone (premium, warm, energetic, sober) and main colour, with a preview."], ["Payment", "At least one payment method: every “Buy” button leads there."], ["Build", "Studio asks 2 or 3 questions if a detail is missing, shows the plan for approval, then builds the page."], ["Publish", "The panel's “Publish” button: the page goes live at technovaihub.com/s/…"]],
      payTitle: "Payment methods",
      pay: [["Mobile Money", "Your number and operator (MTN, Moov, Orange, Wave…) with a “Copy number” button and the steps to send the proof."], ["WhatsApp order", "The customer messages you with a prefilled order (product and price)."], ["Payment link", "A “Pay now” button to your https link (FeexPay, Stripe, PayPal, Wave…)."], ["Cash on delivery", "Delivery areas are shown; the customer pays on delivery."]],
      costTitle: "Cost and plans",
      cost: `About ${studioTotal} credits, charged stage by stage: questions ${STUDIO_COST.questions}, plan ${STUDIO_COST.plan}, build ${STUDIO_COST.build}. Building needs at least the Essential plan; one-click publishing needs Creator.`,
      honest: "TechNova invents nothing: no fake reviews, no fake countdown, no fake stock. Testimonials and a former price only appear if you give them.",
    },
    exports: {
      title: "Download a reply",
      intro: "Every AI reply in the chat has a download button next to “Copy”. It creates a new file from the reply: report, table, presentation…",
      formatsTitle: "Available formats",
      formats: [["Word (.docx)", "Headings, paragraphs, lists, tables and code, laid out."], ["Excel (.xlsx)", "One sheet per table in the reply; numbers stay numbers."], ["PowerPoint (.pptx)", "A cover slide, then one slide per heading."], ["PDF", "A clean page opened in the print dialog: choose “Save as PDF”."], ["Markdown, HTML", "The raw text or a standalone web page."], ["CSV", "The reply's tables, to open in a spreadsheet."]],
      howTitle: "How to",
      how: ["Hover (or tap) the reply, then click the download icon.", "Choose the format: the file downloads at once."],
      privacy: "The file is built in your browser: nothing is sent anywhere and no credits are used. To rework a document you attached, ask for the new version in the chat, then download it.",
    },
    space: {
      title: "Your workspace",
      intro: "A few everyday landmarks in the dashboard.",
      items: [["Credits left", "In the chat (home and conversations), your available balance shows at the top right, next to “Get the app”. It updates after each reply; one click opens Pricing & credits."], ["Account menu", "Click your profile at the bottom of the sidebar: plan, inbox, settings, connections, usage, API, themes, help and sign-out."], ["Inbox", "Tips and alerts: creations expiring soon (14-day retention), low balance, creation prices. A counter shows unread messages."], ["App", "“Get the app” installs TechNova on your computer or phone (on iPhone: Share → Add to Home Screen)."], ["Session security", "After 7 days without activity you are signed out automatically and asked to sign in again."]],
    },
  },
  es: {
    plugins: {
      title: "Plugins",
      intro: ["Un plugin añade un oficio completo a tu espacio con un clic: un agente especializado ya configurado y comandos «/», plantillas de peticiones listas para completar en el chat.", "Los plugins oficiales los diseña TechNova. Están en el panel, menú «Más» → Plugins."],
      catalogTitle: "Los diez plugins oficiales",
      names: ["Comercial", "Asistente jurídico", "Profesor particular", "Community manager", "Desarrollador web", "Analista de Excel", "Recursos humanos", "Gestión y contabilidad", "Vendedor en línea", "Redactor y SEO"],
      installTitle: "Instalar, desactivar, desinstalar",
      install: ["Abre Plugins y haz clic en una tarjeta para ver su ficha: lo que se instalará y los accesos solicitados.", "Haz clic en «Instalar»: el agente se une a tus Agentes IA y los comandos quedan disponibles en el chat.", "Desde «Gestionar», desactiva el plugin para ocultar sus comandos sin perderlo.", "«Desinstalar» quita sus comandos y elimina solo el agente que había creado; tus otros agentes no cambian."],
      slashTitle: "Usar un comando «/»",
      slash: ["En la zona de mensaje, escribe «/»: aparece la lista de comandos de tus plugins activos. Sigue escribiendo para filtrar («/de» → /devis).", "Flechas arriba/abajo para elegir, Intro o Tab para insertar: la petición se coloca en la zona de mensaje con la primera parte entre corchetes seleccionada.", "Completa los [corchetes] y envía. Escape cierra la lista."],
      slashDemo: "Prepara un presupuesto claro para [cliente]: [servicios y cantidades]…",
      plansTitle: "Planes y coste",
      plans: ["La instalación es gratuita. Los comandos funcionan con todos los planes y cuestan el precio normal del modo elegido.", "Los agentes requieren el plan Creator: por debajo, solo se instalan los comandos.", `Cada respuesta de un agente tiene un tope de ${DEFAULT_AGENT_BUDGET} créditos (presupuesto ajustable con Pro).`],
      safety: "Los agentes de los plugins solo tienen accesos de lectura (búsqueda web, lectura de páginas, lectura de tus archivos listos), mostrados antes de instalar. Nunca pueden pagar, enviar correos ni escribir en una base de datos.",
    },
    sales: {
      title: "Página de venta pro",
      intro: ["El botón «Página de venta pro», bajo la zona de mensaje del chat, abre un recorrido guiado desde tu oferta hasta una página de venta en línea conectada a tus medios de pago.", "TechNova Studio construye la página a partir de tus respuestas: portada, beneficios, detalles, garantía, FAQ, precio, botones de compra y barra de compra fija en el móvil."],
      stepsTitle: "El recorrido",
      steps: [["Oferta", "Producto, tipo de oferta, descripción, público, precio y moneda, beneficios, bono, garantía, testimonios reales."], ["Estilo", "Tono de la página (premium, cálido, enérgico, sobrio) y color principal, con vista previa."], ["Pago", "Al menos un medio de pago: cada botón «Comprar» lleva a él."], ["Construcción", "Studio hace 2 o 3 preguntas si falta un detalle, muestra el plan para validar y construye la página."], ["Publicación", "Botón «Publicar» del panel: la página queda en línea en technovaihub.com/s/…"]],
      payTitle: "Medios de pago",
      pay: [["Mobile Money", "Tu número y el operador (MTN, Moov, Orange, Wave…) con un botón «Copiar el número» y los pasos para enviar el comprobante."], ["Pedido por WhatsApp", "El cliente te escribe con un mensaje de pedido ya rellenado (producto y precio)."], ["Enlace de pago", "Un botón «Pagar ahora» hacia tu enlace https (FeexPay, Stripe, PayPal, Wave…)."], ["Pago contra entrega", "Se muestran las zonas de entrega; el cliente paga al recibir."]],
      costTitle: "Coste y planes",
      cost: `Unos ${studioTotal} créditos, cobrados etapa por etapa: preguntas ${STUDIO_COST.questions}, plan ${STUDIO_COST.plan}, construcción ${STUDIO_COST.build}. La construcción requiere al menos el plan Essential; la publicación en un clic, el plan Creator.`,
      honest: "TechNova no inventa nada: ni reseñas falsas, ni cuentas atrás falsas, ni stock falso. Los testimonios y el precio anterior solo aparecen si los das tú.",
    },
    exports: {
      title: "Descargar una respuesta",
      intro: "Cada respuesta de la IA en el chat tiene un botón de descarga junto a «Copiar». Crea un archivo nuevo a partir de la respuesta: informe, tabla, presentación…",
      formatsTitle: "Formatos disponibles",
      formats: [["Word (.docx)", "Títulos, párrafos, listas, tablas y código, maquetados."], ["Excel (.xlsx)", "Una hoja por tabla de la respuesta; los números siguen siendo números."], ["PowerPoint (.pptx)", "Una diapositiva de portada y luego una por título."], ["PDF", "Una página limpia abierta en el cuadro de impresión: elige «Guardar como PDF»."], ["Markdown, HTML", "El texto sin formato o una página web autónoma."], ["CSV", "Las tablas de la respuesta, para abrir en una hoja de cálculo."]],
      howTitle: "Cómo hacerlo",
      how: ["Pasa el ratón (o toca) la respuesta y haz clic en el icono de descarga.", "Elige el formato: el archivo se descarga al instante."],
      privacy: "El archivo se crea en tu navegador: no se envía nada a ningún sitio y no se consumen créditos. Para retocar un documento que adjuntaste, pide la nueva versión en el chat y descárgala.",
    },
    space: {
      title: "Tu espacio",
      intro: "Algunas referencias del panel en el día a día.",
      items: [["Créditos restantes", "En el chat (inicio y conversaciones), tu saldo disponible aparece arriba a la derecha, junto a «Obtener la app». Se actualiza tras cada respuesta; un clic lleva a Precios y créditos."], ["Menú de la cuenta", "Haz clic en tu perfil, abajo en la barra lateral: plan, bandeja de entrada, ajustes, conexiones, uso, API, temas, ayuda y cierre de sesión."], ["Bandeja de entrada", "Consejos y alertas: creaciones que caducan pronto (conservación de 14 días), saldo bajo, precios de las creaciones. Un contador indica los mensajes no leídos."], ["Aplicación", "«Obtener la app» instala TechNova en tu ordenador o teléfono (en iPhone: Compartir → Añadir a pantalla de inicio)."], ["Seguridad de la sesión", "Tras 7 días sin actividad se cierra la sesión automáticamente y se te pide volver a entrar."]],
    },
  },
  pt: {
    plugins: {
      title: "Plugins",
      intro: ["Um plugin acrescenta uma profissão completa ao seu espaço com um clique: um agente especializado já configurado e comandos «/», modelos de pedidos prontos para preencher no chat.", "Os plugins oficiais são criados pela TechNova. Ficam no painel, menu «Mais» → Plugins."],
      catalogTitle: "Os dez plugins oficiais",
      names: ["Comercial", "Assistente jurídico", "Professor particular", "Community manager", "Desenvolvedor web", "Analista de Excel", "Recursos humanos", "Gestão e contabilidade", "Vendedor online", "Redator e SEO"],
      installTitle: "Instalar, desativar, desinstalar",
      install: ["Abra Plugins e clique num cartão para ver a ficha: o que será instalado e os acessos pedidos.", "Clique em «Instalar»: o agente entra nos seus Agentes IA e os comandos ficam disponíveis no chat.", "Em «Gerir», desative o plugin para ocultar os comandos sem o perder.", "«Desinstalar» retira os comandos e apaga apenas o agente que ele criou; os seus outros agentes não mudam."],
      slashTitle: "Usar um comando «/»",
      slash: ["Na caixa de mensagem, digite «/»: aparece a lista de comandos dos seus plugins ativos. Continue a digitar para filtrar («/de» → /devis).", "Setas para cima/baixo para escolher, Enter ou Tab para inserir: o pedido vai para a caixa de mensagem com a primeira parte entre colchetes selecionada.", "Preencha os [colchetes] e envie. Esc fecha a lista."],
      slashDemo: "Prepare um orçamento claro para [cliente]: [serviços e quantidades]…",
      plansTitle: "Pacotes e custo",
      plans: ["A instalação é gratuita. Os comandos funcionam em todos os pacotes e custam o preço normal do modo escolhido.", "Os agentes exigem o pacote Creator: abaixo dele, só os comandos são instalados.", `Cada resposta de agente tem um teto de ${DEFAULT_AGENT_BUDGET} créditos (orçamento ajustável com Pro).`],
      safety: "Os agentes dos plugins só têm acessos de leitura (pesquisa web, leitura de páginas, leitura dos seus arquivos prontos), mostrados antes da instalação. Nunca podem pagar, enviar e-mails nem escrever num banco de dados.",
    },
    sales: {
      title: "Página de vendas pro",
      intro: ["O botão «Página de vendas pro», abaixo da caixa de mensagem do chat, abre um percurso guiado da sua oferta até uma página de vendas online ligada aos seus meios de pagamento.", "O TechNova Studio constrói a página a partir das suas respostas: destaque, benefícios, detalhes, garantia, FAQ, preço, botões de compra e barra de compra fixa no celular."],
      stepsTitle: "O percurso",
      steps: [["Oferta", "Produto, tipo de oferta, descrição, público, preço e moeda, benefícios, bônus, garantia, depoimentos reais."], ["Estilo", "Tom da página (premium, acolhedor, enérgico, sóbrio) e cor principal, com pré-visualização."], ["Pagamento", "Pelo menos um meio de pagamento: cada botão «Comprar» leva até ele."], ["Construção", "O Studio faz 2 ou 3 perguntas se faltar um detalhe, mostra o plano para aprovar e constrói a página."], ["Publicação", "Botão «Publicar» do painel: a página fica online em technovaihub.com/s/…"]],
      payTitle: "Meios de pagamento",
      pay: [["Mobile Money", "O seu número e a operadora (MTN, Moov, Orange, Wave…) com um botão «Copiar o número» e os passos para enviar o comprovante."], ["Pedido pelo WhatsApp", "O cliente escreve-lhe com uma mensagem de pedido já preenchida (produto e preço)."], ["Link de pagamento", "Um botão «Pagar agora» para o seu link https (FeexPay, Stripe, PayPal, Wave…)."], ["Pagamento na entrega", "As zonas de entrega são mostradas; o cliente paga ao receber."]],
      costTitle: "Custo e pacotes",
      cost: `Cerca de ${studioTotal} créditos, cobrados etapa a etapa: perguntas ${STUDIO_COST.questions}, plano ${STUDIO_COST.plan}, construção ${STUDIO_COST.build}. A construção exige pelo menos o pacote Essential; a publicação num clique, o pacote Creator.`,
      honest: "A TechNova não inventa nada: nada de avaliações falsas, contagem regressiva falsa ou estoque falso. Depoimentos e preço anterior só aparecem se você os fornecer.",
    },
    exports: {
      title: "Baixar uma resposta",
      intro: "Cada resposta da IA no chat tem um botão de download ao lado de «Copiar». Ele cria um novo arquivo a partir da resposta: relatório, tabela, apresentação…",
      formatsTitle: "Formatos disponíveis",
      formats: [["Word (.docx)", "Títulos, parágrafos, listas, tabelas e código, diagramados."], ["Excel (.xlsx)", "Uma planilha por tabela da resposta; os números continuam números."], ["PowerPoint (.pptx)", "Um slide de capa e depois um slide por título."], ["PDF", "Uma página limpa aberta na janela de impressão: escolha «Salvar como PDF»."], ["Markdown, HTML", "O texto bruto ou uma página web autônoma."], ["CSV", "As tabelas da resposta, para abrir numa planilha."]],
      howTitle: "Como fazer",
      how: ["Passe o mouse (ou toque) na resposta e clique no ícone de download.", "Escolha o formato: o arquivo é baixado na hora."],
      privacy: "O arquivo é criado no seu navegador: nada é enviado para lugar nenhum e nenhum crédito é consumido. Para retrabalhar um documento que anexou, peça a nova versão no chat e baixe-a.",
    },
    space: {
      title: "O seu espaço",
      intro: "Algumas referências do painel no dia a dia.",
      items: [["Créditos restantes", "No chat (início e conversas), o seu saldo disponível aparece no canto superior direito, ao lado de «Obter o app». Atualiza-se após cada resposta; um clique leva a Preços e créditos."], ["Menu da conta", "Clique no seu perfil, no fundo da barra lateral: pacote, caixa de entrada, configurações, conexões, uso, API, temas, ajuda e saída."], ["Caixa de entrada", "Dicas e alertas: criações que expiram em breve (conservação de 14 dias), saldo baixo, preços das criações. Um contador mostra as mensagens não lidas."], ["Aplicativo", "«Obter o app» instala a TechNova no seu computador ou celular (no iPhone: Compartilhar → Adicionar à Tela de Início)."], ["Segurança da sessão", "Após 7 dias sem atividade, a sessão é encerrada automaticamente e você precisa entrar de novo."]],
    },
  },
};

const sub = "mt-6 font-display text-lg font-semibold";
const p = "mt-3 leading-relaxed text-muted-foreground";
const Steps = ({ items }: { items: string[] }) => <ol className="mt-3 space-y-2">{items.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-ink-foreground">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>;
const frame = "relative mt-4 overflow-hidden rounded-[22px] border border-border bg-secondary/40 p-4 sm:p-5";

/** Illustration: the plugin catalogue as tinted cards with their "/" commands. */
function Catalog({ names }: { names: string[] }) {
  return <div className={frame}>
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">{plugins.map((pl, i) => <div key={pl.id} className="rounded-xl border border-border bg-card p-2.5 shadow-sm">
      <span className="grid size-7 place-items-center rounded-lg" style={{ background: `oklch(.93 .05 ${pl.hue})`, color: `oklch(.42 .13 ${pl.hue})` }}><Puzzle className="size-3.5" /></span>
      <p className="mt-1.5 text-xs font-semibold leading-tight">{names[i] ?? pl.name.en}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{pl.commands.map((c) => `/${c.slug}`).join(" ")}</p>
    </div>)}</div>
  </div>;
}

/** Illustration: the composer with the "/" list open. */
function SlashDemo({ demo }: { demo: string }) {
  const rows = plugins[0]!.commands;
  return <div className={frame}>
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-border bg-card p-1 shadow-sm">{rows.map((c, i) => <div key={c.slug} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs ${i === 1 ? "bg-secondary" : ""}`}>
        <span className="grid size-5 place-items-center rounded-md bg-ink font-mono text-[10px] text-ink-foreground">/</span><span className="font-mono font-medium">/{c.slug}</span>
      </div>)}</div>
      <div className="mt-2 flex items-center gap-2 rounded-[18px] border border-border bg-card px-3.5 py-3 text-xs shadow-sm"><Slash className="size-3.5 text-muted-foreground" /><span className="truncate">{demo}</span></div>
    </div>
  </div>;
}

/** Illustration: the five-step journey. */
function Journey({ steps }: { steps: [string, string][] }) {
  const icons = [Package, Palette, CreditCard, Hammer, Rocket];
  return <ol className="mt-4 grid gap-2.5 sm:grid-cols-5">{steps.map(([t, d], i) => { const I = icons[i] ?? Check; return <li key={t} className="min-w-0 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
    <span className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-ink text-ink-foreground"><I className="size-4" /></span><span className="text-[11px] font-semibold text-muted-foreground">{i + 1}</span></span>
    <p className="mt-2 font-semibold">{t}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{d}</p>
  </li>; })}</ol>;
}

export function featureGuideBlocks3(lang: SiteLang): { id: string; title: string; body: ReactNode }[] {
  const { plugins: pg, sales: s, exports: e, space: w } = g3[lang];
  const payIcons = [Smartphone, MessageCircle, Link2, Truck];
  const formatIcons = [FileText, FileSpreadsheet, Presentation, FileText, FileText, FileSpreadsheet];
  const spaceIcons = [Coins, Bot, Inbox, Download, LogOut];
  return [
    { id: "plugins", title: pg.title, body: <>
      {pg.intro.map((x) => <p key={x} className={p}>{x}</p>)}
      <h3 className={sub}>{pg.catalogTitle}</h3>
      <Catalog names={pg.names} />
      <h3 className={sub}>{pg.installTitle}</h3>
      <Steps items={pg.install} />
      <h3 className={sub}>{pg.slashTitle}</h3>
      <SlashDemo demo={pg.slashDemo} />
      <Steps items={pg.slash} />
      <h3 className={sub}>{pg.plansTitle}</h3>
      <ul className="mt-3 space-y-2 text-sm">{pg.plans.map((x) => <li key={x} className="flex gap-2.5"><Coins className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{x}</span></li>)}</ul>
      <p className={`${p} flex gap-2 text-sm`}><ShieldCheck className="mt-0.5 size-4 shrink-0" />{pg.safety}</p>
    </> },
    { id: "page-de-vente", title: s.title, body: <>
      {s.intro.map((x) => <p key={x} className={p}>{x}</p>)}
      <h3 className={sub}>{s.stepsTitle}</h3>
      <Journey steps={s.steps} />
      <h3 className={sub}>{s.payTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{s.pay.map(([t, d], i) => { const I = payIcons[i] ?? Banknote; return <div key={t} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-ink text-ink-foreground"><I className="size-4" /></span><p className="font-semibold">{t}</p></div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d}</p>
      </div>; })}</div>
      <h3 className={sub}>{s.costTitle}</h3>
      <p className={`${p} flex gap-2`}><Coins className="mt-1 size-4 shrink-0" />{s.cost}</p>
      <p className={`${p} flex gap-2 text-sm`}><ShieldCheck className="mt-0.5 size-4 shrink-0" />{s.honest}</p>
    </> },
    { id: "exporter", title: e.title, body: <>
      <p className={p}>{e.intro}</p>
      <h3 className={sub}>{e.formatsTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{e.formats.map(([t, d], i) => { const I = formatIcons[i] ?? FileText; return <div key={t} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-secondary"><I className="size-4" /></span><p className="font-semibold">{t}</p></div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d}</p>
      </div>; })}</div>
      <h3 className={sub}>{e.howTitle}</h3>
      <Steps items={e.how} />
      <p className={`${p} flex gap-2 text-sm`}><Lock className="mt-0.5 size-4 shrink-0" />{e.privacy}</p>
    </> },
    { id: "votre-espace", title: w.title, body: <>
      <p className={p}>{w.intro}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">{w.items.map(([t, d], i) => { const I = spaceIcons[i] ?? Bell; return <li key={t} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-secondary"><I className="size-4" /></span><p className="font-semibold">{t}</p></div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d}</p>
      </li>; })}</ul>
    </> },
  ];
}
