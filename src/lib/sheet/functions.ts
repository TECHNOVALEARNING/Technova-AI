// Function catalogue for the formula suggestions (type « = » then letters, like Excel): every function the engine
// evaluates (FNS in formula.ts), with its French name, English name, arguments and a one-line description.
// Keep it in step with formula.ts: a function added to FNS needs its line here.

export type FnInfo = { en: string; fr: string; argsFr: string; argsEn: string; fr_: string; en_: string; cat: "math" | "stat" | "logic" | "lookup" | "text" | "date" | "info" };

// [english, french, args (fr), args (en), description (fr), description (en), category]
const RAW: [string, string, string, string, string, string, FnInfo["cat"]][] = [
  ["SUM", "SOMME", "nombre1; [nombre2]; …", "number1, [number2], …", "Additionne des nombres ou une plage de cellules.", "Adds numbers or a range of cells.", "math"],
  ["AVERAGE", "MOYENNE", "nombre1; [nombre2]; …", "number1, [number2], …", "Moyenne des nombres d'une plage.", "Average of the numbers in a range.", "stat"],
  ["MIN", "MIN", "nombre1; [nombre2]; …", "number1, [number2], …", "Plus petite valeur d'une plage.", "Smallest value in a range.", "stat"],
  ["MAX", "MAX", "nombre1; [nombre2]; …", "number1, [number2], …", "Plus grande valeur d'une plage.", "Largest value in a range.", "stat"],
  ["COUNT", "NB", "valeur1; [valeur2]; …", "value1, [value2], …", "Compte les cellules qui contiennent un nombre.", "Counts cells that contain a number.", "stat"],
  ["COUNTA", "NBVAL", "valeur1; [valeur2]; …", "value1, [value2], …", "Compte les cellules non vides.", "Counts non-empty cells.", "stat"],
  ["COUNTBLANK", "NB.VIDE", "plage", "range", "Compte les cellules vides d'une plage.", "Counts empty cells in a range.", "stat"],
  ["PRODUCT", "PRODUIT", "nombre1; [nombre2]; …", "number1, [number2], …", "Multiplie des nombres entre eux.", "Multiplies numbers together.", "math"],
  ["MEDIAN", "MEDIANE", "nombre1; [nombre2]; …", "number1, [number2], …", "Valeur du milieu d'une série de nombres.", "Middle value of a set of numbers.", "stat"],
  ["ROUND", "ARRONDI", "nombre; nb_chiffres", "number, num_digits", "Arrondit un nombre au nombre de décimales voulu.", "Rounds a number to a number of digits.", "math"],
  ["ROUNDUP", "ARRONDI.SUP", "nombre; nb_chiffres", "number, num_digits", "Arrondit vers le haut.", "Rounds up, away from zero.", "math"],
  ["ROUNDDOWN", "ARRONDI.INF", "nombre; nb_chiffres", "number, num_digits", "Arrondit vers le bas.", "Rounds down, toward zero.", "math"],
  ["INT", "ENT", "nombre", "number", "Partie entière d'un nombre.", "Rounds down to the nearest integer.", "math"],
  ["ABS", "ABS", "nombre", "number", "Valeur absolue (sans le signe).", "Absolute value (no sign).", "math"],
  ["MOD", "MOD", "nombre; diviseur", "number, divisor", "Reste d'une division.", "Remainder of a division.", "math"],
  ["SQRT", "RACINE", "nombre", "number", "Racine carrée.", "Square root.", "math"],
  ["POWER", "PUISSANCE", "nombre; puissance", "number, power", "Élève un nombre à une puissance.", "Raises a number to a power.", "math"],
  ["PI", "PI", "", "", "Valeur de π (3,14159…).", "The value of π (3.14159…).", "math"],
  ["IF", "SI", "test_logique; [valeur_si_vrai]; [valeur_si_faux]", "logical_test, [value_if_true], [value_if_false]", "Renvoie une valeur si la condition est vraie, une autre sinon.", "Returns one value if a condition is true, another if false.", "logic"],
  ["IFS", "SI.CONDITIONS", "test1; valeur1; [test2; valeur2]; …", "test1, value1, [test2, value2], …", "Teste plusieurs conditions et renvoie la valeur de la première vraie.", "Checks several conditions and returns the first true one's value.", "logic"],
  ["IFERROR", "SIERREUR", "valeur; valeur_si_erreur", "value, value_if_error", "Remplace une erreur (#DIV/0!, #N/A…) par une autre valeur.", "Replaces an error (#DIV/0!, #N/A…) with another value.", "logic"],
  ["AND", "ET", "condition1; [condition2]; …", "logical1, [logical2], …", "VRAI si toutes les conditions sont vraies.", "TRUE if all conditions are true.", "logic"],
  ["OR", "OU", "condition1; [condition2]; …", "logical1, [logical2], …", "VRAI si au moins une condition est vraie.", "TRUE if any condition is true.", "logic"],
  ["NOT", "NON", "condition", "logical", "Inverse VRAI et FAUX.", "Reverses TRUE and FALSE.", "logic"],
  ["SUMIF", "SOMME.SI", "plage; critère; [somme_plage]", "range, criteria, [sum_range]", "Additionne les cellules qui remplissent un critère.", "Adds the cells that meet a criterion.", "math"],
  ["COUNTIF", "NB.SI", "plage; critère", "range, criteria", "Compte les cellules qui remplissent un critère.", "Counts the cells that meet a criterion.", "stat"],
  ["AVERAGEIF", "MOYENNE.SI", "plage; critère; [moyenne_plage]", "range, criteria, [average_range]", "Moyenne des cellules qui remplissent un critère.", "Average of the cells that meet a criterion.", "stat"],
  ["SUMIFS", "SOMME.SI.ENS", "somme_plage; plage1; critère1; [plage2; critère2]; …", "sum_range, range1, criteria1, [range2, criteria2], …", "Additionne les cellules qui remplissent plusieurs critères.", "Adds the cells that meet several criteria.", "math"],
  ["COUNTIFS", "NB.SI.ENS", "plage1; critère1; [plage2; critère2]; …", "range1, criteria1, [range2, criteria2], …", "Compte les lignes qui remplissent plusieurs critères.", "Counts the rows that meet several criteria.", "stat"],
  ["MAXIFS", "MAX.SI.ENS", "max_plage; plage1; critère1; …", "max_range, range1, criteria1, …", "Plus grande valeur parmi les lignes qui remplissent les critères.", "Largest value among rows that meet the criteria.", "stat"],
  ["MINIFS", "MIN.SI.ENS", "min_plage; plage1; critère1; …", "min_range, range1, criteria1, …", "Plus petite valeur parmi les lignes qui remplissent les critères.", "Smallest value among rows that meet the criteria.", "stat"],
  ["VLOOKUP", "RECHERCHEV", "valeur_cherchée; table; no_colonne; [valeur_proche]", "lookup_value, table_array, col_index, [range_lookup]", "Cherche une valeur dans la 1re colonne et renvoie celle d'une autre colonne.", "Looks up a value in the first column and returns one from another column.", "lookup"],
  ["HLOOKUP", "RECHERCHEH", "valeur_cherchée; table; no_ligne; [valeur_proche]", "lookup_value, table_array, row_index, [range_lookup]", "Cherche une valeur dans la 1re ligne et renvoie celle d'une autre ligne.", "Looks up a value in the first row and returns one from another row.", "lookup"],
  ["XLOOKUP", "RECHERCHEX", "valeur_cherchée; tableau_recherche; tableau_renvoyé; [si_non_trouvé]", "lookup_value, lookup_array, return_array, [if_not_found]", "Recherche moderne : trouve une valeur et renvoie celle d'à côté.", "Modern lookup: finds a value and returns the matching one.", "lookup"],
  ["MATCH", "EQUIV", "valeur_cherchée; tableau; [type]", "lookup_value, lookup_array, [match_type]", "Position d'une valeur dans une plage.", "Position of a value in a range.", "lookup"],
  ["INDEX", "INDEX", "tableau; no_ligne; [no_colonne]", "array, row_num, [column_num]", "Valeur à une ligne et une colonne données d'une plage.", "Value at a given row and column of a range.", "lookup"],
  ["CONCAT", "CONCAT", "texte1; [texte2]; …", "text1, [text2], …", "Assemble plusieurs textes en un seul.", "Joins several texts into one.", "text"],
  ["CONCATENATE", "CONCATENER", "texte1; [texte2]; …", "text1, [text2], …", "Assemble plusieurs textes (ancienne fonction).", "Joins several texts (older function).", "text"],
  ["TEXTJOIN", "JOINDRE.TEXTE", "séparateur; ignorer_vides; texte1; …", "delimiter, ignore_empty, text1, …", "Assemble des textes avec un séparateur.", "Joins texts with a delimiter.", "text"],
  ["LEFT", "GAUCHE", "texte; [nb_caractères]", "text, [num_chars]", "Premiers caractères d'un texte.", "First characters of a text.", "text"],
  ["RIGHT", "DROITE", "texte; [nb_caractères]", "text, [num_chars]", "Derniers caractères d'un texte.", "Last characters of a text.", "text"],
  ["MID", "STXT", "texte; début; nb_caractères", "text, start_num, num_chars", "Caractères au milieu d'un texte.", "Characters from the middle of a text.", "text"],
  ["LEN", "NBCAR", "texte", "text", "Nombre de caractères d'un texte.", "Number of characters in a text.", "text"],
  ["UPPER", "MAJUSCULE", "texte", "text", "Met le texte en majuscules.", "Converts text to uppercase.", "text"],
  ["LOWER", "MINUSCULE", "texte", "text", "Met le texte en minuscules.", "Converts text to lowercase.", "text"],
  ["PROPER", "NOMPROPRE", "texte", "text", "Met une majuscule au début de chaque mot.", "Capitalises the first letter of each word.", "text"],
  ["TRIM", "SUPPRESPACE", "texte", "text", "Supprime les espaces en trop.", "Removes extra spaces.", "text"],
  ["TODAY", "AUJOURDHUI", "", "", "Date du jour.", "Today's date.", "date"],
  ["NOW", "MAINTENANT", "", "", "Date et heure actuelles.", "Current date and time.", "date"],
  ["DATE", "DATE", "année; mois; jour", "year, month, day", "Construit une date à partir de l'année, du mois et du jour.", "Builds a date from year, month and day.", "date"],
  ["YEAR", "ANNEE", "date", "date", "Année d'une date.", "Year of a date.", "date"],
  ["MONTH", "MOIS", "date", "date", "Mois d'une date (1 à 12).", "Month of a date (1 to 12).", "date"],
  ["DAY", "JOUR", "date", "date", "Jour du mois d'une date.", "Day of the month of a date.", "date"],
  ["ISBLANK", "ESTVIDE", "valeur", "value", "VRAI si la cellule est vide.", "TRUE if the cell is empty.", "info"],
  ["ISNUMBER", "ESTNUM", "valeur", "value", "VRAI si la valeur est un nombre.", "TRUE if the value is a number.", "info"],
  ["ISERROR", "ESTERREUR", "valeur", "value", "VRAI si la valeur est une erreur.", "TRUE if the value is an error.", "info"],
];

export const FUNCTIONS: FnInfo[] = RAW.map(([en, fr, argsFr, argsEn, fr_, en_, cat]) => ({ en, fr, argsFr, argsEn, fr_, en_, cat }));
const byName = new Map<string, FnInfo>();
for (const f of FUNCTIONS) { byName.set(f.en, f); byName.set(f.fr, f); }
byName.set("AUJOURD'HUI", byName.get("TODAY")!); byName.set("JOINDRE", byName.get("TEXTJOIN")!);
export const functionInfo = (name: string) => byName.get(name.toUpperCase());

/** The name shown in a French or English interface. */
export const fnName = (f: FnInfo, lang: "fr" | "en") => (lang === "fr" ? f.fr : f.en);
/** "SOMME(nombre1; [nombre2]; …)" or "SUM(number1, [number2], …)". */
export const fnSyntax = (f: FnInfo, lang: "fr" | "en") => `${fnName(f, lang)}(${lang === "fr" ? f.argsFr : f.argsEn})`;

/** Functions whose French or English name starts with `prefix` (accents ignored), the interface's language first,
    exact matches first, then alphabetical. An empty prefix lists the most used functions first. */
export function suggestFunctions(prefix: string, lang: "fr" | "en", limit = 12): FnInfo[] {
  const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const p = fold(prefix);
  if (!p) {
    const top = lang === "fr" ? ["SOMME", "MOYENNE", "SI", "NB.SI", "SOMME.SI", "RECHERCHEX", "RECHERCHEV", "MAX", "MIN", "NBVAL", "ARRONDI", "SIERREUR"] : ["SUM", "AVERAGE", "IF", "COUNTIF", "SUMIF", "XLOOKUP", "VLOOKUP", "MAX", "MIN", "COUNTA", "ROUND", "IFERROR"];
    return top.map((n) => functionInfo(n)!).slice(0, limit);
  }
  const scored = FUNCTIONS.map((f) => {
    const own = fold(fnName(f, lang)), other = fold(fnName(f, lang === "fr" ? "en" : "fr"));
    const score = own === p ? 0 : own.startsWith(p) ? 1 : other.startsWith(p) ? 2 : own.includes(p) && p.length >= 3 ? 3 : 9;
    return { f, score };
  }).filter((x) => x.score < 9);
  scored.sort((a, b) => a.score - b.score || fnName(a.f, lang).length - fnName(b.f, lang).length || fnName(a.f, lang).localeCompare(fnName(b.f, lang)));
  return scored.slice(0, limit).map((x) => x.f);
}

/** The function name being typed just before the caret in a formula (letters after « = », an operator, « ( » or « ; »). */
export function typedFunction(text: string, caret: number): { start: number; prefix: string } | null {
  if (!text.startsWith("=")) return null;
  const before = text.slice(0, caret);
  if ((before.match(/"/g)?.length ?? 0) % 2 === 1) return null;          // inside a text
  if (before === "=") return { start: 1, prefix: "" };
  const m = /(?:^=|[=(;,+\-*/^&<>\s])([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.]*)$/.exec(before);
  if (!m) return null;
  const prefix = m[1]!;
  if (/^[A-Za-z]{1,3}\d+$/.test(prefix)) return null;                       // a cell reference (B12)
  return { start: caret - prefix.length, prefix };
}

/** The innermost function whose brackets are still open at the caret, and which argument the caret is in. */
export function openFunction(text: string, caret: number): { info: FnInfo; arg: number } | null {
  if (!text.startsWith("=")) return null;
  const stack: { name: string; arg: number }[] = [];
  let q = false;
  const s = text.slice(0, caret);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === '"') { q = !q; continue; }
    if (q) continue;
    if (ch === "(") { const m = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.']*)$/.exec(s.slice(0, i)); stack.push({ name: m?.[1] ?? "", arg: 0 }); }
    else if (ch === ")") stack.pop();
    else if ((ch === ";" || ch === ",") && stack.length) stack[stack.length - 1]!.arg++;
  }
  for (let k = stack.length - 1; k >= 0; k--) { const info = functionInfo(stack[k]!.name); if (info) return { info, arg: stack[k]!.arg }; }
  return null;
}
