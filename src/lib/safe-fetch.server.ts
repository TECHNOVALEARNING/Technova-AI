import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Server-only. Fetches a user-supplied URL without letting it reach internal
// networks (cloud metadata, localhost, private ranges) — including via redirects.

function privateV4(ip: string) {
  const [a = 0, b = 0] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

function privateIp(ip: string) {
  if (isIP(ip) === 4) return privateV4(ip);
  const v6 = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6)?.[1];
  if (mapped) return privateV4(mapped);
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9")
    || v6.startsWith("fea") || v6.startsWith("feb") || v6.startsWith("ff");
}

async function assertPublicUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("blocked_protocol");
  if (url.username || url.password) throw new Error("blocked_credentials");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("blocked_port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error("blocked_host");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (!addresses.length || addresses.some(privateIp)) throw new Error("blocked_address");
  return url;
}

/** Returns at most `maxBytes` of the response body as text. */
export async function fetchPublicText(raw: string, { timeoutMs = 8000, maxBytes = 1_000_000, headers = {} as Record<string, string> } = {}) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, { redirect: "manual", headers, signal: AbortSignal.timeout(timeoutMs) });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.body) return "";
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    await reader.cancel().catch(() => {});
    return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, maxBytes));
  }
  throw new Error("too_many_redirects");
}
