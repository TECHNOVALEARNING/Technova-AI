// Browser-safe Deep Research constants shared by the chat and /api/research.

/** Credits reserved per research; the real (lower) provider cost is what gets charged. */
export const RESEARCH_MAX_CREDITS = 300;

/** Splits the streamed text into the latest status line ("§…") and the report body. */
export function splitResearchStream(raw: string): { status: string; report: string } {
  let status = "";
  const body: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("§")) { if (line.length > 1) status = line.slice(1); }
    else body.push(line);
  }
  return { status, report: body.join("\n").trim() };
}
