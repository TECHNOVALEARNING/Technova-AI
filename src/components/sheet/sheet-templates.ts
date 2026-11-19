import { type CellStyle, type ChartKind, type NumFmt, type Sheet, type Workbook, addr, newSheet, parseAddr, uid } from "@/lib/sheet/model";

// Spreadsheet templates of TechNova Tableur: original TechNova layouts written in code, with working formulas,
// number formats and charts. Values are realistic examples the user replaces (FCFA amounts, Beninese context).

export type SheetTemplate = { id: string; fr: string; en: string; descFr: string; descEn: string; group: "finance" | "business" | "organisation" | "education"; accent: string; build: () => Workbook };

const head = (accent: string): CellStyle => ({ b: true, bg: accent, color: "#ffffff", align: "center", border: true });

function title(sh: Sheet, at: string, text: string, accent: string, sub?: string) {
  sh.cells[at] = { v: text, s: { b: true, size: 18, color: accent } };
  if (sub) { const p = parseAddr(at)!; sh.cells[addr(p.c, p.r + 1)] = { v: sub, s: { color: "#6b7280", i: true } }; }
}

/** Writes a table: styled header, rows ("{r}" in a formula becomes the row number), formats per column. */
function table(sh: Sheet, at: string, accent: string, headers: string[], rows: (string | number)[][], fmts: (NumFmt | undefined)[] = [], opts: { zebra?: boolean; total?: (string | number)[] } = {}) {
  const p = parseAddr(at)!;
  headers.forEach((h, i) => { sh.cells[addr(p.c + i, p.r)] = { v: h, s: head(accent) }; });
  rows.forEach((row, ri) => row.forEach((v, ci) => {
    const r = p.r + 1 + ri;
    const raw = typeof v === "number" ? String(v) : v.replace(/\{r\}/g, String(r + 1));
    const s: CellStyle = { border: true, ...(fmts[ci] ? { fmt: fmts[ci] } : {}), ...(opts.zebra !== false && ri % 2 ? { bg: "#f7f7f9" } : {}) };
    if (raw !== "") sh.cells[addr(p.c + ci, r)] = { v: raw, s };
    else sh.cells[addr(p.c + ci, r)] = { v: "", s };
  }));
  if (opts.total) {
    const r = p.r + 1 + rows.length;
    const first = p.r + 2, last = p.r + 1 + rows.length;
    opts.total.forEach((v, ci) => {
      const raw = typeof v === "number" ? String(v) : v.replace(/\{first\}/g, String(first)).replace(/\{last\}/g, String(last));
      sh.cells[addr(p.c + ci, r)] = { v: raw, s: { b: true, border: true, bg: "#eef0f4", ...(fmts[ci] ? { fmt: fmts[ci] } : {}) } };
    });
  }
}
const widths = (sh: Sheet, w: number[]) => w.forEach((x, i) => { sh.colW[i] = x; });
const chart = (sh: Sheet, kind: ChartKind, range: string, titleText: string, x: number, y: number, w = 460, h = 280) => sh.charts.push({ id: uid(), kind, range, title: titleText, x, y, w, h });
const book = (titleText: string, ...sheets: Sheet[]): Workbook => ({ title: titleText, sheets });

export const SHEET_TEMPLATES: SheetTemplate[] = [
  {
    id: "budget", fr: "Budget mensuel", en: "Monthly budget", group: "finance", accent: "#1f7a5a",
    descFr: "Revenus, dépenses par catégorie, solde et graphique de répartition.", descEn: "Income, expenses by category, balance and a breakdown chart.",
    build: () => {
      const a = "#1f7a5a"; const sh = newSheet("Budget", 60, 12);
      title(sh, "A1", "Budget du mois", a, "Remplacez les montants : les totaux et le graphique se mettent à jour.");
      table(sh, "A4", a, ["Revenus", "Montant"], [["Salaire", 350000], ["Activité secondaire", 75000], ["Autres", 15000]], [undefined, "fcfa"], { total: ["Total revenus", "=SOMME(B{first}:B{last})"] });
      table(sh, "D4", a, ["Dépenses", "Prévu", "Réel", "Écart"], [
        ["Loyer", 120000, 120000, "=E{r}-F{r}"], ["Alimentation", 90000, 104500, "=E{r}-F{r}"], ["Transport", 35000, 31000, "=E{r}-F{r}"],
        ["Électricité et eau", 22000, 25500, "=E{r}-F{r}"], ["Internet et téléphone", 15000, 15000, "=E{r}-F{r}"], ["Santé", 10000, 4000, "=E{r}-F{r}"],
        ["Épargne", 60000, 60000, "=E{r}-F{r}"], ["Loisirs", 20000, 27000, "=E{r}-F{r}"],
      ], [undefined, "fcfa", "fcfa", "fcfa"], { total: ["Total dépenses", "=SOMME(E{first}:E{last})", "=SOMME(F{first}:F{last})", "=E13-F13"] });
      sh.cells["A10"] = { v: "Solde du mois", s: { b: true, size: 13 } };
      sh.cells["B10"] = { v: "=B8-F13", s: { b: true, size: 13, fmt: "fcfa", color: a } };
      sh.cells["A11"] = { v: "Taux d'épargne", s: { b: true } };
      sh.cells["B11"] = { v: "=F11/B8", s: { b: true, fmt: "percent", dec: 1 } };
      widths(sh, [190, 130, 24, 190, 120, 120, 120]);
      chart(sh, "pie", "D5:D12,F5:F12", "Dépenses réelles par catégorie", 20, 420);
      chart(sh, "bar", "D4:F12", "Prévu et réel", 500, 420);
      sh.freeze = false;
      return book("Budget mensuel", sh);
    },
  },
  {
    id: "ventes", fr: "Suivi des ventes", en: "Sales tracker", group: "business", accent: "#2563eb",
    descFr: "Journal des ventes, total par produit et graphique.", descEn: "Sales log, totals per product and a chart.",
    build: () => {
      const a = "#2563eb"; const sh = newSheet("Ventes", 200, 12);
      table(sh, "A1", a, ["Date", "Client", "Produit", "Quantité", "Prix unitaire", "Total", "Paiement"], [
        ["03/02/2027", "Boutique Awa", "Savon karité", 24, 1500, "=D{r}*E{r}", "Mobile Money"],
        ["03/02/2027", "M. Houngbo", "Huile de coco", 6, 3500, "=D{r}*E{r}", "Espèces"],
        ["05/02/2027", "Épicerie du Port", "Savon karité", 48, 1400, "=D{r}*E{r}", "Virement"],
        ["07/02/2027", "Mme Dossou", "Beurre de karité", 10, 2500, "=D{r}*E{r}", "Mobile Money"],
        ["09/02/2027", "Boutique Awa", "Huile de coco", 12, 3500, "=D{r}*E{r}", "Mobile Money"],
        ["12/02/2027", "Salon Grâce", "Beurre de karité", 20, 2400, "=D{r}*E{r}", "Espèces"],
        ["14/02/2027", "M. Agbo", "Savon karité", 8, 1500, "=D{r}*E{r}", "Mobile Money"],
      ], ["date", undefined, undefined, undefined, "fcfa", "fcfa", undefined], { total: ["Total", "", "", "=SOMME(D{first}:D{last})", "", "=SOMME(F{first}:F{last})", ""] });
      table(sh, "I1", a, ["Produit", "Quantité", "Chiffre d'affaires"], [
        ["Savon karité", "=SOMME.SI(C:C;I{r};D:D)", "=SOMME.SI(C:C;I{r};F:F)"],
        ["Huile de coco", "=SOMME.SI(C:C;I{r};D:D)", "=SOMME.SI(C:C;I{r};F:F)"],
        ["Beurre de karité", "=SOMME.SI(C:C;I{r};D:D)", "=SOMME.SI(C:C;I{r};F:F)"],
      ], [undefined, undefined, "fcfa"]);
      widths(sh, [100, 150, 150, 90, 120, 130, 130, 24, 150, 90, 150]);
      sh.freeze = true;
      chart(sh, "bar", "I2:I4,K2:K4", "Chiffre d'affaires par produit", 760, 150);
      return book("Suivi des ventes", sh);
    },
  },
  {
    id: "facture", fr: "Facture", en: "Invoice", group: "business", accent: "#b45309",
    descFr: "Lignes, sous-total, TVA et total TTC calculés.", descEn: "Lines, subtotal, VAT and total computed.",
    build: () => {
      const a = "#b45309"; const sh = newSheet("Facture", 60, 8);
      title(sh, "A1", "FACTURE", a);
      const info: [string, string][] = [["A3", "Studio Lumière SARL"], ["A4", "Haie Vive, Cotonou · IFU 3201900000000"], ["A5", "+229 01 00 00 00 · contact@studiolumiere.bj"], ["D3", "N° FAC-2027-014"], ["D4", "Date : 15/01/2027"], ["D5", "Échéance : 30/01/2027"]];
      for (const [k, v] of info) sh.cells[k] = { v, s: k === "A3" ? { b: true } : { color: "#4b5563" } };
      sh.cells["A7"] = { v: "Facturé à", s: { b: true, color: a } }; sh.cells["A8"] = { v: "Boutique Awa · Akpakpa, Cotonou" };
      table(sh, "A10", a, ["Désignation", "Quantité", "Prix unitaire", "Total"], [
        ["Séance photo produits", 1, 150000, "=B{r}*C{r}"], ["Retouche de photos", 40, 2500, "=B{r}*C{r}"], ["Livraison des fichiers HD", 1, 10000, "=B{r}*C{r}"], ["", "", "", "=SI(B{r}=\"\";\"\";B{r}*C{r})"],
      ], [undefined, undefined, "fcfa", "fcfa"]);
      const rows: [string, string, CellStyle][] = [["Sous-total", "=SOMME(D11:D14)", { fmt: "fcfa" }], ["TVA (18 %)", "=D16*18%", { fmt: "fcfa" }], ["Total TTC", "=D16+D17", { fmt: "fcfa", b: true, size: 14, color: a }]];
      rows.forEach(([l, f, s], i) => { sh.cells[`C${16 + i}`] = { v: l, s: { b: true, align: "right" } }; sh.cells[`D${16 + i}`] = { v: f, s }; });
      sh.cells["A21"] = { v: "Paiement à 15 jours par Mobile Money ou virement. Merci pour votre confiance.", s: { i: true, color: "#6b7280" } };
      widths(sh, [280, 100, 140, 150]);
      sh.grid = false;
      return book("Facture", sh);
    },
  },
  {
    id: "devis", fr: "Devis", en: "Quote", group: "business", accent: "#7c3aed",
    descFr: "Devis avec remise, TVA et validité.", descEn: "Quote with discount, VAT and validity.",
    build: () => {
      const a = "#7c3aed"; const sh = newSheet("Devis", 60, 8);
      title(sh, "A1", "DEVIS", a, "Valable 30 jours");
      sh.cells["A4"] = { v: "Client : Hôtel Les Palmiers, Ouidah", s: { b: true } };
      table(sh, "A6", a, ["Prestation", "Quantité", "Prix unitaire", "Remise", "Total"], [
        ["Site web vitrine (5 pages)", 1, 450000, "10%", "=B{r}*C{r}*(1-D{r})"], ["Rédaction des contenus", 5, 15000, "0%", "=B{r}*C{r}*(1-D{r})"],
        ["Photos professionnelles", 1, 120000, "5%", "=B{r}*C{r}*(1-D{r})"], ["Maintenance (mois)", 12, 20000, "0%", "=B{r}*C{r}*(1-D{r})"],
      ], [undefined, undefined, "fcfa", "percent", "fcfa"], { total: ["Total HT", "", "", "", "=SOMME(E{first}:E{last})"] });
      sh.cells["D12"] = { v: "TVA 18 %", s: { b: true, align: "right" } }; sh.cells["E12"] = { v: "=E11*18%", s: { fmt: "fcfa" } };
      sh.cells["D13"] = { v: "Total TTC", s: { b: true, align: "right" } }; sh.cells["E13"] = { v: "=E11+E12", s: { fmt: "fcfa", b: true, color: a, size: 14 } };
      widths(sh, [260, 90, 130, 90, 150]);
      sh.grid = false;
      return book("Devis", sh);
    },
  },
  {
    id: "stock", fr: "Inventaire et stock", en: "Inventory", group: "business", accent: "#0f766e",
    descFr: "Stock, seuil d'alerte, valeur et articles à commander.", descEn: "Stock, alert threshold, value and items to reorder.",
    build: () => {
      const a = "#0f766e"; const sh = newSheet("Stock", 200, 10);
      table(sh, "A1", a, ["Référence", "Article", "Catégorie", "En stock", "Seuil d'alerte", "Prix d'achat", "Valeur du stock", "Statut"], [
        ["ART-001", "Sac de riz 25 kg", "Alimentaire", 18, 10, 17500, "=D{r}*F{r}", "=SI(D{r}<=E{r};\"À commander\";\"OK\")"],
        ["ART-002", "Huile 5 L", "Alimentaire", 6, 8, 6500, "=D{r}*F{r}", "=SI(D{r}<=E{r};\"À commander\";\"OK\")"],
        ["ART-003", "Savon (carton)", "Hygiène", 22, 5, 9000, "=D{r}*F{r}", "=SI(D{r}<=E{r};\"À commander\";\"OK\")"],
        ["ART-004", "Lait en poudre", "Alimentaire", 4, 6, 4200, "=D{r}*F{r}", "=SI(D{r}<=E{r};\"À commander\";\"OK\")"],
        ["ART-005", "Eau minérale (pack)", "Boissons", 40, 15, 2400, "=D{r}*F{r}", "=SI(D{r}<=E{r};\"À commander\";\"OK\")"],
        ["ART-006", "Sucre 1 kg", "Alimentaire", 35, 20, 800, "=D{r}*F{r}", "=SI(D{r}<=E{r};\"À commander\";\"OK\")"],
      ], [undefined, undefined, undefined, undefined, undefined, "fcfa", "fcfa", undefined], { total: ["", "Total", "", "=SOMME(D{first}:D{last})", "", "", "=SOMME(G{first}:G{last})", "=NB.SI(H{first}:H{last};\"À commander\")&\" à commander\""] });
      widths(sh, [90, 180, 120, 90, 110, 120, 140, 150]);
      sh.freeze = true;
      chart(sh, "bar", "B2:B7,G2:G7", "Valeur du stock par article", 20, 280, 620, 280);
      return book("Inventaire", sh);
    },
  },
  {
    id: "tresorerie", fr: "Suivi de trésorerie", en: "Cash flow", group: "finance", accent: "#0369a1",
    descFr: "Entrées, sorties et solde cumulé jour après jour.", descEn: "Cash in, cash out and running balance.",
    build: () => {
      const a = "#0369a1"; const sh = newSheet("Trésorerie", 300, 8);
      sh.cells["A1"] = { v: "Solde de départ", s: { b: true } }; sh.cells["B1"] = { v: "250000", s: { fmt: "fcfa", b: true } };
      table(sh, "A3", a, ["Date", "Libellé", "Entrée", "Sortie", "Solde"], [
        ["01/03/2027", "Vente marché Dantokpa", 85000, "", "=B1+C{r}-D{r}"],
        ["02/03/2027", "Achat marchandises", "", 60000, "=E{prev}+C{r}-D{r}"],
        ["04/03/2027", "Paiement client (Mobile Money)", 45000, "", "=E{prev}+C{r}-D{r}"],
        ["06/03/2027", "Loyer boutique", "", 75000, "=E{prev}+C{r}-D{r}"],
        ["08/03/2027", "Vente en ligne", 120000, "", "=E{prev}+C{r}-D{r}"],
        ["10/03/2027", "Salaire vendeur", "", 50000, "=E{prev}+C{r}-D{r}"],
      ], ["date", undefined, "fcfa", "fcfa", "fcfa"], { total: ["", "Totaux", "=SOMME(C{first}:C{last})", "=SOMME(D{first}:D{last})", "=E{last}"] });
      for (let r = 5; r <= 9; r++) sh.cells[`E${r}`]!.v = sh.cells[`E${r}`]!.v.replace("{prev}", String(r - 1));
      widths(sh, [110, 260, 130, 130, 140]);
      sh.freeze = false;
      chart(sh, "line", "A4:A9,E4:E9", "Évolution du solde", 20, 330, 640, 260);
      return book("Trésorerie", sh);
    },
  },
  {
    id: "tontine", fr: "Tontine", en: "Savings circle", group: "finance", accent: "#9333ea",
    descFr: "Membres, cotisations, tours de bénéficiaires et retards.", descEn: "Members, contributions, payout turns and arrears.",
    build: () => {
      const a = "#9333ea"; const sh = newSheet("Tontine", 80, 10);
      title(sh, "A1", "Tontine des amis · 2027", a, "Cotisation mensuelle fixe, un bénéficiaire par tour.");
      sh.cells["A4"] = { v: "Cotisation par mois", s: { b: true } }; sh.cells["B4"] = { v: "25000", s: { fmt: "fcfa", b: true } };
      table(sh, "A6", a, ["Membre", "Téléphone", "Tour", "Mois versés", "Montant versé", "Reste dû (à ce jour)", "Statut"], [
        ["Awa", "+229 01 00 00 01", 1, 3, "=D{r}*$B$4", "=($B$12-D{r})*$B$4", "=SI(F{r}<=0;\"À jour\";\"En retard\")"],
        ["Koffi", "+229 01 00 00 02", 2, 3, "=D{r}*$B$4", "=($B$12-D{r})*$B$4", "=SI(F{r}<=0;\"À jour\";\"En retard\")"],
        ["Fifamè", "+229 01 00 00 03", 3, 2, "=D{r}*$B$4", "=($B$12-D{r})*$B$4", "=SI(F{r}<=0;\"À jour\";\"En retard\")"],
        ["Jonas", "+229 01 00 00 04", 4, 3, "=D{r}*$B$4", "=($B$12-D{r})*$B$4", "=SI(F{r}<=0;\"À jour\";\"En retard\")"],
      ], [undefined, undefined, undefined, undefined, "fcfa", "fcfa", undefined], { total: ["Caisse", "", "", "", "=SOMME(E{first}:E{last})", "=SOMME(F{first}:F{last})", ""] });
      sh.cells["A12"] = { v: "Mois écoulés", s: { b: true } }; sh.cells["B12"] = { v: "3", s: { b: true } };
      sh.cells["A13"] = { v: "Montant reçu par le bénéficiaire du tour", s: { b: true } }; sh.cells["B13"] = { v: "=B4*NBVAL(A7:A10)", s: { fmt: "fcfa", b: true, color: a } };
      widths(sh, [190, 150, 70, 110, 130, 170, 120]);
      return book("Tontine", sh);
    },
  },
  {
    id: "notes", fr: "Notes des élèves", en: "Student grades", group: "education", accent: "#dc2626",
    descFr: "Moyennes pondérées, rang et mention automatique.", descEn: "Weighted averages, rank and grade label.",
    build: () => {
      const a = "#dc2626"; const sh = newSheet("Notes", 80, 10);
      table(sh, "A1", a, ["Élève", "Devoir 1", "Devoir 2", "Composition", "Moyenne", "Mention"], [
        ["Adjovi Grâce", 14, 16, 15, "=ARRONDI((B{r}+C{r}+D{r}*2)/4;2)", "=SI(E{r}>=16;\"Très bien\";SI(E{r}>=14;\"Bien\";SI(E{r}>=12;\"Assez bien\";SI(E{r}>=10;\"Passable\";\"Insuffisant\"))))"],
        ["Bio Ismaël", 11, 9, 12, "=ARRONDI((B{r}+C{r}+D{r}*2)/4;2)", "=SI(E{r}>=16;\"Très bien\";SI(E{r}>=14;\"Bien\";SI(E{r}>=12;\"Assez bien\";SI(E{r}>=10;\"Passable\";\"Insuffisant\"))))"],
        ["Dossou Marc", 17, 18, 16, "=ARRONDI((B{r}+C{r}+D{r}*2)/4;2)", "=SI(E{r}>=16;\"Très bien\";SI(E{r}>=14;\"Bien\";SI(E{r}>=12;\"Assez bien\";SI(E{r}>=10;\"Passable\";\"Insuffisant\"))))"],
        ["Houénou Léa", 8, 10, 9, "=ARRONDI((B{r}+C{r}+D{r}*2)/4;2)", "=SI(E{r}>=16;\"Très bien\";SI(E{r}>=14;\"Bien\";SI(E{r}>=12;\"Assez bien\";SI(E{r}>=10;\"Passable\";\"Insuffisant\"))))"],
        ["Kpodo Sarah", 13, 14, 12, "=ARRONDI((B{r}+C{r}+D{r}*2)/4;2)", "=SI(E{r}>=16;\"Très bien\";SI(E{r}>=14;\"Bien\";SI(E{r}>=12;\"Assez bien\";SI(E{r}>=10;\"Passable\";\"Insuffisant\"))))"],
      ], [undefined, undefined, undefined, undefined, "number", undefined], { total: ["Moyenne de la classe", "=MOYENNE(B{first}:B{last})", "=MOYENNE(C{first}:C{last})", "=MOYENNE(D{first}:D{last})", "=MOYENNE(E{first}:E{last})", "=NB.SI(E{first}:E{last};\">=10\")&\" admis\""] });
      for (const c of ["B", "C", "D"]) { const t = sh.cells[`${c}7`]; if (t) t.s = { ...t.s, fmt: "number", dec: 2 }; }
      widths(sh, [170, 90, 90, 110, 100, 130]);
      chart(sh, "bar", "A2:A6,E2:E6", "Moyenne par élève", 20, 230, 560, 260);
      return book("Notes", sh);
    },
  },
  {
    id: "invites", fr: "Liste d'invités", en: "Guest list", group: "organisation", accent: "#be185d",
    descFr: "Confirmations, nombre de personnes et plan de tables.", descEn: "RSVPs, headcount and table plan.",
    build: () => {
      const a = "#be185d"; const sh = newSheet("Invités", 300, 8);
      table(sh, "A1", a, ["Nom", "Téléphone", "Côté", "Confirmé", "Personnes", "Table"], [
        ["Famille Agossou", "+229 01 00 00 10", "Mariée", "Oui", 4, 1], ["M. et Mme Hounkpè", "+229 01 00 00 11", "Marié", "Oui", 2, 2],
        ["Sœurs Ahouandjinou", "+229 01 00 00 12", "Mariée", "En attente", 3, ""], ["Collègues de Jonas", "+229 01 00 00 13", "Marié", "Oui", 6, 3],
        ["Tante Rosine", "+229 01 00 00 14", "Mariée", "Non", 1, ""],
      ], [], {});
      sh.cells["H1"] = { v: "Résumé", s: head(a) }; sh.cells["I1"] = { v: "", s: head(a) };
      const sum: [string, string][] = [["Invitations", "=NBVAL(A2:A300)"], ["Confirmées", "=NB.SI(D2:D300;\"Oui\")"], ["Personnes attendues", "=SOMME.SI(D2:D300;\"Oui\";E2:E300)"], ["En attente", "=NB.SI(D2:D300;\"En attente\")"]];
      sum.forEach(([l, f], i) => { sh.cells[`H${i + 2}`] = { v: l, s: { b: true, border: true } }; sh.cells[`I${i + 2}`] = { v: f, s: { border: true, align: "center" } }; });
      widths(sh, [190, 150, 90, 110, 100, 70, 24, 170, 90]);
      sh.freeze = true;
      chart(sh, "pie", "H3:H5,I3:I5", "Réponses", 640, 170, 340, 260);
      return book("Liste d'invités", sh);
    },
  },
  {
    id: "projet", fr: "Planning de projet", en: "Project plan", group: "organisation", accent: "#4f46e5",
    descFr: "Tâches, responsables, dates, durée et avancement.", descEn: "Tasks, owners, dates, duration and progress.",
    build: () => {
      const a = "#4f46e5"; const sh = newSheet("Planning", 200, 10);
      table(sh, "A1", a, ["Tâche", "Responsable", "Début", "Fin", "Durée (jours)", "Avancement", "Statut"], [
        ["Cadrage et objectifs", "Awa", "06/01/2027", "10/01/2027", "=D{r}-C{r}", "100%", "=SI(F{r}>=1;\"Terminé\";SI(F{r}>0;\"En cours\";\"À faire\"))"],
        ["Maquettes", "Koffi", "11/01/2027", "20/01/2027", "=D{r}-C{r}", "80%", "=SI(F{r}>=1;\"Terminé\";SI(F{r}>0;\"En cours\";\"À faire\"))"],
        ["Développement", "Jonas", "21/01/2027", "15/02/2027", "=D{r}-C{r}", "30%", "=SI(F{r}>=1;\"Terminé\";SI(F{r}>0;\"En cours\";\"À faire\"))"],
        ["Tests et corrections", "Fifamè", "16/02/2027", "25/02/2027", "=D{r}-C{r}", "0%", "=SI(F{r}>=1;\"Terminé\";SI(F{r}>0;\"En cours\";\"À faire\"))"],
        ["Lancement", "Awa", "01/03/2027", "01/03/2027", "=D{r}-C{r}", "0%", "=SI(F{r}>=1;\"Terminé\";SI(F{r}>0;\"En cours\";\"À faire\"))"],
      ], [undefined, undefined, "date", "date", undefined, "percent", undefined], { total: ["Avancement global", "", "", "", "=SOMME(E{first}:E{last})", "=MOYENNE(F{first}:F{last})", ""] });
      widths(sh, [210, 120, 110, 110, 110, 110, 110]);
      sh.freeze = true;
      chart(sh, "bar", "A2:A6,F2:F6", "Avancement par tâche", 20, 260, 600, 260);
      return book("Planning de projet", sh);
    },
  },
  {
    id: "contenu", fr: "Calendrier de contenu", en: "Content calendar", group: "organisation", accent: "#ea580c",
    descFr: "Publications par réseau, format, statut et résultats.", descEn: "Posts per network, format, status and results.",
    build: () => {
      const a = "#ea580c"; const sh = newSheet("Contenu", 200, 10);
      table(sh, "A1", a, ["Date", "Réseau", "Sujet", "Format", "Statut", "Vues", "Interactions", "Taux d'engagement"], [
        ["02/02/2027", "Instagram", "Nouvelle collection", "Carrousel", "Publié", 4200, 380, "=SIERREUR(G{r}/F{r};0)"],
        ["04/02/2027", "Facebook", "Témoignage client", "Vidéo", "Publié", 6100, 410, "=SIERREUR(G{r}/F{r};0)"],
        ["06/02/2027", "TikTok", "Coulisses de l'atelier", "Vidéo courte", "Publié", 15800, 1250, "=SIERREUR(G{r}/F{r};0)"],
        ["09/02/2027", "WhatsApp", "Offre de la semaine", "Statut", "Programmé", "", "", "=SIERREUR(G{r}/F{r};0)"],
        ["11/02/2027", "Instagram", "Conseil d'entretien", "Reel", "À créer", "", "", "=SIERREUR(G{r}/F{r};0)"],
      ], ["date", undefined, undefined, undefined, undefined, undefined, undefined, "percent"]);
      for (let r = 2; r <= 6; r++) { const c = sh.cells[`H${r}`]; if (c) c.s = { ...c.s, dec: 1 }; }
      widths(sh, [110, 110, 200, 120, 110, 90, 110, 150]);
      sh.freeze = true;
      chart(sh, "bar", "B2:B4,F2:F4", "Vues par publication", 20, 230, 560, 260);
      return book("Calendrier de contenu", sh);
    },
  },
  {
    id: "tableau-bord", fr: "Tableau de bord mensuel", en: "Monthly dashboard", group: "finance", accent: "#0891b2",
    descFr: "Chiffre d'affaires, charges, bénéfice et marge sur 12 mois.", descEn: "Revenue, costs, profit and margin over 12 months.",
    build: () => {
      const a = "#0891b2"; const sh = newSheet("Tableau de bord", 60, 10);
      const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      const ca = [820000, 760000, 910000, 980000, 1050000, 990000, 1120000, 1080000, 1210000, 1290000, 1350000, 1600000];
      const ch = [610000, 590000, 640000, 660000, 700000, 690000, 720000, 710000, 760000, 780000, 800000, 880000];
      table(sh, "A1", a, ["Mois", "Chiffre d'affaires", "Charges", "Bénéfice", "Marge"], months.map((m, i) => [m, ca[i]!, ch[i]!, "=B{r}-C{r}", "=SIERREUR(D{r}/B{r};0)"]),
        [undefined, "fcfa", "fcfa", "fcfa", "percent"], { total: ["Année", "=SOMME(B{first}:B{last})", "=SOMME(C{first}:C{last})", "=SOMME(D{first}:D{last})", "=D14/B14"] });
      widths(sh, [120, 150, 140, 140, 90]);
      sh.freeze = true;
      chart(sh, "line", "A1:C13", "Chiffre d'affaires et charges", 680, 20, 520, 280);
      chart(sh, "area", "A1:A13,D1:D13", "Bénéfice mensuel", 680, 320, 520, 240);
      return book("Tableau de bord", sh);
    },
  },
  {
    id: "taches", fr: "Liste de tâches", en: "To-do list", group: "organisation", accent: "#16a34a",
    descFr: "Priorités, échéances, jours restants et progression.", descEn: "Priorities, due dates, days left and progress.",
    build: () => {
      const a = "#16a34a"; const sh = newSheet("Tâches", 200, 8);
      table(sh, "A1", a, ["Tâche", "Priorité", "Échéance", "Fait", "Jours restants"], [
        ["Envoyer le devis à l'hôtel", "Haute", "20/02/2027", "Non", "=SI(D{r}=\"Oui\";\"\";C{r}-AUJOURDHUI())"],
        ["Relancer les factures impayées", "Haute", "22/02/2027", "Non", "=SI(D{r}=\"Oui\";\"\";C{r}-AUJOURDHUI())"],
        ["Préparer les publications de mars", "Moyenne", "28/02/2027", "Oui", "=SI(D{r}=\"Oui\";\"\";C{r}-AUJOURDHUI())"],
        ["Commander les emballages", "Basse", "05/03/2027", "Non", "=SI(D{r}=\"Oui\";\"\";C{r}-AUJOURDHUI())"],
      ], [undefined, undefined, "date", undefined, undefined]);
      sh.cells["G1"] = { v: "Progression", s: head(a) };
      sh.cells["G2"] = { v: "=SIERREUR(NB.SI(D2:D200;\"Oui\")/NBVAL(A2:A200);0)", s: { fmt: "percent", b: true, size: 16, align: "center", color: a } };
      widths(sh, [280, 100, 110, 80, 130, 24, 130]);
      sh.freeze = true;
      return book("Liste de tâches", sh);
    },
  },
  {
    id: "depenses", fr: "Suivi des dépenses", en: "Expense tracker", group: "finance", accent: "#ca8a04",
    descFr: "Dépenses par catégorie et mode de paiement.", descEn: "Expenses by category and payment method.",
    build: () => {
      const a = "#ca8a04"; const sh = newSheet("Dépenses", 300, 10);
      table(sh, "A1", a, ["Date", "Description", "Catégorie", "Montant", "Paiement"], [
        ["01/04/2027", "Courses au marché", "Alimentation", 18500, "Espèces"], ["02/04/2027", "Zémidjan", "Transport", 1500, "Espèces"],
        ["03/04/2027", "Forfait internet", "Internet", 10000, "Mobile Money"], ["05/04/2027", "Pharmacie", "Santé", 7200, "Mobile Money"],
        ["07/04/2027", "Carburant", "Transport", 12000, "Espèces"], ["09/04/2027", "Restaurant", "Loisirs", 9000, "Carte"],
      ], ["date", undefined, undefined, "fcfa", undefined], { total: ["", "Total", "", "=SOMME(D{first}:D{last})", ""] });
      table(sh, "G1", a, ["Catégorie", "Total"], ["Alimentation", "Transport", "Internet", "Santé", "Loisirs"].map((c) => [c, "=SOMME.SI(C:C;G{r};D:D)"]), [undefined, "fcfa"]);
      widths(sh, [110, 200, 130, 120, 130, 24, 140, 120]);
      sh.freeze = true;
      chart(sh, "pie", "G2:H6", "Répartition des dépenses", 20, 300, 420, 280);
      return book("Suivi des dépenses", sh);
    },
  },
];

export const SHEET_GROUPS: Record<SheetTemplate["group"], { fr: string; en: string }> = {
  finance: { fr: "Finances", en: "Finance" }, business: { fr: "Commerce", en: "Business" },
  organisation: { fr: "Organisation", en: "Planning" }, education: { fr: "École", en: "School" },
};
