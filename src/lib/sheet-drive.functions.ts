import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// TechNova Tableur ← Google Drive: lists the user's spreadsheets (Google Sheets, .xlsx, .csv) with the Drive
// connection they made in Connexions (read-only scope) and downloads one — Google Sheets are exported as .xlsx by
// Google. The token never leaves the server; the file goes straight back to the browser and is not stored.

const SHEET_MIMES = [
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];
const MAX_BYTES = 10 * 1024 * 1024;

export const listDriveSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { q?: string }) => z.object({ q: z.string().max(80).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    await (await import("@/lib/org.server")).requireOrgFeature(context.userId, "connections");
    const { getAccessToken } = await import("@/lib/connections.server");
    const access = await getAccessToken(context.userId, "google_drive");
    if (!access) return { connected: false as const, files: [] };
    const mimes = SHEET_MIMES.map((m) => `mimeType='${m}'`).join(" or ");
    const name = data.q?.trim() ? ` and name contains '${data.q.trim().replace(/['\\]/g, "")}'` : "";
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", `(${mimes}) and trashed=false${name}`);
    url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,size)");
    url.searchParams.set("orderBy", "modifiedTime desc");
    url.searchParams.set("pageSize", "40");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(15_000) });
    if (res.status === 401 || res.status === 403) return { connected: false as const, files: [] };
    if (!res.ok) throw new Error("DRIVE_UNAVAILABLE");
    const json = await res.json() as { files?: { id: string; name: string; mimeType: string; modifiedTime?: string; size?: string }[] };
    return { connected: true as const, files: (json.files ?? []).map((f) => ({ id: f.id, name: f.name, kind: f.mimeType.includes("google-apps") ? "sheets" : f.mimeType === "text/csv" ? "csv" : "xlsx", modified: f.modifiedTime ?? null })) };
  });

export const fetchDriveSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().regex(/^[\w-]{10,120}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    await (await import("@/lib/org.server")).requireOrgFeature(context.userId, "connections");
    const { hitRateLimit } = await import("@/lib/security.server");
    if (!(await hitRateLimit(context.userId, "files"))) throw new Error("RATE_LIMITED");
    const { getAccessToken } = await import("@/lib/connections.server");
    const access = await getAccessToken(context.userId, "google_drive");
    if (!access) throw new Error("DRIVE_NOT_CONNECTED");
    const headers = { Authorization: `Bearer ${access}` };
    const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}?fields=name,mimeType,size`, { headers, signal: AbortSignal.timeout(15_000) });
    if (!meta.ok) throw new Error("DRIVE_FILE_NOT_FOUND");
    const m = await meta.json() as { name: string; mimeType: string; size?: string };
    if (!SHEET_MIMES.includes(m.mimeType)) throw new Error("UNSUPPORTED");
    if (m.size && Number(m.size) > MAX_BYTES) throw new Error("TOO_BIG");
    const file = m.mimeType === "application/vnd.google-apps.spreadsheet"
      ? await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/export?mimeType=${encodeURIComponent(SHEET_MIMES[1]!)}`, { headers, signal: AbortSignal.timeout(30_000) })
      : await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}?alt=media`, { headers, signal: AbortSignal.timeout(30_000) });
    if (!file.ok) throw new Error("DRIVE_DOWNLOAD_FAILED");
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error("TOO_BIG");
    return { name: m.name.replace(/\.(xlsx|csv)$/i, ""), kind: m.mimeType === "text/csv" ? "csv" as const : "xlsx" as const, base64: buf.toString("base64") };
  });
