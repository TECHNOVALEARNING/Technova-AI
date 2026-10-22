/** Public-domain Wikimedia photos selected for the approved site's visual brief. */
type CommonsImage = { title: string; index?: number; imageinfo?: Array<{ thumburl?: string; width?: number; height?: number; mime?: string; extmetadata?: { LicenseShortName?: { value?: string } } }> };
type CommonsResponse = { query?: { pages?: Record<string, CommonsImage> } };

const API = "https://commons.wikimedia.org/w/api.php";
const AGENT = `TechNovaStudio/1.0 (${process.env["TECHNOVA_APP_URL"]?.trim() || "https://technova.ai"})`;

export function imageProxyUrl(title: string) {
  return `/api/public/studio-image?file=${encodeURIComponent(title)}`;
}

export async function imageInfo(title: string) {
  const url = new URL(API);
  url.search = new URLSearchParams({ action: "query", titles: title, prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1400", format: "json" }).toString();
  const res = await fetch(url, { headers: { "User-Agent": AGENT } });
  if (!res.ok) return null;
  const json = await res.json() as CommonsResponse;
  const page = Object.values(json.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl || !info.mime?.startsWith("image/") || !["CC0", "Public domain", "PD"].includes(info.extmetadata?.LicenseShortName?.value ?? "")) return null;
  const image = new URL(info.thumburl);
  if (image.protocol !== "https:" || !image.hostname.endsWith(".wikimedia.org")) return null;
  return { url: image.toString(), width: info.width ?? 0, height: info.height ?? 0 };
}

export async function findStudioImages(searches: string[]) {
  const found: Array<{ title: string; url: string; subject: string; width: number; height: number }> = [];
  const seen = new Set<string>();
  for (const search of searches.slice(0, 3)) {
    const query = search.trim().slice(0, 100);
    if (!query) continue;
    // Commons searches titles/descriptions literally; shorter subjects recover relevant results.
    const words = query.split(/\s+/);
    const subjectWords = words.filter((word) => !/^(artisan|warm|golden|modern|rustic|fresh|cozy|bright|luxury|minimal|soft|light|interior|exterior|shop|store|photo|image|handmade)$/i.test(word));
    const required = subjectWords[0]?.toLowerCase().replace(/s$/, "") ?? words[0]?.toLowerCase();
    const alternatives = [...new Set([`${required} Unsplash`, query, subjectWords.slice(0, 2).join(" "), required])].filter(Boolean);
    for (const term of alternatives) {
      const url = new URL(API);
      url.search = new URLSearchParams({ action: "query", generator: "search", gsrsearch: `${term} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "20", prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1400", format: "json" }).toString();
      try {
        const res = await fetch(url, { headers: { "User-Agent": AGENT } });
        if (!res.ok) continue;
        const json = await res.json() as CommonsResponse;
        const pages = Object.values(json.query?.pages ?? {}).sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
        for (const page of pages) {
          const info = page.imageinfo?.[0];
          if (!info?.thumburl || !info.mime?.startsWith("image/") || !["CC0", "Public domain", "PD"].includes(info.extmetadata?.LicenseShortName?.value ?? "") || seen.has(page.title)) continue;
          if (required && !page.title.toLowerCase().includes(required)) continue;
          if (/museum|tomb|ancient|painting|drawing|illustration|model|relief|sculpture|texture|historic|portrait|sign|logo|circa \d|\b19\d\d\b/i.test(page.title)) continue;
          if ((info.width ?? 0) < 900 || (info.height ?? 0) < 550) continue;
          seen.add(page.title);
          found.push({ title: page.title, url: imageProxyUrl(page.title), subject: query, width: info.width ?? 0, height: info.height ?? 0 });
          if (found.filter((item) => item.subject === query).length >= 2) break;
        }
      } catch { /* Photo search is optional; site generation still continues. */ }
      if (found.filter((item) => item.subject === query).length >= 2) break;
    }
  }
  return found;
}