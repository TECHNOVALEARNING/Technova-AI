import type { ReactNode } from "react";
import { BookOpen, GraduationCap, Layers, ShieldCheck } from "lucide-react";
import type { SiteLang } from "@/lib/i18n";

// Feature guides, part 8 (documentation 1.9): « Apprendre », the learning space for students and teachers
// (src/lib/learn.ts, LearnPage, LearnBlocks, learn-store). Update with the tool list, the price rule in /api/chat
// (Équilibré at least) and the technova-learn storage.

type G8 = { title: string; intro: string; studentHead: string; student: [string, string][]; teacherHead: string; teacher: [string, string][]; how: string[]; reviews: string; price: string; trust: string };

const g8 = (l: SiteLang): G8 => (({
  fr: {
    title: "Apprendre : élèves, étudiants et enseignants",
    intro: "« Apprendre » (menu Créer, ou le bouton Apprendre sous le chat) réunit des outils pour comprendre, réviser et enseigner. Chaque outil pose quelques questions (sujet, niveau, document éventuel), puis ouvre une conversation qui garde ses règles jusqu'au bout.",
    studentHead: "Côté élève / étudiant",
    student: [["Tuteur guidé", "il ne donne pas la réponse tout de suite : questions, indices, étapes, puis un exercice semblable."], ["Mes cours", "joignez un PDF, une photo ou un Word (ou collez le texte) : résumé, notions clés, erreurs fréquentes et questions, basés sur votre document."], ["Quiz et QCM", "questions interactives, chaque erreur expliquée, score à la fin."], ["Flashcards", "cartes à retourner, à ajouter à « Mes révisions »."], ["Plan de révision", "un programme jour par jour jusqu'à la date de l'examen."], ["Expliquer autrement", "en une phrase, simplement avec un exemple d'ici, puis précisément."], ["Préparer un examen", "BEPC, BAC, concours… : un sujet d'entraînement original avec minuteur, puis correction et note sur 20 quand vous envoyez vos réponses."]],
    teacherHead: "Côté enseignant",
    teacher: [["Plan de cours", "objectifs, déroulé par séance, évaluation et différenciation."], ["Quiz, exercices, examens", "à imprimer, avec barème et corrigé."], ["Grille d'évaluation", "critères, niveaux et points."], ["Aide à la correction", "note proposée, points forts, erreurs et conseils pour une copie (texte ou photo) ; la note finale reste la vôtre."], ["Adapter un texte", "le même contenu en version facile, standard et approfondie."]],
    how: ["Ouvrez « Apprendre » et choisissez l'onglet Élève ou Enseignant.", "Choisissez un outil et remplissez le court formulaire.", "Continuez dans la conversation : posez vos questions, demandez un autre quiz, envoyez vos réponses. Téléchargez une réponse en Word, PDF ou PowerPoint avec le menu de téléchargement."],
    reviews: "Mes révisions : les flashcards ajoutées reviennent au bon moment (1, 3, 7, 14 jours… quand vous les savez, quelques minutes plus tard quand vous les ratez). La page affiche votre série de jours, les cartes à réviser et vos scores aux quiz. Tout cela reste sur votre appareil.",
    price: "Prix : chaque réponse coûte un message Équilibré (3 crédits, 4 avec un document), ou Expert si vous l'avez choisi. Les réponses d'apprentissage ne descendent jamais en Éclair, pour privilégier l'exactitude.",
    trust: "L'IA peut se tromper : elle signale ses doutes et ce qui ne vient pas de votre document. Les sujets d'examen sont des sujets d'entraînement, pas des annales officielles. Vérifiez toujours avec votre cours ou votre professeur.",
  },
  en: {
    title: "Learn: students and teachers",
    intro: "« Apprendre » (Create menu, or the Learn button under the chat) gathers tools to understand, revise and teach. Each tool asks a few questions (topic, level, optional document), then opens a conversation that keeps its rules to the end.",
    studentHead: "For students",
    student: [["Guided tutor", "does not give the answer straight away: questions, hints, steps, then a similar exercise."], ["My courses", "attach a PDF, a photo or a Word file (or paste the text): summary, key ideas, common mistakes and questions, based on your document."], ["Quizzes", "interactive questions, every mistake explained, score at the end."], ["Flashcards", "cards to flip, to add to « My reviews »."], ["Revision plan", "a day-by-day schedule until the exam date."], ["Explain it differently", "in one sentence, simply with a local example, then precisely."], ["Exam practice", "BEPC, BAC, competitive exams…: an original practice paper with a timer, then marking out of 20 when you send your answers."]],
    teacherHead: "For teachers",
    teacher: [["Lesson plan", "goals, session-by-session steps, assessment and differentiation."], ["Quizzes, exercises, exams", "printable, with marking scheme and answer key."], ["Rubric", "criteria, levels and points."], ["Marking help", "suggested mark, strengths, mistakes and advice for a paper (text or photo); the final mark stays yours."], ["Adapt a text", "the same content in easy, standard and advanced versions."]],
    how: ["Open « Apprendre » and pick the Student or Teacher tab.", "Choose a tool and fill in the short form.", "Carry on in the conversation: ask questions, request another quiz, send your answers. Download any reply as Word, PDF or PowerPoint from the download menu."],
    reviews: "My reviews: added flashcards come back at the right time (1, 3, 7, 14 days… when you know them, a few minutes later when you miss them). The page shows your streak, the cards to review and your quiz scores. All of it stays on your device.",
    price: "Price: each reply costs one Équilibré message (3 credits, 4 with a document), or Expert if you chose it. Learning replies never drop to Éclair, to favour accuracy.",
    trust: "AI can be wrong: it flags its doubts and anything not taken from your document. Exam papers are practice papers, not official past papers. Always check with your course or teacher.",
  },
  es: {
    title: "Aprender: alumnos, estudiantes y docentes",
    intro: "« Apprendre » (menú Crear, o el botón Aprender bajo el chat) reúne herramientas para comprender, repasar y enseñar. Cada herramienta hace unas preguntas (tema, nivel, documento opcional) y abre una conversación que mantiene sus reglas hasta el final.",
    studentHead: "Para alumnos y estudiantes",
    student: [["Tutor guiado", "no da la respuesta enseguida: preguntas, pistas, pasos y luego un ejercicio parecido."], ["Mis cursos", "adjunte un PDF, una foto o un Word (o pegue el texto): resumen, nociones clave, errores frecuentes y preguntas, basados en su documento."], ["Quiz", "preguntas interactivas, cada error explicado, puntuación al final."], ["Flashcards", "tarjetas para girar y añadir a « Mis repasos »."], ["Plan de repaso", "un programa día a día hasta la fecha del examen."], ["Explicar de otra forma", "en una frase, de forma sencilla con un ejemplo cercano, y luego con precisión."], ["Preparar un examen", "BEPC, BAC, oposiciones…: un examen de práctica original con cronómetro, luego corrección y nota sobre 20 cuando envía sus respuestas."]],
    teacherHead: "Para docentes",
    teacher: [["Plan de clase", "objetivos, desarrollo por sesión, evaluación y diferenciación."], ["Quiz, ejercicios, exámenes", "para imprimir, con baremo y solucionario."], ["Rúbrica", "criterios, niveles y puntos."], ["Ayuda a la corrección", "nota sugerida, puntos fuertes, errores y consejos para una copia (texto o foto); la nota final es suya."], ["Adaptar un texto", "el mismo contenido en versión fácil, estándar y avanzada."]],
    how: ["Abra « Apprendre » y elija la pestaña Alumno o Docente.", "Elija una herramienta y rellene el breve formulario.", "Siga en la conversación: haga preguntas, pida otro quiz, envíe sus respuestas. Descargue una respuesta en Word, PDF o PowerPoint desde el menú de descarga."],
    reviews: "Mis repasos: las flashcards añadidas vuelven en el momento justo (1, 3, 7, 14 días… si las sabe, unos minutos después si falla). La página muestra su racha, las tarjetas pendientes y sus puntuaciones. Todo queda en su dispositivo.",
    price: "Precio: cada respuesta cuesta un mensaje Équilibré (3 créditos, 4 con un documento), o Expert si lo eligió. Las respuestas de aprendizaje nunca bajan a Éclair, para priorizar la exactitud.",
    trust: "La IA puede equivocarse: señala sus dudas y lo que no procede de su documento. Los exámenes son de práctica, no exámenes oficiales anteriores. Verifique siempre con su curso o su profesor.",
  },
  pt: {
    title: "Aprender: alunos, estudantes e professores",
    intro: "« Apprendre » (menu Criar, ou o botão Aprender sob o chat) reúne ferramentas para entender, revisar e ensinar. Cada ferramenta faz algumas perguntas (tema, nível, documento opcional) e abre uma conversa que mantém as suas regras até o fim.",
    studentHead: "Para alunos e estudantes",
    student: [["Tutor guiado", "não dá a resposta de imediato: perguntas, dicas, etapas e depois um exercício parecido."], ["Meus cursos", "anexe um PDF, uma foto ou um Word (ou cole o texto): resumo, noções-chave, erros frequentes e perguntas, com base no seu documento."], ["Quiz", "perguntas interativas, cada erro explicado, pontuação no fim."], ["Flashcards", "cartões para virar e adicionar a « Minhas revisões »."], ["Plano de revisão", "um programa dia a dia até a data da prova."], ["Explicar de outro jeito", "numa frase, de forma simples com um exemplo próximo, depois com precisão."], ["Preparar uma prova", "BEPC, BAC, concursos…: uma prova de treino original com cronômetro, depois correção e nota sobre 20 quando você envia as respostas."]],
    teacherHead: "Para professores",
    teacher: [["Plano de aula", "objetivos, desenvolvimento por sessão, avaliação e diferenciação."], ["Quiz, exercícios, provas", "para imprimir, com critérios e gabarito."], ["Rubrica de avaliação", "critérios, níveis e pontos."], ["Ajuda na correção", "nota sugerida, pontos fortes, erros e conselhos para uma prova (texto ou foto); a nota final é sua."], ["Adaptar um texto", "o mesmo conteúdo nas versões fácil, padrão e aprofundada."]],
    how: ["Abra « Apprendre » e escolha a aba Aluno ou Professor.", "Escolha uma ferramenta e preencha o formulário curto.", "Continue na conversa: faça perguntas, peça outro quiz, envie as suas respostas. Baixe uma resposta em Word, PDF ou PowerPoint pelo menu de download."],
    reviews: "Minhas revisões: os flashcards adicionados voltam no momento certo (1, 3, 7, 14 dias… quando você sabe, alguns minutos depois quando erra). A página mostra a sua sequência, os cartões a revisar e as suas pontuações. Tudo fica no seu aparelho.",
    price: "Preço: cada resposta custa uma mensagem Équilibré (3 créditos, 4 com um documento), ou Expert se você o escolheu. As respostas de aprendizagem nunca descem para Éclair, para privilegiar a exatidão.",
    trust: "A IA pode errar: ela indica as suas dúvidas e o que não vem do seu documento. As provas são de treino, não provas oficiais anteriores. Confira sempre com o seu curso ou professor.",
  },
}) satisfies Record<SiteLang, G8>)[l];

const p = "mt-3 leading-relaxed text-muted-foreground";
const list = (items: [string, string][]) => <ul className="mt-2 space-y-1.5 text-sm">{items.map(([t, d]) => <li key={t} className="leading-relaxed"><span className="font-semibold text-foreground">{t}</span> <span className="text-muted-foreground">— {d}</span></li>)}</ul>;

export function featureGuideBlocks8(lang: SiteLang): { id: string; title: string; body: ReactNode }[] {
  const g = g8(lang);
  return [{ id: "apprendre", title: g.title, body: <>
    <p className={p}>{g.intro}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-4 text-[#4f6bd8]" />{g.studentHead}</p>{list(g.student)}</div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="size-4 text-[#0f8a6a]" />{g.teacherHead}</p>{list(g.teacher)}</div>
    </div>
    <ol className="mt-4 space-y-2">{g.how.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">{i + 1}</span><span className="pt-0.5 text-muted-foreground">{s}</span></li>)}</ol>
    <p className={`${p} flex gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm shadow-sm`}><Layers className="mt-0.5 size-4 shrink-0 text-fuchsia-600" /><span>{g.reviews}</span></p>
    <p className={`${p} text-sm`}>{g.price}</p>
    <p className={`${p} flex gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm shadow-sm`}><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#1d4ed8]" /><span>{g.trust}</span></p>
  </> }];
}
