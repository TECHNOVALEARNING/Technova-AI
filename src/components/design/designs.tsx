import type { CSSProperties, ReactNode } from "react";
import type { DesignField, DesignFormatId, FieldKind } from "@/lib/design-formats";

// Original TechNova design layouts, drawn in code with inline styles so the same markup renders on screen,
// prints to PDF and fills the gallery thumbnails. Every template = one layout × one palette. The sample text
// is French (the dashboard's main language) and is meant to be replaced by the user or by « Rédiger avec l'IA ».

export type Palette = { id: string; fr: string; en: string; bg: string; surface: string; ink: string; muted: string; accent: string; soft: string; line: string; head: string; body: string };

export const PALETTES: Record<string, Palette> = {
  ivoire: { id: "ivoire", fr: "Ivoire", en: "Ivory", bg: "#faf8f4", surface: "#ffffff", ink: "#1c1917", muted: "#6b6560", accent: "#b4532a", soft: "#f3e9df", line: "#e7e0d8", head: "Fraunces", body: "Inter" },
  ardoise: { id: "ardoise", fr: "Ardoise", en: "Slate", bg: "#ffffff", surface: "#f5f7fa", ink: "#0f172a", muted: "#64748b", accent: "#2563eb", soft: "#e8efff", line: "#e2e8f0", head: "Inter", body: "Inter" },
  foret: { id: "foret", fr: "Forêt", en: "Forest", bg: "#f6f8f5", surface: "#ffffff", ink: "#14231a", muted: "#5d6b62", accent: "#2f6b4f", soft: "#e3eee6", line: "#dbe5dd", head: "Playfair Display", body: "DM Sans" },
  nuit: { id: "nuit", fr: "Nuit dorée", en: "Golden night", bg: "#111214", surface: "#1b1c20", ink: "#f5f5f4", muted: "#a1a1aa", accent: "#e8c27a", soft: "#26272c", line: "#2e2f35", head: "Fraunces", body: "Inter" },
  corail: { id: "corail", fr: "Corail", en: "Coral", bg: "#fff8f5", surface: "#ffffff", ink: "#2a1715", muted: "#7a625d", accent: "#e4572e", soft: "#fde3da", line: "#f3dcd3", head: "Manrope", body: "Manrope" },
  lavande: { id: "lavande", fr: "Lavande", en: "Lavender", bg: "#f8f7fc", surface: "#ffffff", ink: "#1e1b2e", muted: "#6b6880", accent: "#6d5bd0", soft: "#ece9fb", line: "#e4e1f3", head: "Plus Jakarta Sans", body: "Plus Jakarta Sans" },
  sable: { id: "sable", fr: "Sable", en: "Sand", bg: "#f7f3ec", surface: "#fffdf9", ink: "#2b2620", muted: "#7d7468", accent: "#8a6a3d", soft: "#ede4d6", line: "#e5dccd", head: "Playfair Display", body: "Inter" },
};

export const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&family=DM+Sans:wght@400;500;700&family=Manrope:wght@400;600;800&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap";

type V = Record<string, string>;
type Layout = { id: string; format: DesignFormatId; fr: string; en: string; pages: number; fields: DesignField[]; render: (v: V, p: Palette, page: number) => ReactNode };

const f = (key: string, label: string, value: string, kind: FieldKind = "text", max = kind === "long" ? 600 : 120): DesignField => ({ key, label, kind, value, max });
const font = (name: string) => `'${name}', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`;
const lines = (t: string) => t.split(/\n+/).map((x) => x.trim()).filter(Boolean);

/** A page at its design size; everything inside is positioned in design pixels. */
function Page({ w, h, p, children, style }: { w: number; h: number; p: Palette; children: ReactNode; style?: CSSProperties }) {
  return <div data-design-page style={{ width: w, height: h, position: "relative", overflow: "hidden", background: p.bg, color: p.ink, fontFamily: font(p.body), boxSizing: "border-box", ...style }}>{children}</div>;
}
const H = (p: Palette, size: number, extra: CSSProperties = {}): CSSProperties => ({ fontFamily: font(p.head), fontSize: size, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, ...extra });
const B = (p: Palette, size: number, extra: CSSProperties = {}): CSSProperties => ({ fontFamily: font(p.body), fontSize: size, lineHeight: 1.55, margin: 0, color: p.muted, ...extra });
const Eyebrow = ({ p, children, size = 14 }: { p: Palette; children: ReactNode; size?: number }) => <p style={{ fontFamily: font(p.body), fontSize: size, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: p.accent, margin: 0 }}>{children}</p>;
const Img = ({ src, p, style, label = "Photo" }: { src: string; p: Palette; style: CSSProperties; label?: string }) => src
  ? <div style={{ backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center", ...style }} />
  : <div style={{ background: p.soft, display: "flex", alignItems: "center", justifyContent: "center", color: p.muted, fontFamily: font(p.body), fontSize: 14, ...style }}>{label}</div>;
const Bar = ({ p, w = 56, h = 4 }: { p: Palette; w?: number; h?: number }) => <div style={{ width: w, height: h, background: p.accent, borderRadius: h }} />;

// ---------- Presentation (5 slides) ----------
const presFields = [
  f("title", "Titre de la présentation", "Lancer notre offre en 2027"), f("subtitle", "Sous-titre", "Stratégie, étapes et chiffres clés"),
  f("author", "Présenté par", "Awa Mensah · Direction commerciale"), f("date", "Date", "Janvier 2027"),
  f("agenda", "Sommaire (une ligne par point)", "Où nous en sommes\nNotre plan d'action\nLes chiffres à retenir", "long"),
  f("contentTitle", "Titre de la diapositive principale", "Notre plan d'action"),
  f("bullets", "Points clés (une ligne par point)", "Renforcer l'équipe commerciale à Cotonou et Lomé\nLancer la vente en ligne avec paiement Mobile Money\nFidéliser nos clients grâce à un suivi personnalisé", "long"),
  f("stat1", "Chiffre 1", "+38 %"), f("stat1Label", "Légende chiffre 1", "de chiffre d'affaires visé"),
  f("stat2", "Chiffre 2", "1 200"), f("stat2Label", "Légende chiffre 2", "nouveaux clients"),
  f("stat3", "Chiffre 3", "6 mois"), f("stat3Label", "Légende chiffre 3", "pour le déploiement"),
  f("closing", "Message de fin", "Merci pour votre attention"), f("contact", "Contact", "awa.mensah@entreprise.com · +229 01 00 00 00"),
];
function presentation(variant: "minimal" | "split" | "editorial") {
  return (v: V, p: Palette, page: number) => {
    const W = 1280, Hh = 720, pad = 88;
    const side = variant === "split";
    if (page === 0) return <Page w={W} h={Hh} p={p}>
      {side && <div style={{ position: "absolute", right: 0, top: 0, width: 420, height: Hh, background: p.accent }} />}
      {variant === "editorial" && <div style={{ position: "absolute", left: pad, right: pad, top: 64, height: 1, background: p.line }} />}
      <div style={{ position: "absolute", left: pad, top: side ? 200 : 210, width: side ? 680 : 900, display: "flex", flexDirection: "column", gap: 26 }}>
        <Eyebrow p={p}>{v["date"]}</Eyebrow>
        <h1 style={H(p, variant === "editorial" ? 76 : 68)}>{v["title"]}</h1>
        <p style={B(p, 26)}>{v["subtitle"]}</p>
      </div>
      <p style={{ ...B(p, 18), position: "absolute", left: pad, bottom: 64, color: p.ink, fontWeight: 600 }}>{v["author"]}</p>
    </Page>;
    if (page === 1) return <Page w={W} h={Hh} p={p}>
      <div style={{ position: "absolute", left: pad, top: 90 }}><Eyebrow p={p}>Sommaire</Eyebrow></div>
      <div style={{ position: "absolute", left: pad, right: pad, top: 170, display: "flex", flexDirection: "column", gap: 0 }}>
        {lines(v["agenda"] ?? "").slice(0, 5).map((t, i) => <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 32, padding: "26px 0", borderTop: `1px solid ${p.line}` }}>
          <span style={{ ...H(p, 34), color: p.accent, width: 70 }}>{String(i + 1).padStart(2, "0")}</span><span style={H(p, 38, { fontWeight: 600 })}>{t}</span>
        </div>)}
      </div>
    </Page>;
    if (page === 2) return <Page w={W} h={Hh} p={p}>
      {side && <div style={{ position: "absolute", left: 0, top: 0, width: 26, height: Hh, background: p.accent }} />}
      <div style={{ position: "absolute", left: pad, top: 96, width: 430, display: "flex", flexDirection: "column", gap: 22 }}>
        <Bar p={p} /><h2 style={H(p, 52)}>{v["contentTitle"]}</h2>
      </div>
      <div style={{ position: "absolute", left: 590, right: pad, top: 110, display: "flex", flexDirection: "column", gap: 22 }}>
        {lines(v["bullets"] ?? "").slice(0, 5).map((t, i) => <div key={i} style={{ display: "flex", gap: 20, padding: "22px 26px", background: p.surface, border: `1px solid ${p.line}`, borderRadius: 16 }}>
          <span style={{ width: 34, height: 34, flex: "0 0 34px", borderRadius: 34, background: p.soft, color: p.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{i + 1}</span>
          <span style={B(p, 22, { color: p.ink })}>{t}</span>
        </div>)}
      </div>
    </Page>;
    if (page === 3) return <Page w={W} h={Hh} p={p}>
      <div style={{ position: "absolute", left: pad, top: 90 }}><Eyebrow p={p}>Chiffres clés</Eyebrow></div>
      <div style={{ position: "absolute", left: pad, right: pad, top: 230, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
        {[1, 2, 3].map((n) => <div key={n} style={{ padding: "42px 36px", background: n === 2 && side ? p.accent : p.surface, border: `1px solid ${p.line}`, borderRadius: 20 }}>
          <p style={H(p, 64, { color: n === 2 && side ? p.bg : p.accent })}>{v[`stat${n}`]}</p>
          <p style={B(p, 20, { marginTop: 14, color: n === 2 && side ? p.bg : p.muted })}>{v[`stat${n}Label`]}</p>
        </div>)}
      </div>
    </Page>;
    return <Page w={W} h={Hh} p={p} style={variant === "minimal" ? {} : { background: p.ink, color: p.bg }}>
      <div style={{ position: "absolute", left: pad, right: pad, top: 250, display: "flex", flexDirection: "column", gap: 28 }}>
        <Bar p={p} /><h2 style={H(p, 72, { color: variant === "minimal" ? p.ink : p.bg })}>{v["closing"]}</h2>
        <p style={B(p, 22, { color: variant === "minimal" ? p.muted : p.line })}>{v["contact"]}</p>
      </div>
    </Page>;
  };
}

// ---------- A4 documents ----------
const A4 = { w: 794, h: 1123 };
const reportFields = [
  f("org", "Organisation", "Coopérative Agro Sud"), f("title", "Titre", "Rapport d'activité 2026"), f("subtitle", "Sous-titre", "Bilan de l'année et perspectives"),
  f("intro", "Introduction", "Cette année, la coopérative a renforcé sa production et ouvert deux nouveaux points de vente. Ce rapport présente les résultats, les difficultés rencontrées et les priorités pour l'année à venir.", "long"),
  f("s1", "Titre section 1", "Résultats de l'année"), f("s1body", "Texte section 1", "La production a progressé de 18 % grâce aux nouvelles parcelles irriguées. Les ventes directes représentent désormais un tiers du chiffre d'affaires.", "long"),
  f("s2", "Titre section 2", "Priorités 2027"), f("s2body", "Texte section 2", "Former les membres aux techniques de conservation, moderniser la transformation et développer la vente en ligne.", "long"),
  f("footer", "Pied de page", "Coopérative Agro Sud · Bohicon · contact@agrosud.bj"),
];
function report(v: V, p: Palette) {
  return <Page w={A4.w} h={A4.h} p={p}>
    <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 300, background: p.soft }} />
    <div style={{ position: "absolute", left: 72, right: 72, top: 70, display: "flex", flexDirection: "column", gap: 18 }}>
      <Eyebrow p={p} size={12}>{v["org"]}</Eyebrow><h1 style={H(p, 44)}>{v["title"]}</h1><p style={B(p, 17)}>{v["subtitle"]}</p>
    </div>
    <div style={{ position: "absolute", left: 72, right: 72, top: 345, display: "flex", flexDirection: "column", gap: 26 }}>
      <p style={B(p, 15.5, { color: p.ink })}>{v["intro"]}</p>
      {[1, 2].map((n) => <div key={n} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Bar p={p} w={22} h={3} /><h2 style={H(p, 22)}>{v[`s${n}`]}</h2></div>
        <p style={B(p, 14.5)}>{v[`s${n}body`]}</p>
      </div>)}
    </div>
    <p style={{ ...B(p, 11), position: "absolute", left: 72, right: 72, bottom: 40, borderTop: `1px solid ${p.line}`, paddingTop: 14 }}>{v["footer"]}</p>
  </Page>;
}
const letterFields = [
  f("org", "Expéditeur", "Atelier Kossi Design"), f("orgInfo", "Coordonnées expéditeur", "Rue des Cocotiers, Cotonou · +229 01 00 00 00"),
  f("to", "Destinataire", "Madame Ruth Adjovi\nDirectrice, Hôtel Le Lagon\nCotonou", "long"), f("date", "Lieu et date", "Cotonou, le 12 janvier 2027"),
  f("subject", "Objet", "Proposition de décoration de votre hall d'accueil"),
  f("body", "Texte de la lettre", "Madame,\n\nSuite à notre échange, je vous adresse notre proposition pour la décoration de votre hall d'accueil. Nous avons imaginé un espace chaleureux, qui met en valeur l'artisanat local tout en restant élégant et facile à entretenir.\n\nVous trouverez ci-joint le détail des matériaux et un calendrier de réalisation. Je reste à votre disposition pour en discuter.\n\nVeuillez agréer, Madame, l'expression de mes salutations distinguées.", "long", 2000),
  f("sign", "Signature", "Kossi Agbo, fondateur"),
];
function letter(v: V, p: Palette) {
  return <Page w={A4.w} h={A4.h} p={p} style={{ background: p.surface }}>
    <div style={{ position: "absolute", left: 72, right: 72, top: 64, display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 18, borderBottom: `2px solid ${p.accent}` }}>
      <p style={H(p, 26)}>{v["org"]}</p><p style={B(p, 11.5, { textAlign: "right", maxWidth: 300 })}>{v["orgInfo"]}</p>
    </div>
    <p style={{ ...B(p, 14, { color: p.ink, whiteSpace: "pre-line" }), position: "absolute", left: 430, top: 170, width: 292 }}>{v["to"]}</p>
    <p style={{ ...B(p, 13.5), position: "absolute", left: 72, top: 280 }}>{v["date"]}</p>
    <p style={{ ...B(p, 14.5, { color: p.ink, fontWeight: 700 }), position: "absolute", left: 72, right: 72, top: 320 }}>Objet : {v["subject"]}</p>
    <p style={{ ...B(p, 14.5, { color: p.ink, whiteSpace: "pre-line" }), position: "absolute", left: 72, right: 72, top: 375 }}>{v["body"]}</p>
    <p style={{ ...B(p, 14.5, { color: p.ink, fontWeight: 600 }), position: "absolute", left: 430, bottom: 110 }}>{v["sign"]}</p>
  </Page>;
}
const cvFields = [
  f("photo", "Photo (facultatif)", "", "image"), f("name", "Nom complet", "Aïcha Bello"), f("job", "Métier", "Chargée de marketing digital"),
  f("contact", "Coordonnées (une ligne par info)", "aicha.bello@email.com\n+229 01 00 00 00\nCotonou, Bénin\nlinkedin.com/in/aichabello", "long"),
  f("profile", "Profil", "Spécialiste du marketing digital avec 5 ans d'expérience dans la communication de marques locales. J'aime transformer une idée en campagne claire et mesurable.", "long"),
  f("exp1", "Expérience 1 (poste · entreprise · dates)", "Responsable communication · MTN Bénin · 2023 – aujourd'hui"), f("exp1d", "Détail expérience 1", "Pilotage des campagnes réseaux sociaux, +45 % d'engagement en un an.", "long"),
  f("exp2", "Expérience 2", "Chargée de marketing · Agence Wouli · 2020 – 2023"), f("exp2d", "Détail expérience 2", "Création de contenus et gestion de budgets publicitaires pour 12 clients.", "long"),
  f("edu", "Formation (une ligne par diplôme)", "Master Marketing · Université d'Abomey-Calavi · 2020\nLicence Communication · ISM Adonaï · 2018", "long"),
  f("skills", "Compétences (une ligne chacune)", "Stratégie social media\nCanva et Figma\nGoogle Ads\nRédaction\nAnglais courant", "long"),
];
function cv(variant: "sidebar" | "classic") {
  return (v: V, p: Palette) => {
    const side = variant === "sidebar";
    const Section = ({ t, children }: { t: string; children: ReactNode }) => <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ fontFamily: font(p.body), fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: p.accent, margin: 0 }}>{t}</p>{children}</div>;
    const left = <>
      <Section t="Contact">{lines(v["contact"] ?? "").map((t, i) => <p key={i} style={B(p, 13, { color: side ? p.bg : p.ink })}>{t}</p>)}</Section>
      <Section t="Compétences">{lines(v["skills"] ?? "").map((t, i) => <p key={i} style={B(p, 13, { color: side ? p.bg : p.ink })}>{t}</p>)}</Section>
      <Section t="Formation">{lines(v["edu"] ?? "").map((t, i) => <p key={i} style={B(p, 12.5, { color: side ? p.line : p.muted })}>{t}</p>)}</Section>
    </>;
    return <Page w={A4.w} h={A4.h} p={p} style={{ background: p.surface }}>
      {side && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 260, background: p.ink }} />}
      {side && <div style={{ position: "absolute", left: 36, top: 56, width: 188, display: "flex", flexDirection: "column", gap: 30 }}>
        <Img src={v["photo"] ?? ""} p={p} style={{ width: 120, height: 120, borderRadius: 120 }} />{left}
      </div>}
      <div style={{ position: "absolute", left: side ? 300 : 64, right: 56, top: 64, display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
          {!side && <Img src={v["photo"] ?? ""} p={p} style={{ width: 96, height: 96, borderRadius: 96, flex: "0 0 96px" }} />}
          <div><h1 style={H(p, 40)}>{v["name"]}</h1><p style={B(p, 17, { color: p.accent, fontWeight: 600, marginTop: 6 })}>{v["job"]}</p></div>
        </div>
        <Section t="Profil"><p style={B(p, 13.5, { color: p.ink })}>{v["profile"]}</p></Section>
        <Section t="Expérience">{[1, 2].map((n) => <div key={n} style={{ paddingLeft: 14, borderLeft: `2px solid ${p.soft}` }}>
          <p style={B(p, 14, { color: p.ink, fontWeight: 700 })}>{v[`exp${n}`]}</p><p style={B(p, 13, { marginTop: 4 })}>{v[`exp${n}d`]}</p>
        </div>)}</Section>
        {!side && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>{left}</div>}
      </div>
    </Page>;
  };
}
const invoiceFields = [
  f("org", "Votre entreprise", "Studio Lumière SARL"), f("orgInfo", "Vos coordonnées", "Haie Vive, Cotonou · IFU 3201900000000 · +229 01 00 00 00", "long"),
  f("client", "Client", "Boutique Awa\nAkpakpa, Cotonou", "long"), f("number", "Numéro de facture", "FAC-2027-014"), f("date", "Date", "15/01/2027"),
  f("currency", "Devise", "FCFA"),
  f("items", "Lignes (désignation ; quantité ; prix unitaire)", "Séance photo produits ; 1 ; 150000\nRetouche de 40 photos ; 40 ; 2500\nLivraison des fichiers HD ; 1 ; 10000", "long"),
  f("note", "Mentions / conditions", "Paiement à 15 jours par Mobile Money ou virement. Merci pour votre confiance.", "long"),
];
const money = (n: number, cur: string) => `${Math.round(n).toLocaleString("fr-FR")} ${cur}`;
function invoice(v: V, p: Palette) {
  const rows = lines(v["items"] ?? "").slice(0, 10).map((l) => { const [d = "", q = "1", u = "0"] = l.split(";").map((x) => x.trim()); const qty = Number(q.replace(/\s/g, "").replace(",", ".")) || 0, unit = Number(u.replace(/\s/g, "").replace(",", ".")) || 0; return { d, qty, unit, total: qty * unit }; });
  const total = rows.reduce((a, r) => a + r.total, 0); const cur = v["currency"] || "FCFA";
  return <Page w={A4.w} h={A4.h} p={p} style={{ background: p.surface }}>
    <div style={{ position: "absolute", left: 64, right: 64, top: 64, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ maxWidth: 360 }}><p style={H(p, 26)}>{v["org"]}</p><p style={B(p, 12, { marginTop: 8 })}>{v["orgInfo"]}</p></div>
      <div style={{ textAlign: "right" }}><p style={H(p, 34, { color: p.accent })}>FACTURE</p><p style={B(p, 13, { marginTop: 8 })}>N° {v["number"]}<br />Date : {v["date"]}</p></div>
    </div>
    <div style={{ position: "absolute", left: 64, top: 230, padding: "16px 20px", background: p.soft, borderRadius: 12, minWidth: 280 }}>
      <p style={{ ...B(p, 11, { fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: p.accent }) }}>Facturé à</p>
      <p style={B(p, 14, { color: p.ink, whiteSpace: "pre-line", marginTop: 6 })}>{v["client"]}</p>
    </div>
    <div style={{ position: "absolute", left: 64, right: 64, top: 380 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 140px 150px", padding: "12px 0", borderBottom: `2px solid ${p.ink}`, ...B(p, 12, { fontWeight: 700, color: p.ink }) }}><span>Désignation</span><span style={{ textAlign: "right" }}>Qté</span><span style={{ textAlign: "right" }}>Prix unitaire</span><span style={{ textAlign: "right" }}>Total</span></div>
      {rows.map((r, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 140px 150px", padding: "14px 0", borderBottom: `1px solid ${p.line}`, ...B(p, 13.5, { color: p.ink }) }}><span>{r.d}</span><span style={{ textAlign: "right" }}>{r.qty}</span><span style={{ textAlign: "right" }}>{money(r.unit, cur)}</span><span style={{ textAlign: "right" }}>{money(r.total, cur)}</span></div>)}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}><div style={{ padding: "16px 22px", background: p.ink, color: p.bg, borderRadius: 12, ...B(p, 18, { color: p.bg, fontWeight: 700 }) }}>Total : {money(total, cur)}</div></div>
    </div>
    <p style={{ ...B(p, 12.5), position: "absolute", left: 64, right: 64, bottom: 70 }}>{v["note"]}</p>
  </Page>;
}
const brochureFields = [
  f("org", "Organisation", "Clinique Sainte-Grâce"), f("title", "Titre", "Votre santé, notre priorité"), f("tagline", "Accroche", "Des soins de qualité, proches de chez vous, 7 jours sur 7."),
  f("photo", "Photo (facultatif)", "", "image"),
  f("col1", "Volet 1 · titre", "Nos services"), f("col1body", "Volet 1 · texte (une ligne par point)", "Consultations générales\nPédiatrie et maternité\nLaboratoire d'analyses\nUrgences 24 h/24", "long"),
  f("col2", "Volet 2 · titre", "Pourquoi nous choisir"), f("col2body", "Volet 2 · texte", "Une équipe de médecins expérimentés, des équipements modernes et un accueil attentif pour chaque patient et sa famille.", "long"),
  f("contact", "Contact", "Quartier Zogbo, Cotonou\n+229 01 00 00 00\nwww.saintegrace.bj", "long"),
];
function brochure(v: V, p: Palette) {
  const W = 1123, Hh = 794, col = W / 3;
  return <Page w={W} h={Hh} p={p}>
    {[1, 2].map((i) => <div key={i} style={{ position: "absolute", top: 40, bottom: 40, left: col * i, width: 1, background: p.line }} />)}
    <div style={{ position: "absolute", left: 40, top: 56, width: col - 80, display: "flex", flexDirection: "column", gap: 18 }}>
      <h3 style={H(p, 26)}>{v["col1"]}</h3>{lines(v["col1body"] ?? "").map((t, i) => <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 8, background: p.accent, flex: "0 0 8px" }} /><span style={B(p, 15, { color: p.ink })}>{t}</span></div>)}
    </div>
    <div style={{ position: "absolute", left: col + 40, top: 56, width: col - 80, display: "flex", flexDirection: "column", gap: 18 }}>
      <h3 style={H(p, 26)}>{v["col2"]}</h3><p style={B(p, 15)}>{v["col2body"]}</p>
      <div style={{ marginTop: 20, padding: 22, background: p.soft, borderRadius: 14 }}><p style={B(p, 14, { color: p.ink, whiteSpace: "pre-line", fontWeight: 600 })}>{v["contact"]}</p></div>
    </div>
    <div style={{ position: "absolute", left: col * 2, top: 0, width: col, height: Hh, background: p.ink }}>
      <Img src={v["photo"] ?? ""} p={p} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 330 }} />
      <div style={{ position: "absolute", left: 40, right: 40, top: 380, display: "flex", flexDirection: "column", gap: 18 }}>
        <Eyebrow p={p} size={12}>{v["org"]}</Eyebrow><h1 style={H(p, 40, { color: p.bg })}>{v["title"]}</h1><p style={B(p, 16, { color: p.line })}>{v["tagline"]}</p>
      </div>
    </div>
  </Page>;
}

// ---------- Flyers & invitations (A5) ----------
const flyerFields = [
  f("photo", "Photo (facultatif)", "", "image"), f("kicker", "Petit titre", "Samedi 15 mars · 10 h"), f("title", "Titre", "Grande journée portes ouvertes"),
  f("text", "Texte", "Découvrez nos ateliers, rencontrez l'équipe et profitez de 20 % de réduction sur toutes les inscriptions de la journée.", "long"),
  f("cta", "Appel à l'action", "Entrée libre"), f("info", "Infos pratiques", "Centre culturel Artisttik · Cotonou · +229 01 00 00 00"),
];
function flyer(variant: "photo" | "type") {
  return (v: V, p: Palette) => {
    const W = 559, Hh = 794;
    return <Page w={W} h={Hh} p={p}>
      {variant === "photo" ? <Img src={v["photo"] ?? ""} p={p} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 360 }} /> : <div style={{ position: "absolute", left: 40, top: 40, width: 64, height: 64, borderRadius: 64, background: p.accent }} />}
      <div style={{ position: "absolute", left: 40, right: 40, top: variant === "photo" ? 392 : 150, display: "flex", flexDirection: "column", gap: 16 }}>
        <Eyebrow p={p} size={12}>{v["kicker"]}</Eyebrow><h1 style={H(p, variant === "photo" ? 38 : 50)}>{v["title"]}</h1><p style={B(p, 15)}>{v["text"]}</p>
        <div style={{ alignSelf: "flex-start", marginTop: 6, padding: "12px 24px", borderRadius: 999, background: p.accent, color: p.bg, fontFamily: font(p.body), fontWeight: 700, fontSize: 15 }}>{v["cta"]}</div>
      </div>
      <p style={{ ...B(p, 11.5), position: "absolute", left: 40, right: 40, bottom: 30, borderTop: `1px solid ${p.line}`, paddingTop: 12 }}>{v["info"]}</p>
    </Page>;
  };
}
const inviteFields = [
  f("kicker", "Petit titre", "Vous êtes invités"), f("title", "Titre", "Mariage de\nFifamè & Jonas", "long", 80), f("date", "Date et heure", "Samedi 20 juin 2027 · 15 h"),
  f("place", "Lieu", "Jardins de la Villa Ahouandjinou, Porto-Novo"), f("text", "Message", "Nous serions heureux de partager ce jour avec vous.", "long"), f("rsvp", "Réponse souhaitée", "Merci de confirmer avant le 1er juin · +229 01 00 00 00"),
];
function invitation(variant: "elegant" | "party") {
  return (v: V, p: Palette) => {
    const W = 559, Hh = 794;
    return <Page w={W} h={Hh} p={p}>
      <div style={{ position: "absolute", inset: 24, border: `1px solid ${variant === "elegant" ? p.accent : p.line}`, borderRadius: variant === "elegant" ? 2 : 22 }} />
      {variant === "party" && <div style={{ position: "absolute", left: 24, right: 24, top: 24, height: 180, background: p.soft, borderRadius: "22px 22px 0 0" }} />}
      <div style={{ position: "absolute", left: 60, right: 60, top: variant === "elegant" ? 150 : 120, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 22 }}>
        <Eyebrow p={p} size={12}>{v["kicker"]}</Eyebrow>
        <h1 style={H(p, 44, { whiteSpace: "pre-line", fontWeight: variant === "elegant" ? 600 : 800 })}>{v["title"]}</h1>
        <Bar p={p} w={40} h={2} />
        <p style={B(p, 17, { color: p.ink, fontWeight: 600 })}>{v["date"]}</p><p style={B(p, 15)}>{v["place"]}</p>
        <p style={B(p, 15, { fontStyle: "italic" })}>{v["text"]}</p>
      </div>
      <p style={{ ...B(p, 12), position: "absolute", left: 60, right: 60, bottom: 64, textAlign: "center" }}>{v["rsvp"]}</p>
    </Page>;
  };
}

// ---------- Social ----------
const igFields = [
  f("photo", "Photo (facultatif)", "", "image"), f("kicker", "Petit titre", "Nouveauté"), f("title", "Titre", "La collection Saison sèche est arrivée"),
  f("text", "Texte", "Pièces en wax et lin, coupes modernes, tailles du S au XXL.", "long", 200), f("handle", "Compte / site", "@boutique.awa"),
];
function igPost(variant: "photo" | "quote" | "promo") {
  return (v: V, p: Palette) => {
    const S = 1080;
    if (variant === "quote") return <Page w={S} h={S} p={p}>
      <p style={{ ...H(p, 260, { color: p.accent, lineHeight: 1 }), position: "absolute", left: 90, top: 60 }}>“</p>
      <div style={{ position: "absolute", left: 100, right: 100, top: 300, display: "flex", flexDirection: "column", gap: 40 }}>
        <h1 style={H(p, 70, { fontWeight: 600 })}>{v["title"]}</h1><p style={B(p, 32)}>{v["text"]}</p>
      </div>
      <p style={{ ...B(p, 28, { color: p.ink, fontWeight: 600 }), position: "absolute", left: 100, bottom: 90 }}>{v["handle"]}</p>
    </Page>;
    if (variant === "promo") return <Page w={S} h={S} p={p} style={{ background: p.accent }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 90, bottom: 90, background: p.bg, borderRadius: 36, padding: 80, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
        <Eyebrow p={p} size={26}>{v["kicker"]}</Eyebrow><h1 style={H(p, 84)}>{v["title"]}</h1><p style={B(p, 32)}>{v["text"]}</p>
        <p style={B(p, 28, { color: p.ink, fontWeight: 700 })}>{v["handle"]}</p>
      </div>
    </Page>;
    return <Page w={S} h={S} p={p}>
      <Img src={v["photo"] ?? ""} p={p} style={{ position: "absolute", inset: 0 }} label="Votre photo" />
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 60, padding: "52px 56px", background: p.surface, borderRadius: 30, display: "flex", flexDirection: "column", gap: 20 }}>
        <Eyebrow p={p} size={22}>{v["kicker"]}</Eyebrow><h1 style={H(p, 60)}>{v["title"]}</h1><p style={B(p, 26)}>{v["text"]}</p>
      </div>
    </Page>;
  };
}
function story(variant: "photo" | "type") {
  return (v: V, p: Palette) => {
    const W = 1080, Hh = 1920;
    return <Page w={W} h={Hh} p={p}>
      {variant === "photo" ? <Img src={v["photo"] ?? ""} p={p} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1100 }} label="Votre photo" /> : <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 760, background: p.soft }} />}
      <div style={{ position: "absolute", left: 100, right: 100, top: variant === "photo" ? 1170 : 860, display: "flex", flexDirection: "column", gap: 40 }}>
        <Eyebrow p={p} size={30}>{v["kicker"]}</Eyebrow><h1 style={H(p, 96)}>{v["title"]}</h1><p style={B(p, 40)}>{v["text"]}</p>
      </div>
      <div style={{ position: "absolute", left: 100, right: 100, bottom: 150, padding: "36px 0", textAlign: "center", borderRadius: 999, background: p.accent, color: p.bg, fontFamily: font(p.body), fontWeight: 700, fontSize: 38 }}>{v["handle"]}</div>
    </Page>;
  };
}
const fbFields = [
  f("photo", "Photo (facultatif)", "", "image"), f("kicker", "Petit titre", "Annonce"), f("title", "Titre", "Nous ouvrons une nouvelle agence à Parakou"),
  f("text", "Texte", "Rendez-vous dès le 3 février, quartier Banikanni.", "long", 160), f("handle", "Page / site", "facebook.com/agencebenin"),
];
function fbPost(v: V, p: Palette) {
  const W = 1200, Hh = 630;
  return <Page w={W} h={Hh} p={p}>
    <Img src={v["photo"] ?? ""} p={p} style={{ position: "absolute", right: 0, top: 0, width: 480, height: Hh }} label="Votre photo" />
    <div style={{ position: "absolute", left: 72, top: 0, width: 580, height: Hh, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
      <Eyebrow p={p} size={18}>{v["kicker"]}</Eyebrow><h1 style={H(p, 52)}>{v["title"]}</h1><p style={B(p, 22)}>{v["text"]}</p>
      <p style={B(p, 18, { color: p.ink, fontWeight: 700 })}>{v["handle"]}</p>
    </div>
  </Page>;
}
const ytFields = [
  f("photo", "Photo (facultatif)", "", "image"), f("title", "Titre (court)", "5 erreurs qui ruinent votre budget"), f("tag", "Étiquette", "TUTO"),
];
function ytThumb(v: V, p: Palette) {
  const W = 1280, Hh = 720;
  return <Page w={W} h={Hh} p={p} style={{ background: p.ink }}>
    <Img src={v["photo"] ?? ""} p={p} style={{ position: "absolute", right: 0, top: 0, width: 560, height: Hh }} label="Votre photo" />
    <div style={{ position: "absolute", left: 64, top: 0, width: 660, height: Hh, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
      <span style={{ alignSelf: "flex-start", padding: "10px 22px", borderRadius: 10, background: p.accent, color: p.ink, fontFamily: font(p.body), fontWeight: 800, fontSize: 30, letterSpacing: "0.06em" }}>{v["tag"]}</span>
      <h1 style={H(p, 84, { color: p.bg, fontWeight: 800, lineHeight: 1.02 })}>{v["title"]}</h1>
    </div>
  </Page>;
}
const bioFields = [
  f("photo", "Photo", "", "image"), f("name", "Nom", "Dr. Sènami Houngbo"), f("role", "Rôle", "Nutritionniste · Conférencière"),
  f("bio", "Bio", "J'aide les familles à mieux manger avec les produits locaux. 10 ans d'expérience, 3 livres et plus de 200 ateliers animés.", "long", 300),
  f("links", "Liens / contacts (une ligne chacun)", "www.senami-nutrition.bj\n@senami.nutrition\n+229 01 00 00 00", "long"),
];
function bio(v: V, p: Palette) {
  const W = 1080, Hh = 1350;
  return <Page w={W} h={Hh} p={p}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 440, background: p.soft }} />
    <Img src={v["photo"] ?? ""} p={p} style={{ position: "absolute", left: 390, top: 260, width: 300, height: 300, borderRadius: 300, border: `10px solid ${p.bg}` }} />
    <div style={{ position: "absolute", left: 110, right: 110, top: 610, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 22 }}>
      <h1 style={H(p, 68)}>{v["name"]}</h1><p style={B(p, 32, { color: p.accent, fontWeight: 600 })}>{v["role"]}</p><p style={B(p, 30)}>{v["bio"]}</p>
    </div>
    <div style={{ position: "absolute", left: 160, right: 160, bottom: 110, display: "flex", flexDirection: "column", gap: 18 }}>
      {lines(v["links"] ?? "").slice(0, 4).map((t, i) => <div key={i} style={{ padding: "22px 0", textAlign: "center", borderRadius: 999, border: `2px solid ${p.ink}`, fontFamily: font(p.body), fontSize: 28, fontWeight: 600 }}>{t}</div>)}
    </div>
  </Page>;
}

// ---------- Brand ----------
const cardFields = [
  f("name", "Nom", "Koffi Ahouansou"), f("role", "Fonction", "Architecte d'intérieur"), f("org", "Entreprise", "Studio Habitat"),
  f("contact", "Coordonnées (une ligne chacune)", "+229 01 00 00 00\nkoffi@studiohabitat.bj\nwww.studiohabitat.bj", "long"),
];
function card(variant: "minimal" | "bold") {
  return (v: V, p: Palette) => {
    const W = 1004, Hh = 650, bold = variant === "bold";
    return <Page w={W} h={Hh} p={p} style={{ background: bold ? p.ink : p.surface }}>
      {bold && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 24, background: p.accent }} />}
      <div style={{ position: "absolute", left: 90, top: 90, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={H(p, 54, { color: bold ? p.bg : p.ink })}>{v["name"]}</p><p style={B(p, 26, { color: p.accent, fontWeight: 600 })}>{v["role"]}</p>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 80, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{lines(v["contact"] ?? "").map((t, i) => <p key={i} style={B(p, 22, { color: bold ? p.line : p.muted })}>{t}</p>)}</div>
        <p style={H(p, 28, { color: bold ? p.bg : p.ink })}>{v["org"]}</p>
      </div>
    </Page>;
  };
}
const logoFields = [f("name", "Nom de la marque", "Nova Café"), f("tagline", "Slogan (facultatif)", "Torréfié à Cotonou"), f("initials", "Initiales", "NC")];
function logo(variant: "monogram" | "wordmark" | "badge") {
  return (v: V, p: Palette) => {
    const S = 800;
    if (variant === "wordmark") return <Page w={S} h={S} p={p} style={{ background: p.surface }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <p style={H(p, 96)}>{v["name"]}<span style={{ color: p.accent }}>.</span></p><p style={B(p, 26, { letterSpacing: "0.3em", textTransform: "uppercase" })}>{v["tagline"]}</p>
      </div>
    </Page>;
    if (variant === "badge") return <Page w={S} h={S} p={p} style={{ background: p.surface }}>
      <div style={{ position: "absolute", left: 160, top: 160, width: 480, height: 480, borderRadius: 480, border: `6px solid ${p.ink}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <p style={B(p, 20, { letterSpacing: "0.3em", textTransform: "uppercase", color: p.accent, fontWeight: 700 })}>{v["tagline"]}</p><p style={H(p, 64, { textAlign: "center" })}>{v["name"]}</p><Bar p={p} w={60} h={4} />
      </div>
    </Page>;
    return <Page w={S} h={S} p={p} style={{ background: p.surface }}>
      <div style={{ position: "absolute", left: 250, top: 160, width: 300, height: 300, borderRadius: 72, background: p.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={H(p, 150, { color: p.bg })}>{v["initials"]}</p>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 520, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <p style={H(p, 60)}>{v["name"]}</p><p style={B(p, 24)}>{v["tagline"]}</p>
      </div>
    </Page>;
  };
}

// ---------- Web ----------
const emailFields = [
  f("org", "Expéditeur", "École Les Lauriers"), f("title", "Titre", "Les inscriptions 2027 sont ouvertes"), f("photo", "Image (facultatif)", "", "image"),
  f("text", "Message", "Chers parents,\n\nLes inscriptions pour la rentrée 2027 sont ouvertes jusqu'au 30 juin. Réservez dès maintenant la place de votre enfant et profitez d'une réduction de 10 % sur les frais d'inscription.", "long", 1200),
  f("cta", "Bouton", "Inscrire mon enfant"), f("footer", "Pied d'e-mail", "École Les Lauriers · Fidjrossè, Cotonou · Se désabonner"),
];
function email(v: V, p: Palette) {
  const W = 640, Hh = 1000;
  return <Page w={W} h={Hh} p={p} style={{ background: p.soft }}>
    <div style={{ position: "absolute", left: 32, right: 32, top: 32, bottom: 32, background: p.surface, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "28px 40px", borderBottom: `1px solid ${p.line}` }}><p style={H(p, 22)}>{v["org"]}</p></div>
      <Img src={v["photo"] ?? ""} p={p} style={{ height: 230 }} label="Image" />
      <div style={{ padding: "34px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 style={H(p, 32)}>{v["title"]}</h1><p style={B(p, 15.5, { color: p.ink, whiteSpace: "pre-line" })}>{v["text"]}</p>
        <div style={{ alignSelf: "flex-start", padding: "14px 28px", borderRadius: 10, background: p.accent, color: p.bg, fontFamily: font(p.body), fontWeight: 700, fontSize: 15 }}>{v["cta"]}</div>
      </div>
      <p style={{ ...B(p, 11.5), position: "absolute", left: 40, right: 40, bottom: 24, textAlign: "center" }}>{v["footer"]}</p>
    </div>
  </Page>;
}
const boardFields = [
  f("title", "Titre", "Atelier : lancement du nouveau produit"),
  f("notes", "Notes (une ligne par note, 8 max)", "Cible : jeunes actifs 25-35 ans\nPrix de lancement : 9 900 FCFA\nCanaux : WhatsApp, Instagram, marchés\nPartenaires : 3 boutiques à Cotonou\nRisque : stock limité au départ\nIdée : parrainage entre clients\nDate de lancement : 1er mars\nResponsable : équipe ventes", "long", 900),
];
function board(v: V, p: Palette) {
  const W = 1600, Hh = 1000; const tints = [p.soft, "#fdf3c4", "#dff3e6", "#e3ecfd", "#fde2e4", "#ece6fb"];
  return <Page w={W} h={Hh} p={p} style={{ background: p.surface, backgroundImage: `radial-gradient(${p.line} 1.5px, transparent 1.5px)`, backgroundSize: "28px 28px" }}>
    <h1 style={{ ...H(p, 44), position: "absolute", left: 80, top: 64 }}>{v["title"]}</h1>
    <div style={{ position: "absolute", left: 80, right: 80, top: 170, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 36 }}>
      {lines(v["notes"] ?? "").slice(0, 8).map((t, i) => <div key={i} style={{ height: 300, padding: 30, background: tints[i % tints.length], borderRadius: 6, boxShadow: "0 8px 20px rgba(0,0,0,0.08)", transform: `rotate(${[-1.5, 1, -0.5, 1.5][i % 4]}deg)`, fontFamily: font(p.body), fontSize: 24, lineHeight: 1.45, color: "#1f1f1f" }}>{t}</div>)}
    </div>
  </Page>;
}

// ---------- Catalogue: layouts × palettes ----------
const LAYOUTS: Layout[] = [
  { id: "pres-minimal", format: "presentation", fr: "Présentation sobre", en: "Clean deck", pages: 5, fields: presFields, render: presentation("minimal") },
  { id: "pres-split", format: "presentation", fr: "Présentation à bandeau", en: "Banner deck", pages: 5, fields: presFields, render: presentation("split") },
  { id: "pres-editorial", format: "presentation", fr: "Présentation éditoriale", en: "Editorial deck", pages: 5, fields: presFields, render: presentation("editorial") },
  { id: "doc-report", format: "document", fr: "Rapport", en: "Report", pages: 1, fields: reportFields, render: report },
  { id: "doc-letter", format: "document", fr: "Lettre professionnelle", en: "Business letter", pages: 1, fields: letterFields, render: letter },
  { id: "cv-sidebar", format: "cv", fr: "CV à colonne", en: "Sidebar résumé", pages: 1, fields: cvFields, render: cv("sidebar") },
  { id: "cv-classic", format: "cv", fr: "CV classique", en: "Classic résumé", pages: 1, fields: cvFields, render: cv("classic") },
  { id: "invoice", format: "invoice", fr: "Facture", en: "Invoice", pages: 1, fields: invoiceFields, render: invoice },
  { id: "brochure", format: "brochure", fr: "Brochure 3 volets", en: "Tri-fold brochure", pages: 1, fields: brochureFields, render: brochure },
  { id: "flyer-photo", format: "flyer", fr: "Flyer photo", en: "Photo flyer", pages: 1, fields: flyerFields, render: flyer("photo") },
  { id: "flyer-type", format: "flyer", fr: "Flyer typographique", en: "Type flyer", pages: 1, fields: flyerFields, render: flyer("type") },
  { id: "invite-elegant", format: "invitation", fr: "Invitation élégante", en: "Elegant invitation", pages: 1, fields: inviteFields, render: invitation("elegant") },
  { id: "invite-party", format: "invitation", fr: "Invitation festive", en: "Party invitation", pages: 1, fields: inviteFields, render: invitation("party") },
  { id: "card-minimal", format: "business_card", fr: "Carte sobre", en: "Clean card", pages: 1, fields: cardFields, render: card("minimal") },
  { id: "card-bold", format: "business_card", fr: "Carte contrastée", en: "Bold card", pages: 1, fields: cardFields, render: card("bold") },
  { id: "logo-monogram", format: "logo", fr: "Logo monogramme", en: "Monogram logo", pages: 1, fields: logoFields, render: logo("monogram") },
  { id: "logo-wordmark", format: "logo", fr: "Logo typographique", en: "Wordmark logo", pages: 1, fields: logoFields, render: logo("wordmark") },
  { id: "logo-badge", format: "logo", fr: "Logo badge", en: "Badge logo", pages: 1, fields: logoFields, render: logo("badge") },
  { id: "ig-photo", format: "instagram_post", fr: "Post photo", en: "Photo post", pages: 1, fields: igFields, render: igPost("photo") },
  { id: "ig-quote", format: "instagram_post", fr: "Post citation", en: "Quote post", pages: 1, fields: igFields, render: igPost("quote") },
  { id: "ig-promo", format: "instagram_post", fr: "Post promotion", en: "Promo post", pages: 1, fields: igFields, render: igPost("promo") },
  { id: "story-photo", format: "story", fr: "Story photo", en: "Photo story", pages: 1, fields: igFields, render: story("photo") },
  { id: "story-type", format: "story", fr: "Story texte", en: "Text story", pages: 1, fields: igFields, render: story("type") },
  { id: "fb-post", format: "facebook_post", fr: "Publication Facebook", en: "Facebook post", pages: 1, fields: fbFields, render: fbPost },
  { id: "yt-thumb", format: "youtube_thumb", fr: "Miniature YouTube", en: "YouTube thumbnail", pages: 1, fields: ytFields, render: ytThumb },
  { id: "bio-card", format: "bio", fr: "Carte bio", en: "Bio card", pages: 1, fields: bioFields, render: bio },
  { id: "email-news", format: "email", fr: "E-mail d'annonce", en: "Announcement e-mail", pages: 1, fields: emailFields, render: email },
  { id: "board-notes", format: "whiteboard", fr: "Tableau de post-it", en: "Sticky-note board", pages: 1, fields: boardFields, render: board },
];

/** Which palettes each layout ships with (two or three each, about fifty templates in all). */
const VARIANTS: Record<string, string[]> = {
  "pres-minimal": ["ardoise", "ivoire", "foret"], "pres-split": ["corail", "lavande", "nuit"], "pres-editorial": ["sable", "ivoire"],
  "doc-report": ["ardoise", "foret"], "doc-letter": ["ivoire", "ardoise"], "cv-sidebar": ["ardoise", "foret"], "cv-classic": ["ivoire", "lavande"],
  invoice: ["ardoise", "corail"], brochure: ["foret", "ardoise"], "flyer-photo": ["corail", "ardoise"], "flyer-type": ["lavande", "nuit"],
  "invite-elegant": ["sable", "nuit"], "invite-party": ["corail", "lavande"], "card-minimal": ["ivoire", "ardoise"], "card-bold": ["nuit", "foret"],
  "logo-monogram": ["corail", "ardoise"], "logo-wordmark": ["ivoire"], "logo-badge": ["foret"], "ig-photo": ["ivoire", "lavande"], "ig-quote": ["sable"],
  "ig-promo": ["corail", "ardoise"], "story-photo": ["ivoire"], "story-type": ["lavande", "foret"], "fb-post": ["ardoise", "sable"], "yt-thumb": ["nuit", "corail"],
  "bio-card": ["lavande", "sable"], "email-news": ["ardoise", "foret"], "board-notes": ["ardoise"],
};

export type DesignTemplate = { id: string; layout: Layout; palette: Palette; format: DesignFormatId; fr: string; en: string };

export const DESIGN_TEMPLATES: DesignTemplate[] = LAYOUTS.flatMap((layout) => (VARIANTS[layout.id] ?? ["ardoise"]).map((pid) => {
  const palette = PALETTES[pid]!;
  return { id: `${layout.id}:${pid}`, layout, palette, format: layout.format, fr: `${layout.fr} · ${palette.fr}`, en: `${layout.en} · ${palette.en}` };
}));

/** The blank page of a format: a simple layout (title + text + optional photo) the user fills from scratch. */
export function blankTemplate(format: DesignFormatId): DesignTemplate {
  const sameFormat = DESIGN_TEMPLATES.find((t) => t.format === format) ?? DESIGN_TEMPLATES[0]!;
  const blankFields = sameFormat.layout.fields.map((x) => ({ ...x, value: x.kind === "image" ? "" : "" }));
  const layout: Layout = { ...sameFormat.layout, id: `${sameFormat.layout.id}-blank`, fields: blankFields };
  return { id: `blank:${format}`, layout, palette: PALETTES["ardoise"]!, format, fr: "Page blanche", en: "Blank page" };
}

export const templateById = (id: string) => DESIGN_TEMPLATES.find((t) => t.id === id) ?? (id.startsWith("blank:") ? blankTemplate(id.slice(6) as DesignFormatId) : undefined);
export const fieldValues = (fields: DesignField[]): V => Object.fromEntries(fields.map((x) => [x.key, x.value]));
