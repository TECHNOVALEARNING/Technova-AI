import type { CSSProperties, ReactNode } from "react";
import { B, Bar, Eyebrow, H, Img, Page, f, lines, type Layout, type V } from "./design-kit";
import type { Palette } from "./designs";

// Eight more presentation layouts (1280 × 720), original TechNova designs: a safety training, a bento report, a startup
// pitch, a sales battlecard, a solar energy offer, an artist press kit, a training course and an agency presentation.
// The subjects were suggested by the user's reference decks; the drawings and texts are TechNova's own. Like every
// layout they use solid colours, borders and picture slots only, so the editor turns each slide into editable elements.

const W = 1280, HH = 720, P = 80;
const g = (v: V, k: string) => v[k] ?? "";
/** "Titre : texte" lines → [titre, texte]. */
const pairs = (t: string): [string, string][] => lines(t).map((l): [string, string] => { const i = l.indexOf(":"); return i < 0 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; });
/** "a | b | c" lines → cells. */
const cols = (t: string) => lines(t).map((l) => l.split("|").map((x) => x.trim()));
const num = (s: string) => Number((s.match(/-?\d[\d\s.,]*/)?.[0] ?? "0").replace(/\s/g, "").replace(",", ".")) || 0;
const thousands = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const pad2 = (n: number) => String(n).padStart(2, "0");

function Slide({ p, children, dark, style }: { p: Palette; children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  return <Page w={W} h={HH} p={p} style={{ ...(dark ? { background: p.ink, color: p.bg } : {}), ...style }}>{children}</Page>;
}
function Head({ p, kicker, title, dark, top = 64, width = W - 2 * P, size = 46 }: { p: Palette; kicker: string; title: string; dark?: boolean; top?: number; width?: number; size?: number }) {
  return <div style={{ position: "absolute", left: P, top, width, display: "flex", flexDirection: "column", gap: 14 }}>
    {kicker && <Eyebrow p={p}>{kicker}</Eyebrow>}
    <h2 style={H(p, size, dark ? { color: p.bg } : {})}>{title}</h2>
  </div>;
}
const Foot = ({ p, text, n, dark }: { p: Palette; text: string; n: number; dark?: boolean }) => <>
  {text && <p style={{ ...B(p, 14, { color: dark ? p.line : p.muted }), position: "absolute", left: P, bottom: 34 }}>{text}</p>}
  <p style={{ ...B(p, 14, { color: dark ? p.line : p.muted, fontWeight: 600 }), position: "absolute", right: P, bottom: 34 }}>{pad2(n)}</p>
</>;
const card = (p: Palette, extra: CSSProperties = {}): CSSProperties => ({ background: p.surface, border: `1px solid ${p.line}`, borderRadius: 18, boxSizing: "border-box", ...extra });
const Dot = ({ p, n, size = 44, bg, color }: { p: Palette; n: ReactNode; size?: number; bg?: string; color?: string }) =>
  <div style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: size / 2, background: bg ?? p.soft, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={H(p, Math.round(size * 0.4), { color: color ?? p.accent, lineHeight: 1 })}>{n}</span></div>;
const Mark = ({ c, top = 9 }: { c: string; top?: number }) => <div style={{ width: 12, height: 12, flex: "0 0 12px", borderRadius: 3, background: c, marginTop: top }} />;

// ---------- 1. Safety training ----------
const safetyFields = [
  f("org", "Organisation", "BTP Horizon · Service QHSE"), f("title", "Titre", "Sécurité sur le chantier"),
  f("subtitle", "Sous-titre", "Les règles qui protègent chaque équipe, chaque jour"),
  f("trainer", "Formateur", "Formation animée par Koffi Agbodjan, responsable QHSE"), f("date", "Date", "Session de mars 2027"),
  f("objectives", "Objectifs (une ligne par objectif)", "Repérer les risques avant de commencer le travail\nPorter les bons équipements de protection\nAppliquer la bonne procédure en cas d'accident\nSignaler chaque situation dangereuse", "long"),
  f("dos", "À faire (une ligne par règle)", "Casque, gilet et chaussures de sécurité en permanence\nBaliser la zone de travail avant de commencer\nVérifier outils et échafaudages chaque matin\nPrévenir le chef d'équipe au moindre doute", "long"),
  f("donts", "À éviter (une ligne par règle)", "Travailler en hauteur sans harnais\nRetirer une protection pour aller plus vite\nUtiliser une machine sans formation\nLaisser câbles et déchets au sol", "long"),
  f("steps", "Procédure (« Étape : explication »)", "Protéger : sécuriser la zone pour éviter un second accident\nAlerter : appeler les secours puis le responsable\nSecourir : les premiers gestes, si vous êtes formé\nSignaler : remplir la fiche d'incident le jour même", "long"),
  f("contacts", "Numéros utiles (« Service : numéro »)", "Sapeurs-pompiers : 118\nSAMU : 112\nResponsable QHSE : +229 01 00 00 00\nInfirmerie du site : poste 204", "long"),
  f("closing", "Message de fin", "La sécurité, c'est l'affaire de tous"),
  f("closingText", "Texte de fin", "Questions, remarques ou situations à signaler : parlons-en maintenant."),
];
const Stripe = ({ p, top, alt }: { p: Palette; top?: number; alt?: string }) => <div style={{ position: "absolute", left: 0, right: 0, ...(top !== undefined ? { top } : { bottom: 0 }), height: 16, display: "flex" }}>
  {Array.from({ length: 16 }, (_, i) => <div key={i} style={{ flex: 1, background: i % 2 ? (alt ?? p.ink) : p.accent }} />)}
</div>;
function safety(v: V, p: Palette, page: number) {
  const org = g(v, "org");
  if (page === 0) return <Slide p={p}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 420, height: HH - 16, background: p.accent }} />
    <div style={{ position: "absolute", left: 90, top: 214, width: 240, height: 240, borderRadius: 120, border: `12px solid ${p.bg}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={H(p, 150, { color: p.bg, lineHeight: 1 })}>!</span>
    </div>
    <div style={{ position: "absolute", left: 500, right: P, top: 150, display: "flex", flexDirection: "column", gap: 24 }}>
      <Eyebrow p={p}>{org}</Eyebrow><h1 style={H(p, 66)}>{g(v, "title")}</h1><p style={B(p, 26)}>{g(v, "subtitle")}</p>
    </div>
    <div style={{ position: "absolute", left: 500, right: P, bottom: 70, display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={B(p, 18, { color: p.ink, fontWeight: 600 })}>{g(v, "trainer")}</p><p style={B(p, 16)}>{g(v, "date")}</p>
    </div>
    <Stripe p={p} />
  </Slide>;
  if (page === 1) return <Slide p={p}>
    <Head p={p} kicker="Objectifs de la formation" title="À la fin de cette session, vous saurez" />
    <div style={{ position: "absolute", left: P, right: P, top: 230, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {lines(g(v, "objectives")).slice(0, 4).map((t, i) => <div key={i} style={card(p, { padding: "30px 34px", display: "flex", gap: 26, alignItems: "flex-start", minHeight: 170 })}>
        <span style={H(p, 44, { color: p.accent })}>{pad2(i + 1)}</span><span style={B(p, 22, { color: p.ink, marginTop: 6 })}>{t}</span>
      </div>)}
    </div>
    <Foot p={p} text={org} n={2} />
  </Slide>;
  if (page === 2) return <Slide p={p}>
    <Head p={p} kicker="Les règles" title="Ce qu'on fait, ce qu'on ne fait jamais" />
    {([["À faire", "dos", p.accent], ["À éviter", "donts", p.ink]] as const).map(([label, key, c], k) => <div key={key} style={{ position: "absolute", left: P + k * 576, top: 214, width: 544, display: "flex", flexDirection: "column" }}>
      <div style={{ background: c, borderRadius: 12, padding: "14px 22px", marginBottom: 8 }}><p style={H(p, 24, { color: p.bg })}>{label}</p></div>
      {lines(g(v, key)).slice(0, 5).map((t, i) => <div key={i} style={{ display: "flex", gap: 16, padding: "15px 4px", borderBottom: `1px solid ${p.line}` }}><Mark c={c} /><span style={B(p, 19, { color: p.ink })}>{t}</span></div>)}
    </div>)}
    <Foot p={p} text={org} n={3} />
  </Slide>;
  if (page === 3) return <Slide p={p}>
    <Head p={p} kicker="En cas d'accident" title="Quatre gestes, dans cet ordre" />
    <div style={{ position: "absolute", left: P + 38, right: P + 200, top: 300, height: 3, background: p.line }} />
    <div style={{ position: "absolute", left: P, right: P, top: 262, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
      {pairs(g(v, "steps")).slice(0, 4).map(([t, d], i) => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Dot p={p} n={i + 1} size={76} bg={p.accent} color={p.bg} />
        <p style={H(p, 28, { marginTop: 8 })}>{t}</p><p style={B(p, 18)}>{d}</p>
      </div>)}
    </div>
    <Foot p={p} text={org} n={4} />
  </Slide>;
  if (page === 4) return <Slide p={p}>
    <Head p={p} kicker="Numéros utiles" title="À afficher près de chaque poste" />
    <div style={{ position: "absolute", left: P, right: P, top: 230, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {pairs(g(v, "contacts")).slice(0, 4).map(([t, d], i) => <div key={i} style={card(p, { padding: "28px 34px", display: "flex", flexDirection: "column", gap: 10, background: i === 0 ? p.soft : p.surface })}>
        <span style={B(p, 18)}>{t}</span><span style={H(p, 46, { color: p.accent })}>{d}</span>
      </div>)}
    </div>
    <Foot p={p} text={org} n={5} />
  </Slide>;
  return <Slide p={p} dark>
    <Stripe p={p} top={0} alt={p.bg} />
    <div style={{ position: "absolute", left: P, right: P, top: 230, display: "flex", flexDirection: "column", gap: 28 }}>
      <Bar p={p} w={72} h={6} /><h2 style={H(p, 70, { color: p.bg })}>{g(v, "closing")}</h2><p style={B(p, 24, { color: p.line })}>{g(v, "closingText")}</p>
    </div>
    <Foot p={p} text={org} n={6} dark />
  </Slide>;
}

// ---------- 2. Bento report ----------
const bentoFields = [
  f("photo", "Photo", "", "image"), f("title", "Titre", "Rapport annuel 2026"), f("subtitle", "Sous-titre", "Une année de croissance, en un coup d'œil"),
  f("author", "Présenté par", "Direction générale · Groupe Kora"), f("date", "Date", "Février 2027"), f("badge", "Étiquette", "Édition 2026"),
  f("highlightsTitle", "Titre des faits marquants", "Les faits marquants de l'année"),
  f("highlights", "Faits marquants (« Thème : texte », 6 lignes)", "Clients : 4 800 entreprises accompagnées\nÉquipe : 120 collaborateurs dans 5 pays\nOffre : 3 nouveaux services lancés\nQualité : 96 % de clients satisfaits\nImpact : 40 % d'achats auprès de fournisseurs locaux\nCap 2027 : ouverture à Abidjan et à Dakar", "long"),
  f("stat1", "Chiffre principal", "2,4 Md"), f("stat1Label", "Légende", "FCFA de chiffre d'affaires, +31 % sur un an"),
  f("stat2", "Chiffre 2", "18"), f("stat2Label", "Légende 2", "villes desservies"), f("stat3", "Chiffre 3", "62"), f("stat3Label", "Légende 3", "recrutements"),
  f("statsNote", "Note", "Des résultats portés par la vente en ligne et le paiement Mobile Money."),
  f("quote", "Citation", "Nous avons grandi sans perdre ce qui fait notre force : la proximité avec chaque client.", "long"), f("quoteAuthor", "Auteur de la citation", "Mariam Traoré, directrice générale"),
  f("closing", "Message de fin", "Merci de votre confiance"), f("contact", "Contact", "contact@groupekora.com · www.groupekora.com"),
];
const tile = (p: Palette, extra: CSSProperties = {}): CSSProperties => ({ background: p.surface, border: `1px solid ${p.line}`, borderRadius: 28, boxSizing: "border-box", padding: 30, display: "flex", flexDirection: "column", ...extra });
const kick = (p: Palette, color: string): CSSProperties => B(p, 13, { color, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" });
function bento(v: V, p: Palette, page: number) {
  const grid = (c: string, r: string, top = 48): CSSProperties => ({ position: "absolute", left: 48, right: 48, top, bottom: 48, display: "grid", gridTemplateColumns: c, gridTemplateRows: r, gap: 16 });
  if (page === 0) return <Slide p={p}><div style={grid("repeat(4, 1fr)", "1fr 1fr 0.75fr")}>
    <div style={tile(p, { gridColumn: "1 / 4", gridRow: "1 / 3", padding: 52, justifyContent: "flex-end", gap: 20 })}><h1 style={H(p, 72)}>{g(v, "title")}</h1><p style={B(p, 24)}>{g(v, "subtitle")}</p></div>
    <Img src={g(v, "photo")} p={p} style={{ gridColumn: "4", gridRow: "1 / 3", borderRadius: 28 }} label="Votre photo" />
    <div style={tile(p, { background: p.accent, border: "none", justifyContent: "space-between" })}><p style={kick(p, p.bg)}>Date</p><p style={H(p, 26, { color: p.bg })}>{g(v, "date")}</p></div>
    <div style={tile(p, { gridColumn: "2 / 4", background: p.soft, border: "none", justifyContent: "center" })}><p style={B(p, 20, { color: p.ink, fontWeight: 600 })}>{g(v, "author")}</p></div>
    <div style={tile(p, { background: p.ink, border: "none", justifyContent: "flex-end" })}><p style={H(p, 26, { color: p.bg })}>{g(v, "badge")}</p></div>
  </div></Slide>;
  if (page === 1) return <Slide p={p}>
    <h2 style={{ ...H(p, 40), position: "absolute", left: 56, top: 52 }}>{g(v, "highlightsTitle")}</h2>
    <div style={grid("1.2fr 1fr 1fr", "1fr 1fr", 140)}>
      {pairs(g(v, "highlights")).slice(0, 6).map(([t, d], i) => { const bg = i === 0 ? p.accent : i === 4 ? p.ink : i === 2 ? p.soft : p.surface; const light = i === 0 || i === 4;
        return <div key={i} style={tile(p, { background: bg, border: light || i === 2 ? "none" : `1px solid ${p.line}`, justifyContent: "space-between" })}>
          <p style={kick(p, light ? p.bg : p.accent)}>{t}</p><p style={H(p, 28, { color: light ? p.bg : p.ink, fontWeight: 600, lineHeight: 1.2 })}>{d}</p>
        </div>; })}
    </div>
  </Slide>;
  if (page === 2) return <Slide p={p}><div style={grid("1.1fr 1fr 1fr", "1fr 1fr")}>
    <div style={tile(p, { gridRow: "1 / 3", background: p.soft, border: "none", padding: 44, justifyContent: "flex-end", gap: 18 })}><p style={kick(p, p.accent)}>Chiffres clés</p><p style={H(p, 84, { color: p.accent })}>{g(v, "stat1")}</p><p style={B(p, 22, { color: p.ink })}>{g(v, "stat1Label")}</p></div>
    <div style={tile(p, { gridColumn: "2 / 4", padding: 40, justifyContent: "flex-end", gap: 10 })}><p style={H(p, 80)}>{g(v, "stat2")}</p><p style={B(p, 20)}>{g(v, "stat2Label")}</p></div>
    <div style={tile(p, { background: p.ink, border: "none", padding: 36, justifyContent: "flex-end", gap: 8 })}><p style={H(p, 64, { color: p.bg })}>{g(v, "stat3")}</p><p style={B(p, 18, { color: p.line })}>{g(v, "stat3Label")}</p></div>
    <div style={tile(p, { background: p.accent, border: "none", padding: 36, justifyContent: "flex-end" })}><p style={H(p, 24, { color: p.bg, fontWeight: 600, lineHeight: 1.3 })}>{g(v, "statsNote")}</p></div>
  </div></Slide>;
  if (page === 3) return <Slide p={p}><div style={grid("1fr", "1fr")}>
    <div style={tile(p, { background: p.soft, border: "none", padding: "56px 80px", justifyContent: "center", gap: 28 })}>
      <p style={H(p, 120, { color: p.accent, lineHeight: 0.8 })}>«</p>
      <p style={H(p, 46, { fontWeight: 600, lineHeight: 1.22, maxWidth: 960 })}>{g(v, "quote")}</p>
      <p style={B(p, 20, { color: p.ink, fontWeight: 600 })}>{g(v, "quoteAuthor")}</p>
    </div>
  </div></Slide>;
  return <Slide p={p}><div style={grid("1fr 1fr 1fr", "1.7fr 1fr")}>
    <div style={tile(p, { gridColumn: "1 / 4", background: p.ink, border: "none", padding: 56, justifyContent: "flex-end" })}><h2 style={H(p, 80, { color: p.bg })}>{g(v, "closing")}</h2></div>
    <div style={tile(p, { gridColumn: "1 / 3", background: p.soft, border: "none", justifyContent: "center" })}><p style={B(p, 22, { color: p.ink, fontWeight: 600 })}>{g(v, "contact")}</p></div>
    <div style={tile(p, { background: p.accent, border: "none", justifyContent: "center" })}><p style={H(p, 24, { color: p.bg })}>{g(v, "badge")}</p></div>
  </div></Slide>;
}

// ---------- 3. Startup pitch ----------
const pitchFields = [
  f("name", "Nom de la startup", "Kwali"), f("tagline", "Promesse", "Le marché frais livré en 2 heures à Cotonou"),
  f("founder", "Présenté par", "Sena Dossou, cofondatrice et CEO"), f("date", "Contexte", "Levée d'amorçage · 2027"),
  f("problem", "Le problème", "Les familles perdent des heures chaque semaine au marché, pendant qu'une grande partie des récoltes des petits producteurs est jetée faute d'acheteurs.", "long"),
  f("problemStats", "Chiffres du problème (« chiffre : légende »)", "6 h : perdues chaque semaine au marché\n30 % : des récoltes jetées\n1 sur 2 : ménages prêts à commander en ligne", "long"),
  f("solutionTitle", "Titre de la solution", "Du champ à votre porte, sans intermédiaire"),
  f("solution", "La solution", "Kwali relie directement les producteurs aux familles : commande sur WhatsApp ou sur l'application, paiement Mobile Money, livraison à moto en 2 heures.", "long"),
  f("solutionPoints", "Points forts (« titre : texte »)", "Commande simple : sur WhatsApp ou l'application, en trois messages\nPaiement Mobile Money : avant ou à la livraison\nLivré en 2 h : 25 livreurs à moto dans toute la ville", "long"),
  f("tam", "Marché total", "450 Md FCFA"), f("tamLabel", "Légende marché total", "Dépenses alimentaires urbaines au Bénin"),
  f("sam", "Marché visé", "90 Md FCFA"), f("samLabel", "Légende marché visé", "Produits frais à Cotonou et Porto-Novo"),
  f("som", "Objectif", "4,5 Md FCFA"), f("somLabel", "Légende objectif", "Notre objectif de ventes à 3 ans"),
  f("model", "Modèle économique (« source : texte »)", "Commission : 12 % sur chaque commande livrée\nAbonnement : 5 000 FCFA par mois pour la livraison illimitée\nEntreprises : paniers pour cantines et restaurants", "long"),
  f("tractionTitle", "Titre de la traction", "Commandes multipliées par 9 en six mois"),
  f("traction", "Traction (« mois : valeur »)", "Jan : 120\nFév : 210\nMar : 340\nAvr : 520\nMai : 760\nJuin : 1100", "long"),
  f("team1", "Photo 1", "", "image"), f("team2", "Photo 2", "", "image"), f("team3", "Photo 3", "", "image"),
  f("team", "Équipe (« nom : rôle »)", "Sena Dossou : CEO, ex-responsable logistique\nMarc Ahouandjinou : CTO, 8 ans de mobile\nAïcha Bello : Opérations, 300 producteurs partenaires", "long"),
  f("ask", "Montant recherché", "150 M FCFA"), f("askText", "Durée", "pour 18 mois de croissance"),
  f("funds", "Utilisation des fonds (« poste : % »)", "Logistique et motos : 40\nProduit et technologie : 30\nMarketing : 20\nFonds de roulement : 10", "long"),
  f("contact", "Contact", "sena@kwali.bj · +229 01 00 00 00"),
];
function pitch(v: V, p: Palette, page: number) {
  const name = g(v, "name");
  if (page === 0) return <Slide p={p}>
    <div style={{ position: "absolute", right: -140, top: 90, width: 600, height: 600, borderRadius: 300, background: p.soft }} />
    <div style={{ position: "absolute", right: 90, top: 250, width: 240, height: 240, borderRadius: 120, background: p.accent }} />
    <div style={{ position: "absolute", left: P, top: 170, width: 700, display: "flex", flexDirection: "column", gap: 24 }}>
      <Eyebrow p={p}>{g(v, "date")}</Eyebrow><h1 style={H(p, 124, { letterSpacing: "-0.04em" })}>{name}</h1><p style={B(p, 30, { color: p.ink })}>{g(v, "tagline")}</p>
    </div>
    <p style={{ ...B(p, 18, { color: p.ink, fontWeight: 600 }), position: "absolute", left: P, bottom: 64 }}>{g(v, "founder")}</p>
  </Slide>;
  if (page === 1) return <Slide p={p}>
    <div style={{ position: "absolute", left: P, top: 150, width: 600, display: "flex", flexDirection: "column", gap: 26 }}>
      <Eyebrow p={p}>Le problème</Eyebrow><p style={H(p, 38, { fontWeight: 600, lineHeight: 1.25 })}>{g(v, "problem")}</p>
    </div>
    <div style={{ position: "absolute", left: 770, right: P, top: 120, display: "flex", flexDirection: "column", gap: 18 }}>
      {pairs(g(v, "problemStats")).slice(0, 3).map(([a, b], i) => <div key={i} style={card(p, { padding: "26px 30px", display: "flex", flexDirection: "column", gap: 6 })}>
        <span style={H(p, 48, { color: p.accent })}>{a}</span><span style={B(p, 18)}>{b}</span>
      </div>)}
    </div>
    <Foot p={p} text={name} n={2} />
  </Slide>;
  if (page === 2) return <Slide p={p}>
    <Head p={p} kicker="Notre solution" title={g(v, "solutionTitle")} />
    <p style={{ ...B(p, 23, { color: p.ink }), position: "absolute", left: P, top: 236, width: 940 }}>{g(v, "solution")}</p>
    <div style={{ position: "absolute", left: P, right: P, top: 400, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
      {pairs(g(v, "solutionPoints")).slice(0, 3).map(([t, d], i) => <div key={i} style={card(p, { padding: 30, display: "flex", flexDirection: "column", gap: 14, minHeight: 210 })}>
        <Dot p={p} n={i + 1} /><p style={H(p, 24)}>{t}</p><p style={B(p, 17)}>{d}</p>
      </div>)}
    </div>
    <Foot p={p} text={name} n={3} />
  </Slide>;
  if (page === 3) {
    const rings = [[g(v, "tam"), g(v, "tamLabel"), 470, p.soft, p.ink], [g(v, "sam"), g(v, "samLabel"), 320, p.surface, p.ink], [g(v, "som"), g(v, "somLabel"), 170, p.accent, p.bg]] as const;
    return <Slide p={p}>
      <Head p={p} kicker="Le marché" title="Une opportunité à notre portée" top={56} />
      {rings.map(([val, , size, bg, ink], i) => <div key={i} style={{ position: "absolute", left: P + 25 + (470 - size) / 2, top: 168 + 470 - size, width: size, height: size, borderRadius: size / 2, background: bg, border: i === 1 ? `2px solid ${p.line}` : undefined, boxSizing: "border-box", display: "flex", justifyContent: "center", alignItems: i === 2 ? "center" : "flex-start", paddingTop: i === 2 ? 0 : 34 }}>
        <span style={H(p, i === 2 ? 26 : 28, { color: ink })}>{val}</span>
      </div>)}
      <div style={{ position: "absolute", left: 720, right: P, top: 250, display: "flex", flexDirection: "column", gap: 30 }}>
        {rings.map(([val, label, , bg], i) => <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 26, height: 26, flex: "0 0 26px", borderRadius: 13, background: bg, border: `2px solid ${i === 2 ? p.accent : p.line}`, boxSizing: "border-box", marginTop: 4 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={H(p, 30)}>{val}</span><span style={B(p, 18)}>{label}</span></div>
        </div>)}
      </div>
      <Foot p={p} text={name} n={4} />
    </Slide>;
  }
  if (page === 4) return <Slide p={p}>
    <Head p={p} kicker="Modèle économique" title="Comment nous gagnons de l'argent" />
    <div style={{ position: "absolute", left: P, right: P, top: 250, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
      {pairs(g(v, "model")).slice(0, 3).map(([t, d], i) => <div key={i} style={card(p, { padding: "36px 32px", display: "flex", flexDirection: "column", gap: 16, minHeight: 300, ...(i === 0 ? { background: p.accent, border: "none" } : {}) })}>
        <span style={H(p, 52, { color: i === 0 ? p.bg : p.accent })}>{pad2(i + 1)}</span><p style={H(p, 28, { color: i === 0 ? p.bg : p.ink })}>{t}</p><p style={B(p, 18, { color: i === 0 ? p.bg : p.muted })}>{d}</p>
      </div>)}
    </div>
    <Foot p={p} text={name} n={5} />
  </Slide>;
  if (page === 5) {
    const data = pairs(g(v, "traction")).slice(0, 8); const max = Math.max(1, ...data.map(([, b]) => num(b)));
    return <Slide p={p}>
      <Head p={p} kicker="Traction" title={g(v, "tractionTitle")} />
      <div style={{ position: "absolute", left: P, right: P, top: 230, height: 390, display: "flex", alignItems: "flex-end", gap: 28, borderBottom: `2px solid ${p.line}` }}>
        {data.map(([, b], i) => <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span style={B(p, 18, { color: p.ink, fontWeight: 600 })}>{b}</span>
          <div style={{ width: "100%", height: Math.max(6, Math.round((num(b) / max) * 310)), borderRadius: 10, background: p.accent, opacity: i === data.length - 1 ? 1 : 0.4 }} />
        </div>)}
      </div>
      <div style={{ position: "absolute", left: P, right: P, top: 636, display: "flex", gap: 28 }}>
        {data.map(([a], i) => <span key={i} style={{ ...B(p, 17), flex: 1, textAlign: "center" }}>{a}</span>)}
      </div>
    </Slide>;
  }
  if (page === 6) return <Slide p={p}>
    <Head p={p} kicker="L'équipe" title="Une équipe qui connaît le terrain" />
    <div style={{ position: "absolute", left: P, right: P, top: 236, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
      {pairs(g(v, "team")).slice(0, 3).map(([n, r], i) => <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Img src={g(v, `team${i + 1}`)} p={p} style={{ width: 190, height: 190, borderRadius: 95 }} label="Photo" />
        <p style={H(p, 26, { textAlign: "center", marginTop: 8 })}>{n}</p><p style={B(p, 18, { textAlign: "center" })}>{r}</p>
      </div>)}
    </div>
    <Foot p={p} text={name} n={7} />
  </Slide>;
  return <Slide p={p}>
    <div style={{ position: "absolute", left: P, top: 160, width: 570, display: "flex", flexDirection: "column", gap: 20 }}>
      <Eyebrow p={p}>Notre demande</Eyebrow><p style={H(p, 88, { color: p.accent, letterSpacing: "-0.03em" })}>{g(v, "ask")}</p><p style={B(p, 26, { color: p.ink })}>{g(v, "askText")}</p>
    </div>
    <p style={{ ...B(p, 18, { color: p.ink, fontWeight: 600 }), position: "absolute", left: P, bottom: 64 }}>{g(v, "contact")}</p>
    <div style={{ position: "absolute", left: 700, right: P, top: 170, display: "flex", flexDirection: "column", gap: 26 }}>
      <Eyebrow p={p}>Utilisation des fonds</Eyebrow>
      {pairs(g(v, "funds")).slice(0, 5).map(([a, b], i) => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={B(p, 19, { color: p.ink })}>{a}</span><span style={B(p, 19, { color: p.ink, fontWeight: 700 })}>{`${num(b)} %`}</span></div>
        <div style={{ height: 12, borderRadius: 6, background: p.soft }}><div style={{ width: `${Math.min(100, num(b))}%`, height: 12, borderRadius: 6, background: p.accent }} /></div>
      </div>)}
    </div>
  </Slide>;
}

// ---------- 4. Sales battlecard ----------
const battleFields = [
  f("product", "Produit", "Caisse Lumo"), f("title", "Titre", "Fiche de vente comparative"), f("subtitle", "Sous-titre", "Gagner face aux caisses traditionnelles"),
  f("team", "Équipe", "Équipe commerciale · Afrique de l'Ouest"), f("date", "Date", "Mise à jour : janvier 2027"),
  f("us", "Notre offre", "Caisse Lumo"), f("them", "La concurrence", "Caisse classique"),
  f("compare", "Comparatif (« critère | nous | eux »)", "Paiement Mobile Money | Inclus | En option payante\nFonctionne hors ligne | Oui | Non\nPrix mensuel | 9 000 FCFA | 25 000 FCFA\nMise en place | 1 jour | 2 semaines\nAssistance | WhatsApp 7 j/7 | E-mail uniquement", "long"),
  f("objections", "Objections (« objection : réponse »)", "C'est trop cher : 9 000 FCFA par mois, moins qu'une journée de vente perdue.\nNous avons déjà une caisse : le catalogue s'importe en 10 minutes, sans tout changer.\nEt sans internet ? : les ventes sont gardées puis envoyées dès le retour du réseau.", "long"),
  f("pillars", "Arguments (« titre : texte »)", "Rapide : un client encaissé en moins de 30 secondes\nFiable : vos ventes enregistrées même pendant les coupures\nRentable : un stock suivi au jour près, moins de pertes", "long"),
  f("questions", "Questions de découverte", "Combien de ventes faites-vous un jour chargé ?\nComment vos clients paient-ils aujourd'hui ?\nQue se passe-t-il pendant une coupure ?\nComment suivez-vous votre stock ?", "long"),
  f("closing", "Titre de fin", "Conclure la vente en trois étapes"),
  f("next", "Prochaines étapes", "Proposer un essai gratuit de 14 jours\nInstaller la caisse avec le gérant\nRappeler le client après sa première semaine", "long"),
  f("contact", "Contact", "Support ventes : ventes@lumo.africa · +225 07 00 00 00"),
];
function battle(v: V, p: Palette, page: number) {
  const product = g(v, "product");
  if (page === 0) return <Slide p={p}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 430, background: p.ink }} />
    <div style={{ position: "absolute", left: P, right: P, top: 110, display: "flex", flexDirection: "column", gap: 22 }}>
      <Eyebrow p={p}>{product}</Eyebrow><h1 style={H(p, 72, { color: p.bg })}>{g(v, "title")}</h1><p style={B(p, 26, { color: p.line })}>{g(v, "subtitle")}</p>
    </div>
    <div style={{ position: "absolute", left: P, top: 500, display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={B(p, 19, { color: p.ink, fontWeight: 600 })}>{g(v, "team")}</p><p style={B(p, 16)}>{g(v, "date")}</p>
    </div>
    <div style={{ position: "absolute", right: P, top: 500, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ background: p.accent, borderRadius: 999, padding: "14px 26px" }}><p style={H(p, 22, { color: p.bg })}>{g(v, "us")}</p></div>
      <span style={H(p, 26, { color: p.muted })}>vs</span>
      <div style={{ border: `2px solid ${p.line}`, borderRadius: 999, padding: "12px 24px" }}><p style={H(p, 22, { color: p.muted })}>{g(v, "them")}</p></div>
    </div>
  </Slide>;
  if (page === 1) {
    const rows = cols(g(v, "compare")).slice(0, 6);
    return <Slide p={p}>
      <Head p={p} kicker="Comparatif" title="Pourquoi les clients nous choisissent" />
      <div style={{ position: "absolute", left: P, right: P, top: 210, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 12 }}>
          <span />
          <div style={{ background: p.accent, borderRadius: "14px 14px 0 0", padding: "16px 0", textAlign: "center" }}><p style={H(p, 22, { color: p.bg })}>{g(v, "us")}</p></div>
          <div style={{ background: p.surface, borderRadius: "14px 14px 0 0", padding: "16px 0", textAlign: "center" }}><p style={H(p, 22, { color: p.muted })}>{g(v, "them")}</p></div>
        </div>
        {rows.map((r, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 12, borderBottom: `1px solid ${p.line}` }}>
          <p style={B(p, 19, { color: p.ink, fontWeight: 600, padding: "16px 4px" })}>{r[0] ?? ""}</p>
          <div style={{ background: p.soft, padding: "16px 0", textAlign: "center" }}><p style={B(p, 19, { color: p.ink, fontWeight: 600 })}>{r[1] ?? ""}</p></div>
          <p style={B(p, 19, { padding: "16px 0", textAlign: "center" })}>{r[2] ?? ""}</p>
        </div>)}
      </div>
      <Foot p={p} text={product} n={2} />
    </Slide>;
  }
  if (page === 2) return <Slide p={p}>
    <Head p={p} kicker="Objections" title="Ce qu'on entend, ce qu'on répond" />
    <div style={{ position: "absolute", left: P, right: P, top: 214, display: "flex", flexDirection: "column", gap: 18 }}>
      {pairs(g(v, "objections")).slice(0, 4).map(([q, a], i) => <div key={i} style={card(p, { padding: "30px 34px", display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 30, alignItems: "center", minHeight: 118 })}>
        <p style={H(p, 26, { fontWeight: 600 })}>{`« ${q} »`}</p>
        <p style={B(p, 21, { color: p.ink, borderLeft: `3px solid ${p.accent}`, paddingLeft: 24 })}>{a}</p>
      </div>)}
    </div>
    <Foot p={p} text={product} n={3} />
  </Slide>;
  if (page === 3) return <Slide p={p}>
    <Head p={p} kicker="Nos arguments" title="Trois raisons de signer aujourd'hui" />
    <div style={{ position: "absolute", left: P, right: P, top: 240, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
      {pairs(g(v, "pillars")).slice(0, 3).map(([t, d], i) => <div key={i} style={card(p, { padding: "36px 32px", display: "flex", flexDirection: "column", gap: 16, minHeight: 320 })}>
        <span style={H(p, 64, { color: p.accent })}>{pad2(i + 1)}</span><p style={H(p, 30)}>{t}</p><p style={B(p, 19)}>{d}</p>
      </div>)}
    </div>
    <Foot p={p} text={product} n={4} />
  </Slide>;
  if (page === 4) return <Slide p={p}>
    <Head p={p} kicker="Questions de découverte" title="Faire parler le client avant de présenter" />
    <div style={{ position: "absolute", left: P, right: P, top: 240, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
      {lines(g(v, "questions")).slice(0, 4).map((t, i) => <div key={i} style={card(p, { padding: "28px 30px", display: "flex", gap: 22, alignItems: "center", minHeight: 150 })}>
        <Dot p={p} n="?" size={56} /><span style={H(p, 24, { fontWeight: 600, lineHeight: 1.3 })}>{t}</span>
      </div>)}
    </div>
    <Foot p={p} text={product} n={5} />
  </Slide>;
  return <Slide p={p} dark>
    <Head p={p} kicker="Prochaines étapes" title={g(v, "closing")} dark top={100} />
    <div style={{ position: "absolute", left: P, right: P, top: 290, display: "flex", flexDirection: "column", gap: 22 }}>
      {lines(g(v, "next")).slice(0, 4).map((t, i) => <div key={i} style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Dot p={p} n={i + 1} size={52} bg={p.accent} color={p.bg} /><span style={B(p, 24, { color: p.bg })}>{t}</span>
      </div>)}
    </div>
    <Foot p={p} text={g(v, "contact")} n={6} dark />
  </Slide>;
}

// ---------- 5. Solar energy offer ----------
const solarFields = [
  f("photo", "Photo", "", "image"), f("company", "Entreprise", "SolarKa Énergie"), f("title", "Titre", "Passez au solaire, réduisez votre facture"),
  f("subtitle", "Sous-titre", "Notre offre pour les maisons, les boutiques et les ateliers"), f("date", "Date", "Offre valable jusqu'au 30 juin 2027"),
  f("problemStat", "Chiffre fort", "42 %"), f("problemText", "Explication", "c'est la part moyenne de l'électricité dans les charges d'une boutique équipée d'un congélateur, sans compter les coupures.", "long"),
  f("pains", "Difficultés (« titre : texte »)", "Coupures : jusqu'à 4 heures par jour en saison chaude\nGroupe électrogène : 2 500 FCFA de carburant par jour\nFacture : en hausse chaque année", "long"),
  f("kits", "Kits (« nom | puissance | prix | usage »)", "Kit Maison | 1,5 kWc | 950 000 FCFA | Éclairage, télévision, ventilateurs\nKit Boutique | 3 kWc | 1 900 000 FCFA | Congélateur, caisse, éclairage\nKit Atelier | 6 kWc | 3 600 000 FCFA | Machines et climatisation", "long"),
  f("billBefore", "Facture actuelle", "85 000"), f("billAfter", "Facture avec le solaire", "18 000"), f("billUnit", "Unité", "FCFA par mois"),
  f("payback", "Retour sur investissement", "Votre installation est remboursée en 3 ans environ, puis l'énergie du soleil reste gratuite."),
  f("steps", "Étapes (« étape : texte »)", "Visite technique : un technicien mesure vos besoins, gratuitement\nDevis détaillé : le prix ferme sous 48 heures\nInstallation : en 1 à 3 jours selon le kit\nSuivi : contrôle et nettoyage tous les 6 mois", "long"),
  f("stepsNote", "Note sous les étapes", "En moyenne 10 jours entre la visite et la mise en service, sans acompte avant la visite."),
  f("guarantees", "Garanties", "Panneaux garantis 25 ans\nBatteries et onduleur garantis 5 ans\nPaiement en 3 fois par Mobile Money\nÉquipe locale, intervention sous 48 heures", "long"),
  f("cta", "Appel à l'action", "Demandez votre étude gratuite"), f("contact", "Contact", "+229 01 00 00 00 · contact@solarka.bj"),
];
function solar(v: V, p: Palette, page: number) {
  const co = g(v, "company");
  if (page === 0) return <Slide p={p}>
    <Img src={g(v, "photo")} p={p} style={{ position: "absolute", right: 0, top: 0, width: 540, height: HH }} label="Votre photo" />
    <div style={{ position: "absolute", left: P, top: 80 }}><Eyebrow p={p}>{co}</Eyebrow></div>
    <div style={{ position: "absolute", left: P, top: 190, width: 580, display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={H(p, 62)}>{g(v, "title")}</h1><p style={B(p, 24)}>{g(v, "subtitle")}</p>
    </div>
    <div style={{ position: "absolute", left: P, bottom: 70, background: p.soft, borderRadius: 999, padding: "12px 22px" }}><p style={B(p, 16, { color: p.ink, fontWeight: 600 })}>{g(v, "date")}</p></div>
  </Slide>;
  if (page === 1) return <Slide p={p}>
    <div style={{ position: "absolute", left: P, top: 80 }}><Eyebrow p={p}>Le constat</Eyebrow></div>
    <p style={{ ...H(p, 170, { color: p.accent, letterSpacing: "-0.04em" }), position: "absolute", left: P, top: 130 }}>{g(v, "problemStat")}</p>
    <p style={{ ...B(p, 28, { color: p.ink, lineHeight: 1.4 }), position: "absolute", left: 560, right: P, top: 160 }}>{g(v, "problemText")}</p>
    <div style={{ position: "absolute", left: P, right: P, top: 430, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
      {pairs(g(v, "pains")).slice(0, 3).map(([t, d], i) => <div key={i} style={card(p, { padding: "26px 28px", display: "flex", flexDirection: "column", gap: 10 })}>
        <p style={H(p, 24)}>{t}</p><p style={B(p, 18)}>{d}</p>
      </div>)}
    </div>
    <Foot p={p} text={co} n={2} />
  </Slide>;
  if (page === 2) return <Slide p={p}>
    <Head p={p} kicker="Nos kits" title="Une installation adaptée à chaque besoin" />
    <div style={{ position: "absolute", left: P, right: P, top: 214, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
      {cols(g(v, "kits")).slice(0, 3).map((k, i) => <div key={i} style={card(p, { padding: "32px 30px", display: "flex", flexDirection: "column", gap: 12, minHeight: 420, ...(i === 1 ? { border: `2px solid ${p.accent}` } : {}) })}>
        <p style={H(p, 26)}>{k[0] ?? ""}</p><p style={H(p, 56, { color: p.accent })}>{k[1] ?? ""}</p><p style={B(p, 18)}>{k[3] ?? ""}</p>
        <div style={{ height: 1, background: p.line, margin: "auto 0 6px" }} />
        <p style={H(p, 28)}>{k[2] ?? ""}</p><p style={B(p, 15)}>Installation comprise</p>
      </div>)}
    </div>
    <Foot p={p} text={co} n={3} />
  </Slide>;
  if (page === 3) {
    const before = num(g(v, "billBefore")), after = num(g(v, "billAfter")); const max = Math.max(1, before, after);
    const bars = [["Aujourd'hui", g(v, "billBefore"), before, p.ink], ["Avec le solaire", g(v, "billAfter"), after, p.accent]] as const;
    return <Slide p={p}>
      <Head p={p} kicker="Vos économies" title="Une facture enfin sous contrôle" />
      <div style={{ position: "absolute", left: P + 20, top: 220, width: 460, height: 380, display: "flex", alignItems: "flex-end", gap: 60, borderBottom: `2px solid ${p.line}` }}>
        {bars.map(([, txt, n, c], i) => <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span style={H(p, 26)}>{txt}</span><div style={{ width: "100%", height: Math.max(8, Math.round((n / max) * 300)), borderRadius: 12, background: c }} />
        </div>)}
      </div>
      <div style={{ position: "absolute", left: P + 20, top: 616, width: 460, display: "flex", gap: 60 }}>
        {bars.map(([l], i) => <span key={i} style={{ ...B(p, 17), flex: 1, textAlign: "center" }}>{l}</span>)}
      </div>
      <div style={{ position: "absolute", left: 680, right: P, top: 250, display: "flex", flexDirection: "column", gap: 18 }}>
        <p style={H(p, 72, { color: p.accent })}>{thousands(Math.max(0, before - after))}</p>
        <p style={B(p, 22, { color: p.ink, fontWeight: 600 })}>{`${g(v, "billUnit")} économisés`}</p>
        <p style={B(p, 20)}>{g(v, "payback")}</p>
      </div>
    </Slide>;
  }
  if (page === 4) return <Slide p={p}>
    <Head p={p} kicker="Installation" title="De la visite à la mise en service" />
    <div style={{ position: "absolute", left: P, right: P, top: 250, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
      {pairs(g(v, "steps")).slice(0, 4).map(([t, d], i) => <div key={i} style={{ borderTop: `4px solid ${i === 0 ? p.accent : p.line}`, paddingTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={H(p, 22, { color: p.accent })}>{`Étape ${i + 1}`}</span><p style={H(p, 30)}>{t}</p><p style={B(p, 20)}>{d}</p>
      </div>)}
    </div>
    <div style={{ position: "absolute", left: P, right: P, top: 530, background: p.soft, borderRadius: 18, padding: "26px 32px" }}><p style={B(p, 21, { color: p.ink, fontWeight: 600 })}>{g(v, "stepsNote")}</p></div>
    <Foot p={p} text={co} n={5} />
  </Slide>;
  return <Slide p={p}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 600, height: HH, background: p.soft }} />
    <div style={{ position: "absolute", left: P, top: 110, width: 460, display: "flex", flexDirection: "column", gap: 20 }}>
      <Eyebrow p={p}>Nos garanties</Eyebrow>
      {lines(g(v, "guarantees")).slice(0, 5).map((t, i) => <div key={i} style={{ display: "flex", gap: 16 }}><Mark c={p.accent} /><span style={B(p, 21, { color: p.ink })}>{t}</span></div>)}
    </div>
    <div style={{ position: "absolute", left: 680, right: P, top: 220, display: "flex", flexDirection: "column", gap: 24 }}>
      <Bar p={p} /><h2 style={H(p, 54)}>{g(v, "cta")}</h2><p style={B(p, 22, { color: p.ink })}>{g(v, "contact")}</p><p style={B(p, 18)}>{co}</p>
    </div>
  </Slide>;
}

// ---------- 6. Artist press kit ----------
const artistFields = [
  f("photo", "Photo principale", "", "image"), f("photo2", "Deuxième photo", "", "image"),
  f("name", "Nom d'artiste", "Nadia Kossou"), f("role", "Rôle", "Chanteuse · autrice · compositrice"), f("genre", "Style", "Afro-soul et jazz"),
  f("socials", "Réseaux", "@nadiakossou · YouTube · Spotify"),
  f("bioTitle", "Titre de la biographie", "Une voix entre Cotonou et Paris"),
  f("bio", "Biographie", "Révélée par les scènes ouvertes de Cotonou, Nadia mêle chants traditionnels fon, soul et harmonies jazz. Après deux albums autoproduits, elle tourne en Afrique de l'Ouest et en Europe, et transmet sa musique dans des ateliers pour les jeunes chanteurs.", "long"),
  f("timeline", "Parcours (« année : étape »)", "2019 : premier prix d'un concours de jeunes talents\n2021 : premier album « Racines »\n2023 : tournée dans 6 pays d'Afrique de l'Ouest\n2026 : deuxième album et festival en Europe", "long"),
  f("works", "Discographie (« titre | année | détail »)", "Racines | 2021 | Album · 10 titres\nLumière d'Agbodjan | 2022 | Single · plus d'un million d'écoutes\nNuits de Cotonou | 2024 | EP · 5 titres\nSur la route | 2025 | Album live\nHorizons | 2026 | Album · 12 titres", "long"),
  f("stagesTitle", "Titre des scènes", "Sur scène et en chiffres"),
  f("stat1", "Chiffre 1", "120+"), f("stat1Label", "Légende 1", "concerts donnés"), f("stat2", "Chiffre 2", "3 M"), f("stat2Label", "Légende 2", "écoutes en ligne"), f("stat3", "Chiffre 3", "9"), f("stat3Label", "Légende 3", "pays visités"),
  f("stages", "Scènes et festivals (une ligne par lieu)", "Festival des Arts de Ouidah\nInstitut français de Cotonou\nAbidjan Jazz Night\nFestival de Dakar\nScène ouverte à Paris", "long"),
  f("contactTitle", "Titre du contact", "Programmons votre prochain événement"), f("booking", "Contact booking", "booking@nadiakossou.com · +229 01 00 00 00"),
];
function artist(v: V, p: Palette, page: number) {
  const name = g(v, "name");
  if (page === 0) return <Slide p={p} dark>
    <Img src={g(v, "photo")} p={p} style={{ position: "absolute", left: 0, top: 0, width: 520, height: HH }} label="Votre photo" />
    <div style={{ position: "absolute", left: 600, right: P, top: 200, display: "flex", flexDirection: "column", gap: 22 }}>
      <Eyebrow p={p}>{g(v, "genre")}</Eyebrow><h1 style={H(p, 92, { color: p.bg, letterSpacing: "-0.03em" })}>{name}</h1><p style={B(p, 26, { color: p.line })}>{g(v, "role")}</p>
    </div>
    <p style={{ ...B(p, 17, { color: p.line }), position: "absolute", left: 600, bottom: 64 }}>{g(v, "socials")}</p>
  </Slide>;
  if (page === 1) return <Slide p={p}>
    <Head p={p} kicker="Biographie" title={g(v, "bioTitle")} width={600} />
    <p style={{ ...B(p, 21, { color: p.ink, lineHeight: 1.65 }), position: "absolute", left: P, top: 250, width: 600 }}>{g(v, "bio")}</p>
    <Img src={g(v, "photo2")} p={p} style={{ position: "absolute", left: 760, top: 64, width: 440, height: 592, borderRadius: 24 }} label="Photo" />
  </Slide>;
  if (page === 2) return <Slide p={p}>
    <Head p={p} kicker="Parcours" title="Les grandes étapes" />
    <div style={{ position: "absolute", left: P, right: P, top: 347, height: 2, background: p.line }} />
    <div style={{ position: "absolute", left: P, right: P, top: 270, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
      {pairs(g(v, "timeline")).slice(0, 4).map(([y, t], i) => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <span style={H(p, 40, { color: p.accent })}>{y}</span>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: p.accent, border: `5px solid ${p.bg}`, boxSizing: "border-box" }} />
        <span style={B(p, 19, { color: p.ink })}>{t}</span>
      </div>)}
    </div>
    <Foot p={p} text={name} n={3} />
  </Slide>;
  if (page === 3) return <Slide p={p}>
    <Head p={p} kicker="Discographie" title="Œuvres et projets" />
    <div style={{ position: "absolute", left: P, right: P, top: 210, display: "flex", flexDirection: "column" }}>
      {cols(g(v, "works")).slice(0, 5).map((w, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px", alignItems: "center", padding: "15px 0", borderBottom: `1px solid ${p.line}` }}>
        <span style={H(p, 22, { color: p.accent })}>{pad2(i + 1)}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={H(p, 25)}>{w[0] ?? ""}</span><span style={B(p, 16)}>{w[2] ?? ""}</span></div>
        <span style={B(p, 18, { color: p.ink, fontWeight: 600, textAlign: "right" })}>{w[1] ?? ""}</span>
      </div>)}
    </div>
  </Slide>;
  if (page === 4) return <Slide p={p}>
    <Head p={p} kicker="Scènes" title={g(v, "stagesTitle")} />
    <div style={{ position: "absolute", left: P, right: P, top: 220, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
      {[1, 2, 3].map((n) => <div key={n} style={card(p, { padding: "30px 32px", display: "flex", flexDirection: "column", gap: 8, ...(n === 1 ? { background: p.soft, border: "none" } : {}) })}>
        <span style={H(p, 60, { color: p.accent })}>{g(v, `stat${n}`)}</span><span style={B(p, 19)}>{g(v, `stat${n}Label`)}</span>
      </div>)}
    </div>
    <div style={{ position: "absolute", left: P, right: P, top: 470, display: "flex", flexWrap: "wrap", gap: 14 }}>
      {lines(g(v, "stages")).slice(0, 8).map((t, i) => <div key={i} style={{ border: `1.5px solid ${p.line}`, borderRadius: 999, padding: "11px 22px" }}><p style={B(p, 18, { color: p.ink })}>{t}</p></div>)}
    </div>
    <Foot p={p} text={name} n={5} />
  </Slide>;
  return <Slide p={p} dark>
    <div style={{ position: "absolute", left: P, right: P, top: 220, display: "flex", flexDirection: "column", gap: 26 }}>
      <Eyebrow p={p}>Booking</Eyebrow><h2 style={H(p, 70, { color: p.bg })}>{g(v, "contactTitle")}</h2>
      <p style={B(p, 24, { color: p.line })}>{g(v, "booking")}</p><p style={B(p, 18, { color: p.line })}>{g(v, "socials")}</p>
    </div>
  </Slide>;
}

// ---------- 7. Training course ----------
const trainingFields = [
  f("org", "Organisme", "Institut Kaba Management"), f("title", "Titre", "Gérer un projet de A à Z"), f("subtitle", "Sous-titre", "Formation pratique pour chefs de projet débutants"),
  f("trainer", "Formateur", "Animée par Fatou Ndiaye, cheffe de projet certifiée"), f("date", "Date", "Avril 2027 · 2 jours"),
  f("modules", "Programme (« module | durée »)", "Cadrer le projet et ses objectifs | 2 h\nConstruire le planning et le budget | 3 h\nPiloter l'équipe et les risques | 3 h\nClôturer et tirer les leçons | 2 h", "long"),
  f("phases", "Phases (« phase : texte »)", "Cadrer : définir le besoin, le périmètre et les objectifs\nPlanifier : découper en tâches, estimer, fixer les jalons\nExécuter : produire, suivre l'avancement, ajuster\nClôturer : livrer, mesurer, partager les leçons", "long"),
  f("methodTitle", "Titre de la méthode", "Les quatre questions à se poser"),
  f("method", "Méthode (« question : texte »)", "Pourquoi ? : le problème à résoudre et le résultat attendu\nQuoi ? : ce qui est inclus, et ce qui ne l'est pas\nQui ? : les rôles, les décideurs et les personnes concernées\nQuand et combien ? : les délais, le budget et les ressources", "long"),
  f("caseTitle", "Titre de l'exercice", "La boutique en ligne de Mariam"),
  f("caseText", "Énoncé", "Mariam vend des pagnes à Dakar et veut ouvrir une boutique en ligne avant la Tabaski, dans 10 semaines, avec un budget de 1 500 000 FCFA et une seule développeuse.", "long"),
  f("questions", "Questions de l'exercice", "Quel est l'objectif mesurable du projet ?\nQuelles sont les trois tâches les plus risquées ?\nQue retirer du périmètre si le délai glisse ?", "long"),
  f("caseTime", "Consigne", "20 minutes · en binôme"),
  f("recap", "À retenir (une ligne par point)", "Un objectif clair vaut mieux qu'un long cahier des charges\nUn planning se découpe en livrables, pas en jours\nLes risques se suivent chaque semaine\nOn communique avant d'avoir un problème\nOn clôture toujours par un bilan", "long"),
  f("closing", "Titre de fin", "Ce qu'il faut retenir"),
];
function training(v: V, p: Palette, page: number) {
  const org = g(v, "org");
  if (page === 0) return <Slide p={p}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 440, height: HH, background: p.soft }} />
    <div style={{ position: "absolute", left: P, top: 210, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={H(p, 210, { color: p.accent, lineHeight: 0.9 })}>{String(Math.max(1, lines(g(v, "modules")).length))}</span><span style={B(p, 24, { color: p.ink, fontWeight: 600 })}>modules pratiques</span>
    </div>
    <div style={{ position: "absolute", left: 520, right: P, top: 160, display: "flex", flexDirection: "column", gap: 24 }}>
      <Eyebrow p={p}>{org}</Eyebrow><h1 style={H(p, 58)}>{g(v, "title")}</h1><p style={B(p, 24)}>{g(v, "subtitle")}</p>
    </div>
    <div style={{ position: "absolute", left: 520, right: P, bottom: 70, display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={B(p, 18, { color: p.ink, fontWeight: 600 })}>{g(v, "trainer")}</p><p style={B(p, 16)}>{g(v, "date")}</p>
    </div>
  </Slide>;
  if (page === 1) return <Slide p={p}>
    <Head p={p} kicker="Programme" title="Le déroulé de la formation" />
    <div style={{ position: "absolute", left: P, right: P, top: 220, display: "flex", flexDirection: "column", gap: 14 }}>
      {cols(g(v, "modules")).slice(0, 6).map((m, i) => <div key={i} style={card(p, { padding: "20px 26px", display: "flex", alignItems: "center", gap: 22 })}>
        <Dot p={p} n={i + 1} size={48} /><span style={{ ...H(p, 25, { fontWeight: 600 }), flex: 1 }}>{m[0] ?? ""}</span>
        {m[1] && <div style={{ background: p.accent, borderRadius: 999, padding: "8px 18px" }}><p style={B(p, 16, { color: p.bg, fontWeight: 700 })}>{m[1]}</p></div>}
      </div>)}
    </div>
    <Foot p={p} text={org} n={2} />
  </Slide>;
  if (page === 2) return <Slide p={p}>
    <Head p={p} kicker="Le cycle d'un projet" title="Quatre phases, un fil conducteur" />
    <div style={{ position: "absolute", left: P, right: P, top: 250, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
      {pairs(g(v, "phases")).slice(0, 4).map(([t, d], i) => { const last = i === 3;
        return <div key={i} style={card(p, { padding: "30px 26px", display: "flex", flexDirection: "column", gap: 14, minHeight: 330, ...(last ? { background: p.accent, border: "none" } : {}) })}>
          <p style={B(p, 14, { color: last ? p.bg : p.accent, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" })}>{`Phase ${i + 1}`}</p>
          <p style={H(p, 32, { color: last ? p.bg : p.ink })}>{t}</p><p style={B(p, 19, { color: last ? p.bg : p.muted })}>{d}</p>
        </div>; })}
    </div>
    <Foot p={p} text={org} n={3} />
  </Slide>;
  if (page === 3) return <Slide p={p}>
    <Head p={p} kicker="Méthode" title={g(v, "methodTitle")} />
    <div style={{ position: "absolute", left: P, right: P, top: 220, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
      {pairs(g(v, "method")).slice(0, 4).map(([t, d], i) => <div key={i} style={card(p, { padding: "26px 30px", borderLeft: `5px solid ${p.accent}`, display: "flex", flexDirection: "column", gap: 10, minHeight: 170 })}>
        <p style={H(p, 28)}>{t}</p><p style={B(p, 19)}>{d}</p>
      </div>)}
    </div>
    <Foot p={p} text={org} n={4} />
  </Slide>;
  if (page === 4) return <Slide p={p}>
    <div style={{ position: "absolute", left: P, top: 80, width: 560, height: 560, background: p.soft, borderRadius: 24, padding: 44, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20 }}>
      <Eyebrow p={p}>Exercice</Eyebrow><p style={H(p, 36)}>{g(v, "caseTitle")}</p><p style={B(p, 20, { color: p.ink, lineHeight: 1.6 })}>{g(v, "caseText")}</p>
    </div>
    <div style={{ position: "absolute", left: 720, right: P, top: 100, display: "flex", flexDirection: "column", gap: 24 }}>
      <Eyebrow p={p}>À vous de jouer</Eyebrow>
      {lines(g(v, "questions")).slice(0, 4).map((t, i) => <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}><Dot p={p} n={i + 1} size={42} /><span style={H(p, 23, { fontWeight: 600, lineHeight: 1.3, marginTop: 6 })}>{t}</span></div>)}
      <div style={{ alignSelf: "flex-start", background: p.ink, borderRadius: 999, padding: "10px 20px", marginTop: 8 }}><p style={B(p, 16, { color: p.bg, fontWeight: 600 })}>{g(v, "caseTime")}</p></div>
    </div>
  </Slide>;
  return <Slide p={p}>
    <Head p={p} kicker="À retenir" title={g(v, "closing")} />
    <div style={{ position: "absolute", left: P, right: P, top: 220, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 48, rowGap: 0 }}>
      {lines(g(v, "recap")).slice(0, 8).map((t, i) => <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: `1px solid ${p.line}` }}><Mark c={p.accent} /><span style={B(p, 20, { color: p.ink })}>{t}</span></div>)}
    </div>
    <Foot p={p} text={`${org} · ${g(v, "trainer")}`} n={6} />
  </Slide>;
}

// ---------- 8. Agency presentation ----------
const agencyFields = [
  f("photo", "Photo", "", "image"), f("agency", "Agence", "Studio Baobab"), f("title", "Titre", "Votre marque visible et protégée en ligne"),
  f("subtitle", "Sous-titre", "Réseaux sociaux · contenus · cybersécurité"), f("date", "Date", "Présentation 2027"),
  f("aboutTitle", "Titre de présentation", "Une équipe locale, des standards internationaux"),
  f("about", "Qui sommes-nous", "Depuis 2020, nous aidons les commerces, les écoles et les PME d'Afrique de l'Ouest à se faire connaître sur les réseaux sociaux, à vendre en ligne et à protéger leurs comptes et leurs données.", "long"),
  f("values", "Valeurs (« titre : texte »)", "Proximité : un interlocuteur unique, joignable sur WhatsApp\nRésultats : des objectifs chiffrés et un bilan chaque mois\nSécurité : vos accès protégés, vos données jamais revendues", "long"),
  f("services", "Services (« titre : texte », 6 lignes)", "Gestion des réseaux : calendrier, publications et réponses aux messages\nContenus : photos, vidéos courtes et visuels de marque\nPublicité : campagnes ciblées avec un budget maîtrisé\nSite et boutique : pages de vente et paiement Mobile Money\nCybersécurité : audit des comptes, double authentification, sauvegardes\nFormation : vos équipes autonomes sur les bons réflexes", "long"),
  f("process", "Méthode (« étape : texte »)", "Diagnostic : audit gratuit de votre présence en ligne\nStratégie : objectifs, cibles et calendrier\nProduction : contenus et campagnes chaque semaine\nBilan : rapport mensuel et ajustements", "long"),
  f("caseTitle", "Titre du cas client", "Une boulangerie de Lomé, six mois plus tard"),
  f("stat1", "Résultat 1", "×4"), f("stat1Label", "Légende 1", "commandes reçues sur WhatsApp"), f("stat2", "Résultat 2", "+12 000"), f("stat2Label", "Légende 2", "abonnés sur Instagram"), f("stat3", "Résultat 3", "0"), f("stat3Label", "Légende 3", "compte piraté depuis l'audit"),
  f("caseText", "Texte du cas client", "Calendrier de publications, vidéos courtes du fournil et sécurisation des comptes : la boutique ne désemplit plus le week-end.", "long"),
  f("packs", "Formules (« nom | prix | contenu ; contenu »)", "Essentiel | 75 000 FCFA / mois | 2 réseaux ; 12 publications ; rapport mensuel\nCroissance | 150 000 FCFA / mois | 3 réseaux ; 20 publications ; 2 vidéos ; publicité\nSérénité | 220 000 FCFA / mois | Tout Croissance ; audit sécurité ; formation de l'équipe", "long"),
  f("closing", "Titre de fin", "Parlons de votre projet"), f("contact", "Contact", "hello@studiobaobab.com · +228 90 00 00 00"),
];
function agency(v: V, p: Palette, page: number) {
  const ag = g(v, "agency");
  if (page === 0) return <Slide p={p}>
    <div style={{ position: "absolute", left: P, top: 80 }}><Eyebrow p={p}>{ag}</Eyebrow></div>
    <div style={{ position: "absolute", left: P, top: 170, width: 700, display: "flex", flexDirection: "column", gap: 26 }}>
      <h1 style={H(p, 76, { letterSpacing: "-0.03em" })}>{g(v, "title")}</h1><p style={B(p, 24)}>{g(v, "subtitle")}</p>
    </div>
    <Img src={g(v, "photo")} p={p} style={{ position: "absolute", left: 860, top: 64, width: 340, height: 380, borderRadius: 24 }} label="Votre photo" />
    <div style={{ position: "absolute", left: 860, top: 460, width: 160, height: 196, borderRadius: 24, background: p.accent }} />
    <div style={{ position: "absolute", left: 1036, top: 460, width: 164, height: 196, borderRadius: 24, background: p.ink, display: "flex", alignItems: "flex-end", padding: 20, boxSizing: "border-box" }}><p style={B(p, 15, { color: p.bg, fontWeight: 600 })}>{g(v, "date")}</p></div>
  </Slide>;
  if (page === 1) return <Slide p={p}>
    <div style={{ position: "absolute", left: P, top: 90, width: 560, display: "flex", flexDirection: "column", gap: 22 }}>
      <Eyebrow p={p}>Qui sommes-nous</Eyebrow><h2 style={H(p, 44)}>{g(v, "aboutTitle")}</h2><p style={B(p, 21, { color: p.ink, lineHeight: 1.6 })}>{g(v, "about")}</p>
    </div>
    <div style={{ position: "absolute", left: 720, right: P, top: 110, display: "flex", flexDirection: "column" }}>
      {pairs(g(v, "values")).slice(0, 3).map(([t, d], i) => <div key={i} style={{ display: "flex", gap: 22, padding: "26px 0", borderTop: `1px solid ${p.line}` }}>
        <span style={H(p, 26, { color: p.accent })}>{pad2(i + 1)}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={H(p, 26)}>{t}</span><span style={B(p, 18)}>{d}</span></div>
      </div>)}
    </div>
    <Foot p={p} text={ag} n={2} />
  </Slide>;
  if (page === 2) return <Slide p={p}>
    <Head p={p} kicker="Services" title="Ce que nous faisons pour vous" />
    <div style={{ position: "absolute", left: P, right: P, top: 210, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
      {pairs(g(v, "services")).slice(0, 6).map(([t, d], i) => <div key={i} style={card(p, { padding: "24px 26px", display: "flex", flexDirection: "column", gap: 10, minHeight: 200 })}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: i % 2 ? p.soft : p.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={H(p, 17, { color: i % 2 ? p.accent : p.bg })}>{pad2(i + 1)}</span></div>
        <p style={H(p, 23, { marginTop: 6 })}>{t}</p><p style={B(p, 16)}>{d}</p>
      </div>)}
    </div>
  </Slide>;
  if (page === 3) return <Slide p={p}>
    <Head p={p} kicker="Méthode" title="Une collaboration claire, étape par étape" />
    <div style={{ position: "absolute", left: P, right: P, top: 240, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
      {pairs(g(v, "process")).slice(0, 4).map(([t, d], i) => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={H(p, 84, { color: i === 0 ? p.accent : p.line, lineHeight: 1 })}>{pad2(i + 1)}</span>
        <div style={{ height: 3, background: i === 0 ? p.accent : p.line }} />
        <p style={H(p, 26, { marginTop: 6 })}>{t}</p><p style={B(p, 18)}>{d}</p>
      </div>)}
    </div>
    <Foot p={p} text={ag} n={4} />
  </Slide>;
  if (page === 4) return <Slide p={p} dark>
    <Head p={p} kicker="Résultats" title={g(v, "caseTitle")} dark />
    <div style={{ position: "absolute", left: P, right: P, top: 240, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
      {[1, 2, 3].map((n) => <div key={n} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `2px solid ${p.accent}`, paddingTop: 24 }}>
        <span style={H(p, 72, { color: p.accent })}>{g(v, `stat${n}`)}</span><span style={B(p, 19, { color: p.line })}>{g(v, `stat${n}Label`)}</span>
      </div>)}
    </div>
    <p style={{ ...B(p, 22, { color: p.bg, lineHeight: 1.5 }), position: "absolute", left: P, right: 260, top: 520 }}>{g(v, "caseText")}</p>
  </Slide>;
  if (page === 5) return <Slide p={p}>
    <Head p={p} kicker="Formules" title="Des offres claires, mois par mois" />
    <div style={{ position: "absolute", left: P, right: P, top: 210, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
      {cols(g(v, "packs")).slice(0, 3).map((k, i) => { const hi = i === 1;
        return <div key={i} style={card(p, { padding: "32px 30px", display: "flex", flexDirection: "column", gap: 14, minHeight: 430, ...(hi ? { background: p.accent, border: "none" } : {}) })}>
          <p style={H(p, 26, { color: hi ? p.bg : p.ink })}>{k[0] ?? ""}</p><p style={H(p, 28, { color: hi ? p.bg : p.accent })}>{k[1] ?? ""}</p>
          <div style={{ height: 1, background: hi ? p.bg : p.line, opacity: hi ? 0.4 : 1, margin: "6px 0" }} />
          {(k[2] ?? "").split(";").map((x) => x.trim()).filter(Boolean).slice(0, 5).map((x, j) => <div key={j} style={{ display: "flex", gap: 12 }}><Mark c={hi ? p.bg : p.accent} top={8} /><span style={B(p, 18, { color: hi ? p.bg : p.ink })}>{x}</span></div>)}
        </div>; })}
    </div>
  </Slide>;
  return <Slide p={p}>
    <div style={{ position: "absolute", left: P, right: P, top: 180, display: "flex", flexDirection: "column", gap: 26 }}>
      <Eyebrow p={p}>{ag}</Eyebrow><h2 style={H(p, 84, { letterSpacing: "-0.03em" })}>{g(v, "closing")}</h2><p style={B(p, 24, { color: p.ink })}>{g(v, "contact")}</p>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90, display: "grid", gridTemplateColumns: "2fr 1fr 1fr" }}>
      <div style={{ background: p.accent }} /><div style={{ background: p.ink }} /><div style={{ background: p.soft }} />
    </div>
  </Slide>;
}

export const DECK_LAYOUTS: Layout[] = [
  { id: "deck-safety", format: "presentation", fr: "Formation sécurité", en: "Safety training", pages: 6, fields: safetyFields, render: safety },
  { id: "deck-bento", format: "presentation", fr: "Rapport en mosaïque", en: "Bento report", pages: 5, fields: bentoFields, render: bento },
  { id: "deck-pitch", format: "presentation", fr: "Pitch startup", en: "Startup pitch", pages: 8, fields: pitchFields, render: pitch },
  { id: "deck-battle", format: "presentation", fr: "Fiche de vente comparative", en: "Sales battlecard", pages: 6, fields: battleFields, render: battle },
  { id: "deck-solar", format: "presentation", fr: "Offre énergie solaire", en: "Solar energy offer", pages: 6, fields: solarFields, render: solar },
  { id: "deck-artist", format: "presentation", fr: "Dossier d'artiste", en: "Artist press kit", pages: 6, fields: artistFields, render: artist },
  { id: "deck-training", format: "presentation", fr: "Formation en modules", en: "Training course", pages: 6, fields: trainingFields, render: training },
  { id: "deck-agency", format: "presentation", fr: "Présentation d'agence", en: "Agency presentation", pages: 7, fields: agencyFields, render: agency },
];
