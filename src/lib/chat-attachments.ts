// Browser helpers for chat attachments (images, PDF, audio, video).
export type ChatFilePart = { type: "file"; mediaType: string; filename: string; url: string };

export const ACCEPT = "image/*,application/pdf,audio/*,video/*";
export const MAX_FILES = 4;
// Requests to the server are capped at 4.5 MB on Vercel and files travel as base64 (+33 %).
const MAX_MEDIA_BYTES = 3 * 1024 * 1024; // audio / video
const MAX_PDF_BYTES = 3 * 1024 * 1024;
/** Total base64 size of the files sent with one /api/chat request. */
export const MAX_REQUEST_FILE_CHARS = 4_000_000;
const PERSIST_LIMIT = 2_500_000; // data URLs above this size are kept only in memory

// Large media is not stored in the conversation; keep it in memory for the current session.
export const pendingMedia = new Map<string, string>();
export const mediaKey = (messageId: string, index: number) => `${messageId}:${index}`;

// Documents indexed by the file pipeline travel as references, never as bytes.
export const INDEXED_FILE_TYPE = "application/x-technova-file";
export const indexedFileUrl = (fileId: string) => `tnfile:${fileId}`;
export const indexedFileId = (url: string | undefined) => (url?.startsWith("tnfile:") ? url.slice(7) : null);

/** Sent directly to the model as bytes (small images, PDF, audio, video); anything else goes through the pipeline. */
export function isDirectAttachment(file: File) {
  const kind = kindOf(file.type);
  if (kind === "image") return /^image\/(png|jpe?g|webp)$/.test(file.type);
  if (kind === "pdf") return file.size <= MAX_PDF_BYTES;
  if (kind === "audio" || kind === "video") return file.size <= MAX_MEDIA_BYTES;
  return false;
}

export function kindOf(mediaType: string) {
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.startsWith("audio/")) return "audio";
  if (mediaType.startsWith("video/")) return "video";
  if (mediaType === "application/pdf") return "pdf";
  return "other";
}

function readDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function compressImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

export async function toFilePart(file: File): Promise<ChatFilePart> {
  const kind = kindOf(file.type);
  if (kind === "other") throw new Error("unsupported");
  if (kind === "image") return { type: "file", mediaType: "image/jpeg", filename: file.name, url: await compressImage(file) };
  if (kind === "pdf" && file.size > MAX_PDF_BYTES) throw new Error("too-large");
  if ((kind === "audio" || kind === "video") && file.size > MAX_MEDIA_BYTES) throw new Error("too-large");
  return { type: "file", mediaType: file.type, filename: file.name, url: await readDataUrl(file) };
}

// Split parts into what we persist (small) and what stays in memory (large media).
export function persistableParts(messageId: string, parts: Array<{ type: "text"; text: string } | ChatFilePart>) {
  return parts.map((p, i) => {
    if (p.type !== "file" || p.url.length <= PERSIST_LIMIT) return p;
    pendingMedia.set(mediaKey(messageId, i), p.url);
    return { ...p, url: "" };
  });
}

type SentFile = { mediaType: string; filename: string; url: string };

/**
 * Keeps files only for the last `recentTurns` turns, newest first, until `budget` base64
 * characters are used; older or overflowing files are dropped from the request.
 */
export function budgetFiles<T extends { files: SentFile[] }>(turns: T[], budget = MAX_REQUEST_FILE_CHARS, recentTurns = 6): Array<Omit<T, "files"> & { files?: SentFile[] }> {
  let left = budget;
  const out = turns.map((turn) => ({ ...turn }) as Omit<T, "files"> & { files?: SentFile[] });
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i]!;
    const kept = i >= turns.length - recentTurns ? turn.files.filter((f) => (left -= f.url.length) >= 0) : [];
    if (kept.length) out[i]!.files = kept; else delete out[i]!.files;
  }
  return out;
}
