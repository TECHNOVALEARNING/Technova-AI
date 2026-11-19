import { renderToStaticMarkup } from "react-dom/server";
import { formatById, type DesignFormatId } from "@/lib/design-formats";
import { DESIGN_FONTS_HREF } from "@/lib/design-fonts";
import { DocPage, textLines, type DesignDoc } from "./doc";

// Exports of TechNova Design, all built in the browser from the editable document (nothing is sent anywhere, no
// credits): print / PDF at the exact page size, a standalone HTML file, a native PowerPoint file (editable text
// boxes, shapes and images, any format), and the web page published as a share link (/s/…, Netlify, Vercel,
// GitHub) — for invitations it adds a countdown, WhatsApp RSVP, directions and « add to calendar ».

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pagesMarkup = (doc: DesignDoc) => doc.pages.map((_, i) => `<section class="sheet">${renderToStaticMarkup(<DocPage doc={doc} page={i} />)}</section>`).join("");
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "design";
function save(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function printHtml(doc: DesignDoc, format: DesignFormatId, title: string) {
  const fmt = formatById(format);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="${DESIGN_FONTS_HREF}">
<style>
@page { size: ${fmt.print}; margin: 0; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #e9e9ec; }
.sheet { width: ${doc.w}px; height: ${doc.h}px; margin: 24px auto; box-shadow: 0 10px 30px rgba(0,0,0,.12); overflow: hidden; break-after: page; page-break-after: always; }
@media print { html, body { background: none; } .sheet { margin: 0; box-shadow: none; zoom: var(--fit, 1); } }
</style></head><body>${pagesMarkup(doc)}</body></html>`;
}

/** Opens the print dialog (Imprimer ou Enregistrer en PDF) with the design at its real page size. */
export function printDoc(doc: DesignDoc, format: DesignFormatId, title: string) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const fmt = formatById(format);
  win.document.open(); win.document.write(printHtml(doc, format, title)); win.document.close();
  const mm: Record<string, number> = { A4: 210, A5: 148, "A4 landscape": 297, "85mm 55mm": 85 };
  if (mm[fmt.print]) win.document.documentElement.style.setProperty("--fit", String((mm[fmt.print]! * 96) / 25.4 / doc.w));
  void (win.document.fonts?.ready ?? Promise.resolve()).then(() => setTimeout(() => { try { win.focus(); win.print(); } catch { /* closed */ } }, 400));
  return true;
}

export function downloadDocHtml(doc: DesignDoc, format: DesignFormatId, title: string, values: Record<string, string>) {
  save(new Blob([shareHtml(doc, format, title, values)], { type: "text/html;charset=utf-8" }), `${slug(title)}.html`);
}

/** The page behind the share link: every page fitted to the visitor's screen, plus the invitation extras. */
export function shareHtml(doc: DesignDoc, format: DesignFormatId, title: string, values: Record<string, string>) {
  const invite = format === "invitation";
  const when = (values["eventDate"] ?? "").trim().replace(" ", "T");
  const phone = (values["rsvpPhone"] ?? "").replace(/[^\d]/g, "");
  const map = (values["mapQuery"] ?? values["place"] ?? "").trim();
  const name = (values["title"] ?? title).replace(/\s+/g, " ").trim();
  const extras = invite ? `
<div class="bar">
  ${when ? `<p class="count" id="count"></p>` : ""}
  <div class="actions">
    ${phone ? `<a class="btn main" href="https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour, je confirme ma présence : ${name}.`)}" target="_blank" rel="noopener">Confirmer ma présence</a>
    <a class="btn" href="https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour, je ne pourrai malheureusement pas être présent(e) : ${name}.`)}" target="_blank" rel="noopener">Je ne pourrai pas venir</a>` : ""}
    ${map ? `<a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(map)}" target="_blank" rel="noopener">Itinéraire</a>` : ""}
    ${when ? `<button class="btn" id="cal" type="button">Ajouter au calendrier</button>` : ""}
    <a class="btn" id="share" href="#">Partager</a>
  </div>
</div>` : `<div class="bar"><div class="actions"><a class="btn" id="share" href="#">Partager</a></div></div>`;
  const script = `<script>
(function(){
  var W=${doc.w};
  function fit(){document.querySelectorAll('.page').forEach(function(p){var s=Math.min(1,p.parentElement.clientWidth/W);p.style.transform='scale('+s+')';p.parentElement.style.height=(${doc.h}*s)+'px';});}
  window.addEventListener('resize',fit);fit();
  var sh=document.getElementById('share');
  if(sh)sh.addEventListener('click',function(e){e.preventDefault();var u=location.href;var t=${JSON.stringify(name)};
    if(navigator.share){navigator.share({title:t,url:u}).catch(function(){});}else{window.open('https://wa.me/?text='+encodeURIComponent(t+' '+u),'_blank');}});
  ${when ? `var target=new Date(${JSON.stringify(when)});var c=document.getElementById('count');
  function tick(){var d=target-new Date();if(!c)return;if(isNaN(d)){c.textContent='';return;}if(d<=0){c.textContent="C'est aujourd'hui !";return;}
    var j=Math.floor(d/864e5),h=Math.floor(d%864e5/36e5),m=Math.floor(d%36e5/6e4);c.textContent='Plus que '+j+' j '+h+' h '+m+' min';}
  tick();setInterval(tick,30000);
  var cal=document.getElementById('cal');
  if(cal)cal.addEventListener('click',function(){var s=target,e=new Date(s.getTime()+4*36e5);function f(x){return x.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';}
    var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TechNova Design//FR','BEGIN:VEVENT','UID:'+Date.now()+'@technovaihub.com','DTSTAMP:'+f(new Date()),'DTSTART:'+f(s),'DTEND:'+f(e),'SUMMARY:'+${JSON.stringify(name)},'LOCATION:'+${JSON.stringify(map)},'END:VEVENT','END:VCALENDAR'].join('\\r\\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.download='invitation.ics';a.click();});` : ""}
})();
</script>`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title><link rel="stylesheet" href="${DESIGN_FONTS_HREF}">
<style>
*{box-sizing:border-box}body{margin:0;background:#f1f1f4;font-family:Inter,system-ui,sans-serif;color:#1c1917}
main{max-width:${Math.min(doc.w, 1100)}px;margin:0 auto;padding:20px 14px 40px;display:flex;flex-direction:column;gap:18px}
.wrap{width:100%;overflow:hidden;border-radius:14px;box-shadow:0 14px 40px -18px rgba(0,0,0,.35);background:#fff}
.page{transform-origin:top left;width:${doc.w}px;height:${doc.h}px}
.bar{display:flex;flex-direction:column;align-items:center;gap:14px;padding:6px 0}
.count{margin:0;font-size:18px;font-weight:700}
.actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.btn{appearance:none;border:1px solid #d8d8de;background:#fff;color:#1c1917;padding:12px 18px;border-radius:999px;font:600 14px Inter,system-ui,sans-serif;text-decoration:none;cursor:pointer}
.btn.main{background:#1c1917;color:#fff;border-color:#1c1917}
footer{text-align:center;font-size:12px;color:#8a8a94}
</style></head><body><main>
${doc.pages.map((_, i) => `<div class="wrap"><div class="page">${renderToStaticMarkup(<DocPage doc={doc} page={i} />)}</div></div>`).join("")}
${extras}
<footer>Créé avec TechNova AI Hub</footer>
</main>${script}</body></html>`;
}

const hex = (c: string) => (c.startsWith("#") ? c.slice(1).toUpperCase() : "FFFFFF");
const inch = (n: number) => n / 96;

/** Native PowerPoint file for any format: the document's text boxes, shapes and images, editable. */
export async function downloadDocPptx(doc: DesignDoc, title: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "TECHNOVA", width: inch(doc.w), height: inch(doc.h) });
  pptx.layout = "TECHNOVA";
  pptx.title = title;
  for (const page of doc.pages) {
    const s = pptx.addSlide();
    s.background = { color: hex(page.bg) };
    for (const el of page.elements) {
      const pos = { x: inch(el.x), y: inch(el.y), w: inch(el.w), h: inch(el.h) };
      if (el.type === "shape") {
        if (el.fill === "transparent" && !el.border) continue;
        s.addShape(el.radius > Math.min(el.w, el.h) / 2.2 ? pptx.ShapeType.ellipse : el.radius > 0 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
          ...pos, ...(el.fill !== "transparent" ? { fill: { color: hex(el.fill), transparency: Math.round((1 - el.opacity) * 100) } } : { fill: { type: "none" } as never }),
          line: el.border ? { color: hex(el.borderColor), width: el.border * 0.75 } : { type: "none" } as never,
          ...(el.radius > 0 ? { rectRadius: Math.min(0.5, el.radius / Math.min(el.w, el.h)) } : {}),
        });
      } else if (el.type === "image") {
        if (el.src.startsWith("data:")) s.addImage({ ...pos, data: el.src, sizing: { type: "cover", w: pos.w, h: pos.h } });
      } else {
        s.addText(textLines(el).replace(/^(•|\d+\.)\s/gm, el.list === "none" ? "$&" : ""), {
          ...pos, fontFace: el.font, fontSize: Math.max(6, el.size * 0.75), bold: el.bold, italic: el.italic, ...(el.underline ? { underline: { style: "sng" as const } } : {}),
          color: hex(el.color), align: el.align, valign: "top", margin: 0, lineSpacingMultiple: el.lineHeight, charSpacing: el.spacing * 0.75,
          ...(el.highlight ? { highlight: hex(el.highlight) } : {}), ...(el.list === "bullet" ? { bullet: true } : el.list === "number" ? { bullet: { type: "number" } } : {}),
          fit: "shrink",
        });
      }
    }
  }
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  save(blob, `${slug(title)}.pptx`);
}
