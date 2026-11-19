import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClaude, faOpenai } from "@fortawesome/free-brands-svg-icons";

// Small brand marks shown before each flagship model in the chat's mode menu (Creator and Pro). OpenAI and Claude come
// from Font Awesome Free brands; Gemini, DeepSeek, Grok and Kimi are simplified marks drawn here (no icon library).
// The models page keeps its own covers without provider logos.

const box = "grid size-5 shrink-0 place-items-center";

function GeminiMark() {
  return <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <defs><linearGradient id="tn-gemini" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4796E3" /><stop offset=".55" stopColor="#9168C0" /><stop offset="1" stopColor="#D96570" /></linearGradient></defs>
    <path fill="url(#tn-gemini)" d="M12 24A14.3 14.3 0 0 0 0 12 14.3 14.3 0 0 0 12 0a14.3 14.3 0 0 0 12 12 14.3 14.3 0 0 0-12 12" />
  </svg>;
}

function DeepSeekMark() {
  return <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path fill="#4D6BFE" d="M1.8 12.6c0-4.1 3.7-7.1 8.6-7.1 3.2 0 5.7 1.4 7.1 3.4.6-1.4 1.9-2.5 3.7-3-.5 1.6-.5 3.1.3 4.5-.8 1.3-2 2-3.3 2.1-.9 3.8-4.4 6.1-8.4 6.1-4.5 0-8-2.6-8-6z" />
    <circle cx="7.4" cy="11" r="1.1" fill="#fff" />
    <path d="M5 14.6c2.4 1.4 5.6 1.4 8-.2" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
  </svg>;
}

function GrokMark() {
  return <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" aria-hidden="true">
    <path d="M4 4l16 16" /><path d="M20 3 13.5 10.5" /><path d="M9.5 14.5 4 21" />
  </svg>;
}

function KimiMark() {
  return <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#111" />
    <path d="M8 6.5v11M8 12.5l6-6M10.2 10.6 15 17.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <circle cx="17.6" cy="6.6" r="1.8" fill="#1783FF" />
  </svg>;
}

/** The provider mark of a flagship model, picked from its label. */
export function ModelLogo({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l.startsWith("gpt")) return <span className={box}><FontAwesomeIcon icon={faOpenai} className="size-4 text-foreground" /></span>;
  if (l.startsWith("claude")) return <span className={box}><FontAwesomeIcon icon={faClaude} className="size-4" style={{ color: "#D97757" }} /></span>;
  if (l.startsWith("gemini")) return <span className={box}><GeminiMark /></span>;
  if (l.startsWith("deepseek")) return <span className={box}><DeepSeekMark /></span>;
  if (l.startsWith("grok")) return <span className={`${box} text-foreground`}><GrokMark /></span>;
  if (l.startsWith("kimi")) return <span className={box}><KimiMark /></span>;
  return <span className={box} />;
}
