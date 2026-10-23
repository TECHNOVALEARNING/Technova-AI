// Browser- and server-safe detection of credentials in generated project files.
// Used before ZIP export (redaction), preview sharing, publishing and GitHub push (refusal).

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "Clé privée", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: "OpenAI / OpenRouter", re: /\bsk-(?:or-v1-|proj-|ant-)?[A-Za-z0-9_-]{20,}/g },
  { name: "Supabase secret", re: /\bsb_secret_[A-Za-z0-9_-]{16,}/g },
  { name: "Supabase service_role (JWT)", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_-]*\.[A-Za-z0-9_-]{10,}/g },
  { name: "GitHub", re: /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/g },
  { name: "AWS", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Stripe", re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/g },
  { name: "Google API", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "TechNova / Nyole", re: /\b(?:tn_live|af_live|af_test)_[A-Za-z0-9]{16,}/g },
  { name: "Slack", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
];

const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g;

/** Supabase service_role tokens are JWTs whose payload says role=service_role (anon keys are public and allowed). */
function isServiceRoleJwt(payload: string) {
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="));
    return /"role"\s*:\s*"service_role"/.test(json);
  } catch { return false; }
}

export type SecretFinding = { path: string; kind: string };
type FileLike = { path: string; content: string };

export function findSecrets(files: FileLike[]): SecretFinding[] {
  const found: SecretFinding[] = [];
  for (const f of files) for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    if (p.re.test(f.content)) found.push({ path: f.path, kind: p.name });
  }
  for (const f of files) for (const m of f.content.matchAll(JWT)) {
    if (isServiceRoleJwt(m[1]!)) { found.push({ path: f.path, kind: "Supabase service_role" }); break; }
  }
  return found;
}

/** Same files with every detected secret replaced by a visible placeholder. */
export function redactSecrets<T extends FileLike>(files: T[]): T[] {
  return files.map((f) => ({
    ...f,
    content: PATTERNS.reduce((text, p) => text.replace(p.re, "REMPLACEZ_PAR_VOTRE_CLE"), f.content)
      .replace(JWT, (token, payload: string) => (isServiceRoleJwt(payload) ? "REMPLACEZ_PAR_VOTRE_CLE" : token)),
  }));
}
