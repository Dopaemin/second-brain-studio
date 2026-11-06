import { cn } from "@/lib/utils";

interface ModeSwitchProps {
  mode: "work" | "private";
  onChange: (mode: "work" | "private") => void;
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-md bg-[var(--bg-subtle)] border border-hairline select-none">
      <button
        type="button"
        onClick={() => onChange("work")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-medium tracking-tight transition-all duration-150 cursor-pointer border",
          mode === "work"
            ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-medium border-hairline"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] border-transparent"
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-opacity",
            mode === "work" ? "bg-emerald-500 opacity-100" : "opacity-0"
          )}
        />
        <span>Arbeit</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("private")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-medium tracking-tight transition-all duration-150 cursor-pointer border",
          mode === "private"
            ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-medium border-hairline"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] border-transparent"
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-opacity",
            mode === "private" ? "bg-purple-500 opacity-100" : "opacity-0"
          )}
        />
        <span>Privat</span>
      </button>
    </div>
  );
}
