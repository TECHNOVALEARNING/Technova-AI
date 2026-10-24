// Formats accepted for chat files and knowledge bases, with their size limits (shared browser/server).

export type FileKind = "document" | "spreadsheet" | "presentation" | "text" | "code" | "image" | "audio" | "video" | "archive";

const MB = 1024 * 1024;

export const kindLimits: Record<FileKind, number> = {
  document: 20 * MB,
  spreadsheet: 10 * MB,
  presentation: 25 * MB,
  text: 5 * MB,
  code: 2 * MB,
  image: 10 * MB,
  audio: 20 * MB,
  video: 20 * MB,
  archive: 25 * MB,
};

const byKind: Record<FileKind, string[]> = {
  document: ["pdf", "doc", "docx"],
  spreadsheet: ["xls", "xlsx", "csv"],
  presentation: ["ppt", "pptx"],
  text: ["txt", "md", "markdown", "html", "htm", "json"],
  code: [
    "js", "jsx", "mjs", "cjs", "ts", "tsx", "py", "java", "kt", "kts", "scala", "c", "h", "cpp", "cc", "hpp", "cs", "go", "rs", "rb", "php",
    "swift", "dart", "r", "lua", "pl", "sql", "sh", "bash", "zsh", "ps1", "bat", "yaml", "yml", "toml", "ini", "env.example", "xml", "css", "scss",
    "sass", "less", "vue", "svelte", "astro", "graphql", "gql", "prisma", "proto", "tf", "dockerfile", "makefile", "gradle", "ipynb",
  ],
  image: ["png", "jpg", "jpeg", "webp"],
  audio: ["mp3", "wav"],
  video: ["mp4", "mov"],
  archive: ["zip"],
};

const extKind = new Map<string, FileKind>(Object.entries(byKind).flatMap(([kind, exts]) => exts.map((e) => [e, kind as FileKind])));

/** "Dockerfile" and "Makefile" have no extension: the whole name is used. */
export function extOf(filename: string) {
  const name = filename.trim().toLowerCase().split(/[\\/]/).pop() ?? "";
  if (name === "dockerfile" || name === "makefile") return name;
  if (name.endsWith(".env.example")) return "env.example";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}

export function kindOfFile(filename: string): FileKind | null {
  return extKind.get(extOf(filename)) ?? null;
}

export const ALL_ACCEPT = [...extKind.keys()].filter((e) => !["dockerfile", "makefile", "env.example"].includes(e)).map((e) => `.${e}`).join(",") + ",Dockerfile,Makefile";

export const MAX_CHAT_DOCUMENTS = 10;

export type FileCheck = { ok: true; kind: FileKind; ext: string } | { ok: false; reason: "type" | "size" | "empty" };

export function checkFile(filename: string, size: number): FileCheck {
  const kind = kindOfFile(filename);
  if (!kind) return { ok: false, reason: "type" };
  if (size <= 0) return { ok: false, reason: "empty" };
  if (size > kindLimits[kind]) return { ok: false, reason: "size" };
  return { ok: true, kind, ext: extOf(filename) };
}

export const formatsLabel = "PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, TXT, MD, HTML, JSON, PNG, JPG, WEBP, MP3, WAV, MP4, MOV, ZIP";
export const sizeLabel = (bytes: number) => (bytes >= MB ? `${Math.round(bytes / MB)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`);
