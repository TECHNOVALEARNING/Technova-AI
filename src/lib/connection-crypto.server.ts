import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Server-only. Third-party credentials (a user's Supabase access token) never
// reach the database as plaintext: the row is only readable by the backend.
function key(): Buffer {
  const raw = process.env["TECHNOVA_CONN_CRYPTO_KEY"];
  if (!raw) throw new Error("TECHNOVA_CONN_CRYPTO_KEY is not set");
  return createHash("sha256").update(raw).digest();
}

/** iv | auth tag | ciphertext, base64 — one opaque column value. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
