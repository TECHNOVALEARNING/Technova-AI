// Builds the downloadable documentation PDFs (public/docs/technova-documentation-<lang>-v<version>.pdf) by printing
// /documentation?pdf=1&lang=<lang> with a local Chrome or Edge in headless mode.
// Usage: start the dev server (npm run dev), then `node scripts/build-docs-pdf.mjs [base URL]`.
// The browser can be forced with the CHROME_PATH environment variable.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const version = /DOC_VERSION = "([^"]+)"/.exec(readFileSync("src/lib/docs-version.ts", "utf8"))?.[1];
if (!version) throw new Error("DOC_VERSION not found in src/lib/docs-version.ts");

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) throw new Error("No Chrome or Edge found: set CHROME_PATH.");

const outDir = resolve("public/docs");
mkdirSync(outDir, { recursive: true });
// Older versions are removed so only the current one is served.
for (const f of readdirSync(outDir)) if (/^technova-documentation-.+\.pdf$/.test(f) && !f.endsWith(`-v${version}.pdf`)) unlinkSync(join(outDir, f));

for (const lang of ["fr", "en", "es", "pt"]) {
  const out = join(outDir, `technova-documentation-${lang}-v${version}.pdf`);
  execFileSync(browser, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=15000", `--print-to-pdf=${out}`, `${base}/documentation?pdf=1&lang=${lang}`,
  ], { stdio: "ignore", timeout: 120_000 });
  console.log(`${lang}: ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
}
