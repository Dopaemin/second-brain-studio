import { cn } from "@/lib/utils";

interface ModeSwitchProps {
  mode: "work" | "private";
  onToggle: () => void;
}

export function ModeSwitch({ mode, onToggle }: ModeSwitchProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "no-drag relative flex items-center gap-1 px-4 py-1.5 rounded-full",
        "text-sm font-semibold tracking-wide",
        "border transition-all duration-400 cursor-pointer",
        "hover:scale-105 active:scale-95"
      )}
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--accent-border)",
        boxShadow: `0 0 16px var(--accent-muted)`,
        color: "var(--text)",
      }}
    >
      <span style={{ opacity: mode === "work" ? 1 : 0.4, transition: "opacity 400ms" }}>
        Work
      </span>
      <span style={{ color: "var(--accent)", margin: "0 4px" }}>/</span>
      <span style={{ opacity: mode === "private" ? 1 : 0.4, transition: "opacity 400ms" }}>
        Private
      </span>
    </button>
  );
}
