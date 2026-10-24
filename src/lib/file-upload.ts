// Browser side of the file pipeline: register → upload to the private bucket → server processing.
import { supabase } from "@/integrations/supabase/client";
import { createFileUpload, processUploadedFile } from "@/lib/files.functions";

export type UploadPhase = "uploading" | "processing" | "ready" | "failed";
export type UploadResult = { fileId: string | null; status: UploadPhase; error: string | null };

export async function uploadAndIndex(file: File, origin: "chat" | "knowledge", onPhase: (p: UploadPhase) => void, knowledgeBaseId?: string): Promise<UploadResult> {
  let fileId: string | null = null;
  try {
    onPhase("uploading");
    const reg = await createFileUpload({ data: { filename: file.name, size: file.size, mime: file.type, origin, ...(knowledgeBaseId ? { knowledgeBaseId } : {}) } });
    fileId = reg.fileId;
    const { error } = await supabase.storage.from("user-files").uploadToSignedUrl(reg.path, reg.token, file, { contentType: file.type || "application/octet-stream" });
    if (error) return { fileId, status: "failed", error: "upload_failed" };
    onPhase("processing");
    const done = await processUploadedFile({ data: { fileId } });
    return { fileId, status: done.status === "ready" ? "ready" : "failed", error: done.error ?? null };
  } catch (e) {
    return { fileId, status: "failed", error: e instanceof Error ? e.message : "failed" };
  }
}

const messages: Record<string, { fr: string; en: string }> = {
  file_type: { fr: "Format non pris en charge.", en: "Unsupported format." },
  file_size: { fr: "Fichier trop lourd pour ce format.", en: "File too large for this format." },
  file_empty: { fr: "Fichier vide.", en: "Empty file." },
  rate_limited: { fr: "Trop d'envois, patientez quelques minutes.", en: "Too many uploads, wait a few minutes." },
  upload_failed: { fr: "L'envoi a échoué, réessayez.", en: "Upload failed, try again." },
  not_uploaded: { fr: "Le fichier n'a pas été reçu, renvoyez-le.", en: "The file was not received, upload it again." },
  type_mismatch: { fr: "Le contenu ne correspond pas à l'extension du fichier.", en: "The content does not match the file extension." },
  too_large: { fr: "Fichier trop lourd pour ce format.", en: "File too large for this format." },
  empty: { fr: "Fichier vide.", en: "Empty file." },
  executable: { fr: "Fichier refusé : il contient un programme exécutable.", en: "Rejected: the file contains an executable program." },
  zip_bomb: { fr: "Archive refusée : taille décompressée anormale.", en: "Archive rejected: abnormal uncompressed size." },
  zip_entries: { fr: "Archive refusée : trop de fichiers (500 maximum).", en: "Archive rejected: too many files (500 max)." },
  zip_traversal: { fr: "Archive refusée : chemins de fichiers dangereux.", en: "Archive rejected: dangerous file paths." },
  no_text: { fr: "Aucun texte exploitable n'a été trouvé dans ce fichier.", en: "No usable text was found in this file." },
  credits: { fr: "Crédits insuffisants pour analyser ce fichier.", en: "Not enough credits to analyse this file." },
  provider_unavailable: { fr: "Analyse audio/vidéo momentanément indisponible. Réessayez plus tard.", en: "Audio/video analysis is temporarily unavailable. Try again later." },
  extract_failed: { fr: "La lecture du fichier a échoué, réessayez.", en: "Reading the file failed, try again." },
  embed_failed: { fr: "L'indexation a échoué, réessayez.", en: "Indexing failed, try again." },
  index_failed: { fr: "L'indexation a échoué, réessayez.", en: "Indexing failed, try again." },
  not_found: { fr: "Élément introuvable.", en: "Item not found." },
  too_many: { fr: "Limite de 50 bases de connaissances atteinte.", en: "Limit of 50 knowledge bases reached." },
};

export function fileErrorText(code: string | null, lang: "fr" | "en") {
  return (code && messages[code]?.[lang]) || (lang === "fr" ? "Une erreur est survenue." : "Something went wrong.");
}

export const warningText: Record<string, { fr: string; en: string }> = {
  approximate_extraction: { fr: "Ancien format Office : extraction approximative", en: "Legacy Office format: approximate extraction" },
  office_macros: { fr: "Macros détectées (jamais exécutées)", en: "Macros detected (never run)" },
  pdf_active_content: { fr: "Contenu actif PDF détecté (ignoré)", en: "Active PDF content detected (ignored)" },
  secrets_detected: { fr: "Le fichier semble contenir des clés secrètes", en: "The file seems to contain secret keys" },
  text_truncated: { fr: "Texte tronqué à 500 000 caractères", en: "Text truncated to 500,000 characters" },
  archive_entries_skipped: { fr: "Médias et sous-archives de l'archive ignorés", en: "Media and nested archives skipped" },
  archive_executable_skipped: { fr: "Exécutables de l'archive ignorés", en: "Executables in the archive skipped" },
  archive_entry_unreadable: { fr: "Certains fichiers de l'archive sont illisibles", en: "Some archive entries are unreadable" },
  nested_archive_skipped: { fr: "Sous-archive ignorée", en: "Nested archive skipped" },
};
