// Browser helpers for chat attachments (images, PDF, audio, video).
export type ChatFilePart = { type: "file"; mediaType: string; filename: string; url: string };

export const ACCEPT = "image/*,application/pdf,audio/*,video/*";
export const MAX_FILES = 4;
const MAX_MEDIA_BYTES = 20 * 1024 * 1024; // audio / video
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const PERSIST_LIMIT = 2_500_000; // data URLs above this size are kept only in memory

// Large media is not stored in the conversation; keep it in memory for the current session.
export const pendingMedia = new Map<string, string>();
export const mediaKey = (messageId: string, index: number) => `${messageId}:${index}`;

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
