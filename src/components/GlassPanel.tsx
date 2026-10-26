import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function GlassPanel({ children, className, title }: GlassPanelProps) {
  return (
    <div className={cn("glass-panel p-4 flex flex-col gap-3", className)}>
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--accent)", opacity: 0.85 }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
