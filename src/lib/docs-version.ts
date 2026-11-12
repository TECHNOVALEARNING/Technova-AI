// Version of the downloadable documentation (PDF in public/docs, one per language).
// After changing the documentation: bump DOC_VERSION / DOC_DATE, start the dev server, then run
// `node scripts/build-docs-pdf.mjs` to regenerate the PDFs.
export const DOC_VERSION = "1.1";
export const DOC_DATE = "2026-11-12";
export const docPdfPath = (lang: "fr" | "en" | "es" | "pt") => `/docs/technova-documentation-${lang}-v${DOC_VERSION}.pdf`;
