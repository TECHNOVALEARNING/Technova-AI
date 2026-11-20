import type { ReactNode } from "react";
import { ArrowRight, BarChart3, Calculator, Check, Coins, Download, FileSpreadsheet, FileUp, Film, HardDrive, Image as ImageIcon, LayoutTemplate, Music, Palette, Share2, ShieldCheck, Sparkles, Type, Wand2 } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";
import { DESIGN_FORMATS, designAiCredits } from "@/lib/design-formats";
import { DESIGN_FONTS } from "@/lib/design-fonts";
import { FUNCTION_MENU } from "@/lib/sheet/formula";
import { SHEET_AI_CREDITS, SHEET_AI_PER_10_MIN, SHEET_AI_PER_DAY, SHEET_PDF_CREDITS } from "@/lib/sheet/limits";
import { VIDEO_DURATION_CHOICES, VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS, mediaTiers, videoCredits } from "@/lib/media-models";

// Feature guides, part 5 (documentation 1.6): Créativité (TechNova Design), TechNova Tableur, image / music / video
// creations, and what is new in 1.6. Written from what the product does today (design-formats.ts, design-fonts.ts,
// designs.tsx, sheet/*, media-models.ts); prices and limits are read from the code. Illustrations are drawn in code.

const designTemplates = 210;
const sheetTemplates = 14;

type Guide5 = {
  design: { title: string; intro: string; steps: [string, string][]; toolsTitle: string; tools: [string, string][]; formatsTitle: string; shareTitle: string; share: string[]; invite: string; storage: string; price: string; legal: string };
  sheet: { title: string; intro: string; start: string[]; featuresTitle: string; features: [string, string][]; fnTitle: string; fnNote: string; aiTitle: string; ai: string[]; ioTitle: string; io: [string, string][]; keysTitle: string; keys: [string, string][]; storage: string };
  media: { title: string; intro: string; table: [string, string][]; videoTitle: string; video: string; note: string };
  news: { title: string; intro: string; items: [string, string][] };
  ill: { add: string; emojis: string; pages: string; share: string; publish: string; formula: string; assistant: string; apply: string; aiMsg: string; product: string; qty: string; total: string; chart: string };
};

const fmtNames = (lang: SiteLang) => DESIGN_FORMATS.map((f) => (lang === "fr" ? f.fr : f.en));
const fontList = DESIGN_FONTS.slice(0, 12).map((f) => f.name).join(", ");

const g5: Record<SiteLang, Guide5> = {
  fr: {
    design: {
      title: "Créativité : présentations, CV, flyers et invitations",
      intro: `Le bouton « Créativité » sous la zone de message ouvre TechNova Design (Templates → « Présentation et Canva »). ${designTemplates} modèles originaux dans ${DESIGN_FORMATS.length} formats, un éditeur libre comme dans Canva, et des exports prêts à imprimer ou à partager. Les modèles, la mise en forme et les exports sont gratuits.`,
      steps: [["Contenu", "Remplissez les champs (titre, textes, photos) ou décrivez votre projet et cliquez sur « Rédiger avec l'IA »."], ["Style", "Choisissez une des 7 palettes et la couleur d'accent."], ["Mise en forme", "Déplacez, redimensionnez et mettez en forme chaque élément, ajoutez des pages, des images, des formes et des emojis."], ["Exporter et partager", "Publiez un lien, partagez-le sur WhatsApp, imprimez, enregistrez en PDF ou ouvrez dans PowerPoint, Google Slides ou Canva."]],
      toolsTitle: "L'éditeur, outil par outil",
      tools: [["Déplacer et redimensionner", "Cliquez sur un texte, une image ou une forme ; glissez pour le déplacer comme une zone de texte Word, tirez le coin pour le redimensionner. Flèches du clavier pour ajuster au pixel (Maj = 10 px)."], ["Écrire", "Double-cliquez sur un texte pour l'écrire directement sur la page."], ["Polices libres de droit", `${DESIGN_FONTS.length} polices Google Fonts (licence SIL OFL ou Apache) utilisables, imprimables et commerciales : ${fontList}…`], ["Mise en forme", "Taille, gras, italique, souligné, majuscules, couleur, surlignage, alignement à gauche, centré, à droite ou justifié, puces, numéros, interligne."], ["Images", "« Importer une image » depuis votre ordinateur ou votre téléphone ; double-cliquez sur un cadre « Image » pour le remplir. Les photos sont réduites dans votre navigateur (1 600 px)."], ["Emojis et formes", "Des centaines d'emojis Unicode classés par thème (fête, cœurs, travail, contact…), rectangles, cercles et lignes."], ["Pages", "Ajoutez, dupliquez, réordonnez ou supprimez des pages dans tous les formats, pas seulement les présentations."], ["Annuler", "60 retours en arrière (Ctrl+Z / Ctrl+Y), Suppr pour effacer, Ctrl+D pour dupliquer, calques premier plan / arrière-plan."]],
      formatsTitle: "Les formats",
      shareTitle: "Exporter et partager",
      share: ["« Publier et obtenir un lien » : une page en ligne (lien TechNova, GitHub, Netlify ou Vercel), puis « Partager sur WhatsApp » ou « Copier le lien ».", "Imprimer ou enregistrer en PDF au format exact (A4, A5, carte de visite 85 × 55 mm…).", "PowerPoint (.pptx) modifiable pour tous les formats : textes, formes et images restent éditables.", "Page HTML autonome, puis Google Slides, PowerPoint en ligne ou Canva avec les instructions d'import."],
      invite: "Pour une invitation, la page partagée ajoute un compte à rebours, deux boutons de réponse par WhatsApp (« Je confirme ma présence », « Je ne pourrai pas venir ») vers le numéro choisi, l'itinéraire Google Maps et « Ajouter au calendrier ».",
      storage: "Vos créations ne sont pas enregistrées sur nos serveurs : elles restent dans votre navigateur le temps de l'édition. Téléchargez-les ou publiez-les avant de fermer. Seule une page publiée est conservée (dans vos sites publiés, supprimable à tout moment).",
      price: `Gratuit : modèles, édition, exports et publication. Seule la rédaction par l'IA consomme quelques crédits, selon le travail réellement effectué (un message vous prévient avant la première utilisation), et rien n'est prélevé si elle échoue.`,
      legal: "Les modèles sont des créations originales de TechNova, dessinées en code : ils ne copient aucun modèle Canva ni d'un autre site. Vous pouvez les utiliser librement, y compris pour un usage commercial.",
    },
    sheet: {
      title: "Tableur : un mini Excel avec assistant IA",
      intro: "Le bouton « Tableur » sous la zone de message ouvre TechNova Tableur (Templates → « Tableur et Excel ») : des tableaux avec formules, mise en forme, graphiques et plusieurs feuilles, sans installer Excel, et un assistant IA qui vous aide à le remplir.",
      start: ["« Classeur vierge » pour partir de zéro.", `Un des ${sheetTemplates} modèles prêts à remplir : budget mensuel, suivi des ventes, facture, devis, inventaire et stock, trésorerie, tontine, notes des élèves, liste d'invités, planning de projet, calendrier de contenu, tableau de bord, liste de tâches, suivi des dépenses.`, "« Ouvrir un fichier Excel ou CSV » pour reprendre un fichier existant (et, depuis le classeur, les tableaux d'un PDF ou un fichier Google Drive).", "« Reprendre » rouvre le classeur que vous modifiiez sur cet appareil."],
      featuresTitle: "Ce que vous pouvez faire",
      features: [["Formules", "Plus de 50 fonctions, en français ou en anglais (SOMME ou SUM), avec ; ou , comme dans Excel. Cliquez sur les cellules pendant la saisie pour insérer leurs références ; les parenthèses se ferment toutes seules."], ["Mise en forme", "Taille, gras, italique, souligné, barré, couleur du texte et du fond, bordures, alignement, renvoi à la ligne, quadrillage affiché ou masqué, première ligne figée."], ["Formats", "Nombre, FCFA, euro, dollar, pourcentage, date, texte, nombre de décimales. Tapez « 15 % », « 12/01/2027 » ou « 25 000 FCFA » : le format se met tout seul."], ["Graphiques", "Histogramme, courbes, aires ou secteurs à partir de la sélection ; déplacez et redimensionnez-les sur la feuille, changez leur type, leur titre et leurs données."], ["Lignes, colonnes et tri", "Insérer ou supprimer des lignes et des colonnes (les formules suivent), trier de A à Z ou de Z à A, ajuster la largeur au contenu."], ["Recopier", "Tirez la poignée verte pour recopier une formule (les références avancent) ou prolonger une série 1, 2, 3…"], ["Plusieurs feuilles", "Ajoutez, renommez, dupliquez et supprimez des feuilles ; une formule peut citer une autre feuille ('Feuille 2'!A1)."], ["Barre d'état", "La somme, la moyenne et le nombre de valeurs de la sélection s'affichent en bas, comme dans Excel."]],
      fnTitle: "Les fonctions les plus utiles",
      fnNote: "Aussi : ARRONDI.SUP, ARRONDI.INF, ENT, ABS, MOD, RACINE, PUISSANCE, PRODUIT, MEDIANE, SI.CONDITIONS, ET, OU, NON, SOMME.SI.ENS, NB.SI.ENS, MAX.SI.ENS, MIN.SI.ENS, RECHERCHEH, INDEX, EQUIV, JOINDRE.TEXTE, GAUCHE, DROITE, STXT, NBCAR, MAJUSCULE, MINUSCULE, NOMPROPRE, SUPPRESPACE, DATE, ANNEE, MOIS, JOUR, MAINTENANT, ESTVIDE, ESTNUM, ESTERREUR. Les erreurs s'affichent comme dans Excel : #DIV/0!, #REF!, #NAME?, #N/A, #VALUE!, #CYCLE! pour une référence circulaire.",
      aiTitle: "L'assistant IA",
      ai: ["Cliquez sur « Assistant IA » : un panneau s'ouvre à droite. Il lit la feuille active et vous répond en français.", "Demandez ce que vous voulez : « crée un suivi des ventes de ma boutique », « ajoute une colonne marge », « mets ce tableau en forme », « crée un graphique », « explique la formule de E5 », « trouve les erreurs », « résume ces chiffres ».", "Quand il propose des changements (cellules, formules, mise en forme, graphique, nouvelle feuille), il les liste : rien ne change tant que vous n'avez pas cliqué sur « Appliquer ». Ctrl+Z annule.", `Chaque demande consomme quelques crédits selon le travail réellement effectué par le modèle (un message vous prévient avant la première demande) ; le nombre exact s'affiche sous la réponse, et rien n'est prélevé si l'assistant ne répond pas. Au plus ${SHEET_AI_PER_10_MIN} demandes par 10 minutes et ${SHEET_AI_PER_DAY} par jour.`],
      ioTitle: "Ouvrir et exporter",
      io: [["Ouvrir", `Fichiers Excel (.xlsx) avec formules, formats et largeurs, fichiers CSV, tableaux d'un PDF (lus par l'IA, pour quelques crédits : vérifiez les chiffres), fichiers Google Sheets et .xlsx de votre Google Drive connecté.`], ["Exporter", "Excel (.xlsx) avec formules, formats, quadrillage, première ligne figée et graphiques en images ; PDF ou impression (feuille active ou classeur entier) ; CSV ; Google Sheets (le .xlsx s'importe dans Sheets)."], ["Partager", "« Publier en lecture seule » crée une page en ligne du classeur (lien TechNova, GitHub, Netlify ou Vercel), à envoyer par WhatsApp."]],
      keysTitle: "Raccourcis clavier",
      keys: [["Entrée / Tab", "Valider et passer à la cellule du dessous / de droite"], ["F2 ou double-clic", "Modifier la cellule"], ["Ctrl + flèche", "Aller au bout des données"], ["Maj + flèche", "Étendre la sélection"], ["Ctrl+C / X / V", "Copier, couper, coller (les formules suivent)"], ["Ctrl+D", "Recopier vers le bas"], ["Ctrl+B / I / U", "Gras, italique, souligné"], ["Ctrl+Z / Y", "Annuler, rétablir"]],
      storage: "Comme dans Créativité, vos classeurs ne sont pas enregistrés sur nos serveurs. Un brouillon est gardé sur votre appareil (effacé à la déconnexion) : exportez en Excel pour conserver votre travail. Le contenu envoyé à l'assistant sert seulement à répondre et n'est pas conservé.",
    },
    media: {
      title: "Créer des images, de la musique et des vidéos",
      intro: "Sous la zone de message, « Création de musique » et « Création de vidéo » ouvrent un parcours guidé ; une image se demande simplement dans le chat (« génère une image de… »). Les créations sont gardées 14 jours : téléchargez-les. Une création qui échoue est remboursée.",
      table: [[mediaTiers.image_rapide.fr, `${mediaTiers.image_rapide.credits} crédits`], [mediaTiers.image_hd.fr, `${mediaTiers.image_hd.credits} crédits`], [mediaTiers.musique.fr, `${mediaTiers.musique.credits} crédits`], [mediaTiers.video_fast.fr, `${mediaTiers.video_fast.credits} crédits pour 5 secondes`], [mediaTiers.video_quality.fr, `${mediaTiers.video_quality.credits} crédits pour 5 secondes`]],
      videoTitle: "La durée des vidéos",
      video: `Une vidéo dure de ${VIDEO_MIN_SECONDS} à ${VIDEO_MAX_SECONDS} secondes. Indiquez-la dans votre demande (« une vidéo de 8 secondes ») ou choisissez-la dans le parcours vidéo (5, 8, 10 ou 15 s) ; sans précision, elle dure 5 secondes. Le prix suit la durée, seconde par seconde.`,
      note: "La vidéo est réservée aux forfaits qui l'incluent : le verrou s'affiche avant le moindre clic.",
    },
    news: {
      title: "Nouveautés de la version 1.6",
      intro: "Ce qui a été ajouté à TechNova AI Hub depuis la version précédente de cette documentation.",
      items: [["Tableur", `Un mini Excel complet : formules en français, formats FCFA, graphiques, plusieurs feuilles, imports Excel / CSV / PDF / Google Drive, exports Excel / PDF / Google Sheets, et un assistant IA à ${SHEET_AI_CREDITS} crédits la demande.`], ["Créativité", `${designTemplates} modèles de présentations, documents, CV, factures, flyers, invitations, cartes, logos et publications, avec un éditeur libre façon Canva.`], ["Invitations à partager", "Un lien avec compte à rebours, réponses par WhatsApp, itinéraire et ajout au calendrier."], ["Vidéos de 4 à 15 secondes", "La durée se choisit et le prix suit la durée, seconde par seconde."], ["Logos des modèles phares", "Chaque modèle phare (Creator et Pro) affiche le logo de son éditeur dans le menu des modes."], ["Sites du Studio plus soignés", "Design professionnel par défaut, icônes Font Awesome vérifiées, menu mobile propre, panneau de code plus confortable."]],
    },
    ill: { add: "Ajouter", emojis: "Emojis", pages: "Pages", share: "Partager sur WhatsApp", publish: "Publier", formula: "=SOMME(D2:D5)", assistant: "Assistant IA", apply: "Appliquer", aiMsg: "J'ajoute une colonne Marge et un graphique.", product: "Produit", qty: "Qté", total: "Total", chart: "Ventes par produit" },
  },
  en: {
    design: {
      title: "Creativity: presentations, résumés, flyers and invitations",
      intro: `The "Créativité" (Creativity) button under the message box opens TechNova Design (Templates → "Presentations & Canva"): ${designTemplates} original templates in ${DESIGN_FORMATS.length} formats, a free Canva-like editor, and exports ready to print or share. Templates, editing and exports are free.`,
      steps: [["Content", "Fill in the fields (title, texts, photos) or describe your project and click \"Write with AI\"."], ["Style", "Pick one of the 7 palettes and the accent colour."], ["Layout", "Move, resize and format every element; add pages, pictures, shapes and emojis."], ["Export and share", "Publish a link, share it on WhatsApp, print, save as PDF or open in PowerPoint, Google Slides or Canva."]],
      toolsTitle: "The editor, tool by tool",
      tools: [["Move and resize", "Click a text, picture or shape; drag it like a Word text box, pull the corner to resize. Arrow keys nudge by one pixel (Shift = 10 px)."], ["Write", "Double-click a text to type directly on the page."], ["Free fonts", `${DESIGN_FONTS.length} Google Fonts (SIL OFL or Apache licence) you may use, print and sell: ${fontList}…`], ["Formatting", "Size, bold, italic, underline, capitals, colour, highlight, left / centre / right / justified alignment, bullets, numbering, line spacing."], ["Pictures", "\"Import a picture\" from your computer or phone; double-click an \"Image\" frame to fill it. Photos are resized in your browser (1,600 px)."], ["Emojis and shapes", "Hundreds of Unicode emojis by theme (party, hearts, work, contact…), rectangles, circles and lines."], ["Pages", "Add, duplicate, reorder or delete pages in every format, not only presentations."], ["Undo", "60 steps back (Ctrl+Z / Ctrl+Y), Delete to remove, Ctrl+D to duplicate, bring to front / send to back."]],
      formatsTitle: "Formats",
      shareTitle: "Export and share",
      share: ["\"Publish and get a link\": an online page (TechNova link, GitHub, Netlify or Vercel), then \"Share on WhatsApp\" or \"Copy the link\".", "Print or save as PDF at the exact size (A4, A5, 85 × 55 mm business card…).", "Editable PowerPoint (.pptx) for every format: texts, shapes and pictures stay editable.", "Standalone HTML page, then Google Slides, PowerPoint online or Canva with import instructions."],
      invite: "For an invitation, the shared page adds a countdown, two WhatsApp reply buttons (\"I'll be there\", \"I can't come\") to the number you chose, Google Maps directions and \"Add to calendar\".",
      storage: "Your designs are not saved on our servers: they stay in your browser while you edit. Download or publish them before closing. Only a published page is kept (in your published sites, deletable at any time).",
      price: `Free: templates, editing, exports and publishing. Only AI writing uses a few credits, depending on the work really done (a notice tells you before the first use), and nothing is charged if it fails.`,
      legal: "The templates are original TechNova designs drawn in code: they copy no Canva template or any other site's. You may use them freely, including commercially.",
    },
    sheet: {
      title: "Spreadsheet: a mini Excel with an AI assistant",
      intro: "The \"Tableur\" (Spreadsheet) button under the message box opens TechNova Tableur (Templates → \"Spreadsheets & Excel\"): tables with formulas, formatting, charts and several sheets, without installing Excel, plus an AI assistant that helps you fill it.",
      start: ["\"Blank workbook\" to start from scratch.", `One of the ${sheetTemplates} ready-to-fill templates: monthly budget, sales tracker, invoice, quote, inventory, cash flow, savings circle (tontine), student grades, guest list, project plan, content calendar, dashboard, to-do list, expense tracker.`, "\"Open an Excel or CSV file\" to continue an existing file (and, inside the workbook, the tables of a PDF or a Google Drive file).", "\"Resume\" reopens the workbook you were editing on this device."],
      featuresTitle: "What you can do",
      features: [["Formulas", "50+ functions, with French or English names (SOMME or SUM), using ; or , like Excel. Click cells while typing to insert their references; brackets close themselves."], ["Formatting", "Size, bold, italic, underline, strikethrough, text and fill colour, borders, alignment, wrap, gridlines on or off, frozen top row."], ["Formats", "Number, FCFA, euro, dollar, percent, date, text, decimals. Type \"15%\", \"12/01/2027\" or \"25,000 FCFA\": the format applies itself."], ["Charts", "Column, line, area or pie from the selection; move and resize them on the sheet, change their type, title and data."], ["Rows, columns, sorting", "Insert or delete rows and columns (formulas follow), sort A to Z or Z to A, fit the column width."], ["Fill", "Drag the green handle to copy a formula (references move) or extend a series 1, 2, 3…"], ["Several sheets", "Add, rename, duplicate and delete sheets; a formula can use another sheet ('Feuille 2'!A1)."], ["Status bar", "Sum, average and count of the selection at the bottom, like Excel."]],
      fnTitle: "The most useful functions",
      fnNote: "Also: ROUNDUP, ROUNDDOWN, INT, ABS, MOD, SQRT, POWER, PRODUCT, MEDIAN, IFS, AND, OR, NOT, SUMIFS, COUNTIFS, MAXIFS, MINIFS, HLOOKUP, INDEX, MATCH, TEXTJOIN, LEFT, RIGHT, MID, LEN, UPPER, LOWER, PROPER, TRIM, DATE, YEAR, MONTH, DAY, NOW, ISBLANK, ISNUMBER, ISERROR (French names work too). Errors show as in Excel: #DIV/0!, #REF!, #NAME?, #N/A, #VALUE!, and #CYCLE! for a circular reference.",
      aiTitle: "The AI assistant",
      ai: ["Click \"AI assistant\": a panel opens on the right. It reads the active sheet and answers in your language.", "Ask anything: \"create a sales tracker for my shop\", \"add a margin column\", \"format this table\", \"create a chart\", \"explain the formula in E5\", \"find errors\", \"summarise these figures\".", "When it proposes changes (cells, formulas, formatting, chart, new sheet), it lists them: nothing changes until you click \"Apply\". Ctrl+Z undoes it.", `Each request uses a few credits depending on the work the model really did (a notice tells you before the first request); the exact number shows under the answer, and nothing is charged if the assistant does not answer. At most ${SHEET_AI_PER_10_MIN} requests per 10 minutes and ${SHEET_AI_PER_DAY} per day.`],
      ioTitle: "Open and export",
      io: [["Open", `Excel files (.xlsx) with formulas, formats and widths, CSV files, tables from a PDF (read by AI, for a few credits: check the figures), Google Sheets and .xlsx files from your connected Google Drive.`], ["Export", "Excel (.xlsx) with formulas, formats, gridlines, frozen row and charts as pictures; PDF or print (active sheet or whole workbook); CSV; Google Sheets (import the .xlsx into Sheets)."], ["Share", "\"Publish read-only\" creates an online page of the workbook (TechNova link, GitHub, Netlify or Vercel) to send on WhatsApp."]],
      keysTitle: "Keyboard shortcuts",
      keys: [["Enter / Tab", "Confirm and move down / right"], ["F2 or double-click", "Edit the cell"], ["Ctrl + arrow", "Jump to the edge of the data"], ["Shift + arrow", "Extend the selection"], ["Ctrl+C / X / V", "Copy, cut, paste (formulas follow)"], ["Ctrl+D", "Fill down"], ["Ctrl+B / I / U", "Bold, italic, underline"], ["Ctrl+Z / Y", "Undo, redo"]],
      storage: "As with Creativity, your workbooks are not saved on our servers. A draft is kept on your device (cleared when you sign out): export to Excel to keep your work. What you send to the assistant is only used to answer and is not kept.",
    },
    media: {
      title: "Create pictures, music and videos",
      intro: "Under the message box, \"Create a song\" and \"Create a video\" open a guided journey; for a picture, just ask in the chat (\"generate a picture of…\"). Creations are kept 14 days: download them. A failed creation is refunded.",
      table: [[mediaTiers.image_rapide.en, `${mediaTiers.image_rapide.credits} credits`], [mediaTiers.image_hd.en, `${mediaTiers.image_hd.credits} credits`], [mediaTiers.musique.en, `${mediaTiers.musique.credits} credits`], [mediaTiers.video_fast.en, `${mediaTiers.video_fast.credits} credits for 5 seconds`], [mediaTiers.video_quality.en, `${mediaTiers.video_quality.credits} credits for 5 seconds`]],
      videoTitle: "Video length",
      video: `A video lasts ${VIDEO_MIN_SECONDS} to ${VIDEO_MAX_SECONDS} seconds. Say it in your request ("an 8-second video") or choose it in the video journey (5, 8, 10 or 15 s); otherwise it lasts 5 seconds. The price follows the length, second by second.`,
      note: "Video is reserved to the plans that include it: the lock shows before any click.",
    },
    news: {
      title: "What's new in version 1.6",
      intro: "What was added to TechNova AI Hub since the previous version of this documentation.",
      items: [["Spreadsheet", `A complete mini Excel: formulas, currency formats, charts, several sheets, Excel / CSV / PDF / Google Drive imports, Excel / PDF / Google Sheets exports, and an AI assistant at ${SHEET_AI_CREDITS} credits a request.`], ["Creativity", `${designTemplates} templates for presentations, documents, résumés, invoices, flyers, invitations, cards, logos and posts, with a free Canva-like editor.`], ["Shareable invitations", "A link with countdown, WhatsApp replies, directions and add-to-calendar."], ["4 to 15-second videos", "Choose the length; the price follows it second by second."], ["Flagship model logos", "Each flagship model (Creator and Pro) shows its maker's logo in the modes menu."], ["Better Studio sites", "Professional design by default, checked Font Awesome icons, clean mobile menu, roomier code panel."]],
    },
    ill: { add: "Add", emojis: "Emojis", pages: "Pages", share: "Share on WhatsApp", publish: "Publish", formula: "=SUM(D2:D5)", assistant: "AI assistant", apply: "Apply", aiMsg: "I add a Margin column and a chart.", product: "Product", qty: "Qty", total: "Total", chart: "Sales by product" },
  },
  es: {
    design: {
      title: "Creatividad: presentaciones, CV, flyers e invitaciones",
      intro: `El botón «Créativité» (Creatividad) bajo el cuadro de mensaje abre TechNova Design (Templates → «Presentations & Canva»): ${designTemplates} plantillas originales en ${DESIGN_FORMATS.length} formatos, un editor libre como Canva y exportaciones listas para imprimir o compartir. Plantillas, edición y exportaciones son gratis.`,
      steps: [["Contenido", "Rellene los campos (título, textos, fotos) o describa su proyecto y pulse «Escribir con IA»."], ["Estilo", "Elija una de las 7 paletas y el color de acento."], ["Diseño", "Mueva, redimensione y dé formato a cada elemento; añada páginas, imágenes, formas y emojis."], ["Exportar y compartir", "Publique un enlace, compártalo por WhatsApp, imprima, guarde en PDF o abra en PowerPoint, Google Slides o Canva."]],
      toolsTitle: "El editor, herramienta por herramienta",
      tools: [["Mover y redimensionar", "Haga clic en un texto, imagen o forma; arrástrelo como un cuadro de texto de Word y tire de la esquina para redimensionarlo. Flechas del teclado para ajustar al píxel (Mayús = 10 px)."], ["Escribir", "Doble clic en un texto para escribir directamente en la página."], ["Fuentes libres", `${DESIGN_FONTS.length} fuentes de Google Fonts (licencia SIL OFL o Apache) que puede usar, imprimir y vender: ${fontList}…`], ["Formato", "Tamaño, negrita, cursiva, subrayado, mayúsculas, color, resaltado, alineación izquierda / centro / derecha / justificada, viñetas, numeración, interlineado."], ["Imágenes", "«Importar una imagen» desde su ordenador o teléfono; doble clic en un marco «Imagen» para llenarlo. Las fotos se reducen en su navegador (1.600 px)."], ["Emojis y formas", "Cientos de emojis Unicode por tema, rectángulos, círculos y líneas."], ["Páginas", "Añada, duplique, reordene o elimine páginas en todos los formatos."], ["Deshacer", "60 pasos atrás (Ctrl+Z / Ctrl+Y), Supr para borrar, Ctrl+D para duplicar, capas adelante / atrás."]],
      formatsTitle: "Formatos",
      shareTitle: "Exportar y compartir",
      share: ["«Publicar y obtener un enlace»: una página en línea (enlace TechNova, GitHub, Netlify o Vercel), luego «Compartir en WhatsApp» o «Copiar el enlace».", "Imprimir o guardar en PDF al tamaño exacto (A4, A5, tarjeta de 85 × 55 mm…).", "PowerPoint (.pptx) editable para todos los formatos.", "Página HTML autónoma, luego Google Slides, PowerPoint en línea o Canva con instrucciones de importación."],
      invite: "En una invitación, la página compartida añade una cuenta atrás, dos botones de respuesta por WhatsApp hacia el número elegido, la ruta en Google Maps y «Añadir al calendario».",
      storage: "Sus diseños no se guardan en nuestros servidores: permanecen en su navegador mientras edita. Descárguelos o publíquelos antes de cerrar. Solo se conserva una página publicada (en sus sitios publicados, eliminable en cualquier momento).",
      price: `Gratis: plantillas, edición, exportaciones y publicación. Solo la redacción con IA consume algunos créditos, según el trabajo realizado (un aviso le informa antes del primer uso), y no se cobra nada si falla.`,
      legal: "Las plantillas son creaciones originales de TechNova dibujadas en código: no copian ninguna plantilla de Canva ni de otro sitio. Puede usarlas libremente, también con fines comerciales.",
    },
    sheet: {
      title: "Hoja de cálculo: un mini Excel con asistente IA",
      intro: "El botón «Tableur» (Hoja de cálculo) bajo el cuadro de mensaje abre TechNova Tableur (Templates → «Spreadsheets & Excel»): tablas con fórmulas, formato, gráficos y varias hojas, sin instalar Excel, y un asistente IA que le ayuda a rellenarla.",
      start: ["«Libro en blanco» para empezar de cero.", `Una de las ${sheetTemplates} plantillas: presupuesto mensual, ventas, factura, presupuesto, inventario, tesorería, tontina, notas de alumnos, lista de invitados, planificación de proyecto, calendario de contenidos, panel mensual, lista de tareas, gastos.`, "«Abrir un archivo Excel o CSV» (y, dentro del libro, las tablas de un PDF o un archivo de Google Drive).", "«Retomar» vuelve a abrir el libro que editaba en este dispositivo."],
      featuresTitle: "Lo que puede hacer",
      features: [["Fórmulas", "Más de 50 funciones, con nombres en francés o en inglés (SOMME o SUM), con ; o , como en Excel. Haga clic en las celdas mientras escribe para insertar sus referencias."], ["Formato", "Tamaño, negrita, cursiva, subrayado, tachado, color de texto y relleno, bordes, alineación, ajuste de texto, cuadrícula visible u oculta, primera fila fija."], ["Formatos", "Número, FCFA, euro, dólar, porcentaje, fecha, texto, decimales; el formato se aplica solo al escribir «15 %» o «12/01/2027»."], ["Gráficos", "Columnas, líneas, áreas o sectores desde la selección; muévalos y redimensiónelos sobre la hoja."], ["Filas, columnas y orden", "Insertar o eliminar filas y columnas (las fórmulas siguen), ordenar de A a Z o de Z a A."], ["Rellenar", "Arrastre el tirador verde para copiar una fórmula o prolongar una serie."], ["Varias hojas", "Añada, renombre, duplique y elimine hojas; una fórmula puede citar otra hoja."], ["Barra de estado", "Suma, promedio y recuento de la selección abajo, como en Excel."]],
      fnTitle: "Las funciones más útiles",
      fnNote: "También: ROUNDUP, ROUNDDOWN, INT, ABS, MOD, SQRT, POWER, PRODUCT, MEDIAN, IFS, AND, OR, NOT, SUMIFS, COUNTIFS, HLOOKUP, INDEX, MATCH, TEXTJOIN, LEFT, RIGHT, MID, LEN, UPPER, LOWER, TRIM, DATE, YEAR, MONTH, DAY, NOW (también en francés). Los errores se muestran como en Excel: #DIV/0!, #REF!, #NAME?, #N/A, #VALUE! y #CYCLE! para una referencia circular.",
      aiTitle: "El asistente IA",
      ai: ["Pulse «Asistente IA»: se abre un panel a la derecha que lee la hoja activa.", "Pida lo que quiera: «crea un seguimiento de ventas», «añade una columna de margen», «da formato a esta tabla», «crea un gráfico», «explica la fórmula de E5».", "Cuando propone cambios, los enumera: nada cambia hasta que pulse «Aplicar». Ctrl+Z deshace.", `Cada solicitud consume algunos créditos según el trabajo realizado (un aviso le informa antes de la primera); el número exacto aparece bajo la respuesta y no se cobra nada si el asistente no responde. Como máximo ${SHEET_AI_PER_10_MIN} solicitudes cada 10 minutos y ${SHEET_AI_PER_DAY} al día.`],
      ioTitle: "Abrir y exportar",
      io: [["Abrir", `Archivos Excel (.xlsx) con fórmulas y formatos, CSV, tablas de un PDF (leídas por IA, por algunos créditos: revise las cifras), Google Sheets y .xlsx de su Google Drive conectado.`], ["Exportar", "Excel (.xlsx) con fórmulas, formatos y gráficos en imagen; PDF o impresión; CSV; Google Sheets."], ["Compartir", "«Publicar en solo lectura» crea una página en línea del libro, para enviar por WhatsApp."]],
      keysTitle: "Atajos de teclado",
      keys: [["Intro / Tab", "Validar y bajar / ir a la derecha"], ["F2 o doble clic", "Editar la celda"], ["Ctrl + flecha", "Ir al borde de los datos"], ["Mayús + flecha", "Ampliar la selección"], ["Ctrl+C / X / V", "Copiar, cortar, pegar"], ["Ctrl+D", "Rellenar hacia abajo"], ["Ctrl+B / I / U", "Negrita, cursiva, subrayado"], ["Ctrl+Z / Y", "Deshacer, rehacer"]],
      storage: "Sus libros no se guardan en nuestros servidores. Se guarda un borrador en su dispositivo (borrado al cerrar sesión): exporte a Excel para conservar su trabajo.",
    },
    media: {
      title: "Crear imágenes, música y vídeos",
      intro: "Bajo el cuadro de mensaje, «Crear música» y «Crear vídeo» abren un recorrido guiado; una imagen se pide en el chat. Las creaciones se guardan 14 días: descárguelas. Una creación fallida se reembolsa.",
      table: [[mediaTiers.image_rapide.en, `${mediaTiers.image_rapide.credits} créditos`], [mediaTiers.image_hd.en, `${mediaTiers.image_hd.credits} créditos`], [mediaTiers.musique.en, `${mediaTiers.musique.credits} créditos`], [mediaTiers.video_fast.en, `${mediaTiers.video_fast.credits} créditos por 5 segundos`], [mediaTiers.video_quality.en, `${mediaTiers.video_quality.credits} créditos por 5 segundos`]],
      videoTitle: "Duración de los vídeos",
      video: `Un vídeo dura de ${VIDEO_MIN_SECONDS} a ${VIDEO_MAX_SECONDS} segundos. Indíquelo en su solicitud o elíjalo en el recorrido (5, 8, 10 o 15 s); sin precisión dura 5 segundos. El precio sigue la duración, segundo a segundo.`,
      note: "El vídeo está reservado a los planes que lo incluyen: el candado aparece antes de cualquier clic.",
    },
    news: {
      title: "Novedades de la versión 1.6",
      intro: "Lo que se añadió a TechNova AI Hub desde la versión anterior de esta documentación.",
      items: [["Hoja de cálculo", `Un mini Excel completo con fórmulas, formatos, gráficos, varias hojas, importaciones y exportaciones, y un asistente IA a ${SHEET_AI_CREDITS} créditos por solicitud.`], ["Creatividad", `${designTemplates} plantillas con un editor libre al estilo Canva.`], ["Invitaciones para compartir", "Un enlace con cuenta atrás, respuestas por WhatsApp, ruta y calendario."], ["Vídeos de 4 a 15 segundos", "El precio sigue la duración, segundo a segundo."], ["Logos de los modelos destacados", "Cada modelo destacado muestra el logo de su editor."], ["Sitios del Studio más cuidados", "Diseño profesional por defecto, iconos verificados, menú móvil limpio."]],
    },
    ill: { add: "Añadir", emojis: "Emojis", pages: "Páginas", share: "Compartir en WhatsApp", publish: "Publicar", formula: "=SUM(D2:D5)", assistant: "Asistente IA", apply: "Aplicar", aiMsg: "Añado una columna Margen y un gráfico.", product: "Producto", qty: "Cant.", total: "Total", chart: "Ventas por producto" },
  },
  pt: {
    design: {
      title: "Criatividade: apresentações, currículos, flyers e convites",
      intro: `O botão «Créativité» (Criatividade) sob a área de mensagem abre o TechNova Design (Templates → «Presentations & Canva»): ${designTemplates} modelos originais em ${DESIGN_FORMATS.length} formatos, um editor livre como o Canva e exportações prontas para imprimir ou compartilhar. Modelos, edição e exportações são gratuitos.`,
      steps: [["Conteúdo", "Preencha os campos (título, textos, fotos) ou descreva o seu projeto e clique em «Escrever com IA»."], ["Estilo", "Escolha uma das 7 paletas e a cor de destaque."], ["Diagramação", "Mova, redimensione e formate cada elemento; adicione páginas, imagens, formas e emojis."], ["Exportar e compartilhar", "Publique um link, compartilhe no WhatsApp, imprima, salve em PDF ou abra no PowerPoint, Google Slides ou Canva."]],
      toolsTitle: "O editor, ferramenta por ferramenta",
      tools: [["Mover e redimensionar", "Clique num texto, imagem ou forma; arraste como uma caixa de texto do Word e puxe o canto para redimensionar. Setas do teclado ajustam ao pixel (Shift = 10 px)."], ["Escrever", "Clique duas vezes num texto para escrever direto na página."], ["Fontes livres", `${DESIGN_FONTS.length} fontes do Google Fonts (licença SIL OFL ou Apache) que pode usar, imprimir e vender: ${fontList}…`], ["Formatação", "Tamanho, negrito, itálico, sublinhado, maiúsculas, cor, marca-texto, alinhamento à esquerda / centro / direita / justificado, marcadores, numeração, entrelinha."], ["Imagens", "«Importar uma imagem» do computador ou do celular; clique duas vezes num quadro «Imagem» para preenchê-lo."], ["Emojis e formas", "Centenas de emojis Unicode por tema, retângulos, círculos e linhas."], ["Páginas", "Adicione, duplique, reordene ou exclua páginas em todos os formatos."], ["Desfazer", "60 passos atrás (Ctrl+Z / Ctrl+Y), Delete para apagar, Ctrl+D para duplicar, camadas."]],
      formatsTitle: "Formatos",
      shareTitle: "Exportar e compartilhar",
      share: ["«Publicar e obter um link»: uma página on-line (link TechNova, GitHub, Netlify ou Vercel), depois «Compartilhar no WhatsApp» ou «Copiar o link».", "Imprimir ou salvar em PDF no tamanho exato (A4, A5, cartão de 85 × 55 mm…).", "PowerPoint (.pptx) editável para todos os formatos.", "Página HTML autônoma, depois Google Slides, PowerPoint on-line ou Canva com instruções de importação."],
      invite: "Num convite, a página compartilhada adiciona uma contagem regressiva, dois botões de resposta pelo WhatsApp para o número escolhido, o trajeto no Google Maps e «Adicionar ao calendário».",
      storage: "Os seus designs não são salvos nos nossos servidores: ficam no seu navegador durante a edição. Baixe-os ou publique-os antes de fechar. Só uma página publicada é mantida (nos seus sites publicados, removível a qualquer momento).",
      price: `Gratuito: modelos, edição, exportações e publicação. Só a redação por IA consome alguns créditos, conforme o trabalho realizado (um aviso informa antes do primeiro uso), e nada é cobrado se falhar.`,
      legal: "Os modelos são criações originais da TechNova desenhadas em código: não copiam nenhum modelo do Canva ou de outro site. Pode usá-los livremente, inclusive comercialmente.",
    },
    sheet: {
      title: "Planilha: um mini Excel com assistente de IA",
      intro: "O botão «Tableur» (Planilha) sob a área de mensagem abre o TechNova Tableur (Templates → «Spreadsheets & Excel»): tabelas com fórmulas, formatação, gráficos e várias abas, sem instalar o Excel, e um assistente de IA que ajuda a preenchê-la.",
      start: ["«Pasta em branco» para começar do zero.", `Um dos ${sheetTemplates} modelos: orçamento mensal, vendas, fatura, orçamento de serviço, estoque, fluxo de caixa, tontina, notas de alunos, lista de convidados, planejamento de projeto, calendário de conteúdo, painel mensal, lista de tarefas, despesas.`, "«Abrir um arquivo Excel ou CSV» (e, dentro da pasta, as tabelas de um PDF ou um arquivo do Google Drive).", "«Retomar» reabre a pasta que você editava neste aparelho."],
      featuresTitle: "O que você pode fazer",
      features: [["Fórmulas", "Mais de 50 funções, com nomes em francês ou inglês (SOMME ou SUM), com ; ou , como no Excel. Clique nas células durante a digitação para inserir as referências."], ["Formatação", "Tamanho, negrito, itálico, sublinhado, tachado, cor do texto e do fundo, bordas, alinhamento, quebra de linha, linhas de grade, primeira linha fixa."], ["Formatos", "Número, FCFA, euro, dólar, porcentagem, data, texto, casas decimais; o formato se aplica sozinho ao digitar «15 %» ou «12/01/2027»."], ["Gráficos", "Colunas, linhas, áreas ou pizza a partir da seleção; mova e redimensione sobre a planilha."], ["Linhas, colunas e ordenação", "Inserir ou excluir linhas e colunas (as fórmulas acompanham), ordenar de A a Z ou de Z a A."], ["Preencher", "Arraste a alça verde para copiar uma fórmula ou continuar uma série."], ["Várias abas", "Adicione, renomeie, duplique e exclua abas; uma fórmula pode citar outra aba."], ["Barra de status", "Soma, média e contagem da seleção embaixo, como no Excel."]],
      fnTitle: "As funções mais úteis",
      fnNote: "Também: ROUNDUP, ROUNDDOWN, INT, ABS, MOD, SQRT, POWER, PRODUCT, MEDIAN, IFS, AND, OR, NOT, SUMIFS, COUNTIFS, HLOOKUP, INDEX, MATCH, TEXTJOIN, LEFT, RIGHT, MID, LEN, UPPER, LOWER, TRIM, DATE, YEAR, MONTH, DAY, NOW (também em francês). Os erros aparecem como no Excel: #DIV/0!, #REF!, #NAME?, #N/A, #VALUE! e #CYCLE! para uma referência circular.",
      aiTitle: "O assistente de IA",
      ai: ["Clique em «Assistente IA»: um painel abre à direita e lê a aba ativa.", "Peça o que quiser: «crie um controle de vendas», «adicione uma coluna de margem», «formate esta tabela», «crie um gráfico», «explique a fórmula de E5».", "Quando propõe mudanças, ele as lista: nada muda até você clicar em «Aplicar». Ctrl+Z desfaz.", `Cada pedido consome alguns créditos conforme o trabalho realizado (um aviso informa antes do primeiro); o número exato aparece sob a resposta e nada é cobrado se o assistente não responder. No máximo ${SHEET_AI_PER_10_MIN} pedidos a cada 10 minutos e ${SHEET_AI_PER_DAY} por dia.`],
      ioTitle: "Abrir e exportar",
      io: [["Abrir", `Arquivos Excel (.xlsx) com fórmulas e formatos, CSV, tabelas de um PDF (lidas por IA, por alguns créditos: confira os números), Google Sheets e .xlsx do seu Google Drive conectado.`], ["Exportar", "Excel (.xlsx) com fórmulas, formatos e gráficos em imagem; PDF ou impressão; CSV; Google Sheets."], ["Compartilhar", "«Publicar somente leitura» cria uma página on-line da pasta, para enviar pelo WhatsApp."]],
      keysTitle: "Atalhos de teclado",
      keys: [["Enter / Tab", "Confirmar e descer / ir à direita"], ["F2 ou clique duplo", "Editar a célula"], ["Ctrl + seta", "Ir ao fim dos dados"], ["Shift + seta", "Ampliar a seleção"], ["Ctrl+C / X / V", "Copiar, recortar, colar"], ["Ctrl+D", "Preencher para baixo"], ["Ctrl+B / I / U", "Negrito, itálico, sublinhado"], ["Ctrl+Z / Y", "Desfazer, refazer"]],
      storage: "As suas pastas não são salvas nos nossos servidores. Um rascunho fica no seu aparelho (apagado ao sair): exporte para Excel para guardar o seu trabalho.",
    },
    media: {
      title: "Criar imagens, música e vídeos",
      intro: "Sob a área de mensagem, «Criar música» e «Criar vídeo» abrem um percurso guiado; uma imagem se pede no chat. As criações ficam 14 dias: baixe-as. Uma criação que falha é reembolsada.",
      table: [[mediaTiers.image_rapide.en, `${mediaTiers.image_rapide.credits} créditos`], [mediaTiers.image_hd.en, `${mediaTiers.image_hd.credits} créditos`], [mediaTiers.musique.en, `${mediaTiers.musique.credits} créditos`], [mediaTiers.video_fast.en, `${mediaTiers.video_fast.credits} créditos por 5 segundos`], [mediaTiers.video_quality.en, `${mediaTiers.video_quality.credits} créditos por 5 segundos`]],
      videoTitle: "Duração dos vídeos",
      video: `Um vídeo dura de ${VIDEO_MIN_SECONDS} a ${VIDEO_MAX_SECONDS} segundos. Diga no seu pedido ou escolha no percurso (5, 8, 10 ou 15 s); sem precisar, dura 5 segundos. O preço acompanha a duração, segundo a segundo.`,
      note: "O vídeo é reservado aos planos que o incluem: o cadeado aparece antes de qualquer clique.",
    },
    news: {
      title: "Novidades da versão 1.6",
      intro: "O que foi adicionado à TechNova AI Hub desde a versão anterior desta documentação.",
      items: [["Planilha", `Um mini Excel completo com fórmulas, formatos, gráficos, várias abas, importações e exportações, e um assistente de IA a ${SHEET_AI_CREDITS} créditos por pedido.`], ["Criatividade", `${designTemplates} modelos com um editor livre no estilo Canva.`], ["Convites para compartilhar", "Um link com contagem regressiva, respostas pelo WhatsApp, trajeto e calendário."], ["Vídeos de 4 a 15 segundos", "O preço acompanha a duração, segundo a segundo."], ["Logos dos modelos de destaque", "Cada modelo de destaque mostra o logo do seu fabricante."], ["Sites do Studio mais caprichados", "Design profissional por padrão, ícones verificados, menu móvel limpo."]],
    },
    ill: { add: "Adicionar", emojis: "Emojis", pages: "Páginas", share: "Compartilhar no WhatsApp", publish: "Publicar", formula: "=SUM(D2:D5)", assistant: "Assistente IA", apply: "Aplicar", aiMsg: "Adiciono uma coluna Margem e um gráfico.", product: "Produto", qty: "Qtd.", total: "Total", chart: "Vendas por produto" },
  },
};

// ------------------------------------------------------------------ building blocks

const sub = "mt-7 font-display text-lg font-semibold";
const p = "mt-3 leading-relaxed text-muted-foreground";
const Card = ({ icon: I, title, children, tint }: { icon: typeof Check; title: string; children: ReactNode; tint: string }) => <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
  <div className="flex items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: `${tint}1a`, color: tint }}><I className="size-4" /></span><p className="font-semibold">{title}</p></div>
  <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{children}</div>
</div>;
const Note = ({ icon: I, children, tint = "#6b7280" }: { icon: typeof Check; children: ReactNode; tint?: string }) => <p className={`${p} flex gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm shadow-sm`}><I className="mt-0.5 size-4 shrink-0" style={{ color: tint }} /><span>{children}</span></p>;

/** Coloured step flow: 1 → 2 → 3 → 4. */
function Flow({ steps, colors }: { steps: [string, string][]; colors: string[] }) {
  return <ol className="mt-5 grid gap-3 md:grid-cols-4">{steps.map(([t, d], i) => <li key={t} className="relative rounded-2xl border border-border bg-card p-4 shadow-sm">
    <span className="grid size-8 place-items-center rounded-full text-sm font-bold text-white" style={{ background: colors[i % colors.length] }}>{i + 1}</span>
    <p className="mt-2.5 font-semibold">{t}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</p>
    {i < steps.length - 1 && <ArrowRight className="absolute -right-3 top-6 z-10 hidden size-5 rounded-full bg-background text-muted-foreground md:block" />}
  </li>)}</ol>;
}

/** The Creativity editor, drawn in code (no screenshot). */
function DesignIllustration({ t }: { t: Guide5["ill"] }) {
  return <figure className="mt-5 overflow-hidden rounded-2xl border border-border bg-[#f4f4f6] shadow-sm" aria-hidden="true">
    <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-white px-3 py-2">
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />)}
      <span className="ml-3 flex gap-1">{["B", "I", "U"].map((x) => <span key={x} className="grid size-5 place-items-center rounded bg-zinc-100 text-[10px] font-bold text-zinc-700">{x}</span>)}<span className="ml-1 rounded bg-zinc-100 px-1.5 text-[10px] leading-5 text-zinc-700" style={{ fontFamily: "Georgia, serif" }}>Playfair Display</span></span>
      <span className="ml-auto rounded-full bg-[#25D366] px-2.5 py-1 text-[10px] font-semibold text-white">{t.share}</span>
    </div>
    <div className="grid grid-cols-[110px_1fr] gap-0">
      <div className="space-y-1.5 border-r border-zinc-200 bg-white p-2.5 text-[10px] text-zinc-700">
        {[t.add, t.emojis, t.pages].map((x, i) => <div key={x} className={`rounded-md px-2 py-1 ${i === 0 ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>{x}</div>)}
        <div className="grid grid-cols-4 gap-1 pt-1 text-[12px]">{["🎉", "💍", "🌸", "✨", "📅", "📍", "🥂", "💐"].map((e) => <span key={e}>{e}</span>)}</div>
      </div>
      <div className="grid place-items-center p-5">
        <div className="relative w-[220px] rounded-md bg-[#f7f3ec] p-4 text-center shadow-lg" style={{ aspectRatio: "148/210" }}>
          <div className="absolute inset-2 rounded border border-[#c9a96e]" />
          <p className="mt-6 text-[7px] font-bold uppercase tracking-[0.2em] text-[#8a6a3d]">Vous êtes invités</p>
          <p className="mt-2 text-[17px] leading-tight text-[#2b2620]" style={{ fontFamily: "'Great Vibes', 'Brush Script MT', cursive" }}>Fifamè &amp; Jonas</p>
          <div className="mx-auto mt-2 h-px w-8 bg-[#8a6a3d]" />
          <p className="mt-2 text-[8px] font-semibold text-[#2b2620]">Samedi 20 juin 2027 · 15 h</p>
          <p className="mt-1 text-[7px] text-[#7d7468]">Porto-Novo</p>
          <div className="absolute left-[34px] top-[52px] h-[30px] w-[152px] rounded-sm border-2 border-[#7c5cff]"><span className="absolute -bottom-1 -right-1 size-2 rounded-sm bg-[#7c5cff]" /></div>
        </div>
      </div>
    </div>
  </figure>;
}

/** The spreadsheet editor with its AI panel, drawn in code. */
function SheetIllustration({ t }: { t: Guide5["ill"] }) {
  const rows: [string, number, number][] = [["Savon karité", 24, 1500], ["Huile de coco", 6, 3500], ["Beurre de karité", 10, 2500], ["Pagne wax", 4, 9000]];
  const max = Math.max(...rows.map((r) => r[1] * r[2]));
  return <figure className="mt-5 overflow-hidden rounded-2xl border border-border bg-white text-zinc-800 shadow-sm" aria-hidden="true">
    <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2">
      <span className="grid size-6 place-items-center rounded-md bg-[#1f7a5a] text-white"><FileSpreadsheet className="size-3.5" /></span>
      <span className="text-[11px] font-semibold">Ventes · février</span>
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#1f7a5a] px-2.5 py-1 text-[10px] font-semibold text-white"><Sparkles className="size-3" />{t.assistant}</span>
    </div>
    <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-1.5 font-mono text-[10px]"><span className="rounded border border-zinc-200 px-1.5">D6</span><i className="font-serif text-zinc-400">fx</i><span>{t.formula}</span></div>
    <div className="grid md:grid-cols-[1fr_200px]">
      <div className="p-3">
        <table className="w-full border-collapse text-[10px]">
          <thead><tr>{["", "A", "B", "C", "D"].map((h) => <th key={h} className="border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-medium text-zinc-400">{h}</th>)}</tr></thead>
          <tbody>
            <tr><td className="border border-zinc-200 bg-zinc-50 px-1 text-center text-zinc-400">1</td>{[t.product, t.qty, "Prix", t.total].map((h) => <td key={h} className="border border-zinc-200 bg-[#1f7a5a] px-1.5 py-0.5 text-center font-semibold text-white">{h}</td>)}</tr>
            {rows.map(([n, q, pr], i) => <tr key={n} className={i % 2 ? "bg-zinc-50" : ""}><td className="border border-zinc-200 bg-zinc-50 px-1 text-center text-zinc-400">{i + 2}</td><td className="border border-zinc-200 px-1.5">{n}</td><td className="border border-zinc-200 px-1.5 text-right">{q}</td><td className="border border-zinc-200 px-1.5 text-right">{pr.toLocaleString("fr-FR")} FCFA</td><td className="border border-zinc-200 px-1.5 text-right">{(q * pr).toLocaleString("fr-FR")} FCFA</td></tr>)}
            <tr><td className="border border-zinc-200 bg-zinc-50 px-1 text-center text-zinc-400">6</td><td className="border border-zinc-200 px-1.5 font-bold" colSpan={3}>{t.total}</td><td className="border-2 border-[#1f7a5a] px-1.5 text-right font-bold">{rows.reduce((s, r) => s + r[1] * r[2], 0).toLocaleString("fr-FR")} FCFA</td></tr>
          </tbody>
        </table>
        <div className="mt-3 rounded-xl border border-zinc-200 p-2.5">
          <p className="text-[10px] font-semibold">{t.chart}</p>
          <div className="mt-2 flex h-20 items-end gap-3 border-b border-zinc-200 px-1">{rows.map(([n, q, pr], i) => <div key={n} className="flex-1 rounded-t" style={{ height: `${(q * pr) / max * 100}%`, background: ["#2563eb", "#16a34a", "#ea580c", "#9333ea"][i] }} />)}</div>
        </div>
      </div>
      <div className="border-l border-zinc-200 bg-zinc-50 p-3 text-[10px]">
        <p className="ml-auto w-fit rounded-xl bg-[#1f7a5a] px-2.5 py-1.5 text-white">Ajoute la marge et un graphique</p>
        <div className="mt-2 rounded-xl bg-white p-2 shadow-sm">
          <p>{t.aiMsg}</p>
          <ul className="mt-1.5 space-y-0.5 text-zinc-500"><li>• E1:E5</li><li>• Graphique</li></ul>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1f7a5a] px-2.5 py-1 font-semibold text-white"><Check className="size-3" />{t.apply}</span>
        </div>
      </div>
    </div>
  </figure>;
}

export function featureGuideBlocks5(lang: SiteLang): { id: string; title: string; body: ReactNode }[] {
  const { design: d, sheet: s, media: m, news: n, ill } = g5[lang];
  const ui = lang === "fr" ? "fr" : "en";
  const designTint = ["#e86a9e", "#a46be0", "#f0955a", "#2563eb", "#16a34a", "#0891b2", "#ca8a04", "#4f46e5"];
  const designIcons = [LayoutTemplate, Type, Type, Palette, ImageIcon, Sparkles, LayoutTemplate, Wand2];
  const sheetIcons = [Calculator, Palette, Coins, BarChart3, LayoutTemplate, ArrowRight, FileSpreadsheet, Calculator];
  const ioIcons = [FileUp, Download, Share2];
  const newsTint = ["#1f7a5a", "#a46be0", "#be185d", "#5f9c57", "#2563eb", "#ea580c"];
  const newsIcons = [FileSpreadsheet, Palette, Share2, Film, Sparkles, LayoutTemplate];
  return [
    { id: "nouveautes", title: n.title, body: <>
      <p className={p}>{n.intro}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{n.items.map(([t, x], i) => <div key={t} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-1.5" style={{ background: newsTint[i % newsTint.length] }} />
        <div className="p-4"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg" style={{ background: `${newsTint[i % newsTint.length]}1a`, color: newsTint[i % newsTint.length] }}>{(() => { const I = newsIcons[i] ?? Sparkles; return <I className="size-4" />; })()}</span><p className="font-semibold">{t}</p><span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">1.6</span></div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{x}</p></div>
      </div>)}</div>
    </> },
    { id: "creativite", title: d.title, body: <>
      <p className={p}>{d.intro}</p>
      <Flow steps={d.steps} colors={["#e86a9e", "#a46be0", "#7c5cff", "#f0955a"]} />
      <DesignIllustration t={ill} />
      <h3 className={sub}>{d.toolsTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{d.tools.map(([t, x], i) => <Card key={t} icon={designIcons[i] ?? Check} title={t} tint={designTint[i % designTint.length]!}>{x}</Card>)}</div>
      <h3 className={sub}>{d.formatsTitle}</h3>
      <div className="mt-3 flex flex-wrap gap-1.5">{fmtNames(lang).map((f, i) => <span key={f} className="rounded-full border border-border bg-card px-3 py-1 text-xs" style={{ borderColor: `${designTint[i % designTint.length]}55` }}>{f} <span className="text-muted-foreground">· {DESIGN_FORMATS[i]!.size}</span></span>)}</div>
      <h3 className={sub}>{d.shareTitle}</h3>
      <ul className="mt-3 space-y-2">{d.share.map((x) => <li key={x} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-[#16a34a]" /><span>{x}</span></li>)}</ul>
      <Note icon={Share2} tint="#25D366">{d.invite}</Note>
      <Note icon={Coins} tint="#ca8a04">{d.price}</Note>
      <Note icon={HardDrive} tint="#2563eb">{d.storage}</Note>
      <Note icon={ShieldCheck} tint="#1f7a5a">{d.legal}</Note>
    </> },
    { id: "tableur", title: s.title, body: <>
      <p className={p}>{s.intro}</p>
      <SheetIllustration t={ill} />
      <ul className="mt-5 space-y-2">{s.start.map((x, i) => <li key={x} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#1f7a5a] text-[11px] font-semibold text-white">{i + 1}</span><span className="pt-0.5">{x}</span></li>)}</ul>
      <h3 className={sub}>{s.featuresTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{s.features.map(([t, x], i) => <Card key={t} icon={sheetIcons[i] ?? Check} title={t} tint={["#1f7a5a", "#2563eb", "#ca8a04", "#9333ea", "#0891b2", "#16a34a", "#ea580c", "#4f46e5"][i]!}>{x}</Card>)}</div>
      <h3 className={sub}>{s.fnTitle}</h3>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">{ui === "fr" ? "Fonction" : "Function"}</th><th className="px-3 py-2">{ui === "fr" ? "Exemple" : "Example"}</th></tr></thead>
          <tbody>{FUNCTION_MENU.map((f) => <tr key={f.name} className="border-t border-border"><td className="px-3 py-2 font-medium">{ui === "fr" ? f.fr : f.en}</td><td className="px-3 py-2 font-mono text-xs text-[#1f7a5a]">{f.hint}</td></tr>)}</tbody></table>
      </div>
      <p className={`${p} text-xs`}>{s.fnNote}</p>
      <h3 className={sub}>{s.aiTitle}</h3>
      <ol className="mt-3 space-y-2">{s.ai.map((x, i) => <li key={x} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1f7a5a] to-[#2b9b74] text-[11px] font-semibold text-white">{i + 1}</span><span className="pt-0.5">{x}</span></li>)}</ol>
      <h3 className={sub}>{s.ioTitle}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">{s.io.map(([t, x], i) => <Card key={t} icon={ioIcons[i] ?? Check} title={t} tint={["#2563eb", "#1f7a5a", "#25D366"][i]!}>{x}</Card>)}</div>
      <h3 className={sub}>{s.keysTitle}</h3>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">{s.keys.map(([k, x]) => <div key={k} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm"><kbd className="shrink-0 rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-[11px]">{k}</kbd><span className="text-muted-foreground">{x}</span></div>)}</div>
      <Note icon={HardDrive} tint="#2563eb">{s.storage}</Note>
    </> },
    { id: "creations-media", title: m.title, body: <>
      <p className={p}>{m.intro}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-5">{m.table.map(([t, x], i) => { const I = [ImageIcon, ImageIcon, Music, Film, Film][i] ?? ImageIcon; const c = ["#0891b2", "#2563eb", "#a77bcb", "#5f9c57", "#1f7a5a"][i]!; return <div key={t} className="rounded-2xl border border-border bg-card p-3.5 text-center shadow-sm">
        <span className="mx-auto grid size-10 place-items-center rounded-xl" style={{ background: `${c}1a`, color: c }}><I className="size-5" /></span>
        <p className="mt-2 text-sm font-semibold">{t}</p><p className="mt-0.5 text-xs text-muted-foreground">{x}</p>
      </div>; })}</div>
      <h3 className={sub}>{m.videoTitle}</h3>
      <p className={p}>{m.video}</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-center text-sm"><thead className="bg-secondary/60 text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left">{ui === "fr" ? "Durée" : "Length"}</th>{VIDEO_DURATION_CHOICES.map((sec) => <th key={sec} className="px-3 py-2">{sec} s</th>)}</tr></thead>
          <tbody>{(["video_fast", "video_quality"] as const).map((tier) => <tr key={tier} className="border-t border-border"><td className="px-3 py-2 text-left font-medium">{mediaTiers[tier][ui]}</td>{VIDEO_DURATION_CHOICES.map((sec) => <td key={sec} className="px-3 py-2 tabular-nums">{videoCredits(tier, sec)}</td>)}</tr>)}</tbody></table>
      </div>
      <Note icon={ShieldCheck} tint="#6b7280">{m.note}</Note>
    </> },
  ];
}
