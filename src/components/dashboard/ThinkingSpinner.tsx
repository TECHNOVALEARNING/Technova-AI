// Turning "thinking" indicator: twelve rays shaded from violet to blue to grey, stepping round like a
// classic activity indicator. Shown before « Réflexion en cours » in the chat and above media in progress.

const rays = ["#6d28d9", "#7c3aed", "#5b4fd8", "#4f63d8", "#6c86d6", "#8fa3d6", "#b4bdd4", "#b9c3c3", "#a7b2ae", "#8a8e99", "#6e6a8c", "#5d3f91"];

export function ThinkingSpinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="thinking-spinner shrink-0">
      {rays.map((color, i) => (
        <line key={i} x1="12" y1="2.2" x2="12" y2="6.6" stroke={color} strokeWidth="2.1" strokeLinecap="round" transform={`rotate(${i * 30} 12 12)`} />
      ))}
    </svg>
  );
}

/** Spinner + « Réflexion en cours » (or a custom status) on one line. */
export function ThinkingLine({ fr, label }: { fr: boolean; label?: string | undefined }) {
  return (
    <span role="status" className="inline-flex items-center gap-2.5 text-[14px] text-muted-foreground">
      <ThinkingSpinner />
      {label || (fr ? "Réflexion en cours" : "Thinking")}
    </span>
  );
}
